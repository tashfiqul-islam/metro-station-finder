import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { isRecord } from "./guards.ts";
import { validateTag } from "./release-sync.ts";

/**
 * Read-only preflight for the default-branch cutover (METRO-34, docs/agents/cutover-runbook.md).
 *
 * It prints PASS / FAIL / INFO / MANUAL for each precondition that GitHub can answer and lists the
 * ones only a person can answer. It never writes: every call goes through `assertReadOnly`, which
 * allows `gh api <endpoint>` without any method, field or input flag (so GET only) and
 * `gh pr list`, and rejects everything else before a process starts. A pass is not authorization to
 * cut over; the owner decides.
 */

export type Status = "pass" | "fail" | "info" | "manual";

export interface Finding {
  id: string;
  status: Status;
  title: string;
  detail: string;
}

export interface PreflightOptions {
  repo: string;
  /** The long-lived branch that is about to become main's content. */
  integration: string;
  /** The tag the release will create, for example v1.0.0. */
  tag: string;
}

/** Runs `gh` with these arguments and resolves with stdout; rejects with the failure text. */
export type Gh = (args: readonly string[]) => Promise<string>;

const WRITE_FLAGS =
  /^(?:-X.*|--method(?:=.*)?|-f|-F|--field(?:=.*)?|--raw-field(?:=.*)?|--input(?:=.*)?)$/u;

/** Throws unless the arguments describe a read-only `gh api` GET or `gh pr list`. */
export function assertReadOnly(args: readonly string[]): void {
  const [command, sub] = args;
  if (command === "pr" && sub === "list") return;
  if (command === "api" && args.length >= 2) {
    const bad = args.slice(1).find((arg) => WRITE_FLAGS.test(arg));
    if (bad !== undefined)
      throw new Error(`cutover-preflight is read-only; refusing gh flag ${bad}`);
    return;
  }
  throw new Error(`cutover-preflight is read-only; refusing gh ${args.join(" ")}`);
}

const execFileAsync = promisify(execFile);

