import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { isRecord } from "./guards.ts";
import { validateTag } from "./release-sync.ts";

/**
 * Read-only preflight for the default-branch cutover (METRO-34, docs/agents/cutover-runbook.md).
 *
 * It prints PASS / FAIL / INFO / MANUAL for each precondition that GitHub can answer and lists the
 * ones only a person can answer. It never writes: every call goes through `assertReadOnly`, an
 * ALLOW-list (not a deny-list): `gh api repos/...` with only `--jq`/`-q` and `--paginate`, and
 * `gh pr list` with only a fixed set of value flags. Any other argument that starts with `-`
 * (attached forms such as `-fa=b`, `-XDELETE`, `-H`, `--header=...` included) is rejected before a
 * process starts. A pass is not authorization to cut over; the owner decides.
 *
 * Limitation: the docs gate (`branches:check`) proves only that the three documents agree with
 * each other, not that they match GitHub's actual default branch; the runbook's readback does that.
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
  /** The master head SHA recorded in the release ticket; when given, the live head must equal it. */
  recordedMasterSha?: string;
}

/** Runs `gh` with these arguments and resolves with stdout; rejects with the failure text. */
export type Gh = (args: readonly string[]) => Promise<string>;

const API_PATH = /^repos\/[A-Za-z0-9._~:@+/?=&,%*-]+$/u;
const API_VALUE_FLAGS: ReadonlySet<string> = new Set(["--jq", "-q"]);
const API_SWITCHES: ReadonlySet<string> = new Set(["--paginate"]);
const PR_VALUE_FLAGS: ReadonlySet<string> = new Set([
  "--repo",
  "--state",
  "--json",
  "--limit",
  "--base",
]);
const NO_SWITCHES: ReadonlySet<string> = new Set();

function refuse(args: readonly string[], why: string): never {
  throw new Error(`cutover-preflight is read-only; refusing gh ${args.join(" ")} (${why})`);
}

/** Returns the positional arguments; throws on any flag that is not in the allow-lists. */
function positionals(
  args: readonly string[],
  rest: readonly string[],
  valueFlags: ReadonlySet<string>,
  switches: ReadonlySet<string>,
): string[] {
  const found: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index] ?? "";
    if (valueFlags.has(arg)) {
      const value = rest[index + 1];
      if (value === undefined || value.startsWith("-")) refuse(args, `${arg} needs a value`);
      index += 1;
    } else if (switches.has(arg)) {
      // allowed switch
    } else if (arg.startsWith("-")) {
      refuse(args, `flag ${arg} is not allowed`);
    } else {
      found.push(arg);
    }
  }
  return found;
}

/** Throws unless the arguments describe an allow-listed read-only `gh api` GET or `gh pr list`. */
export function assertReadOnly(args: readonly string[]): void {
  const [command, sub] = args;
  if (command === "pr" && sub === "list") {
    if (positionals(args, args.slice(2), PR_VALUE_FLAGS, NO_SWITCHES).length > 0)
      refuse(args, "unexpected argument");
    return;
  }
  if (command === "api") {
    const [endpoint, ...extra] = positionals(args, args.slice(1), API_VALUE_FLAGS, API_SWITCHES);
    if (endpoint === undefined || extra.length > 0 || !API_PATH.test(endpoint))
      refuse(args, "exactly one repos/... endpoint is allowed");
    return;
  }
  refuse(args, "command is not allowed");
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

/** gh prints `gh: Not Found (HTTP 404)` for a missing resource; nothing else counts as absent. */
function isNotFound(error: unknown): boolean {
  return /\(HTTP 404\)/u.test(message(error));
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

/** Calls `load` once; every later caller gets the same result or the same failure. */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= load());
}

interface Ruleset {
  id: string;
  enforcement: string;
  include: unknown[];
  rules: Record<string, unknown>[];
}

