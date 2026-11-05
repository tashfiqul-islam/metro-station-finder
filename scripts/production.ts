import { appendFileSync, readFileSync } from "node:fs";

import { isRecord } from "./guards.ts";
import { REQUIRED_SECRETS, missingSecrets, smokePreview } from "./preview.ts";

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
 * PRODUCTION_DEPLOY_ENABLED=true; only a stable `v*` tag or `main` may deploy; the URL and the
 * environment secrets must exist. The workflow also checks the variable in the job condition, so a
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
    requireSecrets(env);
    return { kind: "tag", ref: name };
  }
  if (type === "branch" && name === "main") {
    productionOrigin(env["PRODUCTION_URL"]);
    requireSecrets(env);
    return { kind: "branch", ref: name };
  }
  throw new Error(
    `Ref ${type} "${name}" is not allowed to deploy production; only stable tags vX.Y.Z and the branch main are.`,
  );
}

function requireSecrets(env: Readonly<Record<string, string | undefined>>): void {
  const missing = missingSecrets(env);
  if (missing.length > 0)
    throw new Error(
      `Missing ${missing.join(" and ")} in the GitHub environment "production" (${REQUIRED_SECRETS.join(", ")}). Nothing was deployed.`,
    );
}

/** Version label: twelve hex digits of the commit and the run id. Digits and hex only. */
export function releaseLabel(sha: string, runId: string): string {
  if (!/^[0-9a-f]{40}$/u.test(sha)) throw new Error(`Not a full commit SHA: "${sha}"`);
  if (!/^[0-9]{1,20}$/u.test(runId)) throw new Error(`Not a numeric run id: "${runId}"`);
  return `${sha.slice(0, 12)}-${runId}`;
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

function latestDeployment(parsed: unknown): unknown {
  if (Array.isArray(parsed)) return (parsed as unknown[])[0];
  if (isRecord(parsed) && isRecord(parsed["result"])) {
    const list = parsed["result"]["deployments"];
    return Array.isArray(list) ? (list as unknown[])[0] : undefined;
  }
  return parsed;
}

/**
 * The version serving 100 percent of production traffic, from `wrangler deployments status --json`.
 * Refuses a split deployment: a rollout that is already in progress must be settled by the owner.
 * The exact JSON shape is Unverified against a live account; any other shape fails closed.
 */
export function currentVersionId(json: string): string {
  const deployment = latestDeployment(JSON.parse(json));
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

type SmokeOptions = NonNullable<Parameters<typeof smokePreview>[2]>;

export async function runProductionCli(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  smokeOptions: SmokeOptions = {},
): Promise<string> {
  const [command, first, second, third] = args;
  switch (command ?? "") {
    case "guard": {
      const request = checkDeployRequest(env);
      return `Production deploy allowed for ${request.kind} ${request.ref}`;
    }
    case "label":
      return releaseLabel(env["GITHUB_SHA"] ?? "", env["GITHUB_RUN_ID"] ?? "");
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
