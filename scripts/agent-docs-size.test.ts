import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { GUIDE_CAP, ROOT_CAP, guidePaths, sizeProblems } from "./agent-docs-size.ts";

// METRO-86: the root AGENTS.md is a map and each guide stays short. Bytes, not lines, are the budget.
const root = resolve(import.meta.dir, "..");

const README = [
  "## Kinds",
  "",
  "| Kind | What it is |",
  "| --- | --- |",
  "| guide | rules |",
  "| runbook | procedures |",
  "| data | machine-read files |",
  "",
  "## Map",
  "",
  "| Path | Kind | Note |",
  "| --- | --- | --- |",
  "| `docs/agents/` | guide | rules |",
  "| `docs/agents/deploy-runbook.md` | runbook | one file |",
  "| `docs/agents/skills.lock.json` | data | pins |",
  "",
].join("\n");

test("METRO-86 the real root file and every real guide are within their byte caps", async () => {
  const readme = await readFile(join(root, "docs/README.md"), "utf8");
  const names = (await readdir(join(root, "docs/agents"))).map((name) => `docs/agents/${name}`);
  const guides = guidePaths(names, readme);
  expect(guides.length).toBeGreaterThan(5);
  const sized = async (path: string) => ({
    path,
    bytes: (await readFile(join(root, path))).length,
  });
  const problems = sizeProblems(await sized("AGENTS.md"), await Promise.all(guides.map(sized)));
  expect(problems).toEqual([]);
});

test("METRO-86 the real runbooks are exempt and the real guides are found by kind", async () => {
  const readme = await readFile(join(root, "docs/README.md"), "utf8");
  const names = (await readdir(join(root, "docs/agents"))).map((name) => `docs/agents/${name}`);
  const guides = guidePaths(names, readme);
  for (const runbook of [
    "cutover-runbook",
    "deploy-runbook",
    "github-settings",
    "maintenance-runbook",
  ])
    expect(guides).not.toContain(`docs/agents/${runbook}.md`);
  expect(guides).toContain("docs/agents/workflow.md");
  expect(guides).not.toContain("docs/agents/skills.lock.json");
});

test("METRO-86 an oversized root fixture fails and names the cap and the fix", () => {
  const problems = sizeProblems({ path: "AGENTS.md", bytes: ROOT_CAP + 1 }, []);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("AGENTS.md");
  expect(problems[0]).toContain(`${ROOT_CAP + 1} bytes`);
  expect(problems[0]).toContain(`${ROOT_CAP}`);
  expect(problems[0]).toMatch(/move|evidence/iu);
});

test("METRO-86 an oversized guide fixture fails and an exact-cap one passes", () => {
  const ok = { path: "docs/agents/ok.md", bytes: GUIDE_CAP };
  const big = { path: "docs/agents/big.md", bytes: GUIDE_CAP + 1 };
  expect(sizeProblems({ path: "AGENTS.md", bytes: ROOT_CAP }, [ok])).toEqual([]);
  const problems = sizeProblems({ path: "AGENTS.md", bytes: ROOT_CAP }, [ok, big]);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("docs/agents/big.md");
  expect(problems[0]).toContain(`${GUIDE_CAP}`);
});

test("METRO-86 the caps are 8192 and 6144 bytes", () => {
  expect(ROOT_CAP).toBe(8192);
  expect(GUIDE_CAP).toBe(6144);
});

test("METRO-86 a runbook and a data file are exempt but a guide fixture is not", () => {
  const names = [
    "docs/agents/deploy-runbook.md",
    "docs/agents/skills.lock.json",
    "docs/agents/new-guide.md",
    "docs/elsewhere/x.md",
  ];
  expect(guidePaths(names, README)).toEqual(["docs/agents/new-guide.md"]);
});

test("METRO-86 size is counted in bytes, not characters", () => {
  const text = "é".repeat(GUIDE_CAP / 2 + 1);
  expect(text.length).toBeLessThan(GUIDE_CAP);
  expect(
    sizeProblems({ path: "AGENTS.md", bytes: 1 }, [
      { path: "docs/agents/x.md", bytes: new TextEncoder().encode(text).length },
    ]),
  ).toHaveLength(1);
});
