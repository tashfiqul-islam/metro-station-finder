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
    {
      type: "pull_request",
      parameters: { required_approving_review_count: 0, require_code_owner_review: false },
    },
    {
      type: "required_status_checks",
      parameters: {
        required_status_checks: [{ context: "Quality gates" }, { context: "Reviewer record" }],
      },
    },
  ],
};

const FEATURE_RULESET = {
  id: 8,
  name: "other",
  enforcement: "active",
  conditions: { ref_name: { include: ["refs/heads/feature/metro-rebuild"], exclude: [] } },
  rules: [
    {
      type: "required_status_checks",
      parameters: {
        required_status_checks: [{ context: "Quality gates" }, { context: "Reviewer record" }],
      },
    },
  ],
};

const COMPARE = `api repos/${REPO}/compare/main...feature/metro-rebuild?per_page=100&page=1`;

function withoutReviewer(ruleset: typeof GOOD_RULESET | typeof FEATURE_RULESET) {
  return {
    ...ruleset,
    rules: ruleset.rules.map((rule) =>
      rule.type === "required_status_checks"
        ? {
            type: rule.type,
            parameters: { required_status_checks: [{ context: "Quality gates" }] },
          }
        : rule,
    ),
  };
}

function commit(sha: string, verified: boolean): Record<string, unknown> {
  return { sha, commit: { verification: { verified } } };
}

function responses(): Record<string, unknown> {
  return {
    [`api repos/${REPO}`]: { default_branch: "master" },
    [`api repos/${REPO}/branches/main`]: { commit: { sha: "aaa" } },
    [`api repos/${REPO}/branches/master`]: { commit: { sha: "mmm" } },
    [`api repos/${REPO}/branches/feature/metro-rebuild`]: { commit: { sha: "fff" } },
    [COMPARE]: {
      status: "ahead",
      ahead_by: 2,
      commits: [commit("1111111111aaaa", true), commit("2222222222bbbb", true)],
    },
    [`api repos/${REPO}/immutable-releases`]: { enabled: false, enforced_by_owner: false },
    [`api repos/${REPO}/rulesets`]: [{ id: 7 }, { id: 8 }],
    [`api repos/${REPO}/rulesets/7`]: GOOD_RULESET,
    [`api repos/${REPO}/rulesets/8`]: FEATURE_RULESET,
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
  // Independent of assertReadOnly: only `gh api repos/...` or `gh pr list`, and no flag except
  // --repo/--state/--json/--limit on the list.
  const apiCalls = calls.filter((args) => args[0] === "api");
  const listCalls = calls.filter((args) => args[0] !== "api");
  expect(apiCalls.map((args) => args.length)).toEqual(apiCalls.map(() => 2));
  expect(apiCalls.filter((args) => !(args[1] ?? "").startsWith("repos/"))).toEqual([]);
  expect(listCalls.map((args) => args.slice(0, 2))).toEqual(listCalls.map(() => ["pr", "list"]));
  expect(listCalls.map((args) => args.filter((arg) => arg.startsWith("-")))).toEqual(
    listCalls.map(() => ["--repo", "--state", "--json", "--limit"]),
  );
});

test("METRO-34 every call the preflight makes is accepted by the read-only guard", async () => {
  const { gh, calls } = fakeGh();
  await runPreflight(gh, OPTIONS);
  for (const args of calls) expect(() => assertReadOnly(args)).not.toThrow();
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
    ["api", "repos/o/r", "-fa=b"],
    ["api", "repos/o/r", "-f=a=b"],
    ["api", "repos/o/r", "-F=a"],
    ["api", "repos/o/r", "-Fa=b"],
    ["api", "repos/o/r", "-H", "X-Http-Method-Override: DELETE"],
    ["api", "repos/o/r", "--header=X-A: b"],
    ["api", "repos/o/r", "--hostname", "evil.example"],
    ["api", "repos/o/r", "--paginate", "--silent"],
    ["api", "graphql"],
    ["api", "user"],
    ["api", "repos/o/r", "repos/o/s"],
    ["api"],
    ["api", "repos/o/r", "--jq"],
    ["api", "repos/o/r", "--jq", "-x"],
    ["pr", "list", "--repo=o/r"],
    ["pr", "list", "--web"],
    ["pr", "list", "-R", "o/r"],
    ["pr", "list", "extra"],
    ["pr", "edit", "1", "--base", "main"],
    ["pr", "merge", "1"],
    ["release", "create", "v1.0.0"],
    ["repo", "delete", "o/r"],
    [],
  ]) {
    expect(() => assertReadOnly(args)).toThrow(
      `cutover-preflight is read-only; refusing gh ${args.join(" ")}`,
    );
  }
  expect(() => assertReadOnly(["api", "repos/o/r"])).not.toThrow();
  expect(() =>
    assertReadOnly(["api", "repos/o/r/compare/a...b?per_page=100&page=2"]),
  ).not.toThrow();
  expect(() => assertReadOnly(["api", "repos/o/r/rulesets", "--jq", ".[].id"])).not.toThrow();
  expect(() =>
    assertReadOnly(["api", "repos/o/r/rulesets", "-q", ".[].id", "--paginate"]),
  ).not.toThrow();
  expect(() => assertReadOnly(["pr", "list", "--repo", "o/r"])).not.toThrow();
});