function contextsOf(ruleset: Ruleset): string[] {
  return ruleset.rules
    .filter((rule) => rule["type"] === "required_status_checks")
    .flatMap((rule) => {
      const parameters = rule["parameters"];
      const checks = isRecord(parameters) ? parameters["required_status_checks"] : undefined;
      return Array.isArray(checks)
        ? (checks as unknown[]).map((entry) => (isRecord(entry) ? text(entry["context"]) : ""))
        : [];
    });
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

const REPO = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/u;
const BRANCH = /^[A-Za-z0-9._/-]{1,100}$/u;
const SHA = /^[0-9a-f]{40}$/u;

/** Rejects values that would change the shape of an API path (they are interpolated into one). */
export function validateOptions(options: PreflightOptions): void {
  if (!REPO.test(options.repo))
    throw new Error(`--repo must look like owner/name, got ${JSON.stringify(options.repo)}`);
  if (
    !BRANCH.test(options.integration) ||
    options.integration.includes("..") ||
    options.integration.startsWith("-") ||
    options.integration.startsWith("/")
  )
    throw new Error(
      `--integration must be a plain branch name, got ${JSON.stringify(options.integration)}`,
    );
  validateTag(options.tag);
  if (options.recordedMasterSha !== undefined && !SHA.test(options.recordedMasterSha))
    throw new Error("--master-sha must be a full 40-character lowercase SHA");
}

interface Compare {
  status: string;
  aheadBy: number;
  commits: Record<string, unknown>[];
}

export async function runPreflight(gh: Gh, options: PreflightOptions): Promise<Finding[]> {
  validateOptions(options);
  const { repo, integration, tag } = options;
  const findings: Finding[] = [];
  const add = async (...args: Parameters<typeof check>): Promise<void> => {
    findings.push(await check(...args));
  };

  const rulesets = once(async (): Promise<Ruleset[]> => {
    const list = asArray(await json(gh, ["api", `repos/${repo}/rulesets`]), "rulesets");
    const loaded: Ruleset[] = [];
    for (const entry of list) {
      const id = String(asRecord(entry, "ruleset")["id"]);
      const ruleset = asRecord(
        await json(gh, ["api", `repos/${repo}/rulesets/${id}`]),
        `ruleset ${id}`,
      );
      const conditions = asRecord(ruleset["conditions"] ?? {}, "conditions");
      const refName = asRecord(conditions["ref_name"] ?? {}, "ref_name");
      loaded.push({
        id,
        enforcement: text(ruleset["enforcement"]),
        include: asArray(refName["include"] ?? [], "include"),
        rules: asArray(ruleset["rules"] ?? [], "rules").map((rule) => asRecord(rule, "rule")),
      });
    }
    return loaded;
  });
  const rulesetsFor = async (ref: string): Promise<Ruleset[]> =>
    (await rulesets()).filter((ruleset) => ruleset.include.includes(ref));

  /** main...integration, all pages (100 commits per page, at most 10 pages). */
  const compare = once(async (): Promise<Compare> => {
    const commits: Record<string, unknown>[] = [];
    let status = "";
    let aheadBy = 0;
    for (let page = 1; page <= 10; page += 1) {
      const body = asRecord(
        await json(gh, [
          "api",
          `repos/${repo}/compare/main...${integration}?per_page=100&page=${String(page)}`,
        ]),
        "compare",
      );
      if (page === 1) {
        status = text(body["status"]);
        aheadBy = typeof body["ahead_by"] === "number" ? body["ahead_by"] : 0;
      }
      commits.push(...asArray(body["commits"] ?? [], "commits").map((c) => asRecord(c, "commit")));
      if (commits.length >= aheadBy) break;
    }
    return { status, aheadBy, commits };
  });

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
    if (options.recordedMasterSha === undefined)
      return {
        status: "info",
        detail: `master head is ${sha}; record it in the ticket and pass it as --master-sha before deleting master`,
      };
    return sha === options.recordedMasterSha
      ? { status: "pass", detail: `master head ${sha} equals the recorded SHA` }
      : {
          status: "fail",
          detail: `master head is ${sha} but the recorded SHA is ${options.recordedMasterSha}; the backup bundle is stale`,
        };
  });

  await add("main-exists", "Branch main exists", async () => {
    const branch = asRecord(await json(gh, ["api", `repos/${repo}/branches/main`]), "main");
    return {
      status: "pass",
      detail: `main head is ${text(asRecord(branch["commit"], "main commit")["sha"])}`,
    };
  });

  await add("main-fast-forward", `main is an ancestor of ${integration}`, async () => {
    const { status, aheadBy } = await compare();
    return status === "ahead" || status === "identical"
      ? {
          status: "pass",
          detail: `${integration} is ${status} of main (ahead_by ${String(aheadBy)})`,
        }
      : {
          status: "fail",
          detail: `compare status is ${status || "unknown"}; main must be an ancestor of ${integration}`,
        };
  });

  await add(
    "commits-verified",
    `Every commit main...${integration} is signature-verified`,
    async () => {
      const { aheadBy, commits } = await compare();
      if (commits.length < aheadBy)
        return {
          status: "fail",
          detail: `only ${String(commits.length)} of ${String(aheadBy)} commits could be listed`,
        };
      const unverified = commits.filter((entry) => {
        const commit = isRecord(entry["commit"]) ? entry["commit"] : {};
        const verification = isRecord(commit["verification"]) ? commit["verification"] : {};
        return verification["verified"] !== true;
      });
      return unverified.length === 0
        ? {
            status: "pass",
            detail: `all ${String(commits.length)} commits show verified signatures`,
          }
        : {
            status: "fail",
            detail: `unverified: ${unverified.map((entry) => text(entry["sha"]).slice(0, 9)).join(", ")} (the main ruleset requires signed commits)`,
          };
    },
  );

  await add("main-ruleset", "An active ruleset protects main with the required rules", async () => {
    const matching = await rulesetsFor("refs/heads/main");
    const problems: string[] = [];
    if (matching.length === 0) problems.push("no ruleset targets refs/heads/main");
    for (const ruleset of matching) {
      if (ruleset.enforcement !== "active")
        problems.push(`ruleset ${ruleset.id} enforcement is ${ruleset.enforcement}`);
      for (const required of REQUIRED_RULES)
        if (!ruleset.rules.some((rule) => rule["type"] === required))
          problems.push(`ruleset ${ruleset.id} lacks ${required}`);
      if (!contextsOf(ruleset).includes("Quality gates"))
        problems.push(`ruleset ${ruleset.id} does not require "Quality gates"`);
    }
    return problems.length === 0
      ? {
          status: "pass",
          detail:
            "an active ruleset targets refs/heads/main with deletion, non_fast_forward, required_signatures, pull_request and Quality gates",
        }
      : { status: "fail", detail: problems.join("; ") };
  });

  await add("main-approvals", "Approvals the main ruleset requires on a pull request", async () => {
    const parts: string[] = [];
    for (const ruleset of await rulesetsFor("refs/heads/main")) {
      const rule = ruleset.rules.find((entry) => entry["type"] === "pull_request");
      const parameters = rule && isRecord(rule["parameters"]) ? rule["parameters"] : {};
      parts.push(
        `ruleset ${ruleset.id}: required_approving_review_count ${String(parameters["required_approving_review_count"])}, require_code_owner_review ${String(parameters["require_code_owner_review"])}`,
      );
    }
    return {
      status: "info",
      detail: `${parts.join("; ") || "no main ruleset"}; the owner cannot approve their own pull request, so a count above 0 would block the cutover pull request`,
    };
  });

  await add(
    "reviewer-record-required",
    'The "Reviewer record" check is required on main and the integration branch',
    async () => {
      const problems: string[] = [];
      for (const ref of ["refs/heads/main", `refs/heads/${integration}`]) {
        const matching = await rulesetsFor(ref);
        if (!matching.some((ruleset) => contextsOf(ruleset).includes("Reviewer record")))
          problems.push(`${ref} does not require "Reviewer record"`);
      }
      return problems.length === 0
        ? { status: "pass", detail: '"Reviewer record" is a required context on both branches' }
        : { status: "fail", detail: problems.join("; ") };
    },
  );

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
      if (gates.length === 0)
        return {
          status: "fail",
          detail: `no Quality gates check run on ${sha}; open the pull request to main (its run attaches to the head commit) or keep a push trigger for ${integration} until it exists`,
        };
      return gates.every((run) => run["status"] === "completed" && run["conclusion"] === "success")
        ? { status: "pass", detail: `Quality gates succeeded on ${sha}` }
        : { status: "fail", detail: `Quality gates is not a success on ${sha}` };
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

  await add(
    "immutable-releases",
    "Immutable releases are off (a throwaway rehearsal tag can be deleted)",
    async () => {
      try {
        const body = asRecord(
          await json(gh, ["api", `repos/${repo}/immutable-releases`]),
          "setting",
        );
        return body["enabled"] === true
          ? {
              status: "info",
              detail:
                "immutable releases are ON: published tags cannot be deleted; do not rehearse with a tag",
            }
          : { status: "pass", detail: "immutable releases are off" };
      } catch (error) {
        if (isNotFound(error))
          return { status: "pass", detail: "immutable releases are not enabled (404)" };
        throw error;
      }
    },
  );

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
      detail: `${prs.map((pr) => `#${String(pr["number"])} -> ${text(pr["baseRefName"])}`).join(", ")}; retarget any that point at master after the switch`,
    };
  });

  await add("pages", "GitHub Pages (legacy site)", async () => {
    try {
      const pages = asRecord(await json(gh, ["api", `repos/${repo}/pages`]), "pages");
      return {
        status: "info",
        detail: `Pages is enabled (build_type ${text(pages["build_type"])}, ${text(pages["html_url"])}); the owner decided to unpublish it at cutover after production is live`,
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
      `${finding.status.toUpperCase().padEnd(7)}${finding.id.padEnd(26)}${finding.title}\n${" ".repeat(33)}${finding.detail}`,
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
  const masterSha = option(args, "--master-sha", "");
  const options: PreflightOptions = {
    repo: option(args, "--repo", "tashfiqul-islam/metro-station-finder"),
    integration: option(args, "--integration", "feature/metro-rebuild"),
    tag: option(args, "--tag", "v1.0.0"),
    ...(masterSha === "" ? {} : { recordedMasterSha: masterSha }),
  };
  const findings = await runPreflight(gh, options);
  console.log(formatReport(findings));
  if (hasFailure(findings)) process.exitCode = 1;
}

if (import.meta.main) await runCli(process.argv.slice(2));
