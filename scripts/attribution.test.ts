import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = (path: string) => readFile(resolve(path), "utf8");

test("METRO-52 the attribution policy states the trailer, the Signed-off-by rule, the footer and merge methods", async () => {
  const policy = await read("docs/agents/attribution.md");
  for (const needle of [
    "Co-Authored-By: <agent name and model> <noreply@anthropic.com>",
    "Agents never add `Signed-off-by`",
    "Generated with [Claude Code](https://claude.com/claude-code)",
    "Merge commit",
    "Rebase and merge",
    "Squash and merge",
    "scripts/commit-message.ts",
  ])
    expect(policy, needle).toContain(needle);
});

test("METRO-52 workflow, quality gates and CONTRIBUTING link the attribution policy", async () => {
  expect(await read("docs/agents/workflow.md")).toContain("(attribution.md)");
  expect(await read("docs/agents/quality-gates.md")).toContain("(attribution.md)");
  expect(await read("CONTRIBUTING.md")).toContain("(docs/agents/attribution.md)");
});
