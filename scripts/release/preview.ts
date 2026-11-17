import { appendFileSync, readFileSync } from "node:fs";

import { assertNotFoundEnvelope } from "./api-envelope.ts";

/**
 * Helpers for the per-pull-request Cloudflare preview job (METRO-13, docs/specifications/cloudflare-preview.md).
 * Everything that decides pass or fail lives here so it is unit tested; the workflow only orchestrates.
 */

export const REQUIRED_SECRETS = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"] as const;
const PREFIX = "metro-scaffold-pr-";

/** Worker name for a pull request. Digits only, so the name can never carry shell or URL syntax. */
export function previewWorkerName(pullRequest: string): string {
  if (!/^[1-9][0-9]{0,8}$/u.test(pullRequest))
    throw new Error(`Pull request number must be a positive integer, got "${pullRequest}"`);
  return `${PREFIX}${pullRequest}`;
}

/** Names of required secrets that are absent or blank. */
export function missingSecrets(env: Readonly<Record<string, string | undefined>>): string[] {
  return REQUIRED_SECRETS.filter((name) => (env[name] ?? "").trim() === "");
}

export function secretsMessage(missing: readonly string[]): string {
  return `Missing ${missing.join(" and ")} in the GitHub environment "preview". Add CLOUDFLARE_API_TOKEN as a secret and CLOUDFLARE_ACCOUNT_ID as a variable under Settings > Environments > preview (token scope: Workers Scripts edit for this account only); nothing was deployed.`;
}

/** The workers.dev URL of a deployment, from Wrangler's output. Fails when there is none or it is for another Worker. */
export function extractWorkerUrl(output: string, workerName: string): string {
  const pattern = /https:\/\/([a-z0-9-]+)\.([a-z0-9-]+)\.workers\.dev/gu;
  for (const match of output.matchAll(pattern)) {
    if (match[1] === workerName) return match[0];
  }
  throw new Error(`No workers.dev URL for ${workerName} in the Wrangler output`);
}

/** Number of deployments in `wrangler deployments list --json` output; anything but an array is an error. */
export function countDeployments(json: string): number {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array of deployments from Wrangler");
  return parsed.length;
}

/** The part of a Response the smoke reads; a structural type so any runtime's Response fits. */
interface FetchedResponse {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}
type Fetch = (
  input: string,
  init?: { headers: Record<string, string> },
) => Promise<FetchedResponse>;

interface SmokeOptions {
  fetch?: Fetch;
  /** Extra request headers for every smoke request, for example a Worker version override (METRO-57). */
  headers?: Record<string, string>;
  /** A new workers.dev hostname can take a few seconds to resolve; each attempt still has to pass in full. */
  attempts?: number;
  delayMs?: number;
}

async function smokeOnce(fetchFn: Fetch, base: string, sha: string | undefined): Promise<void> {
  const page = await fetchFn(`${base}/`);
  if (page.status !== 200) throw new Error(`GET / returned ${page.status}`);
  if (!(page.headers.get("content-type") ?? "").includes("text/html"))
    throw new Error("GET / did not return HTML");

  // An unknown API route proves the Worker and its headers are live (the only real route is POST /api/vitals).
  const missing = await fetchFn(`${base}/api/does-not-exist`);
  await assertNotFoundEnvelope(missing);
  if (sha !== undefined && missing.headers.get("x-preview-sha") !== sha)
    throw new Error(
      `x-preview-sha is "${missing.headers.get("x-preview-sha") ?? ""}", expected the checked commit ${sha}`,
    );
}

/** Checks a deployed preview. Pass `sha` to prove it serves the checked commit; omit it after a rollback. */
export async function smokePreview(
  base: string,
  sha: string | undefined,
  options: SmokeOptions = {},
): Promise<void> {
  const raw: Fetch = options.fetch ?? ((input, init) => fetch(input, init));
  const extra = options.headers;
  const fetchFn: Fetch =
    extra === undefined ? raw : (input) => raw(input, { headers: { ...extra } });
  const attempts = options.attempts ?? 6;
  const delayMs = options.delayMs ?? 5000;
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await smokeOnce(fetchFn, base.replace(/\/$/u, ""), sha);
      return;
    } catch (error) {
      last = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(`Smoke failed after ${attempts} attempts: ${String(last)}`, { cause: last });
}

/** CLI used by the workflow. Prints results and appends outputs to $GITHUB_OUTPUT when set. */
export async function runPreviewCli(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): Promise<string> {
  const [command, first, second] = args;
  switch (command ?? "") {
    case "secrets": {
      const missing = missingSecrets(env);
      if (missing.length > 0) throw new Error(secretsMessage(missing));
      return "Preview secrets present";
    }
    case "name":
      return previewWorkerName(env["PR_NUMBER"] ?? "");
    case "url": {
      if (first === undefined || second === undefined)
        throw new Error("usage: url <file> <worker>");
      return extractWorkerUrl(readFileSync(first, "utf8"), second);
    }
    case "deployments": {
      if (first === undefined) throw new Error("usage: deployments <file>");
      return String(countDeployments(readFileSync(first, "utf8")));
    }
    case "smoke": {
      if (first === undefined) throw new Error("usage: smoke <url> [sha]");
      await smokePreview(first, second);
      return `Smoke passed for ${first}`;
    }
    default:
      throw new Error(`Unknown command "${command ?? ""}"`);
  }
}

/** Process entry: prints the result, records name/url as step outputs, and fails the step on error. */
export async function previewMain(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
): Promise<void> {
  try {
    const result = await runPreviewCli(args, env);
    console.log(result);
    const output = env["GITHUB_OUTPUT"];
    const command = args[0];
    if (
      output !== undefined &&
      (command === "name" || command === "url" || command === "deployments")
    )
      appendFileSync(output, `${command}=${result}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.main) await previewMain(process.argv.slice(2), process.env);
