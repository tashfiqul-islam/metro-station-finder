import { isRecord } from "./guards.ts";
import { ghFailure, runGh, type GhRunner } from "./production.ts";

/**
 * Read-only comparison of the live GitHub security settings with a committed manifest (METRO-48,
 * docs/agents/github-settings.md). Only `gh api <path>` GET calls are made: the arguments are fixed, there is
 * no `-X`, no `--method` and no field flag. Rulesets and the default branch are covered elsewhere
 * (`cutover:preflight`, `production.ts check-settings`) and are deliberately not repeated here.
 *
 * An unreadable setting (403, 404, 422, any other failure) is a FAIL that quotes the `gh: ... (HTTP n)` status
 * line, never a PASS: the script cannot tell "off" from "not allowed to look" for those, so it does not guess.
 */

export interface SettingsManifest {
  /** `GET /repos/{r}/actions/permissions` `sha_pinning_required` */
  shaPinningRequired: boolean;
  /** `GET /repos/{r}/code-scanning/default-setup`: the state and the languages that must all be present. */
  codeScanning: { state: "configured"; languages: readonly string[] };
  /** `security_and_analysis.secret_scanning` of `GET /repos/{r}` is `enabled` */
  secretScanning: boolean;
  /** `security_and_analysis.secret_scanning_push_protection` of `GET /repos/{r}` is `enabled` */
  secretScanningPushProtection: boolean;
  /** `GET /repos/{r}/private-vulnerability-reporting` */
  privateVulnerabilityReporting: boolean;
  /** `GET /repos/{r}/immutable-releases` */
  immutableReleases: boolean;
  /** Printed as INFO unless `enforce` is true, then PASS or FAIL like the rest. */
  reported: {
    dependabotSecurityUpdates: { enforce: boolean };
    vulnerabilityAlerts: { enforce: boolean };
  };
}

/** What the owner turns on (METRO-48). Dependabot items stay reported until the owner decides to enforce them. */
export const EXPECTED_SETTINGS: SettingsManifest = {
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
};

type Read =
  | { ok: true; body: unknown; empty: boolean }
  | { ok: false; line: string; status?: number; message?: string };

type Lines = string[];

function read(gh: GhRunner, path: string): Read {
  let text: string;
  try {
    text = gh(["api", path]);
  } catch (error) {
    const failure = ghFailure(error);
    return { ok: false, ...failure };
  }
  if (text.trim() === "") return { ok: true, body: undefined, empty: true };
  try {
    return { ok: true, body: JSON.parse(text), empty: false };
  } catch {
    return {
      ok: false,
      line: `the answer is not JSON (${text.slice(0, 60).split("\n")[0] ?? ""})`,
    };
  }
}

function unreadable(path: string, result: Extract<Read, { ok: false }>): string {
  return `read ${path} failed: ${result.line}`;
}

function verdict(ok: boolean, name: string, detail: string): string {
  return `${ok ? "PASS" : "FAIL"} ${name}: ${detail}`;
}

function field(body: unknown, key: string): unknown {
  return isRecord(body) ? body[key] : undefined;
}

function statusOf(body: unknown, key: string): unknown {
  return field(field(field(body, "security_and_analysis"), key), "status");
}

function checkFlag(
  lines: Lines,
  gh: GhRunner,
  options: { name: string; path: string; key: string; expected: boolean; hint: string },
): void {
  const { name, path, key, expected, hint } = options;
  const result = read(gh, path);
  if (!result.ok) {
    lines.push(verdict(false, name, unreadable(path, result)));
    return;
  }
  const value = field(result.body, key);
  lines.push(
    verdict(
      typeof value === "boolean" && value === expected,
      name,
      `${key}=${String(value)} (expected ${String(expected)}; ${hint})`,
    ),
  );
}

function checkCodeScanning(
  lines: Lines,
  gh: GhRunner,
  base: string,
  manifest: SettingsManifest,
): void {
  const name = "code scanning default setup";
  const path = `${base}/code-scanning/default-setup`;
  const result = read(gh, path);
  if (!result.ok) {
    lines.push(verdict(false, name, unreadable(path, result)));
    return;
  }
  const state = field(result.body, "state");
  const languages = field(result.body, "languages");
  const present = Array.isArray(languages) ? (languages as unknown[]).map(String) : [];
  const missing = manifest.codeScanning.languages.filter((language) => !present.includes(language));
  const ok =
    state === manifest.codeScanning.state && Array.isArray(languages) && missing.length === 0;
  const detail = Array.isArray(languages)
    ? `state=${String(state)}, languages=${present.join(",") || "none"}`
    : `state=${String(state)}, languages not a list`;
  lines.push(
    verdict(
      ok,
      name,
      `${detail} (expected state ${manifest.codeScanning.state} with ${manifest.codeScanning.languages.join(", ")}${missing.length > 0 ? `; missing ${missing.join(", ")}` : ""})`,
    ),
  );
}

