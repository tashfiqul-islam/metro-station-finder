import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  KINDS,
  checklistProblems,
  kindOf,
  parseKindMap,
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

const MAP = [
  "| Path | Kind | Notes |",
  "| --- | --- | --- |",
  "| `docs/README.md` | index | the map |",
  "| `docs/adr/` | decision | ADRs |",
  "| `docs/specifications/` | contract | specs |",
  "| `docs/agents/cutover-runbook.md` | runbook | one file |",
  "| `docs/agents/` | guide | rules |",
].join("\n");

test("METRO-75 parseKindMap reads path-and-kind rows and ignores other tables and prose", () => {
  const map = parseKindMap(`${MAP}\n\n| Kind | Meaning |\n| --- | --- |\n| decision | x |\n`);
  expect(map.get("docs/adr/")).toBe("decision");
  expect(map.get("docs/agents/cutover-runbook.md")).toBe("runbook");
  expect(map.size).toBe(5);
});

test("METRO-75 kindOf prefers the exact file row over the directory row", () => {
  const map = parseKindMap(MAP);
  expect(kindOf("docs/agents/cutover-runbook.md", map)).toBe("runbook");
  expect(kindOf("docs/agents/workflow.md", map)).toBe("guide");
  expect(kindOf("docs/adr/0001-x.md", map)).toBe("decision");
  expect(kindOf("docs/stray/notes.md", map)).toBeUndefined();
});

test("METRO-75 structureProblems fails on a file with no kind", () => {
  const problems = structureProblems(["docs/README.md", "docs/stray/notes.md"], MAP);
  expect(problems.join("\n")).toContain("docs/stray/notes.md");
});

test("METRO-75 structureProblems fails on an unknown kind and on a row that matches nothing", () => {
  const unknownKind = `${MAP}\n| \`docs/extra/\` | notes | x |`;
  expect(structureProblems(["docs/extra/a.md"], unknownKind).join("\n")).toContain("notes");
  expect(structureProblems(["docs/README.md"], MAP).join("\n")).toContain("docs/adr/");
});

test("METRO-75 checklistProblems flags task-list items, not prose or fenced examples", () => {
  expect(checklistProblems("- [ ] write the thing")).toHaveLength(1);
  expect(checklistProblems("intro\n  * [x] done\n1. [ ] numbered")).toHaveLength(2);
  expect(checklistProblems("- plain bullet\n- see [link](x.md)\n- [text](x.md)")).toEqual([]);
  expect(checklistProblems("```md\n- [ ] example in a fence\n```")).toEqual([]);
});

test("METRO-75 every docs file has a kind in docs/README.md", async () => {
  const readme = await readFile(join(root, "docs/README.md"), "utf8");
  expect(KINDS.length).toBeGreaterThan(0);
  expect(structureProblems(await filesUnder("docs"), readme)).toEqual([]);
});

test("METRO-75 no specification carries an implementation checklist", async () => {
  const hits: string[] = [];
  for (const file of await filesUnder("docs/specifications"))
    for (const problem of checklistProblems(await readFile(join(root, file), "utf8")))
      hits.push(`${file}: ${problem}`);
  expect(hits).toEqual([]);
});
