import { expect, test } from "bun:test";

import { type SettingsInput, evaluateSettings, runProductionCli } from "./production";
import { expectRejection } from "./test-support";

const OWNER_ID = 4242;
const owner = { login: "tashfiqul-islam", id: OWNER_ID, type: "User" };
const reviewerEntry = (id: number, login: string, type = "User") => ({
  type,
  reviewer: { id, login, type },
});
const environmentWith = (entries: unknown[], extra: object = {}) => ({
  can_admins_bypass: true,
  protection_rules: [{ type: "required_reviewers", reviewers: entries }],
  deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  ...extra,
});
const secretsOf = (...names: string[]) => ({
  total_count: names.length,
  secrets: names.map((name) => ({ name })),
});
const variablesOf = (...names: string[]) => ({
  total_count: names.length,
  variables: names.map((name) => ({ name })),
});
const policiesOf = (...entries: [string, string][]) => ({
  total_count: entries.length,
  branch_policies: entries.map(([name, type]) => ({ name, type })),
});

const truncated = (total: number, key: "secrets" | "variables") => ({
  total_count: total,
  [key]: Array.from({ length: 3 }, (_, i) => ({ name: `NAME_${i}` })),
});

const goodSettings = (): SettingsInput => ({
  owner,
  environment: environmentWith([reviewerEntry(OWNER_ID, "tashfiqul-islam")]),
  policies: policiesOf(["v*", "tag"], ["main", "branch"]),
  repoSecrets: secretsOf("PLANE_API_KEY"),
  repoVariables: variablesOf("PRODUCTION_URL"),
  organizationSecrets: secretsOf(),
  organizationVariables: variablesOf(),
  environmentSecrets: secretsOf("CLOUDFLARE_API_TOKEN"),
  environmentVariables: variablesOf("CLOUDFLARE_ACCOUNT_ID"),
});

test("METRO-57 the settings check passes for the intended configuration and reports admin bypass", () => {
  const result = evaluateSettings(goodSettings());
  expect(result.ok).toBe(true);
  expect(result.lines.every((line) => line.startsWith("PASS "))).toBe(true);
  expect(result.lines.join("\n")).toContain("PASS admin bypass: can_admins_bypass=true");
  expect(result.lines).toHaveLength(12);
});

test("METRO-57 only the owner as a User, matched by id, may be the required reviewer", () => {
  const cases: [string, unknown[], string][] = [
    ["none", [], "required reviewer"],
    ["wrong id", [reviewerEntry(1, "tashfiqul-islam")], "required reviewer"],
    ["wrong login", [reviewerEntry(OWNER_ID, "someone")], "required reviewer"],
    [
      "owner and a team",
      [reviewerEntry(OWNER_ID, "tashfiqul-islam"), reviewerEntry(77, "", "Team")],
      "Team",
    ],
    ["a team only", [{ type: "Team", reviewer: { id: OWNER_ID, slug: "x" } }], "required reviewer"],
    [
      "owner and another user",
      [reviewerEntry(OWNER_ID, "tashfiqul-islam"), reviewerEntry(9, "other")],
      "required reviewer",
    ],
    ["malformed entry", ["x"], "required reviewer"],
  ];
  for (const [, entries, text] of cases) {
    const result = evaluateSettings({ ...goodSettings(), environment: environmentWith(entries) });
    expect(result.ok).toBe(false);
    expect(result.lines.filter((line) => line.startsWith("FAIL ")).join("\n")).toContain(text);
  }
  const unresolved = evaluateSettings({ ...goodSettings(), owner: null });
  expect(unresolved.ok).toBe(false);
  expect(unresolved.lines.join("\n")).toContain("FAIL required reviewer");
});

test("METRO-57 the settings check fails for each missing or unsafe setting", () => {
  const cases: [string, Partial<SettingsInput>, string][] = [
    [
      "no custom policies",
      {
        environment: environmentWith([reviewerEntry(OWNER_ID, "tashfiqul-islam")], {
          deployment_branch_policy: null,
        }),
      },
      "custom",
    ],
    ["no tag policy", { policies: policiesOf(["main", "branch"]) }, "v*"],
    ["no main policy", { policies: policiesOf(["v*", "tag"]) }, "main"],
    [
      "extra policy",
      { policies: policiesOf(["v*", "tag"], ["main", "branch"], ["*", "branch"]) },
      "unexpected",
    ],
    ["repo token", { repoSecrets: secretsOf("CLOUDFLARE_API_TOKEN") }, "no repository secret"],
    [
      "repo token variable",
      { repoVariables: variablesOf("CLOUDFLARE_API_TOKEN") },
      "no repository variable",
    ],
    [
      "repo account id",
      { repoVariables: variablesOf("CLOUDFLARE_ACCOUNT_ID") },
      "no repository variable",
    ],
    [
      "org token",
      { organizationSecrets: secretsOf("CLOUDFLARE_API_TOKEN") },
      "no organization secret",
    ],
    [
      "org variable",
      { organizationVariables: variablesOf("CLOUDFLARE_ACCOUNT_ID") },
      "no organization variable",
    ],
    ["no environment token", { environmentSecrets: secretsOf() }, "environment secret"],
    ["no environment account", { environmentVariables: variablesOf() }, "environment variable"],
    ["garbage policies", { policies: "nope" }, "policies"],
    [
      "admin bypass unreported",
      {
        environment: environmentWith([reviewerEntry(OWNER_ID, "tashfiqul-islam")], {
          can_admins_bypass: "yes",
        }),
      },
      "admin bypass",
    ],
  ];
  for (const [, change, text] of cases) {
    const result = evaluateSettings({ ...goodSettings(), ...change });
    expect(result.ok).toBe(false);
    expect(result.lines.filter((line) => line.startsWith("FAIL ")).join("\n")).toContain(text);
  }
});

