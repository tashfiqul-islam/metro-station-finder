import { isRecord } from "./guards.ts";

/** One parsed workflow file: its name, the whole document and its jobs. */
export interface ParsedWorkflow {
  file: string;
  doc: Record<string, unknown>;
  jobs: Record<string, Record<string, unknown>>;
}

/** The only `cancel-in-progress` expression allowed besides absent or false (METRO-59). */
export const PULL_REQUEST_ONLY_CANCEL = "${{ github.event_name == 'pull_request' }}";
/** The bot-actor exclusion every credentialed pull request job needs (METRO-47). */
export const BOT_ACTOR_EXCLUSION = "!endsWith(github.actor, '[bot]')";
/** The pull request author variant, so a human push onto a bot branch is excluded too (METRO-47). */
export const BOT_AUTHOR_EXCLUSION = "!endsWith(github.event.pull_request.user.login, '[bot]')";

/** Shapes one parsed YAML document (the caller parses; Bun's parser is only typed in tests). */
export function toParsedWorkflow(file: string, doc: unknown): ParsedWorkflow {
  if (!isRecord(doc)) throw new Error(`${file} is not a mapping`);
  const jobs: Record<string, Record<string, unknown>> = {};
  const raw = doc["jobs"];
  if (isRecord(raw)) for (const [id, job] of Object.entries(raw)) if (isRecord(job)) jobs[id] = job;
  return { file, doc, jobs };
}

/** True when the job mentions a Cloudflare or Plane credential name anywhere (secret, variable or env). */
export function isCredentialed(job: Record<string, unknown>): boolean {
  return /CLOUDFLARE_|PLANE_/u.test(JSON.stringify(job));
}

/**
 * Credentialed jobs must not restore any cache: no `actions/cache` step, and every `jdx/mise-action` step
 * sets `cache: false`. mise-action warns against restoring caches in jobs that hold credentials, and
 * `bunx wrangler` runs node_modules code with the token in its environment.
 */
export function credentialedCacheViolations(workflows: ParsedWorkflow[]): string[] {
  const found: string[] = [];
  for (const { file, jobs } of workflows) {
    for (const [id, job] of Object.entries(jobs)) {
      if (!isCredentialed(job)) continue;
      const steps = Array.isArray(job["steps"]) ? (job["steps"] as unknown[]) : [];
      for (const step of steps) {
        if (!isRecord(step)) continue;
        const uses = typeof step["uses"] === "string" ? step["uses"] : "";
        const name = typeof step["name"] === "string" ? step["name"] : uses;
        const where = `${file} job ${id} step ${name}`;
        if (uses.startsWith("actions/cache")) found.push(`${where}: restores a cache`);
        if (uses.startsWith("jdx/mise-action")) {
          const inputs = isRecord(step["with"]) ? step["with"] : {};
          if (inputs["cache"] !== false) found.push(`${where}: mise-action without cache: false`);
        }
      }
    }
  }
  return found;
}

function onPullRequest(doc: Record<string, unknown>): boolean {
  const triggers = doc["on"];
  return (
    triggers === "pull_request" ||
    (Array.isArray(triggers) && triggers.includes("pull_request")) ||
    (isRecord(triggers) && "pull_request" in triggers)
  );
}

/** Credentialed jobs in a pull request workflow must exclude every bot, by actor and by author. */
export function botExclusionViolations(workflows: ParsedWorkflow[]): string[] {
  const found: string[] = [];
  for (const { file, doc, jobs } of workflows) {
    if (!onPullRequest(doc)) continue;
    for (const [id, job] of Object.entries(jobs)) {
      if (!isCredentialed(job)) continue;
      const condition = typeof job["if"] === "string" ? job["if"] : "";
      for (const required of [BOT_ACTOR_EXCLUSION, BOT_AUTHOR_EXCLUSION])
        if (!condition.includes(required)) found.push(`${file} job ${id}: if lacks ${required}`);
    }
  }
  return found;
}

function cancelValue(concurrency: unknown): unknown {
  return isRecord(concurrency) ? concurrency["cancel-in-progress"] : undefined;
}

/**
 * Every concurrency group (workflow or job level) may cancel in progress only for pull requests: the value is
 * absent, false or exactly the pull-request expression. Credentialed workflows (deploy, release, token check)
 * must never cancel at all.
 */
export function concurrencyViolations(workflows: ParsedWorkflow[]): string[] {
  const found: string[] = [];
  const check = (where: string, concurrency: unknown, credentialed: boolean) => {
    const cancel = cancelValue(concurrency);
    if (cancel === undefined || cancel === false) return;
    if (credentialed) found.push(`${where}: credentialed work must never cancel in progress`);
    else if (cancel !== PULL_REQUEST_ONLY_CANCEL)
      found.push(`${where}: cancel-in-progress is ${JSON.stringify(cancel)}`);
  };
  for (const { file, doc, jobs } of workflows) {
    // A pull request workflow may cancel superseded runs; every other credentialed workflow never does.
    const strict = !onPullRequest(doc);
    check(
      `${file} workflow`,
      doc["concurrency"],
      strict && Object.values(jobs).some(isCredentialed),
    );
    for (const [id, job] of Object.entries(jobs))
      check(`${file} job ${id}`, job["concurrency"], strict && isCredentialed(job));
  }
  return found;
}
