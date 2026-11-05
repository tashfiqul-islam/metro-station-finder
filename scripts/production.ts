import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

import { isRecord } from "./guards.ts";
import { smokePreview } from "./preview.ts";

/**
 * Helpers for the production deploy workflow (METRO-57, ADR-0012). Everything that decides pass or
 * fail lives here so it is unit tested; `.github/workflows/production-deploy.yml` only orchestrates.
 */

/** The production Worker: the `name` in apps/api/wrangler.jsonc. Previews are `metro-scaffold-pr-<n>`. */
export const PRODUCTION_WORKER = "metro-scaffold";

const STABLE_TAG = /^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

export function assertProductionWorker(name: string): void {
  if (name !== PRODUCTION_WORKER)
    throw new Error(`Expected the production Worker "${PRODUCTION_WORKER}", got "${name}"`);
}

/** An https origin with no credentials, path, query or fragment, and not a preview Worker host. */
function productionOrigin(value: string | undefined): string {
  const fail = (): never => {
    throw new Error(
      `PRODUCTION_URL must be the https origin of the production custom domain (for example https://metro.example.com), got ${JSON.stringify(value ?? "")}`,
    );
  };
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    return fail();
  }
  const bare = url.pathname === "/" && url.search === "" && url.hash === "";
  const clean = url.protocol === "https:" && url.username === "" && url.password === "" && bare;
  if (
    !clean ||
    url.hostname.startsWith("metro-scaffold-pr-") ||
    !(value ?? "").startsWith("https://")
  )
    return fail();
  return url.origin;
}

export interface DeployRequest {
  kind: "tag" | "branch";
  ref: string;
}

/**
 * Fail-closed gate. The owner switches production deploys on with the repository variable
 * PRODUCTION_DEPLOY_ENABLED=true; only a stable `v*` tag or `main` may deploy; the URL must be valid.
 * It never reads credentials: the workflow tests them inline, so no secret is ever in the environment of
 * repository code (ADR-0012). The workflow also checks the variable in the job condition, so a
 * disabled repository never even references the `production` environment.
 */
export function checkDeployRequest(
  env: Readonly<Record<string, string | undefined>>,
): DeployRequest {
  if (env["PRODUCTION_DEPLOY_ENABLED"] !== "true")
    throw new Error(
      'Production deploys are off: the repository variable PRODUCTION_DEPLOY_ENABLED is not exactly "true". Nothing was deployed.',
    );
  const type = env["REF_TYPE"] ?? "";
  const name = env["REF_NAME"] ?? "";
  if (type === "tag" && STABLE_TAG.test(name)) {
    productionOrigin(env["PRODUCTION_URL"]);
    return { kind: "tag", ref: name };
  }
  if (type === "branch" && name === "main") {
    productionOrigin(env["PRODUCTION_URL"]);
    return { kind: "branch", ref: name };
  }
  throw new Error(
    `Ref ${type} "${name}" is not allowed to deploy production; only stable tags vX.Y.Z and the branch main are.`,
  );
}

/** Version label: twelve hex digits of the commit, the run id and the attempt, so a re-run gets a new label. */
export function releaseLabel(sha: string, runId: string, attempt = "1"): string {
  if (!/^[0-9a-f]{40}$/u.test(sha)) throw new Error(`Not a full commit SHA: "${sha}"`);
  if (!/^[0-9]{1,20}$/u.test(runId)) throw new Error(`Not a numeric run id: "${runId}"`);
  if (!/^[0-9]{1,6}$/u.test(attempt)) throw new Error(`Not a numeric run attempt: "${attempt}"`);
  return `${sha.slice(0, 12)}-${runId}-${attempt}`;
}

/** The version id from Wrangler's `WRANGLER_OUTPUT_FILE_PATH` file (one JSON object per line). */
export function uploadedVersionId(ndjson: string): string {
  const ids: string[] = [];
  for (const line of ndjson.split("\n")) {
    if (line.trim() === "") continue;
    const entry: unknown = JSON.parse(line);
    if (
      isRecord(entry) &&
      entry["type"] === "version-upload" &&
      entry["worker_name"] === PRODUCTION_WORKER
    ) {
      const id = entry["version_id"];
      if (typeof id !== "string" || !UUID.test(id))
        throw new Error("The version-upload entry has no valid version id");
      ids.push(id);
    }
  }
  if (ids.length === 0)
    throw new Error(`No version-upload entry for ${PRODUCTION_WORKER} in the Wrangler output`);
  if (ids.length > 1) throw new Error("Expected exactly one version-upload entry");
  return ids[0] ?? "";
}