test("METRO-57 an incomplete page never passes: a Cloudflare name may sit beyond the first page", () => {
  const cases: [Partial<SettingsInput>, string][] = [
    [{ repoSecrets: truncated(150, "secrets") }, "no repository secret"],
    [{ repoVariables: truncated(150, "variables") }, "no repository variable"],
    [{ organizationSecrets: truncated(150, "secrets") }, "no organization secret"],
    [{ organizationVariables: truncated(150, "variables") }, "no organization variable"],
    [{ environmentSecrets: truncated(150, "secrets") }, "environment secret"],
    [{ environmentVariables: truncated(150, "variables") }, "environment variable"],
    [
      {
        policies: {
          total_count: 150,
          branch_policies: [
            { name: "v*", type: "tag" },
            { name: "main", type: "branch" },
          ],
        },
      },
      "policies",
    ],
  ];
  for (const [change, text] of cases) {
    const result = evaluateSettings({ ...goodSettings(), ...change });
    expect(result.ok).toBe(false);
    const failures = result.lines.filter((line) => line.startsWith("FAIL ")).join("\n");
    expect(failures).toContain(text);
    expect(failures).toContain("incomplete");
  }
});

function fakeGh(overrides: Record<string, unknown> = {}) {
  const good = goodSettings();
  const answers: Record<string, unknown> = {
    "users/tashfiqul-islam": good.owner,
    "repos/o/r/environments/production": good.environment,
    "repos/o/r/environments/production/deployment-branch-policies?per_page=100": good.policies,
    "repos/o/r/actions/secrets?per_page=100": good.repoSecrets,
    "repos/o/r/actions/variables?per_page=100": good.repoVariables,
    "repos/o/r/actions/organization-secrets?per_page=100": good.organizationSecrets,
    "repos/o/r/actions/organization-variables?per_page=100": good.organizationVariables,
    "repos/o/r/environments/production/secrets?per_page=100": good.environmentSecrets,
    "repos/o/r/environments/production/variables?per_page=100": good.environmentVariables,
    ...overrides,
  };
  const calls: string[][] = [];
  const gh = (args: readonly string[]): string => {
    calls.push([...args]);
    const answer = answers[args[1] ?? ""];
    if (answer === undefined) throw new Error("HTTP 404: not found");
    if (answer instanceof Error) throw answer;
    return JSON.stringify(answer);
  };
  return { gh, calls };
}

test("METRO-57 check-settings makes nine read-only gh api calls and prints PASS lines", async () => {
  const { gh, calls } = fakeGh();
  const output = await runProductionCli(["check-settings", "o/r"], {}, {}, gh);
  expect(output.split("\n").every((line) => line.startsWith("PASS "))).toBe(true);
  expect(calls).toHaveLength(9);
  for (const call of calls) {
    expect(call[0]).toBe("api");
    expect(call).toHaveLength(2);
    expect(call).not.toContain("-X");
    expect(call).not.toContain("--method");
  }
});

test("METRO-57 every failed read prints a FAIL line instead of crashing", async () => {
  const paths = [
    "users/tashfiqul-islam",
    "repos/o/r/environments/production",
    "repos/o/r/environments/production/deployment-branch-policies?per_page=100",
    "repos/o/r/actions/secrets?per_page=100",
    "repos/o/r/actions/variables?per_page=100",
    "repos/o/r/environments/production/secrets?per_page=100",
    "repos/o/r/environments/production/variables?per_page=100",
  ];
  for (const path of paths) {
    const { gh } = fakeGh({ [path]: new Error("HTTP 500: boom") });
    let message = "";
    await runProductionCli(["check-settings", "o/r"], {}, {}, gh).catch((error: unknown) => {
      message = error instanceof Error ? error.message : String(error);
    });
    expect(message).toContain("FAIL read");
    expect(message).toContain(path.split("?")[0] ?? path);
    expect(
      message.split("\n").every((line) => line.startsWith("FAIL ") || line.startsWith("PASS ")),
    ).toBe(true);
  }
  const { gh } = fakeGh({ "repos/o/r/environments/production": new Error("HTTP 404: Not Found") });
  await expectRejection(runProductionCli(["check-settings", "o/r"], {}, {}, gh), "FAIL read");
});

