import { isRecord } from "./guards.ts";

/** One parsed workflow file: its name, the whole document and its jobs. */
export interface ParsedWorkflow {
  file: string;
  doc: Record<string, unknown>;
  jobs: Record<string, Record<string, unknown>>;
}

/** Reads a local composite action (`uses: ./path`) as a parsed action.yml, or undefined when it is missing. */
export type ReadAction = (path: string) => unknown;

/** The only `cancel-in-progress` expression allowed besides absent or false (METRO-59). */
export const PULL_REQUEST_ONLY_CANCEL = "${{ github.event_name == 'pull_request' }}";
/** Terms every credentialed pull request job must AND together in its `if` (METRO-47). */
export const BOT_TERMS = [
  "!endsWith(github.actor, '[bot]')",
  "!endsWith(github.event.pull_request.user.login, '[bot]')",
  "github.event.pull_request.user.type != 'Bot'",
  "github.event.sender.type != 'Bot'",
] as const;
export const SAME_REPOSITORY_TERM =
  "github.event.pull_request.head.repo.full_name == github.repository";
export const PULL_REQUEST_EVENT_TERM = "github.event_name == 'pull_request'";

/** Shapes one parsed YAML document (the caller parses; Bun's parser is only typed in tests). */
export function toParsedWorkflow(file: string, doc: unknown): ParsedWorkflow {
  if (!isRecord(doc)) throw new Error(`${file} is not a mapping`);
  const jobs: Record<string, Record<string, unknown>> = {};
  const raw = doc["jobs"];
  if (isRecord(raw)) for (const [id, job] of Object.entries(raw)) if (isRecord(job)) jobs[id] = job;
  return { file, doc, jobs };
}

const CREDENTIAL_NAME = /CLOUDFLARE_|PLANE_/u;
// An expression that reads the secrets context: secrets.X, secrets['X'], toJSON(secrets).
const SECRETS_EXPRESSION = /\$\{\{[^}]*\bsecrets\b[^}]*\}\}/u;

function holdsCredential(value: unknown): boolean {
  if (value === undefined) return false;
  const text = JSON.stringify(value);
  return CREDENTIAL_NAME.test(text) || SECRETS_EXPRESSION.test(text);
}

function localUses(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("./") ? value : undefined;
}

function stepsOf(container: Record<string, unknown>): Record<string, unknown>[] {
  const steps = container["steps"];
  return Array.isArray(steps) ? (steps as unknown[]).filter(isRecord) : [];
}

function triggersOf(doc: Record<string, unknown>): string[] {
  const triggers = doc["on"];
  if (typeof triggers === "string") return [triggers];
  if (Array.isArray(triggers)) return (triggers as unknown[]).map(String);
  return isRecord(triggers) ? Object.keys(triggers) : [];
}

function onPullRequest(doc: Record<string, unknown>): boolean {
  return triggersOf(doc).includes("pull_request");
}

/**
 * Structural test for "this job can see a credential": a Cloudflare or Plane name, any read of the secrets
 * context, workflow or job `env` holding either, a GitHub `environment:`, `secrets:` (including
 * `secrets: inherit`), a local reusable workflow or composite action (`uses: ./...`), or a job in a
 * `workflow_call` workflow (it can be handed secrets by any caller).
 */
export function isCredentialed(workflow: ParsedWorkflow, job: Record<string, unknown>): boolean {
  if (holdsCredential(workflow.doc["env"])) return true;
  if (holdsCredential(job)) return true;
  if (job["environment"] !== undefined || job["secrets"] !== undefined) return true;
  if (triggersOf(workflow.doc).includes("workflow_call")) return true;
  if (localUses(job["uses"]) !== undefined) return true;
  return stepsOf(job).some((step) => localUses(step["uses"]) !== undefined);
}

function scanSteps(
  steps: Record<string, unknown>[],
  where: string,
  readAction: ReadAction,
  seen: Set<string>,
  found: string[],
): void {
  for (const step of steps) {
    const uses = typeof step["uses"] === "string" ? step["uses"] : "";
    const name = typeof step["name"] === "string" ? step["name"] : uses;
    const here = `${where} step ${name}`;
    if (uses.startsWith("actions/cache")) found.push(`${here}: restores a cache`);
    if (uses.startsWith("jdx/mise-action")) {
      const inputs = isRecord(step["with"]) ? step["with"] : {};
      if (inputs["cache"] !== false) found.push(`${here}: mise-action without cache: false`);
    }
    const local = localUses(uses);
    if (local === undefined || /\.ya?ml$/u.test(local) || seen.has(local)) continue;
    seen.add(local);
    const action = readAction(local);
    if (!isRecord(action) || !isRecord(action["runs"])) {
      found.push(`${here}: local action ${local} cannot be read`);
      continue;
    }
    scanSteps(stepsOf(action["runs"]), `${here} (action ${local})`, readAction, seen, found);
  }
}

