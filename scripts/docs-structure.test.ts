import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  checklistProblems,
  kindOf,
  parseKindMap,
  parseKinds,
  structureProblems,
} from "./docs-structure.ts";

// METRO-75: docs/README.md is the one written map of document kinds; these tests keep it honest.
const root = resolve(import.meta.dir, "..");

async function filesUnder(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await filesUnder(path)));
    else found.push(path);
  }
  return found;
}

const KINDS_TABLE = [
  "## Kinds",
  "",
  "| Kind | What it is |",
  "| --- | --- |",
  "| index | the map |",
  "| decision | ADRs |",
  "| contract | specs |",
  "| runbook | procedures |",
  "| guide | rules |",
  "",
].join("\n");

const MAP_TABLE = [
  "## Map",
  "",
  "| Path | Kind | Notes |",
  "| --- | --- | --- |",
  "| `docs/README.md` | index | the map |",
  "| `docs/adr/` | decision | ADRs |",
  "| `docs/specifications/` | contract | specs |",
  "| `docs/agents/cutover-runbook.md` | runbook | one file |",
  "| `docs/agents/` | guide | rules |",
].join("\n");

const README = `${KINDS_TABLE}\n${MAP_TABLE}\n`;
const FILES = [
  "docs/README.md",
  "docs/adr/0001-x.md",
  "docs/specifications/a.md",
  "docs/agents/cutover-runbook.md",
  "docs/agents/workflow.md",
];

test("METRO-75 parseKinds reads the first cell of the Kinds table only", () => {
  expect(parseKinds(README)).toEqual(["index", "decision", "contract", "runbook", "guide"]);
  expect(parseKinds("## Map\n\n| index | x |\n")).toEqual([]);
});

test("METRO-75 parseKindMap reads path-and-kind rows and ignores other tables and prose", () => {
  const map = parseKindMap(`${README}\n| decision | x |\n`);
  expect(map.get("docs/adr/")).toBe("decision");
  expect(map.get("docs/agents/cutover-runbook.md")).toBe("runbook");
  expect(map.size).toBe(5);
});

test("METRO-75 kindOf prefers the exact file row over the directory row", () => {
  const map = parseKindMap(README);
  expect(kindOf("docs/agents/cutover-runbook.md", map)).toBe("runbook");
  expect(kindOf("docs/agents/workflow.md", map)).toBe("guide");
  expect(kindOf("docs/adr/0001-x.md", map)).toBe("decision");
  expect(kindOf("docs/stray/notes.md", map)).toBeUndefined();
});

test("METRO-75 structureProblems passes on a consistent fixture", () => {
  expect(structureProblems(FILES, README)).toEqual([]);
});

test("METRO-75 structureProblems fails on a file with no kind", () => {
  const problems = structureProblems([...FILES, "docs/stray/notes.md"], README);
  expect(problems.join("\n")).toContain("docs/stray/notes.md");
});

test("METRO-75 a map row may use only a kind defined in the Kinds table", () => {
  const readme = `${README}| \`docs/extra/\` | notes | x |\n`;
  const problems = structureProblems([...FILES, "docs/extra/a.md"], readme);
  expect(problems.join("\n")).toContain('unknown kind "notes"');
});

test("METRO-75 a kind in the Kinds table must be used by some map row", () => {
  const readme = README.replace("| guide | rules |", "| guide | rules |\n| orphan | unused |");
  const problems = structureProblems(FILES, readme);
  expect(problems.join("\n")).toContain('kind "orphan" is defined but no map row uses it');
});

test("METRO-75 structureProblems fails on a row that matches no file", () => {
  expect(structureProblems(["docs/README.md"], README).join("\n")).toContain("docs/adr/");
});

test("METRO-75 structureProblems fails when the README defines no kinds", () => {
  expect(structureProblems(FILES, MAP_TABLE).join("\n")).toContain("no Kinds table");
});

test("METRO-75 checklistProblems flags task-list items, not prose", () => {
  expect(checklistProblems("- [ ] write the thing")).toHaveLength(1);
  expect(checklistProblems("intro\n  * [x] done\n1. [ ] numbered")).toHaveLength(2);
  expect(checklistProblems("- plain bullet\n- see [link](x.md)\n- [text](x.md)")).toEqual([]);
});

test("METRO-75 checklistProblems sees task items inside blockquotes", () => {
  expect(checklistProblems("> - [ ] quoted")).toHaveLength(1);
  expect(checklistProblems("> > * [x] nested quote")).toHaveLength(1);
  expect(checklistProblems("> plain quote with [ ] text")).toEqual([]);
});

test("METRO-75 checklistProblems exempts fenced examples", () => {
  expect(checklistProblems("```md\n- [ ] example in a fence\n```")).toEqual([]);
  expect(checklistProblems("~~~\n- [ ] tilde fence\n~~~\n- [ ] after")).toHaveLength(1);
});

test("METRO-75 a fence with an info string inside a fence does not close it", () => {
  const text = "````md\n```js\n- [ ] still inside\n```\n- [ ] still inside the outer fence\n````\n";
  expect(checklistProblems(text)).toEqual([]);
  const sameLength = "```\n```js\n- [ ] inside\n```\n- [ ] after close\n";
  expect(checklistProblems(sameLength).join("\n")).toContain("line 5");
  expect(checklistProblems(sameLength)).toHaveLength(1);
});

test("METRO-75 a different fence character does not close a fence", () => {
  expect(checklistProblems("```\n~~~\n- [ ] inside\n```\n")).toEqual([]);
  expect(checklistProblems("~~~\n```\n- [ ] inside\n~~~\n")).toEqual([]);
});

test("METRO-75 an unclosed fence is reported instead of exempting the rest", () => {
  const problems = checklistProblems("intro\n```md\n- [ ] hidden\n");
  expect(problems.join("\n")).toContain("unclosed fence");
  expect(problems.join("\n")).toContain("line 2");
});

test("METRO-75 every docs file has a kind in docs/README.md", async () => {
  const readme = await readFile(join(root, "docs/README.md"), "utf8");
  expect(parseKinds(readme).length).toBeGreaterThan(0);
  expect(structureProblems(await filesUnder("docs"), readme)).toEqual([]);
});

test("METRO-75 no specification carries an implementation checklist", async () => {
  const hits: string[] = [];
  for (const file of await filesUnder("docs/specifications"))
    for (const problem of checklistProblems(await readFile(join(root, file), "utf8")))
      hits.push(`${file}: ${problem}`);
  expect(hits).toEqual([]);
});
