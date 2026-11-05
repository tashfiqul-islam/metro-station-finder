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

test("METRO-36 the docs say exactly what the check proves and cannot prove", () => {
  const definition = section(workflow, "Independent review").toLowerCase();
  for (const term of [
    "carries a reference",
    "cannot prove",
    "that a review happened",
    "setext",
    "32768",
    "crlf",
  ])
    expect(definition).toContain(term);
  expect(read("docs/agents/review-checklist.md").toLowerCase()).toContain("cannot prove");
});

test("METRO-36 the docs say the check is separate and required by both rulesets", () => {
  const definition = section(workflow, "Independent review").toLowerCase();
  for (const term of [".github/workflows/reviewer-record.yml", "ruleset", "stale", "edited"])
    expect(definition).toContain(term);
  expect(definition).not.toContain("visible but not required");
  expect(definition).not.toContain("until the owner adds");
  const gates = read("docs/agents/quality-gates.md");
  expect(gates).toContain("reviewer-record.yml");
  expect(gates).not.toContain("required only after the owner adds");
  expect(gates).not.toContain("`security` and `review`");
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

test("METRO-60 the docs name both required checks and the pull request Reviewer rule", () => {
  const enforcement = section(workflow, "Independent review");
  expect(enforcement).toContain("`Quality gates`");
  expect(enforcement).toContain("`Reviewer record`");
  expect(enforcement).toContain("feature/metro-rebuild");
  expect(enforcement).toContain("`main`");
  expect(enforcement).toContain("26426527");
  expect(enforcement).toContain("26467450");
  expect(enforcement).toMatch(/require both status checks/iu);
  const gates = read("docs/agents/quality-gates.md");
  expect(gates).toContain("`Quality gates`");
  expect(gates).toContain("`Reviewer record`");
  expect(gates).toMatch(/required (status )?check/iu);

  const rules =
    gates.split(/\r?\n/u).find((line) => line.startsWith("External branch rules")) ?? "";
  expect(rules).toContain("`Quality gates`");
  expect(rules).toContain("`Reviewer record`");
  expect(rules).toContain("`feature/metro-rebuild`");
  expect(rules).toContain("`main`");
  expect(enforcement).toContain("15368");
  expect(enforcement).toMatch(
    /`## Reviewer` section carrying a reference \(a URL, a `#<number>` reference, or a `session:` \/ `run:` token\)/u,
  );
  const negative = /Reviewer record[^.]{0,40}not required/iu;
  expect(workflow).not.toMatch(negative);
  expect(gates).not.toMatch(negative);
  const adr = read("docs/adr/0004-supply-chain-and-ci-policy.md");
  expect(adr).toContain("2026-11-05");
  expect(adr).toMatch(/`Quality gates` and `Reviewer record`/u);
});