/**
 * Credentialed jobs must not restore any cache: no `actions/cache` step, and every `jdx/mise-action` step
 * sets `cache: false`, including inside local composite actions. mise-action warns against restoring caches
 * in jobs that hold credentials, and `bunx wrangler` runs node_modules code with the token in its
 * environment. Other cache mechanisms (for example a setup action's own `cache` input) are not enforced.
 */
export function credentialedCacheViolations(
  workflows: ParsedWorkflow[],
  readAction: ReadAction = () => null,
): string[] {
  const found: string[] = [];
  for (const workflow of workflows) {
    for (const [id, job] of Object.entries(workflow.jobs)) {
      if (!isCredentialed(workflow, job)) continue;
      scanSteps(stepsOf(job), `${workflow.file} job ${id}`, readAction, new Set(), found);
    }
  }
  return found;
}

/** Splits an `if` into its top-level AND terms, or undefined when it contains `||` (any OR can bypass a term). */
export function conjunction(condition: unknown): string[] | undefined {
  if (typeof condition !== "string") return undefined;
  const text = condition
    .trim()
    .replace(/^\$\{\{/u, "")
    .replace(/\}\}$/u, "")
    .trim();
  if (text === "" || text.includes("||")) return undefined;
  return text.split("&&").map((term) => term.trim());
}

/**
 * Credentialed jobs in a pull request workflow must AND together: the same-repository check, the pull request
 * event check when the workflow has other triggers, and every bot exclusion (actor and pull request author by
 * login suffix and by account type). A top-level `||` fails, so a term cannot be bypassed.
 */
export function botExclusionViolations(workflows: ParsedWorkflow[]): string[] {
  const found: string[] = [];
  for (const workflow of workflows) {
    if (!onPullRequest(workflow.doc)) continue;
    const otherTriggers = triggersOf(workflow.doc).some((trigger) => trigger !== "pull_request");
    const required: string[] = [...BOT_TERMS, SAME_REPOSITORY_TERM];
    if (otherTriggers) required.push(PULL_REQUEST_EVENT_TERM);
    for (const [id, job] of Object.entries(workflow.jobs)) {
      if (!isCredentialed(workflow, job)) continue;
      const terms = conjunction(job["if"]);
      if (terms === undefined) {
        found.push(`${workflow.file} job ${id}: if is missing or contains ||`);
        continue;
      }
      for (const term of required)
        if (!terms.includes(term)) found.push(`${workflow.file} job ${id}: if lacks ${term}`);
    }
  }
  return found;
}

function cancelValue(concurrency: unknown): unknown {
  return isRecord(concurrency) ? concurrency["cancel-in-progress"] : undefined;
}

/**
 * Every concurrency group (workflow or job level) may cancel in progress only for pull requests: the value is
 * absent, false or exactly the pull-request expression. A credentialed job's own group, and the group of a
 * credentialed workflow that is not triggered by pull requests (deploy, release, token check), must never
 * cancel at all.
 */
export function concurrencyViolations(workflows: ParsedWorkflow[]): string[] {
  const found: string[] = [];
  const check = (where: string, concurrency: unknown, never: boolean) => {
    const cancel = cancelValue(concurrency);
    if (cancel === undefined || cancel === false) return;
    if (never) found.push(`${where}: credentialed work must never cancel in progress`);
    else if (cancel !== PULL_REQUEST_ONLY_CANCEL)
      found.push(`${where}: cancel-in-progress is ${JSON.stringify(cancel)}`);
  };
  for (const workflow of workflows) {
    const { file, doc, jobs } = workflow;
    const credentialedJobs = Object.entries(jobs).filter(([, job]) =>
      isCredentialed(workflow, job),
    );
    check(
      `${file} workflow`,
      doc["concurrency"],
      !onPullRequest(doc) && credentialedJobs.length > 0,
    );
    for (const [id, job] of Object.entries(jobs))
      check(`${file} job ${id}`, job["concurrency"], isCredentialed(workflow, job));
  }
  return found;
}