test("METRO-34 preflight fails when main is not an ancestor of the integration branch", async () => {
  const { gh } = fakeGh({
    [COMPARE]: { status: "diverged", ahead_by: 3, commits: [] },
  });
  const findings = await runPreflight(gh, OPTIONS);
  expect(find(findings, "main-fast-forward").status).toBe("fail");
  expect(hasFailure(findings)).toBe(true);
});

test("METRO-34 preflight fails when main does not exist", async () => {
  const { gh } = fakeGh({
    [`api repos/${REPO}/branches/main`]: new Error("gh: Not Found (HTTP 404)"),
    [COMPARE]: new Error("gh: Not Found (HTTP 404)"),
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

test("METRO-34 preflight refuses a tag, repository or branch that would change an API path", async () => {
  const { gh, calls } = fakeGh();
  for (const bad of [
    { tag: "1.0" },
    { tag: "v1.0.0/../x" },
    { repo: "o/r/../../user" },
    { repo: "o r" },
    { repo: "or" },
    { repo: "o/r?x=1" },
    { integration: "a..b" },
    { integration: "-x" },
    { integration: "a?b" },
    { integration: "" },
    { recordedMasterSha: "abc" },
  ])
    await expectRejection(runPreflight(gh, { ...OPTIONS, ...bad }));
  expect(calls).toEqual([]);
});

test("METRO-34 preflight fails when Quality gates has no run on the head and says how to get one", async () => {
  const { gh } = fakeGh({
    [`api repos/${REPO}/commits/fff/check-runs?per_page=100`]: { check_runs: [] },
  });
  const detail = find(await runPreflight(gh, OPTIONS), "quality-gates-green").detail;
  expect(detail).toContain("pull request to main");
  expect(detail).toContain("push trigger");
});

test("METRO-34 preflight accepts the Quality gates run of the pull request to main on the head commit", async () => {
  // A run started by the pull_request event attaches to the head SHA like a push run does.
  const { gh } = fakeGh({
    [`api repos/${REPO}/commits/fff/check-runs?per_page=100`]: {
      check_runs: [
        {
          name: "Quality gates",
          status: "completed",
          conclusion: "success",
          app: { slug: "github-actions" },
        },
      ],
    },
  });
  expect(find(await runPreflight(gh, OPTIONS), "quality-gates-green").status).toBe("pass");
});

test("METRO-34 preflight fails and names every unverified commit between main and the integration branch", async () => {
  const { gh } = fakeGh({
    [COMPARE]: {
      status: "ahead",
      ahead_by: 3,
      commits: [
        commit("aaaaaaaaaaaa", true),
        commit("bbbbbbbbbbbb", false),
        { sha: "cccccccccccc" },
      ],
    },
  });
  const verified = find(await runPreflight(gh, OPTIONS), "commits-verified");
  expect(verified.status).toBe("fail");
  expect(verified.detail).toContain("bbbbbbbbb");
  expect(verified.detail).toContain("ccccccccc");
  expect(verified.detail).not.toContain("aaaaaaaaa");
});

test("METRO-34 preflight reads every page of the comparison and fails when commits cannot be listed", async () => {
  const hundred = Array.from({ length: 100 }, (_, index) => commit(`sha${String(index)}`, true));
  const { gh, calls } = fakeGh({
    [COMPARE]: { status: "ahead", ahead_by: 104, commits: hundred },
    [`api repos/${REPO}/compare/main...feature/metro-rebuild?per_page=100&page=2`]: {
      status: "ahead",
      ahead_by: 104,
      commits: [
        commit("p2a", true),
        commit("p2b", true),
        commit("p2c", true),
        commit("p2d", false),
      ],
    },
  });
  const verified = find(await runPreflight(gh, OPTIONS), "commits-verified");
  expect(verified.status).toBe("fail");
  expect(verified.detail).toContain("p2d");
  expect(calls.some((args) => args.join(" ").endsWith("page=2"))).toBe(true);

  const short = fakeGh({
    [COMPARE]: { status: "ahead", ahead_by: 1200, commits: hundred },
  }).gh;
  expect(find(await runPreflight(short, OPTIONS), "commits-verified").status).toBe("fail");
});

test("METRO-34 preflight reports the approvals the main ruleset requires", async () => {
  const { gh } = fakeGh();
  const approvals = find(await runPreflight(gh, OPTIONS), "main-approvals");
  expect(approvals.status).toBe("info");
  expect(approvals.detail).toContain("required_approving_review_count 0");
  expect(approvals.detail).toContain("require_code_owner_review false");
});

test("METRO-34 preflight fails when Reviewer record is not required on main or on the integration branch", async () => {
  for (const [id, ruleset, branch] of [
    [7, withoutReviewer(GOOD_RULESET), "refs/heads/main"],
    [8, withoutReviewer(FEATURE_RULESET), "refs/heads/feature/metro-rebuild"],
  ] as const) {
    const { gh } = fakeGh({ [`api repos/${REPO}/rulesets/${String(id)}`]: ruleset });
    const finding = find(await runPreflight(gh, OPTIONS), "reviewer-record-required");
    expect(finding.status).toBe("fail");
    expect(finding.detail).toContain(branch);
  }
});

test("METRO-34 preflight reports immutable releases and treats a 404 as off", async () => {
  const on = fakeGh({
    [`api repos/${REPO}/immutable-releases`]: { enabled: true, enforced_by_owner: false },
  }).gh;
  expect(find(await runPreflight(on, OPTIONS), "immutable-releases").status).toBe("info");
  const absent = fakeGh({
    [`api repos/${REPO}/immutable-releases`]: new Error("gh: Not Found (HTTP 404)"),
  }).gh;
  expect(find(await runPreflight(absent, OPTIONS), "immutable-releases").status).toBe("pass");
  const off = find(await runPreflight(fakeGh().gh, OPTIONS), "immutable-releases");
  expect(off.status).toBe("pass");
});

test("METRO-34 preflight compares the live master head with the recorded SHA", async () => {
  const live = "a".repeat(40);
  const same = fakeGh({ [`api repos/${REPO}/branches/master`]: { commit: { sha: live } } }).gh;
  expect(
    find(await runPreflight(same, { ...OPTIONS, recordedMasterSha: live }), "master-sha").status,
  ).toBe("pass");
  const moved = find(
    await runPreflight(same, { ...OPTIONS, recordedMasterSha: "b".repeat(40) }),
    "master-sha",
  );
  expect(moved.status).toBe("fail");
  expect(moved.detail).toContain("stale");
});

test("METRO-34 only gh's 'HTTP 404' counts as absent, never other text containing 404 or 'not found'", async () => {
  for (const text of [
    "gh: Server Error (HTTP 500) while reading 404 items",
    "repository not found in the local cache",
    "gh: Forbidden (HTTP 403)",
  ]) {
    const { gh } = fakeGh({ [`api repos/${REPO}/git/ref/tags/v1.0.0`]: new Error(text) });
    const findings = await runPreflight(gh, OPTIONS);
    const finding = find(findings, "release-tag-free");
    expect(finding.status).toBe("fail");
    expect(finding.detail).toContain("could not be checked");
  }
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
    await runCli(["--repo", REPO, "--tag", "v1.0.0", "--master-sha", "c".repeat(40)], fakeGh().gh);
    expect(process.exitCode).toBe(1);
    await expectRejection(runCli(["--repo", REPO, "--tag", "nope"], fakeGh().gh), "Tag must");
  } finally {
    console.log = originalLog;
    process.exitCode = previous ?? 0;
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