/**
 * The version serving 100 percent of production traffic, from `wrangler deployments status --json`.
 * Refuses a split deployment: a rollout that is already in progress must be settled by the owner.
 * `deployments status --json` prints the one latest deployment object (Repo-verified in the installed
 * wrangler 4.156.0 source); `deployments list --json` is a bare array sorted oldest first, so a first element
 * would be the wrong deployment and an array is refused. The live response is Unverified until the first run;
 * any other shape fails closed.
 */
export function currentVersionId(json: string): string {
  const deployment: unknown = JSON.parse(json);
  if (Array.isArray(deployment))
    throw new Error("Expected the single deployment object of `deployments status --json`");
  const versions = isRecord(deployment) ? deployment["versions"] : undefined;
  if (!Array.isArray(versions) || versions.length === 0)
    throw new Error("The deployment status lists no versions; is the production Worker deployed?");
  if (versions.length !== 1)
    throw new Error("A gradual deployment is already in progress; settle it before deploying");
  const only: unknown = versions[0];
  const id = isRecord(only) ? only["version_id"] : undefined;
  if (!isRecord(only) || only["percentage"] !== 100 || typeof id !== "string" || !UUID.test(id))
    throw new Error("The current deployment is not a single valid version at 100 percent");
  return id;
}

/** Header that routes a request to one version that is part of the current deployment (even at 0 percent). */
export function versionOverrideHeader(versionId: string): Record<string, string> {
  if (!UUID.test(versionId)) throw new Error(`Not a valid version id: "${versionId}"`);
  return { "Cloudflare-Workers-Version-Overrides": `${PRODUCTION_WORKER}="${versionId}"` };
}

/** Raw read-only GitHub API answers that describe how the `production` environment is configured. */
export interface SettingsInput {
  environment: unknown;
  policies: unknown;
  repoSecrets: unknown;
  repoVariables: unknown;
  environmentSecrets: unknown;
  environmentVariables: unknown;
}

const OWNER = "tashfiqul-islam";
const CLOUDFLARE_NAMES = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"] as const;

function namesIn(value: unknown, key: "secrets" | "variables"): string[] | null {
  const list = isRecord(value) ? value[key] : undefined;
  if (!Array.isArray(list)) return null;
  return (list as unknown[]).flatMap((item) =>
    isRecord(item) && typeof item["name"] === "string" ? [item["name"]] : [],
  );
}

function leaked(names: string[] | null): string[] {
  return names === null
    ? ["unreadable"]
    : names.filter((n) => (CLOUDFLARE_NAMES as readonly string[]).includes(n));
}

function reviewers(environment: unknown): string[] {
  const rules = isRecord(environment) ? environment["protection_rules"] : undefined;
  if (!Array.isArray(rules)) return [];
  return (rules as unknown[]).flatMap((rule) => {
    if (!isRecord(rule) || rule["type"] !== "required_reviewers") return [];
    const list = rule["reviewers"];
    if (!Array.isArray(list)) return [];
    return (list as unknown[]).flatMap((entry) => {
      const reviewer = isRecord(entry) ? entry["reviewer"] : undefined;
      const login = isRecord(reviewer) ? reviewer["login"] : undefined;
      return typeof login === "string" ? [login] : [];
    });
  });
}

/**
 * Pre-enable check (ADR-0012 item 7): the `production` environment has the owner as the required reviewer
 * and exactly the tag `v*` and branch `main` policies, and no repository-level secret or variable can
 * carry the Cloudflare credentials (a repository-level token would let an unprotected, auto-created
 * environment deploy). Pure: it only reads what `check-settings` fetched.
 */
export function evaluateSettings(input: SettingsInput): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  const check = (ok: boolean, name: string, detail: string): void => {
    lines.push(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
  };
  const found = reviewers(input.environment);
  check(
    found.length === 1 && found[0] === OWNER,
    "required reviewer",
    found.length === 0 ? "none" : found.join(", "),
  );
  const policy = isRecord(input.environment) ? input.environment["deployment_branch_policy"] : null;
  check(
    isRecord(policy) && policy["custom_branch_policies"] === true,
    "custom deployment policies",
    "environment must use custom branch and tag policies",
  );
  const listed = isRecord(input.policies) ? input.policies["branch_policies"] : undefined;
  if (!Array.isArray(listed)) {
    check(false, "deployment policies", "the policies answer is not a list");
  } else {
    const entries = (listed as unknown[]).flatMap((item) =>
      isRecord(item) ? [`${String(item["type"])}:${String(item["name"])}`] : [],
    );
    check(entries.includes("tag:v*"), "tag policy", "v* must be allowed");
    check(entries.includes("branch:main"), "branch policy", "main must be allowed");
    const extra = entries.filter((entry) => entry !== "tag:v*" && entry !== "branch:main");
    check(extra.length === 0, "no unexpected policies", extra.join(", ") || "none");
  }
  const repoSecrets = namesIn(input.repoSecrets, "secrets");
  const repoVariables = namesIn(input.repoVariables, "variables");
  check(
    leaked(repoSecrets).length === 0,
    "no repository secret",
    `Cloudflare names at repository level: ${leaked(repoSecrets).join(", ") || "none"}`,
  );
  check(
    leaked(repoVariables).length === 0,
    "no repository variable",
    `Cloudflare names at repository level: ${leaked(repoVariables).join(", ") || "none"}`,
  );
  check(
    namesIn(input.environmentSecrets, "secrets")?.includes("CLOUDFLARE_API_TOKEN") === true,
    "environment secret",
    "CLOUDFLARE_API_TOKEN exists in production",
  );
  check(
    namesIn(input.environmentVariables, "variables")?.includes("CLOUDFLARE_ACCOUNT_ID") === true,
    "environment variable",
    "CLOUDFLARE_ACCOUNT_ID exists in production",
  );
  return { ok: lines.every((line) => line.startsWith("PASS ")), lines };
}

