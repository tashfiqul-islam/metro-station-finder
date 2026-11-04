import { expect, test } from "bun:test";

import {
  assertReadOnly,
  formatReport,
  hasFailure,
  realGh,
  runCli,
  runPreflight,
  type Finding,
  type Gh,
  type PreflightOptions,
} from "./cutover-preflight.ts";
import { expectRejection } from "./test-support.ts";

const REPO = "o/r";
const OPTIONS: PreflightOptions = {
  repo: REPO,
  integration: "feature/metro-rebuild",
  tag: "v1.0.0",
};

const GOOD_RULESET = {
  id: 7,
  name: "Rebuild quality gates (main)",
  enforcement: "active",
  conditions: { ref_name: { include: ["refs/heads/main"], exclude: [] } },
  rules: [
    { type: "deletion" },
    { type: "non_fast_forward" },
    { type: "required_signatures" },
    { type: "pull_request" },
    {
      type: "required_status_checks",
      parameters: {
        required_status_checks: [{ context: "Quality gates" }, { context: "Reviewer record" }],
      },
    },
  ],
};

function responses(): Record<string, unknown> {
  return {
    [`api repos/${REPO}`]: { default_branch: "master" },
    [`api repos/${REPO}/branches/main`]: { commit: { sha: "aaa" } },
    [`api repos/${REPO}/branches/master`]: { commit: { sha: "mmm" } },
    [`api repos/${REPO}/branches/feature/metro-rebuild`]: { commit: { sha: "fff" } },
    [`api repos/${REPO}/compare/main...feature/metro-rebuild`]: { status: "ahead", ahead_by: 101 },
    [`api repos/${REPO}/rulesets`]: [{ id: 7 }, { id: 8 }],
    [`api repos/${REPO}/rulesets/7`]: GOOD_RULESET,
    [`api repos/${REPO}/rulesets/8`]: {
      id: 8,
      name: "other",
      enforcement: "active",
      conditions: { ref_name: { include: ["refs/heads/feature/metro-rebuild"], exclude: [] } },
      rules: [],
    },
    [`api repos/${REPO}/commits/fff/check-runs?per_page=100`]: {
      check_runs: [{ name: "Quality gates", status: "completed", conclusion: "success" }],
    },
    [`api repos/${REPO}/git/ref/tags/v1.0.0`]: new Error("gh: Not Found (HTTP 404)"),
    [`api repos/${REPO}/git/ref/tags/v0.0.1`]: { ref: "refs/tags/v0.0.1" },
    [`api repos/${REPO}/git/ref/tags/v0.0.2`]: { ref: "refs/tags/v0.0.2" },
    [`api repos/${REPO}/environments/release/deployment-branch-policies`]: {
      branch_policies: [
        { name: "main", type: "branch" },
        { name: "v*", type: "tag" },
      ],
    },
    [`api repos/${REPO}/pages`]: { build_type: "workflow", html_url: "https://x/y" },
    [`pr list --repo ${REPO} --state open --json number,baseRefName --limit 200`]: [],
  };
}

function fakeGh(overrides: Record<string, unknown> = {}): { gh: Gh; calls: string[][] } {
  const table = { ...responses(), ...overrides };
  const calls: string[][] = [];
  const gh: Gh = (args) => {
    assertReadOnly(args);
    calls.push([...args]);
    const key = args.join(" ");
    if (!(key in table)) return Promise.reject(new Error(`unexpected gh call: ${key}`));
    const value = table[key];
    return value instanceof Error ? Promise.reject(value) : Promise.resolve(JSON.stringify(value));
  };
  return { gh, calls };
}

function find(findings: Finding[], id: string): Finding {
  const found = findings.find((finding) => finding.id === id);
  if (!found) throw new Error(`no finding ${id}; have ${findings.map((f) => f.id).join(", ")}`);
  return found;
}

test("METRO-34 preflight passes every verifiable precondition and leaves the ticket checks manual", async () => {
  const { gh } = fakeGh();
  const findings = await runPreflight(gh, OPTIONS);
  expect(findings.filter((f) => f.status === "fail")).toEqual([]);
  expect(hasFailure(findings)).toBe(false);
  expect(find(findings, "main-fast-forward").status).toBe("pass");
  expect(find(findings, "main-ruleset").status).toBe("pass");
  expect(find(findings, "quality-gates-green").status).toBe("pass");
  expect(find(findings, "release-tag-free").status).toBe("pass");
  expect(find(findings, "release-environment").status).toBe("pass");
  expect(find(findings, "legacy-tags").status).toBe("pass");
  expect(find(findings, "ready-tickets").status).toBe("manual");
  expect(find(findings, "default-branch").detail).toContain("master");
  expect(find(findings, "master-sha").detail).toContain("mmm");
  expect(find(findings, "pages").status).toBe("info");
});

