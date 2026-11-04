import { expect, test } from "bun:test";
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
