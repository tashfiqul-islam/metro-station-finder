import { expect, test } from "bun:test";

import { type SettingsInput, evaluateSettings, runProductionCli } from "./production";
import { expectRejection } from "./test-support";

const goodSettings = (): SettingsInput => ({
  environment: {
    protection_rules: [
      {
        type: "required_reviewers",
        reviewers: [{ type: "User", reviewer: { login: "tashfiqul-islam" } }],
      },
    ],
    deployment_branch_policy: { protected_branches: false, custom_branch_policies: true },
  },
  policies: {
    branch_policies: [
      { name: "v*", type: "tag" },
      { name: "main", type: "branch" },
    ],
  },
  repoSecrets: { secrets: [{ name: "PLANE_API_KEY" }] },
  repoVariables: { variables: [{ name: "PRODUCTION_URL" }] },
  environmentSecrets: { secrets: [{ name: "CLOUDFLARE_API_TOKEN" }] },
  environmentVariables: { variables: [{ name: "CLOUDFLARE_ACCOUNT_ID" }] },
});

const missing = (args: readonly string[]): string => {
  if (args[1]?.includes("actions/")) return JSON.stringify({ secrets: [], variables: [] });
  throw new Error("HTTP 404");
};
const reviewerEnvironment = (login: string) => ({
  protection_rules: [{ type: "required_reviewers", reviewers: [{ reviewer: { login } }] }],
  deployment_branch_policy: { custom_branch_policies: true },
});
const policies = (...entries: [string, string][]) => ({
  branch_policies: entries.map(([name, type]) => ({ name, type })),
});

test("METRO-57 the settings check passes for the intended configuration", () => {
  const result = evaluateSettings(goodSettings());
  expect(result.ok).toBe(true);
  expect(result.lines.every((line) => line.startsWith("PASS "))).toBe(true);
  expect(result.lines.length).toBeGreaterThanOrEqual(6);
});

test("METRO-57 the settings check fails for each missing or unsafe setting", () => {
  const cases: [string, Partial<SettingsInput>, string][] = [
    [
      "no reviewer",
      {
        environment: {
          protection_rules: [],
          deployment_branch_policy: { custom_branch_policies: true },
        },
      },
      "reviewer",
    ],
    ["wrong reviewer", { environment: reviewerEnvironment("someone") }, "reviewer"],
    [
      "no custom policies",
      {
        environment: { ...reviewerEnvironment("tashfiqul-islam"), deployment_branch_policy: null },
      },
      "custom",
    ],
    ["no tag policy", { policies: policies(["main", "branch"]) }, "v*"],
    ["no main policy", { policies: policies(["v*", "tag"]) }, "main"],
    [
      "extra policy",
      { policies: policies(["v*", "tag"], ["main", "branch"], ["*", "branch"]) },
      "unexpected",
    ],
    [
      "repo token",
      { repoSecrets: { secrets: [{ name: "CLOUDFLARE_API_TOKEN" }] } },
      "repository secret",
    ],
    [
      "repo token variable",
      { repoVariables: { variables: [{ name: "CLOUDFLARE_API_TOKEN" }] } },
      "repository variable",
    ],
    [
      "repo account id",
      { repoVariables: { variables: [{ name: "CLOUDFLARE_ACCOUNT_ID" }] } },
      "repository variable",
    ],
    ["no environment token", { environmentSecrets: { secrets: [] } }, "environment secret"],
    ["no environment account", { environmentVariables: { variables: [] } }, "environment variable"],
    ["garbage", { policies: "nope" }, "policies"],
  ];
  for (const [, change, text] of cases) {
    const result = evaluateSettings({ ...goodSettings(), ...change });
    expect(result.ok).toBe(false);
    expect(result.lines.filter((line) => line.startsWith("FAIL ")).join("\n")).toContain(text);
  }
});

test("METRO-57 check-settings reads only with gh api GET calls and reports a missing environment", async () => {
  const calls: string[][] = [];
  const good = goodSettings();
  const answers: Record<string, unknown> = {
    "repos/o/r/environments/production": good.environment,
    "repos/o/r/environments/production/deployment-branch-policies": good.policies,
    "repos/o/r/actions/secrets?per_page=100": good.repoSecrets,
    "repos/o/r/actions/variables?per_page=100": good.repoVariables,
    "repos/o/r/environments/production/secrets?per_page=100": good.environmentSecrets,
    "repos/o/r/environments/production/variables?per_page=100": good.environmentVariables,
  };
  const gh = (args: readonly string[]): string => {
    calls.push([...args]);
    const key = args[1] ?? "";
    if (!(key in answers)) throw new Error("HTTP 404");
    return JSON.stringify(answers[key]);
  };
  expect(await runProductionCli(["check-settings", "o/r"], {}, {}, gh)).toContain("PASS ");
  expect(calls).toHaveLength(6);
  for (const call of calls) {
    expect(call[0]).toBe("api");
    expect(call).not.toContain("-X");
    expect(call).not.toContain("--method");
  }
  await expectRejection(
    runProductionCli(["check-settings", "o/r"], {}, {}, missing),
    "FAIL environment",
  );
  await expectRejection(
    runProductionCli(["check-settings", "bad repo; x"], {}, {}, gh),
    "owner/repo",
  );
  await expectRejection(runProductionCli(["check-settings"], {}, {}, gh), "usage");
});
