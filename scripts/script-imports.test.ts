import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * METRO-102: repository scripts run in Node/Bun and never reach into app internals, with ONE reviewed
 * exception. `smoke-live.ts` imports the visible hint from the feature's `copy.ts` so the text that the
 * live check compares against lives once. `copy.ts` has no imports, so no React or DOM code reaches Node.
 * Any other script import under `apps/` (or a second file from there) fails here; widen the allowlist only
 * with a reason recorded in the runbook.
 */
const ALLOWED: Record<string, string[]> = {
  "smoke-live.ts": ["../apps/web/src/features/nearest-station/copy.ts"],
};
const COPY = "../apps/web/src/features/nearest-station/copy.ts";

const here = import.meta.dir;
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/gu;

function appImports(source: string): string[] {
  return [...source.matchAll(SPECIFIER)]
    .map((match) => match[1] ?? "")
    .filter((specifier) => /(?:^|\/)apps\//u.test(specifier));
}

test("a script imports from apps/ only through the allowlist", () => {
  const found: Record<string, string[]> = {};
  for (const file of readdirSync(here)) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
    const imports = appImports(readFileSync(join(here, file), "utf8"));
    if (imports.length > 0) found[file] = imports;
  }
  expect(found).toEqual(ALLOWED);
});

test("the one allowed file has no imports of its own, so nothing else comes along", () => {
  const source = readFileSync(join(here, COPY), "utf8");
  expect([...source.matchAll(SPECIFIER)]).toEqual([]);
});

test("the allowlist check sees import forms and ignores unrelated text", () => {
  expect(appImports('import { x } from "../apps/web/src/a.ts";')).toEqual(["../apps/web/src/a.ts"]);
  expect(appImports('import "../apps/api/src/b.ts";')).toEqual(["../apps/api/src/b.ts"]);
  expect(appImports('const m = await import("../apps/web/c.ts");')).toEqual(["../apps/web/c.ts"]);
  expect(appImports('const m = require("../apps/web/d.ts");')).toEqual(["../apps/web/d.ts"]);
  expect(appImports('import { y } from "node:fs"; const path = "apps/web";')).toEqual([]);
});
