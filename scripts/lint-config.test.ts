import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { isRecord } from "./guards";

async function config(file: string): Promise<Record<string, unknown>> {
  const parsed: unknown = Bun.JSON5.parse(await readFile(resolve(file), "utf8"));
  if (!isRecord(parsed)) throw new Error(`${file}: expected an object`);
  return parsed;
}

test("oxlint stays type-aware, strict and free of stale disable directives", async () => {
  const lint = await config(".oxlintrc.json");
  const options = lint["options"];
  const categories = lint["categories"];
  expect(isRecord(options) && options["typeAware"]).toBe(true);
  expect(isRecord(options) && options["reportUnusedDisableDirectives"]).toBe("error");
  for (const category of ["correctness", "suspicious", "perf"])
    expect(isRecord(categories) && categories[category]).toBe("error");
  const plugins = lint["plugins"];
  for (const plugin of ["typescript", "unicorn", "oxc", "import", "promise", "react", "jsx-a11y"])
    expect(Array.isArray(plugins) && plugins.includes(plugin)).toBe(true);
  const rules = lint["rules"];
  for (const rule of [
    "typescript/no-floating-promises",
    "typescript/no-misused-promises",
    "typescript/no-explicit-any",
    "typescript/no-unsafe-assignment",
    "eslint/eqeqeq",
  ])
    expect(isRecord(rules) && rules[rule]).toBe("error");
});

test("the lint script runs type-aware and denies warnings over every source folder", async () => {
  const manifest: unknown = JSON.parse(await readFile(resolve("package.json"), "utf8"));
  const scripts = isRecord(manifest) ? manifest["scripts"] : undefined;
  const lint = isRecord(scripts) ? scripts["lint"] : undefined;
  expect(typeof lint === "string" && lint).toContain("--type-aware");
  expect(typeof lint === "string" && lint).toContain("--deny-warnings");
  for (const folder of ["apps", "packages", "scripts", "e2e", "playwright.config.ts"])
    expect(typeof lint === "string" && lint).toContain(folder);
});

test("oxfmt sorts imports and package.json and ignores only generated or output paths", async () => {
  const format = await config(".oxfmtrc.json");
  expect(isRecord(format["sortImports"])).toBe(true);
  expect(format["sortPackageJson"]).toBe(true);
  expect(format["printWidth"]).toBe(100);
  const ignored = format["ignorePatterns"];
  expect(Array.isArray(ignored) && ignored).toContain("apps/api/worker-configuration.d.ts");
  for (const pattern of Array.isArray(ignored) ? ignored : [])
    expect(String(pattern)).not.toMatch(
      /^(apps|packages|scripts|e2e)\/(?!api\/worker-configuration)/u,
    );
});