test("METRO-34 preflight only issues read-only gh calls", async () => {
  const { gh, calls } = fakeGh();
  await runPreflight(gh, OPTIONS);
  expect(calls.length).toBeGreaterThan(8);
  for (const args of calls) {
    expect(["api", "pr"]).toContain(args[0] ?? "");
    expect(args.join(" ")).not.toMatch(/-X|--method|--input|-f |-F |--field|--raw-field/u);
  }
});

test("METRO-34 the read-only guard rejects writes and unknown commands", () => {
  for (const args of [
    ["api", "repos/o/r", "-X", "PATCH"],
    ["api", "repos/o/r", "--method", "DELETE"],
    ["api", "repos/o/r", "--method=DELETE"],
    ["api", "repos/o/r", "-XDELETE"],
    ["api", "repos/o/r", "-f", "default_branch=main"],
    ["api", "repos/o/r", "-F", "a=b"],
    ["api", "repos/o/r", "--field", "a=b"],
    ["api", "repos/o/r", "--raw-field", "a=b"],
    ["api", "repos/o/r", "--input", "body.json"],
    ["pr", "edit", "1", "--base", "main"],
    ["pr", "merge", "1"],
    ["release", "create", "v1.0.0"],
    ["repo", "delete", "o/r"],
    [],
  ]) {
    expect(() => assertReadOnly(args)).toThrow();
  }
  expect(() => assertReadOnly(["api", "repos/o/r"])).not.toThrow();
  expect(() => assertReadOnly(["pr", "list", "--repo", "o/r"])).not.toThrow();
});

test("METRO-34 preflight fails when main is not an ancestor of the integration branch", async () => {
  const { gh } = fakeGh({
    [`api repos/${REPO}/compare/main...feature/metro-rebuild`]: { status: "diverged", ahead_by: 3 },
  });
  const findings = await runPreflight(gh, OPTIONS);
  expect(find(findings, "main-fast-forward").status).toBe("fail");
  expect(hasFailure(findings)).toBe(true);
});

test("METRO-34 preflight fails when main does not exist", async () => {
  const { gh } = fakeGh({
    [`api repos/${REPO}/branches/main`]: new Error("gh: Not Found (HTTP 404)"),
    [`api repos/${REPO}/compare/main...feature/metro-rebuild`]: new Error(
      "gh: Not Found (HTTP 404)",
    ),
  });
  const findings = await runPreflight(gh, OPTIONS);
  expect(find(findings, "main-exists").status).toBe("fail");
  expect(find(findings, "main-fast-forward").status).toBe("fail");
});

test("METRO-34 preflight fails when the main ruleset is not active or lacks a required rule", async () => {
  for (const mutate of [
    { ...GOOD_RULESET, enforcement: "evaluate" },
    { ...GOOD_RULESET, rules: GOOD_RULESET.rules.filter((r) => r.type !== "required_signatures") },
    { ...GOOD_RULESET, rules: GOOD_RULESET.rules.filter((r) => r.type !== "deletion") },
    {
      ...GOOD_RULESET,
      rules: GOOD_RULESET.rules.map((r) =>
        r.type === "required_status_checks"
          ? { type: r.type, parameters: { required_status_checks: [{ context: "Other" }] } }
          : r,
      ),
    },
    { ...GOOD_RULESET, conditions: { ref_name: { include: ["refs/heads/other"], exclude: [] } } },
  ]) {
    const { gh } = fakeGh({ [`api repos/${REPO}/rulesets/7`]: mutate });
    const findings = await runPreflight(gh, OPTIONS);
    expect(find(findings, "main-ruleset").status).toBe("fail");
  }
});

test("METRO-34 preflight fails when Quality gates is not green on the integration head", async () => {
  for (const runs of [
    [{ name: "Quality gates", status: "completed", conclusion: "failure" }],
    [{ name: "Quality gates", status: "in_progress", conclusion: null }],
    [{ name: "Checks", status: "completed", conclusion: "success" }],
    [],
  ]) {
    const { gh } = fakeGh({
      [`api repos/${REPO}/commits/fff/check-runs?per_page=100`]: { check_runs: runs },
    });
    const findings = await runPreflight(gh, OPTIONS);
    expect(find(findings, "quality-gates-green").status).toBe("fail");
  }
});

