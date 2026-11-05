import {
  checkGithubSettings,
  EXPECTED_SETTINGS,
  runGithubSettingsCli,
  type SettingsManifest,
} from "./github-settings";
import { expectRejection } from "./test-support";

const REPO = "o/r";
const PATHS = {
  actions: "repos/o/r/actions/permissions",
  codeScanning: "repos/o/r/code-scanning/default-setup",
  repository: "repos/o/r",
  reporting: "repos/o/r/private-vulnerability-reporting",
  immutable: "repos/o/r/immutable-releases",
  alerts: "repos/o/r/vulnerability-alerts",
  fixes: "repos/o/r/automated-security-fixes",
} as const;

const goodAnswers = (): Record<string, unknown> => ({
  [PATHS.actions]: { enabled: true, allowed_actions: "all", sha_pinning_required: true },
  [PATHS.codeScanning]: {
    state: "configured",
    languages: ["actions", "javascript-typescript"],
    query_suite: "default",
  },
  [PATHS.repository]: {
    private: false,
    security_and_analysis: {
      secret_scanning: { status: "enabled" },
      secret_scanning_push_protection: { status: "enabled" },
    },
  },
  [PATHS.reporting]: { enabled: true },
  [PATHS.immutable]: { enabled: true, enforced_by_owner: false },
  [PATHS.alerts]: "", // 204: no body
  [PATHS.fixes]: { enabled: true, paused: false },
});

/** The error `gh api` raises: only the stderr status line counts, as in production-settings.test.ts. */
function ghFailure(status: number, message: string): Error {
  return Object.assign(new Error(`Command failed: gh api x\ngh: ${message} (HTTP ${status})\n`), {
    stderr: `gh: ${message} (HTTP ${status})\n`,
    stdout: JSON.stringify({ message, status: String(status) }),
  });
}

function fakeGh(overrides: Record<string, unknown> = {}) {
  const answers = { ...goodAnswers(), ...overrides };
  const calls: string[][] = [];
  const gh = (args: readonly string[]): string => {
    calls.push([...args]);
    const answer = answers[args[1] ?? ""];
    if (answer === undefined) throw ghFailure(404, "Not Found");
    if (answer instanceof Error) throw answer;
    return typeof answer === "string" ? answer : JSON.stringify(answer);
  };
  return { gh, calls };
}

function lineFor(lines: string[], name: string): string {
  const found = lines.find((line) => line.includes(` ${name}:`));
  if (found === undefined) throw new Error(`No line for ${name} in\n${lines.join("\n")}`);
  return found;
}

test("METRO-48 the manifest holds the values the owner turns on", () => {
  expect(EXPECTED_SETTINGS).toEqual({
    shaPinningRequired: true,
    codeScanning: { state: "configured", languages: ["javascript-typescript", "actions"] },
    secretScanning: true,
    secretScanningPushProtection: true,
    privateVulnerabilityReporting: true,
    immutableReleases: true,
    reported: {
      dependabotSecurityUpdates: { enforce: false },
      vulnerabilityAlerts: { enforce: false },
    },
  });
});

test("METRO-48 matching settings pass with PASS lines and make only read-only gh api calls", () => {
  const { gh, calls } = fakeGh();
  const result = checkGithubSettings(REPO, gh);
  expect(result.ok).toBe(true);
  expect(result.lines.filter((line) => line.startsWith("FAIL "))).toEqual([]);
  expect(result.lines.filter((line) => line.startsWith("PASS "))).toHaveLength(6);
  expect(result.lines.filter((line) => line.startsWith("INFO "))).toHaveLength(2);
  expect(new Set(calls.map((call) => call[1]))).toEqual(new Set(Object.values(PATHS)));
  for (const call of calls) {
    expect(call).toHaveLength(2);
    expect(call[0]).toBe("api");
  }
});

test("METRO-48 drift in each enforced item fails that item only", () => {
  const drifts: [string, string, unknown][] = [
    [
      "actions sha pinning",
      PATHS.actions,
      { enabled: true, allowed_actions: "all", sha_pinning_required: false },
    ],
    ["code scanning default setup", PATHS.codeScanning, { state: "not-configured", languages: [] }],
    [
      "secret scanning",
      PATHS.repository,
      {
        security_and_analysis: {
          secret_scanning: { status: "disabled" },
          secret_scanning_push_protection: { status: "enabled" },
        },
      },
    ],
    [
      "secret scanning push protection",
      PATHS.repository,
      {
        security_and_analysis: {
          secret_scanning: { status: "enabled" },
          secret_scanning_push_protection: { status: "disabled" },
        },
      },
    ],
    ["private vulnerability reporting", PATHS.reporting, { enabled: false }],
    ["immutable releases", PATHS.immutable, { enabled: false, enforced_by_owner: false }],
  ];
  for (const [name, path, answer] of drifts) {
    const result = checkGithubSettings(REPO, fakeGh({ [path]: answer }).gh);
    expect(result.ok).toBe(false);
    expect(lineFor(result.lines, name)).toStartWith("FAIL ");
    expect(result.lines.filter((line) => line.startsWith("FAIL "))).toHaveLength(1);
  }
});

