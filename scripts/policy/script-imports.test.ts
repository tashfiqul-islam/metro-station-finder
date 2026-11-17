import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * METRO-102: repository scripts run in Node/Bun and never reach into app internals. There was one reviewed
 * exception (`smoke-live.ts` read the visible hint from the feature's `copy.ts`); METRO-163 removed the hint
 * with Google's widget, so the allowlist is empty. Any script import under `apps/` fails here; widen the
 * allowlist only with a reason recorded in the runbook.
 */
const ALLOWED: Record<string, string[]> = {};

const here = join(import.meta.dir, "..");
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/gu;

function appImports(source: string): string[] {
  return [...source.matchAll(SPECIFIER)]
    .map((match) => match[1] ?? "")
    .filter((specifier) => /(?:^|\/)apps\//u.test(specifier));
}

test("a script imports from apps/ only through the allowlist", () => {
  const found: Record<string, string[]> = {};
  for (const file of readdirSync(here, { recursive: true, encoding: "utf8" })) {
    if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
    const imports = appImports(readFileSync(join(here, file), "utf8"));
    if (imports.length > 0) found[file] = imports;
  }
  expect(found).toEqual(ALLOWED);
});

test("the allowlist check sees import forms and ignores unrelated text", () => {
  expect(appImports('import { x } from "../apps/web/src/a.ts";')).toEqual(["../apps/web/src/a.ts"]);
  expect(appImports('import "../apps/api/src/b.ts";')).toEqual(["../apps/api/src/b.ts"]);
  expect(appImports('const m = await import("../apps/web/c.ts");')).toEqual(["../apps/web/c.ts"]);
  expect(appImports('const m = require("../apps/web/d.ts");')).toEqual(["../apps/web/d.ts"]);
  expect(appImports('import { y } from "node:fs"; const path = "apps/web";')).toEqual([]);
});
