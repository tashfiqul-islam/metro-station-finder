import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * METRO-167: `scripts/` holds one folder per concern, each named in `scripts/README.md`, and every
 * `.ts` file sits directly in one of them (`scripts/<folder>/<file>.ts`).
 */
function layoutProblems(root: string, readme: string): string[] {
  const found: string[] = [];
  for (const raw of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    const path = raw.replaceAll("\\", "/");
    if (!path.endsWith(".ts")) continue;
    const depth = path.split("/").length;
    if (depth === 1)
      found.push(`scripts/${path} sits directly in scripts/; move it into a concern folder`);
    if (depth > 2) found.push(`scripts/${path} is deeper than scripts/<folder>/<file>`);
  }
  for (const entry of readdirSync(root, { withFileTypes: true }))
    if (entry.isDirectory() && !readme.includes(`\`${entry.name}/\``))
      found.push(`scripts/${entry.name}/ is not named in scripts/README.md`);
  return found;
}

function fixture(files: readonly string[], readme: string): [string, string] {
  const root = mkdtempSync(join(tmpdir(), "metro-layout-"));
  for (const file of files) {
    mkdirSync(join(root, file, ".."), { recursive: true });
    writeFileSync(join(root, file), "");
  }
  return [root, readme];
}

test("the real scripts folder follows the layout", () => {
  const scripts = resolve(import.meta.dir, "..");
  expect(layoutProblems(scripts, readFileSync(join(scripts, "README.md"), "utf8"))).toEqual([]);
});

test("a .ts file directly in scripts/, one nested too deep and an unlisted folder are named", () => {
  const [root, readme] = fixture(
    ["zz-stray.ts", "gates/ok.ts", "gates/deep/x.ts", "extra/y.ts", "gates/data.json"],
    "| Gates | `gates/` | checks |",
  );
  try {
    expect(new Set(layoutProblems(root, readme))).toEqual(
      new Set([
        "scripts/extra/ is not named in scripts/README.md",
        "scripts/gates/deep/x.ts is deeper than scripts/<folder>/<file>",
        "scripts/zz-stray.ts sits directly in scripts/; move it into a concern folder",
      ]),
    );
  } finally {
    rmSync(root, { recursive: true });
  }
});
