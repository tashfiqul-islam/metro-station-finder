import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const read = (file: string) => readFile(join(root, file), "utf8");

test("METRO-41 the axe fixture keeps every WCAG 2.2 AA tag", async () => {
  const fixtures = await read("e2e/fixtures.ts");
  const list = /AXE_TAGS = \[([^\]]*)\]/u.exec(fixtures)?.[1] ?? "";
  expect(list.match(/"[^"]+"/gu)).toEqual([
    '"wcag2a"',
    '"wcag2aa"',
    '"wcag21a"',
    '"wcag21aa"',
    '"wcag22aa"',
    '"best-practice"',
  ]);
});

test("METRO-41 every axe scan goes through axeBuilder, which applies AXE_TAGS", async () => {
  const fixtures = await read("e2e/fixtures.ts");
  expect(fixtures).toMatch(/new AxeBuilder\(\{ page \}\)\.withTags\(\[\.\.\.AXE_TAGS\]\)/u);
  expect(fixtures.match(/new AxeBuilder\(/gu)).toHaveLength(1);
  expect(fixtures).toMatch(/await axeBuilder\(page\)\.analyze\(\)/u);
  for (const file of await readdir(join(root, "e2e"))) {
    if (file === "fixtures.ts" || !file.endsWith(".ts")) continue;
    expect(await read(`e2e/${file}`), file).not.toContain("new AxeBuilder(");
  }
});
