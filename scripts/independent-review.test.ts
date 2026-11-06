import { existsSync, readFileSync } from "node:fs";

const read = (path: string): string => readFileSync(path, "utf8");
test("METRO-36 a tracked read-only reviewer definition and checklist exist", () => {
  expect(existsSync("docs/agents/review-checklist.md")).toBe(true);
  const agent = read(".claude/agents/independent-reviewer.md");
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(agent)?.[1] ?? "";
  expect(frontmatter).toMatch(/^name: independent-reviewer$/mu);
  expect(frontmatter).toMatch(/^description: .+/mu);
  expect(frontmatter).toMatch(/^tools: Read, Glob, Grep$/mu);
  expect(frontmatter).not.toMatch(/Write|Edit|Bash|WebFetch|NotebookEdit|Agent/u);
  expect(agent).toContain("docs/agents/review-checklist.md");
});

test("METRO-36 the pull request template asks for the reviewer", () => {
  const template = read(".github/pull_request_template.md");
  expect(template).toMatch(/^## Reviewer\s*$/mu);
  expect(template).toContain("none (docs only)");
});

test("METRO-37 the reviewer definition carries the embedded-instruction rules", () => {
  const agent = read(".claude/agents/independent-reviewer.md");
  expect(agent).toContain("docs/agents/untrusted-input.md");
  expect(agent).toMatch(/quote it/iu);
  expect(agent).toMatch(/defang/iu);
  expect(agent).toMatch(/tell the owner/iu);
});