test("METRO-48 code scanning must be configured and cover both languages", () => {
  const notConfigured = {
    state: "not-configured",
    languages: ["actions", "javascript", "javascript-typescript", "typescript"],
  };
  const notConfiguredResult = checkGithubSettings(
    REPO,
    fakeGh({ [PATHS.codeScanning]: notConfigured }).gh,
  );
  expect(lineFor(notConfiguredResult.lines, "code scanning default setup")).toContain(
    "not-configured",
  );
  expect(notConfiguredResult.ok).toBe(false);
  const onlyOne = checkGithubSettings(
    REPO,
    fakeGh({ [PATHS.codeScanning]: { state: "configured", languages: ["actions"] } }).gh,
  );
  expect(lineFor(onlyOne.lines, "code scanning default setup")).toContain("javascript-typescript");
  expect(onlyOne.ok).toBe(false);
  const extra = checkGithubSettings(
    REPO,
    fakeGh({
      [PATHS.codeScanning]: {
        state: "configured",
        languages: ["actions", "javascript-typescript", "python"],
      },
    }).gh,
  );
  expect(extra.ok).toBe(true);
  const malformed = checkGithubSettings(
    REPO,
    fakeGh({ [PATHS.codeScanning]: { state: "configured", languages: "actions" } }).gh,
  );
  expect(malformed.ok).toBe(false);
});

test("METRO-48 an unreadable endpoint is a FAIL with the exact gh status line, never a PASS", () => {
  const cases: [string, string, number, string][] = [
    ["actions sha pinning", PATHS.actions, 403, "Resource not accessible by integration"],
    ["code scanning default setup", PATHS.codeScanning, 403, "Advanced Security must be enabled"],
    ["code scanning default setup", PATHS.codeScanning, 404, "Not Found"],
    ["private vulnerability reporting", PATHS.reporting, 422, "Validation Failed"],
    ["immutable releases", PATHS.immutable, 404, "Not Found"],
    ["immutable releases", PATHS.immutable, 403, "Must have admin rights to Repository."],
  ];
  for (const [name, path, status, message] of cases) {
    const result = checkGithubSettings(REPO, fakeGh({ [path]: ghFailure(status, message) }).gh);
    expect(result.ok).toBe(false);
    const line = lineFor(result.lines, name);
    expect(line).toStartWith("FAIL ");
    expect(line).toContain(`gh: ${message} (HTTP ${status})`);
    expect(line).toContain(path);
  }
});

test("METRO-48 an unreadable repository fails both secret scanning items", () => {
  const result = checkGithubSettings(
    REPO,
    fakeGh({ [PATHS.repository]: ghFailure(404, "Not Found") }).gh,
  );
  expect(lineFor(result.lines, "secret scanning")).toContain("gh: Not Found (HTTP 404)");
  expect(lineFor(result.lines, "secret scanning push protection")).toContain(
    "gh: Not Found (HTTP 404)",
  );
  expect(result.ok).toBe(false);
});

test("METRO-48 a repository answer without security_and_analysis (no admin) fails, never passes", () => {
  const result = checkGithubSettings(
    REPO,
    fakeGh({ [PATHS.repository]: { private: false, full_name: "o/r" } }).gh,
  );
  expect(result.ok).toBe(false);
  expect(lineFor(result.lines, "secret scanning")).toContain("not reported");
  expect(lineFor(result.lines, "secret scanning push protection")).toContain("not reported");
});

test("METRO-48 a failure with no status line is reported with its first line", () => {
  const result = checkGithubSettings(
    REPO,
    fakeGh({ [PATHS.immutable]: new Error("spawn gh ENOENT") }).gh,
  );
  expect(lineFor(result.lines, "immutable releases")).toContain("spawn gh ENOENT");
  expect(result.ok).toBe(false);
});