test("METRO-34 preflight fails when the release tag already exists", async () => {
  const { gh } = fakeGh({ [`api repos/${REPO}/git/ref/tags/v1.0.0`]: { ref: "refs/tags/v1.0.0" } });
  const findings = await runPreflight(gh, OPTIONS);
  expect(find(findings, "release-tag-free").status).toBe("fail");
});

test("METRO-34 preflight fails when the release tag is not valid SemVer with a v prefix", async () => {
  const { gh } = fakeGh();
  const findings = await runPreflight(gh, { ...OPTIONS, tag: "1.0" });
  expect(find(findings, "release-tag-valid").status).toBe("fail");
});

test("METRO-34 preflight fails when the release environment does not allow main or v* tags", async () => {
  for (const policies of [[{ name: "v*", type: "tag" }], [{ name: "main", type: "branch" }], []]) {
    const { gh } = fakeGh({
      [`api repos/${REPO}/environments/release/deployment-branch-policies`]: {
        branch_policies: policies,
      },
    });
    const findings = await runPreflight(gh, OPTIONS);
    expect(find(findings, "release-environment").status).toBe("fail");
  }
});

test("METRO-34 preflight fails when a legacy release tag is missing", async () => {
  const { gh } = fakeGh({
    [`api repos/${REPO}/git/ref/tags/v0.0.2`]: new Error("gh: Not Found (HTTP 404)"),
  });
  const findings = await runPreflight(gh, OPTIONS);
  expect(find(findings, "legacy-tags").status).toBe("fail");
});

test("METRO-34 preflight reports open pull requests by base without failing", async () => {
  const { gh } = fakeGh({
    [`pr list --repo ${REPO} --state open --json number,baseRefName --limit 200`]: [
      { number: 5, baseRefName: "master" },
      { number: 6, baseRefName: "feature/metro-rebuild" },
    ],
  });
  const findings = await runPreflight(gh, OPTIONS);
  const prs = find(findings, "open-pull-requests");
  expect(prs.status).toBe("info");
  expect(prs.detail).toContain("#5");
  expect(prs.detail).toContain("master");
});

test("METRO-34 preflight turns an unexpected gh failure into a visible failure, not a crash", async () => {
  const { gh } = fakeGh({
    [`api repos/${REPO}/rulesets`]: new Error("gh: HTTP 500 server error"),
  });
  const findings = await runPreflight(gh, OPTIONS);
  const ruleset = find(findings, "main-ruleset");
  expect(ruleset.status).toBe("fail");
  expect(ruleset.detail).toContain("500");
});

test("METRO-34 preflight fails when the repository default is already not master", async () => {
  const { gh } = fakeGh({ [`api repos/${REPO}`]: { default_branch: "main" } });
  const findings = await runPreflight(gh, OPTIONS);
  expect(find(findings, "default-branch").status).toBe("fail");
});

test("METRO-34 the real gh runner refuses a write before starting any process", async () => {
  await expectRejection(realGh(["pr", "merge", "1"]), "read-only");
  await expectRejection(realGh(["api", "repos/o/r", "-X", "DELETE"]), "read-only");
});

test("METRO-34 the command prints the report and sets the exit code from the findings", async () => {
  const lines: string[] = [];
  const originalLog = console.log;
  const previous = process.exitCode;
  console.log = (line: string) => void lines.push(line);
  try {
    process.exitCode = 0;
    await runCli(["--repo", REPO, "--tag", "v1.0.0"], fakeGh().gh);
    expect(process.exitCode).toBe(0);
    expect(lines.join("\n")).toContain("Result: no failures");
    await runCli(["--repo", REPO, "--tag", "nope"], fakeGh().gh);
    expect(process.exitCode).toBe(1);
  } finally {
    console.log = originalLog;
    process.exitCode = previous;
  }
});

test("METRO-34 the command rejects an option without a value", async () => {
  await expectRejection(runCli(["--tag"], fakeGh().gh), "--tag needs a value");
});

test("METRO-34 the report lists every finding and manual items are not shown as passes", async () => {
  const { gh } = fakeGh();
  const findings = await runPreflight(gh, OPTIONS);
  const report = formatReport(findings);
  for (const finding of findings) expect(report).toContain(finding.id);
  expect(report).toMatch(/MANUAL\s+ready-tickets/u);
  expect(report).toContain("PASS");
  expect(report).toContain("Result: no failures");
  const failing = formatReport([{ id: "x", status: "fail", title: "t", detail: "d" }]);
  expect(failing).toContain("Result: 1 failure");
});