/** Runs `gh` with fixed arguments and no shell; the check below only ever passes `api <path>`. */
export type GhRunner = (args: readonly string[]) => string;
const runGh: GhRunner = (args) => execFileSync("gh", [...args], { encoding: "utf8" });

function readJson(gh: GhRunner, path: string): unknown {
  return JSON.parse(gh(["api", path]));
}

/** Read-only: six `gh api` GET calls. A missing environment is reported as a failure, not thrown. */
export function checkSettings(repo: string, gh: GhRunner): { ok: boolean; lines: string[] } {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repo))
    throw new Error(`Expected owner/repo, got ${JSON.stringify(repo)}`);
  const env = `repos/${repo}/environments/production`;
  const repoSecrets = readJson(gh, `repos/${repo}/actions/secrets?per_page=100`);
  const repoVariables = readJson(gh, `repos/${repo}/actions/variables?per_page=100`);
  let environment: unknown;
  try {
    environment = readJson(gh, env);
  } catch {
    const result = evaluateSettings({
      environment: null,
      policies: null,
      repoSecrets,
      repoVariables,
      environmentSecrets: null,
      environmentVariables: null,
    });
    return {
      ok: false,
      lines: [`FAIL environment: ${env} does not exist or is not readable`, ...result.lines],
    };
  }
  return evaluateSettings({
    environment,
    policies: readJson(gh, `${env}/deployment-branch-policies`),
    repoSecrets,
    repoVariables,
    environmentSecrets: readJson(gh, `${env}/secrets?per_page=100`),
    environmentVariables: readJson(gh, `${env}/variables?per_page=100`),
  });
}

type SmokeOptions = NonNullable<Parameters<typeof smokePreview>[2]>;

export async function runProductionCli(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  smokeOptions: SmokeOptions = {},
  gh: GhRunner = runGh,
): Promise<string> {
  const [command, first, second, third] = args;
  switch (command ?? "") {
    case "guard": {
      const request = checkDeployRequest(env);
      return `Production deploy allowed for ${request.kind} ${request.ref}`;
    }
    case "label":
      return releaseLabel(
        env["GITHUB_SHA"] ?? "",
        env["GITHUB_RUN_ID"] ?? "",
        env["GITHUB_RUN_ATTEMPT"] ?? "1",
      );
    case "check-settings": {
      if (first === undefined) throw new Error("usage: check-settings <owner/repo>");
      const result = checkSettings(first, gh);
      if (!result.ok) throw new Error(result.lines.join("\n"));
      return result.lines.join("\n");
    }
    case "version": {
      if (first === undefined) throw new Error("usage: version <wrangler-output-file>");
      return uploadedVersionId(readFileSync(first, "utf8"));
    }
    case "current": {
      if (first === undefined) throw new Error("usage: current <deployment-status-file>");
      return currentVersionId(readFileSync(first, "utf8"));
    }
    case "smoke": {
      if (first === undefined) throw new Error("usage: smoke <url> [sha] [version-id]");
      const origin = productionOrigin(first);
      const options =
        third === undefined
          ? smokeOptions
          : { ...smokeOptions, headers: versionOverrideHeader(third) };
      await smokePreview(
        origin,
        second === undefined || second === "" ? undefined : second,
        options,
      );
      return `Smoke passed for ${origin}`;
    }
    default:
      throw new Error(`Unknown command "${command ?? ""}"`);
  }
}

/** Process entry: prints the result, records label/version/current as step outputs, fails the step on error. */
export async function productionMain(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): Promise<void> {
  try {
    const result = await runProductionCli(args, env);
    console.log(result);
    const output = env["GITHUB_OUTPUT"];
    const command = args[0];
    if (
      output !== undefined &&
      (command === "label" || command === "version" || command === "current")
    )
      appendFileSync(output, `${command}=${result}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.main) await productionMain(process.argv.slice(2), process.env);
