import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

test("METRO-41 ui.md states the WCAG 2.2 AA target and the axe tag list", async () => {
  const ui = await readFile(join(root, "docs/agents/ui.md"), "utf8");
  expect(ui).toContain("WCAG 2.2 level AA");
  for (const tag of ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]) {
    expect(ui).toContain(`\`${tag}\``);
  }
});

test("METRO-41 the axe fixture keeps every WCAG 2.2 AA tag", async () => {
  const fixtures = await readFile(join(root, "e2e/fixtures.ts"), "utf8");
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