test("METRO-57 organization endpoints: 404 means none, anything else fails with a clear message", async () => {
  const notFound = fakeGh({
    "repos/o/r/actions/organization-secrets?per_page=100": new Error("HTTP 404: Not Found"),
    "repos/o/r/actions/organization-variables?per_page=100": new Error("HTTP 404: Not Found"),
  });
  const output = await runProductionCli(["check-settings", "o/r"], {}, {}, notFound.gh);
  expect(output).toContain("PASS no organization secret");
  const forbidden = fakeGh({
    "repos/o/r/actions/organization-secrets?per_page=100": new Error("HTTP 403: Forbidden"),
  });
  await expectRejection(
    runProductionCli(["check-settings", "o/r"], {}, {}, forbidden.gh),
    "FAIL read repos/o/r/actions/organization-secrets",
  );
});

test("METRO-57 check-settings rejects a bad repository argument and a missing one", async () => {
  const { gh } = fakeGh();
  await expectRejection(
    runProductionCli(["check-settings", "bad repo; x"], {}, {}, gh),
    "owner/repo",
  );
  await expectRejection(runProductionCli(["check-settings"], {}, {}, gh), "usage");
});

const ORG_PATHS = [
  "repos/o/r/actions/organization-secrets?per_page=100",
  "repos/o/r/actions/organization-variables?per_page=100",
];

/** What `execFileSync("gh", ...)` throws for a failed call: message, stderr text and the JSON body on stdout. */
function ghFailure(status: number, message: string): Error {
  const body = JSON.stringify({
    message,
    documentation_url: "https://docs.github.com/rest",
    status: String(status),
  });
  return Object.assign(new Error(`Command failed: gh api x\ngh: ${message} (HTTP ${status})\n`), {
    stderr: `gh: ${message} (HTTP ${status})\n`,
    stdout: body,
  });
}

test("METRO-66 a 422 Validation Failed on the organization endpoints means no organization", async () => {
  // Observed live 2026-11-05 on a personal-account repository.
  for (const path of ORG_PATHS) {
    const { gh } = fakeGh({ [path]: ghFailure(422, "Validation Failed") });
    const output = await runProductionCli(["check-settings", "o/r"], {}, {}, gh);
    expect(output.split("\n").every((line) => line.startsWith("PASS "))).toBe(true);
    expect(output).toContain("PASS no organization");
  }
  const both = fakeGh(
    Object.fromEntries(ORG_PATHS.map((p) => [p, ghFailure(422, "Validation Failed")])),
  );
  const output = await runProductionCli(["check-settings", "o/r"], {}, {}, both.gh);
  expect(output.split("\n")).toHaveLength(12);
  // The status line alone (no stdout body) is enough.
  const bare = fakeGh({ [ORG_PATHS[0] ?? ""]: new Error("gh: Validation Failed (HTTP 422)") });
  expect(await runProductionCli(["check-settings", "o/r"], {}, {}, bare.gh)).toContain("PASS");
  // A real 404 still counts as none.
  const missing = fakeGh({ [ORG_PATHS[1] ?? ""]: ghFailure(404, "Not Found") });
  expect(await runProductionCli(["check-settings", "o/r"], {}, {}, missing.gh)).toContain("PASS");
});

test("METRO-66 other errors on the organization endpoints still fail closed", async () => {
  const errors = [
    ghFailure(403, "Forbidden"),
    ghFailure(500, "Server Error"),
    ghFailure(422, "Unprocessable: something else"),
    new Error("getaddrinfo ENOTFOUND api.github.com"),
    new Error("HTTP 4220 Validation Failed"),
  ];
  for (const path of ORG_PATHS) {
    for (const error of errors) {
      const { gh } = fakeGh({ [path]: error });
      await expectRejection(
        runProductionCli(["check-settings", "o/r"], {}, {}, gh),
        `FAIL read ${path.split("?")[0] ?? path}`,
      );
    }
  }
});

test("METRO-66 a 422 or 404 on a non-organization endpoint is still a FAIL", async () => {
  const paths = [
    "users/tashfiqul-islam",
    "repos/o/r/environments/production",
    "repos/o/r/environments/production/deployment-branch-policies?per_page=100",
    "repos/o/r/actions/secrets?per_page=100",
    "repos/o/r/actions/variables?per_page=100",
    "repos/o/r/environments/production/secrets?per_page=100",
    "repos/o/r/environments/production/variables?per_page=100",
  ];
  for (const path of paths) {
    for (const error of [ghFailure(422, "Validation Failed"), ghFailure(404, "Not Found")]) {
      const { gh } = fakeGh({ [path]: error });
      await expectRejection(
        runProductionCli(["check-settings", "o/r"], {}, {}, gh),
        `FAIL read ${path.split("?")[0] ?? path}`,
      );
    }
  }
});
