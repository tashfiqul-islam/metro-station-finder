import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

const read = (path: string): string => readFileSync(path, "utf8");
const workflow = read("docs/agents/workflow.md");

function section(text: string, heading: string): string {
  const start = text.indexOf(`## ${heading}`);
  if (start === -1) return "";
  const next = text.indexOf("\n## ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

test("METRO-36 workflow.md defines the independent reviewer precisely", () => {
  const definition = section(workflow, "Independent review").toLowerCase();
  for (const term of [
    "fresh context",
    "read-only",
    "does not see the implementer's reasoning",
    "different session",
    "committed diff",
    "critical",
    "important",
    "minor",
    "evidence",
    "could not verify",
    "reports are leads",
    "fixed",
    "disproved",
    "accepted",
    "deferred",
    "docs-only",
    "none (docs only)",
    "owner",
  ])
    expect(definition).toContain(term);
});

test("METRO-36 the rule is at least as strict as the earlier applicable review rule", () => {
  const definition = section(workflow, "Independent review");
  expect(definition).toContain("before merge");
  expect(definition).toMatch(/applicable independent review/u);
  expect(definition).toMatch(/not weaker/u);
});

test("METRO-36 the open owner-review decision is documented and not decided", () => {
  const definition = section(workflow, "Independent review");
  expect(definition).toMatch(/open decision/iu);
  expect(definition).toContain("owner directs merges");
});

test("METRO-36 the review rule points to the one definition", () => {
  for (const file of ["docs/agents/skills.md", "docs/agents/maintenance.md"])
    expect(read(file)).toContain("workflow.md#independent-review");
  expect(read("docs/agents/quality-gates.md")).toContain("Reviewer record");
});

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