test("METRO-48 a non-JSON answer fails the item", () => {
  const result = checkGithubSettings(REPO, fakeGh({ [PATHS.reporting]: "<html>" }).gh);
  expect(lineFor(result.lines, "private vulnerability reporting")).toStartWith("FAIL ");
  expect(result.ok).toBe(false);
});

test("METRO-48 dependabot items are reported, not enforced, by default", () => {
  const off = fakeGh({
    [PATHS.fixes]: { enabled: false, paused: false },
    [PATHS.alerts]: ghFailure(404, "Vulnerability alerts are disabled."),
  });
  const result = checkGithubSettings(REPO, off.gh);
  expect(result.ok).toBe(true);
  expect(lineFor(result.lines, "dependabot security updates")).toStartWith("INFO ");
  expect(lineFor(result.lines, "dependabot security updates")).toContain("enabled=false");
  expect(lineFor(result.lines, "vulnerability alerts")).toStartWith("INFO ");
  expect(lineFor(result.lines, "vulnerability alerts")).toContain("disabled");
});

test("METRO-48 an unreadable reported item is still shown with the gh status line", () => {
  const result = checkGithubSettings(
    REPO,
    fakeGh({
      [PATHS.fixes]: ghFailure(403, "Forbidden"),
      [PATHS.alerts]: ghFailure(404, "Not Found"),
    }).gh,
  );
  expect(result.ok).toBe(true);
  expect(lineFor(result.lines, "dependabot security updates")).toContain(
    "gh: Forbidden (HTTP 403)",
  );
  expect(lineFor(result.lines, "vulnerability alerts")).toContain("unreadable");
  expect(lineFor(result.lines, "vulnerability alerts")).toContain("gh: Not Found (HTTP 404)");
});

test("METRO-48 when the manifest enforces the reported items they PASS or FAIL", () => {
  const manifest: SettingsManifest = {
    ...EXPECTED_SETTINGS,
    reported: {
      dependabotSecurityUpdates: { enforce: true },
      vulnerabilityAlerts: { enforce: true },
    },
  };
  const good = checkGithubSettings(REPO, fakeGh().gh, manifest);
  expect(good.ok).toBe(true);
  expect(lineFor(good.lines, "dependabot security updates")).toStartWith("PASS ");
  expect(lineFor(good.lines, "vulnerability alerts")).toStartWith("PASS ");
  const bad = checkGithubSettings(
    REPO,
    fakeGh({
      [PATHS.fixes]: { enabled: false, paused: false },
      [PATHS.alerts]: ghFailure(404, "Vulnerability alerts are disabled."),
    }).gh,
    manifest,
  );
  expect(bad.ok).toBe(false);
  expect(lineFor(bad.lines, "dependabot security updates")).toStartWith("FAIL ");
  expect(lineFor(bad.lines, "vulnerability alerts")).toStartWith("FAIL ");
  const unreadable = checkGithubSettings(
    REPO,
    fakeGh({ [PATHS.alerts]: ghFailure(404, "Not Found") }).gh,
    manifest,
  );
  expect(lineFor(unreadable.lines, "vulnerability alerts")).toStartWith("FAIL ");
});

test("METRO-48 a paused Dependabot security updates setting is not reported as enabled", () => {
  const result = checkGithubSettings(
    REPO,
    fakeGh({ [PATHS.fixes]: { enabled: true, paused: true } }).gh,
  );
  expect(lineFor(result.lines, "dependabot security updates")).toContain("paused=true");
});

test("METRO-48 the CLI prints the lines on success and rejects with all lines on drift", async () => {
  const output = await runGithubSettingsCli(["check", REPO], fakeGh().gh);
  expect(output.split("\n").filter((line) => line.startsWith("PASS "))).toHaveLength(6);
  await expectRejection(
    runGithubSettingsCli(
      ["check", REPO],
      fakeGh({ [PATHS.immutable]: { enabled: false, enforced_by_owner: false } }).gh,
    ),
    "FAIL immutable releases",
  );
});

test("METRO-48 the CLI rejects bad usage before any gh call", async () => {
  const { gh, calls } = fakeGh();
  await expectRejection(runGithubSettingsCli(["check"], gh), "usage");
  await expectRejection(runGithubSettingsCli(["check", "bad repo; x"], gh), "owner/repo");
  await expectRejection(runGithubSettingsCli(["apply", REPO], gh), "Unknown command");
  await expectRejection(runGithubSettingsCli([], gh), "Unknown command");
  expect(calls).toEqual([]);
});