/** The real `gh`, guarded. */
export const realGh: Gh = async (args) => {
  assertReadOnly(args);
  try {
    const { stdout } = await execFileAsync("gh", [...args], { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    const stderr = isRecord(error) && typeof error["stderr"] === "string" ? error["stderr"] : "";
    const stdout = isRecord(error) && typeof error["stdout"] === "string" ? error["stdout"] : "";
    throw new Error(`${stderr}${stdout}`.trim() || String(error), { cause: error });
  }
};

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isNotFound(error: unknown): boolean {
  return /\b404\b|not found/iu.test(message(error));
}

async function json(gh: Gh, args: readonly string[]): Promise<unknown> {
  return JSON.parse(await gh(args)) as unknown;
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what}: unexpected response shape`);
  return value;
}

function asArray(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${what}: expected a list`);
  return value as unknown[];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Runs one check; a thrown error becomes a visible FAIL instead of ending the report. */
async function check(
  id: string,
  title: string,
  body: () => Promise<{ status: Status; detail: string }>,
): Promise<Finding> {
  try {
    return { id, title, ...(await body()) };
  } catch (error) {
    return { id, title, status: "fail", detail: `could not be checked: ${message(error)}` };
  }
}

function ruleCheckContexts(rule: Record<string, unknown>): string[] {
  const parameters = rule["parameters"];
  if (!isRecord(parameters)) return [];
  const checks = parameters["required_status_checks"];
  if (!Array.isArray(checks)) return [];
  return (checks as unknown[]).map((entry) => (isRecord(entry) ? text(entry["context"]) : ""));
}

/** The rules the plan needs on main before it becomes the default. */
const REQUIRED_RULES = ["deletion", "non_fast_forward", "required_signatures", "pull_request"];

const MANUAL: readonly Omit<Finding, "status">[] = [
  {
    id: "ready-tickets",
    title: "Every ticket in the readiness checklist is Done or listed as Deferred",
    detail:
      "Check in Plane: METRO-57 (production deploy), METRO-31 (security headers), METRO-15 (web rebuild and parity) and the rest of the checklist in docs/adr/0008-default-branch-switch.md.",
  },
  {
    id: "parity-and-smoke",
    title: "Parity matrix has no unaccepted gap and the production smoke passes",
    detail:
      "Check docs/product/feature-parity.md and the METRO-57 smoke evidence for the release SHA.",
  },
  {
    id: "owner-go",
    title: "The owner has said go for this release",
    detail:
      "A pass here is not authorization. Record the owner's go, the rollback owner and the time window.",
  },
];

export async function runPreflight(gh: Gh, options: PreflightOptions): Promise<Finding[]> {
  const { repo, integration, tag } = options;
  const findings: Finding[] = [];
  const add = async (...args: Parameters<typeof check>): Promise<void> => {
    findings.push(await check(...args));
  };

  await add("default-branch", "The repository default is still master", async () => {
    const info = asRecord(await json(gh, ["api", `repos/${repo}`]), "repository");
    const current = text(info["default_branch"]);
    return current === "master"
      ? { status: "pass", detail: "default branch is master (pre-cutover state)" }
      : {
          status: "fail",
          detail: `default branch is ${current || "unknown"}, expected master before the switch`,
        };
  });

  await add("master-sha", "Rollback anchor: the head of master", async () => {
    const branch = asRecord(await json(gh, ["api", `repos/${repo}/branches/master`]), "master");
    const sha = text(asRecord(branch["commit"], "master commit")["sha"]);
    return { status: "info", detail: `master head is ${sha}; record it before any deletion` };
  });

  await add("main-exists", "Branch main exists", async () => {
    const branch = asRecord(await json(gh, ["api", `repos/${repo}/branches/main`]), "main");
    return {
      status: "pass",
      detail: `main head is ${text(asRecord(branch["commit"], "main commit")["sha"])}`,
    };
  });

  await add("main-fast-forward", `main is an ancestor of ${integration}`, async () => {
    const compare = asRecord(
      await json(gh, ["api", `repos/${repo}/compare/main...${integration}`]),
      "compare",
    );
    const status = text(compare["status"]);
    return status === "ahead" || status === "identical"
      ? {
          status: "pass",
          detail: `${integration} is ${status} of main (ahead_by ${String(compare["ahead_by"])})`,
        }
      : {
          status: "fail",
          detail: `compare status is ${status || "unknown"}; main must be an ancestor of ${integration}`,
        };
  });

  await add("main-ruleset", "An active ruleset protects main with the required rules", async () => {
    const list = asArray(await json(gh, ["api", `repos/${repo}/rulesets`]), "rulesets");
    const problems: string[] = [];
    let seen = false;
    for (const entry of list) {
      const id = String(asRecord(entry, "ruleset")["id"]);
      const ruleset = asRecord(
        await json(gh, ["api", `repos/${repo}/rulesets/${id}`]),
        `ruleset ${id}`,
      );
      const conditions = asRecord(ruleset["conditions"] ?? {}, "conditions");
      const refName = asRecord(conditions["ref_name"] ?? {}, "ref_name");
      const include = asArray(refName["include"] ?? [], "include");
      if (!include.includes("refs/heads/main")) continue;
      seen = true;
      if (ruleset["enforcement"] !== "active")
        problems.push(`ruleset ${id} enforcement is ${text(ruleset["enforcement"])}`);
      const rules = asArray(ruleset["rules"] ?? [], "rules").map((rule) => asRecord(rule, "rule"));
      for (const required of REQUIRED_RULES)
        if (!rules.some((rule) => rule["type"] === required))
          problems.push(`ruleset ${id} lacks ${required}`);
      const contexts = rules
        .filter((rule) => rule["type"] === "required_status_checks")
        .flatMap((rule) => ruleCheckContexts(rule));
      if (!contexts.includes("Quality gates"))
        problems.push(`ruleset ${id} does not require "Quality gates"`);
    }
    if (!seen) problems.push("no ruleset targets refs/heads/main");
    return problems.length === 0
      ? {
          status: "pass",
          detail:
            "an active ruleset targets refs/heads/main with deletion, non_fast_forward, required_signatures, pull_request and Quality gates",
        }
      : { status: "fail", detail: problems.join("; ") };
  });

  await add(
    "quality-gates-green",
    `Quality gates passed on the head of ${integration}`,
    async () => {
      const branch = asRecord(
        await json(gh, ["api", `repos/${repo}/branches/${integration}`]),
        integration,
      );
      const sha = text(asRecord(branch["commit"], "commit")["sha"]);
      const runs = asArray(
        asRecord(
          await json(gh, ["api", `repos/${repo}/commits/${sha}/check-runs?per_page=100`]),
          "check runs",
        )["check_runs"],
        "check_runs",
      ).map((run) => asRecord(run, "check run"));
      const gates = runs.filter((run) => run["name"] === "Quality gates");
      const green =
        gates.length > 0 &&
        gates.every((run) => run["status"] === "completed" && run["conclusion"] === "success");
      return green
        ? { status: "pass", detail: `Quality gates succeeded on ${sha}` }
        : {
            status: "fail",
            detail:
              gates.length === 0
                ? `no Quality gates check run on ${sha}`
                : `Quality gates is not a success on ${sha}`,
          };
    },
  );

  await add("release-tag-valid", "The release tag follows the tag rule", async () => {
    validateTag(tag);
    return { status: "pass", detail: `${tag} matches v<major>.<minor>.<patch>[-<prerelease>]` };
  });

  await add("release-tag-free", "The release tag does not exist yet", async () => {
    try {
      await gh(["api", `repos/${repo}/git/ref/tags/${tag}`]);
    } catch (error) {
      if (isNotFound(error)) return { status: "pass", detail: `${tag} does not exist` };
      throw error;
    }
    return { status: "fail", detail: `${tag} already exists; never move or reuse a tag` };
  });

  await add("release-environment", "The release environment accepts main and v* tags", async () => {
    const policies = asArray(
      asRecord(
        await json(gh, ["api", `repos/${repo}/environments/release/deployment-branch-policies`]),
        "policies",
      )["branch_policies"],
      "branch_policies",
    ).map((policy) => asRecord(policy, "policy"));
    const has = (name: string, type: string) =>
      policies.some((p) => p["name"] === name && p["type"] === type);
    return has("main", "branch") && has("v*", "tag")
      ? { status: "pass", detail: "branch main and tag v* are allowed" }
      : { status: "fail", detail: "the release environment must allow branch main and tag v*" };
  });

  await add("legacy-tags", "Legacy release tags v0.0.1 and v0.0.2 exist", async () => {
    const missing: string[] = [];
    for (const legacy of ["v0.0.1", "v0.0.2"]) {
      try {
        await gh(["api", `repos/${repo}/git/ref/tags/${legacy}`]);
      } catch (error) {
        if (!isNotFound(error)) throw error;
        missing.push(legacy);
      }
    }
    return missing.length === 0
      ? {
          status: "pass",
          detail:
            "both tags exist, so the released legacy history stays reachable after master is deleted",
        }
      : { status: "fail", detail: `missing tags: ${missing.join(", ")}` };
  });

  await add("open-pull-requests", "Open pull requests and their bases", async () => {
    const prs = asArray(
      await json(gh, [
        "pr",
        "list",
        "--repo",
        repo,
        "--state",
        "open",
        "--json",
        "number,baseRefName",
        "--limit",
        "200",
      ]),
      "pull requests",
    ).map((pr) => asRecord(pr, "pull request"));
    if (prs.length === 0) return { status: "info", detail: "no open pull requests" };
    return {
      status: "info",
      detail:
        prs.map((pr) => `#${String(pr["number"])} -> ${text(pr["baseRefName"])}`).join(", ") +
        "; retarget any that point at master after the switch",
    };
  });

  await add("pages", "GitHub Pages (legacy site)", async () => {
    try {
      const pages = asRecord(await json(gh, ["api", `repos/${repo}/pages`]), "pages");
      return {
        status: "info",
        detail: `Pages is enabled (build_type ${text(pages["build_type"])}, ${text(pages["html_url"])}); decide its fate before deleting master`,
      };
    } catch (error) {
      if (isNotFound(error)) return { status: "info", detail: "Pages is not enabled" };
      throw error;
    }
  });

  for (const manual of MANUAL) findings.push({ ...manual, status: "manual" });
  return findings;
}

export function hasFailure(findings: readonly Finding[]): boolean {
  return findings.some((finding) => finding.status === "fail");
}

export function formatReport(findings: readonly Finding[]): string {
  const lines = findings.map(
    (finding) =>
      `${finding.status.toUpperCase().padEnd(7)}${finding.id.padEnd(22)}${finding.title}\n${" ".repeat(29)}${finding.detail}`,
  );
  const failures = findings.filter((finding) => finding.status === "fail").length;
  const manual = findings.filter((finding) => finding.status === "manual").length;
  lines.push(
    "",
    failures === 0
      ? `Result: no failures; ${String(manual)} manual item(s) still need a person.`
      : `Result: ${String(failures)} failure(s); do not start the cutover.`,
  );
  return lines.join("\n");
}

function option(args: readonly string[], name: string, fallback: string): string {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  if (index !== -1 && (value === undefined || value.startsWith("--")))
    throw new Error(`${name} needs a value`);
  return value ?? fallback;
}

/** CLI body: prints the report and sets a failing exit code when any check failed. */
export async function runCli(args: readonly string[], gh: Gh = realGh): Promise<void> {
  const options: PreflightOptions = {
    repo: option(args, "--repo", "tashfiqul-islam/metro-station-finder"),
    integration: option(args, "--integration", "feature/metro-rebuild"),
    tag: option(args, "--tag", "v1.0.0"),
  };
  const findings = await runPreflight(gh, options);
  console.log(formatReport(findings));
  if (hasFailure(findings)) process.exitCode = 1;
}

if (import.meta.main) await runCli(process.argv.slice(2));