function checkSecretScanning(
  lines: Lines,
  repository: Read,
  base: string,
  manifest: SettingsManifest,
): void {
  const items: [string, string, boolean][] = [
    ["secret scanning", "secret_scanning", manifest.secretScanning],
    [
      "secret scanning push protection",
      "secret_scanning_push_protection",
      manifest.secretScanningPushProtection,
    ],
  ];
  for (const [name, key, expected] of items) {
    if (!repository.ok) {
      lines.push(verdict(false, name, unreadable(base, repository)));
      continue;
    }
    const status = statusOf(repository.body, key);
    if (typeof status !== "string") {
      lines.push(
        verdict(
          false,
          name,
          `${key} is not reported by the repository answer (security_and_analysis is shown only to administrators)`,
        ),
      );
      continue;
    }
    const wanted = expected ? "enabled" : "disabled";
    lines.push(verdict(status === wanted, name, `${key}=${status} (expected ${wanted})`));
  }
}

/** A reported item: INFO unless the manifest enforces it. State is "on", "off" or an unreadable explanation. */
function reportItem(
  lines: Lines,
  name: string,
  enforce: boolean,
  state: { kind: "on" | "off"; detail: string } | { kind: "unreadable"; detail: string },
): void {
  if (enforce) {
    lines.push(verdict(state.kind === "on", name, `${state.detail} (enforced by the manifest)`));
    return;
  }
  const suffix = state.kind === "unreadable" ? "unreadable" : state.kind;
  lines.push(`INFO ${name}: ${suffix}, ${state.detail} (reported, not enforced)`);
}

function checkDependabot(
  lines: Lines,
  gh: GhRunner,
  base: string,
  manifest: SettingsManifest,
): void {
  const fixesPath = `${base}/automated-security-fixes`;
  const fixes = read(gh, fixesPath);
  const enforceFixes = manifest.reported.dependabotSecurityUpdates.enforce;
  if (!fixes.ok) {
    reportItem(lines, "dependabot security updates", enforceFixes, {
      kind: "unreadable",
      detail: unreadable(fixesPath, fixes),
    });
  } else {
    const enabled = field(fixes.body, "enabled");
    const paused = field(fixes.body, "paused");
    reportItem(lines, "dependabot security updates", enforceFixes, {
      kind: enabled === true && paused !== true ? "on" : "off",
      detail: `enabled=${String(enabled)}, paused=${String(paused)}`,
    });
  }
  const alertsPath = `${base}/vulnerability-alerts`;
  const alerts = read(gh, alertsPath);
  const enforceAlerts = manifest.reported.vulnerabilityAlerts.enforce;
  if (alerts.ok) {
    // 204 with no body means enabled.
    reportItem(lines, "vulnerability alerts", enforceAlerts, {
      kind: alerts.empty ? "on" : "off",
      detail: alerts.empty ? "enabled (HTTP 204)" : "unexpected answer body",
    });
  } else if (alerts.status === 404 && alerts.message === "Vulnerability alerts are disabled.") {
    reportItem(lines, "vulnerability alerts", enforceAlerts, { kind: "off", detail: alerts.line });
  } else {
    reportItem(lines, "vulnerability alerts", enforceAlerts, {
      kind: "unreadable",
      detail: unreadable(alertsPath, alerts),
    });
  }
}

/** Read-only: seven `gh api` GET calls. Never throws for a failed read; the failed read is a FAIL line. */
export function checkGithubSettings(
  repo: string,
  gh: GhRunner,
  manifest: SettingsManifest = EXPECTED_SETTINGS,
): { ok: boolean; lines: string[] } {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repo))
    throw new Error(`Expected owner/repo, got ${JSON.stringify(repo)}`);
  const base = `repos/${repo}`;
  const repoRead = read(gh, base);
  const lines: Lines = [];
  checkFlag(lines, gh, {
    name: "actions sha pinning",
    path: `${base}/actions/permissions`,
    key: "sha_pinning_required",
    expected: manifest.shaPinningRequired,
    hint: "actions must be pinned to a full commit SHA",
  });
  checkCodeScanning(lines, gh, base, manifest);
  checkSecretScanning(lines, repoRead, base, manifest);
  checkFlag(lines, gh, {
    name: "private vulnerability reporting",
    path: `${base}/private-vulnerability-reporting`,
    key: "enabled",
    expected: manifest.privateVulnerabilityReporting,
    hint: "reporters can open private advisories",
  });
  checkFlag(lines, gh, {
    name: "immutable releases",
    path: `${base}/immutable-releases`,
    key: "enabled",
    expected: manifest.immutableReleases,
    hint: "a published release locks its tag and assets",
  });
  checkDependabot(lines, gh, base, manifest);
  return { ok: lines.every((line) => !line.startsWith("FAIL ")), lines };
}

export async function runGithubSettingsCli(
  args: readonly string[],
  gh: GhRunner = runGh,
): Promise<string> {
  const [command, repo] = args;
  if (command !== "check")
    throw new Error(`Unknown command "${command ?? ""}"; use: check <owner/repo>`);
  if (repo === undefined) throw new Error("usage: check <owner/repo>");
  const result = checkGithubSettings(repo, gh);
  if (!result.ok) throw new Error(result.lines.join("\n"));
  return result.lines.join("\n");
}

/** Process entry: prints the lines (stdout on a pass, stderr on drift) and fails the process on drift. */
export async function githubSettingsMain(args: readonly string[]): Promise<void> {
  try {
    console.log(await runGithubSettingsCli(args));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.main) await githubSettingsMain(process.argv.slice(2));
