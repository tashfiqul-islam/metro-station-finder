import { readFileSync } from "node:fs";
import { join } from "node:path";

import { checkBaseBranches } from "./base-branch.ts";

/**
 * METRO-34: the written plan must keep the safeguards the independent review asked for. These read
 * the documents, so a later edit that drops a safeguard fails here instead of silently.
 */

const root = join(import.meta.dir, "..");
const read = (file: string): string => readFileSync(join(root, file), "utf8");
const runbook = read("docs/agents/cutover-runbook.md");
const adr = read("docs/adr/0008-default-branch-switch.md");
const policy = read("docs/agents/release-policy.md");

test("METRO-34 the runbook proves the backup bundle is fresh and makes the deletion conditional", () => {
  expect(runbook).toContain("git bundle list-heads");
  expect(runbook).toContain("git ls-remote origin refs/heads/master");
  expect(runbook).toContain("Get-FileHash");
  expect(runbook).toContain("second copy");
  expect(runbook).toMatch(/if \(\$live -ne \$RECORDED[^\n]*\{ throw/u);
  expect(runbook).toContain("--master-sha");
  expect(adr).toContain("list-heads");
});

test("METRO-34 the runbook states what rollback is supported at each stage", () => {
  expect(runbook).toContain("## Rollback by stage");
  for (const stage of ["Stage A", "Stage B", "Stage C"]) expect(runbook).toContain(stage);
  expect(runbook).toContain("not supported");
  expect(runbook).toContain("refs/heads/feature/metro-rebuild -f sha=<MAIN_SHA>");
  expect(runbook).toContain("ruleset-26426527.json");
  expect(adr).toContain("Stage A");
  expect(adr).toContain("Stage C");
  expect(adr).not.toContain("reversible with one call");
});

test("METRO-34 the runbook lists pull requests on the integration branch before it is deleted", () => {
  expect(runbook).toContain("gh pr list --repo $R --state open --base feature/metro-rebuild");
});

test("METRO-34 the rehearsal needs the default switch, uses a throwaway tag and never an rc tag", () => {
  expect(runbook).not.toMatch(/-f tag=v1\.0\.0-rc/u);
  expect(runbook).toContain("v0.0.0-cutover-test");
  expect(runbook).toContain("immutable-releases");
  expect(adr).toContain("workflow file must be on the default branch");
  expect(adr).not.toMatch(/dress rehearsal for the draft-and-sync path/u);
});

test("METRO-34 step 6.4 keeps the phrase the base-branch gate reads, so the gate stays meaningful", async () => {
  expect(runbook).toContain("Owner requires ticket PRs target `main`.");
  const fixtureDocs = {
    "CONTRIBUTING.md": "Open pull requests against `main` now.\n",
    "docs/agents/workflow.md": "Owner requires ticket PRs target `main`.\n",
    "docs/agents/plane.md": "Ticket merges target `main`.\n",
  };
  const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { dirname } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "metro-plan-"));
  try {
    for (const [name, body] of Object.entries(fixtureDocs)) {
      await mkdir(dirname(join(dir, name)), { recursive: true });
      await writeFile(join(dir, name), body);
    }
    expect(await checkBaseBranches(dir)).toEqual([]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("METRO-34 the first scheduled token check is a manual backstop before deleting master", () => {
  expect(runbook).toContain("--event schedule --branch main --status success");
  expect(adr).toContain("first scheduled");
  expect(adr).toContain("owner confirms");
});

test("METRO-34 the quality-gates push-trigger dependency is documented", () => {
  expect(adr).toContain("keeps a push trigger for `feature/metro-rebuild`");
});

test("METRO-34 the policy states its SemVer subset and names the next Plane release", () => {
  expect(policy).toContain("SemVer-compatible subset");
  expect(policy).toContain("v1.1.0");
});

/**
 * METRO-61: the repository is cutover-ready. These read the real files, so a later edit that makes
 * the cutover more than the documented single flip fails here.
 */

const BASE_BRANCH_DOCUMENTS = [
  "CONTRIBUTING.md",
  "docs/agents/workflow.md",
  "docs/agents/plane.md",
  "docs/development.md",
  "docs/agents/maintenance.md",
];

test("METRO-61 Renovate pins no base branch, so it follows the default branch after the switch", () => {
  const config: unknown = Bun.JSON5.parse(read(".github/renovate.json5"));
  expect(JSON.stringify(config)).toContain("minimumReleaseAge");
  expect(JSON.stringify(config)).not.toMatch(/"baseBranch/u);
});

test("METRO-61 the runbook says Renovate needs no edit at the flip and why", () => {
  expect(runbook).toContain("baseBranchPatterns");
  expect(runbook).toContain("default branch");
  expect(runbook).toContain("no Renovate edit");
});

test("METRO-61 every base-branch document points at the cutover runbook", () => {
  for (const file of BASE_BRANCH_DOCUMENTS)
    expect(read(file), file).toContain("cutover-runbook.md");
  for (const file of ["CONTRIBUTING.md", "docs/agents/workflow.md", "docs/agents/plane.md"])
    expect(read(file), file).toContain("step 6.4");
});

test("METRO-61 development.md replaces the transition text with a pointer to ADR-0008", () => {
  const development = read("docs/development.md");
  expect(development).not.toContain("Before the eventual authorized switch");
  expect(development).toContain("## Release-time branch transition");
  expect(development).toContain("0008-default-branch-switch.md");
});

test("METRO-61 quality.yml keeps the feature-branch push trigger and says why", () => {
  const workflow = read(".github/workflows/quality.yml");
  const parsed: unknown = Bun.YAML.parse(workflow);
  const on = Reflect.get(Object(parsed), "on") as unknown;
  const push = Reflect.get(Object(on), "push") as unknown;
  const branches = Reflect.get(Object(push), "branches") as unknown;
  expect(branches).toEqual(["feature/metro-rebuild", "main"]);
  const block = /^ {2}push:\n((?: {4}.*\n)+)/mu.exec(workflow)?.[1] ?? "";
  expect(block).toMatch(/^ {4}#[^\n]*runbook step 6\.3/mu);
});

test("METRO-61 the ADR no longer says a Renovate base branch must change at the switch", () => {
  expect(adr).not.toContain('baseBranchPatterns: ["feature/metro-rebuild"]');
  expect(adr).not.toMatch(/baseBranchPatterns[^\n]{0,200}must change/u);
  expect(adr).toContain("no Renovate edit");
});

test("METRO-61 the runbook separates retiring the branch (6.3) from the 6.4 pull request", () => {
  expect(runbook).toContain("window between");
  expect(runbook).toMatch(/6\.3[^\n]*retires?[^\n]*6\.4|6\.4[^\n]*removes the[^\n]*trigger/u);
});

test("METRO-61 the ADR says the base-branch documents flip at runbook step 6.4", () => {
  expect(adr).toContain("runbook step 6.4");
  expect(adr).toContain("no Renovate edit");
});
