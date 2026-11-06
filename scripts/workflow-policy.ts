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
    if (uses.startsWith("actions/download-artifact"))
      found.push(`${here}: downloads a shared artifact`);
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
 * Credentialed jobs must not restore any cache or shared artifact: no `actions/cache` step (which also covers
 * `actions/cache/restore`), no `actions/download-artifact` step, and every `jdx/mise-action` step sets
 * `cache: false`, including inside local composite actions. mise-action warns against restoring caches
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

/** The longest a browser install step may run (METRO-90): normal installs take under two minutes. */
export const BROWSER_INSTALL_MAX_MINUTES = 10;

/**
 * Every step that runs `playwright install` (any amount of whitespace between the words) must set its own
 * `timeout-minutes` (a positive number, at most BROWSER_INSTALL_MAX_MINUTES). The install fetches system
 * packages from a mirror and stalled for 13 to 20 minutes in hosted runs (METRO-90 evidence); without a step
 * limit only the job limit ended it.
 */
export function browserInstallTimeoutViolations(workflows: ParsedWorkflow[]): string[] {
  const found: string[] = [];
  for (const workflow of workflows) {
    for (const [id, job] of Object.entries(workflow.jobs)) {
      for (const step of stepsOf(job)) {
        const run = step["run"];
        if (typeof run !== "string" || !/\bplaywright\s+install\b/u.test(run)) continue;
        const name = typeof step["name"] === "string" ? step["name"] : run;
        const limit = step["timeout-minutes"];
        const where = `${workflow.file} job ${id} step ${name}`;
        if (typeof limit !== "number" || !(limit > 0) || limit > BROWSER_INSTALL_MAX_MINUTES)
          found.push(
            `${where}: needs timeout-minutes between 1 and ${BROWSER_INSTALL_MAX_MINUTES}, found ${JSON.stringify(limit)}`,
          );
      }
    }
  }
  return found;
}

/** Seconds a retry loop can take in the worst case, read from its `timeout --kill-after=Ns Ms` and `for attempt in` lines. */
export function installBudgetSeconds(run: string): number | undefined {
  const timeout = /timeout --kill-after=(\d+)s (\d+)s/u.exec(run);
  const attempts = /for attempt in ((?:\d+ ?)+); do/u.exec(run);
  if (timeout === null || attempts === null) return undefined;
  const count = (attempts[1] ?? "").trim().split(/\s+/u).length;
  // A few seconds of cleanup (apt stop, dpkg, mirror switch) between two attempts.
  const cleanup = 15;
  return count * (Number(timeout[1]) + Number(timeout[2])) + (count - 1) * cleanup;
}

/**
 * The install step's retry budget must fit inside its own `timeout-minutes`, or the step limit would cut the
 * retry that the loop promises. A `run` step without `shell:` uses `bash -e {0}` (no pipefail), so the retry
 * script must not rely on pipefail; it has no pipes.
 */
export function installBudgetViolations(workflows: ParsedWorkflow[]): string[] {
  const found: string[] = [];
  for (const workflow of workflows) {
    for (const [id, job] of Object.entries(workflow.jobs)) {
      for (const step of stepsOf(job)) {
        const run = step["run"];
        if (typeof run !== "string" || !/\bplaywright\s+install\b/u.test(run)) continue;
        const budget = installBudgetSeconds(run);
        const limit = step["timeout-minutes"];
        const where = `${workflow.file} job ${id} step ${String(step["name"])}`;
        if (budget === undefined) found.push(`${where}: no bounded retry loop`);
        else if (typeof limit !== "number" || budget >= limit * 60)
          found.push(
            `${where}: retry budget ${budget} s does not fit in timeout-minutes ${JSON.stringify(limit)}`,
          );
      }
    }
  }
  return found;
}

/** Playwright project names declared in `playwright.config.ts` (`{ name: "chromium", ... }` entries). */
export function playwrightProjects(configText: string): string[] {
  return [...configText.matchAll(/\{\s*name:\s*"([^"]+)"/gu)].map((match) => match[1] ?? "");
}

/** The browser each Playwright project needs installed. */
const PROJECT_BROWSER: Record<string, string> = {
  chromium: "chromium",
  "mobile-chrome": "chromium",
  firefox: "firefox",
  webkit: "webkit",
};

function matrixEntries(workflow: ParsedWorkflow): Record<string, unknown>[] {
  const strategy = workflow.jobs["smoke"]?.["strategy"];
  const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
  const include = isRecord(matrix) ? matrix["include"] : undefined;
  return Array.isArray(include) ? (include as unknown[]).filter(isRecord) : [];
}

function smokedProjects(workflow: ParsedWorkflow): Set<string> {
  const projects = new Set<string>();
  for (const step of stepsOf(workflow.jobs["build"] ?? {})) {
    const run = typeof step["run"] === "string" ? step["run"] : "";
    for (const match of run.matchAll(/--project=(\S+)/gu)) projects.add(match[1] ?? "");
  }
  for (const entry of matrixEntries(workflow))
    if (typeof entry["project"] === "string") projects.add(entry["project"]);
  return projects;
}

function isDisabled(condition: unknown): boolean {
  if (condition === false) return true;
  if (typeof condition !== "string") return false;
  return /^(?:\$\{\{\s*)?false(?:\s*\}\})?$/u.test(condition.trim());
}

/** The env value of the step whose `run` contains `needle`, or undefined. */
function stepWith(
  job: Record<string, unknown>,
  needle: string,
): Record<string, unknown> | undefined {
  return stepsOf(job).find(
    (step) => typeof step["run"] === "string" && step["run"].includes(needle),
  );
}

function envOf(step: Record<string, unknown> | undefined, key: string): unknown {
  const env = step?.["env"];
  return isRecord(env) ? env[key] : undefined;
}

/**
 * The parallel smoke (METRO-90) must still run every Playwright project: the `build` job's `--project=` plus
 * the `smoke` matrix cover exactly the projects in the Playwright config, the matrix names no unknown one,
 * every matrix entry installs the browser its project needs, the matrix run step really passes the matrix
 * project and installs the matrix browsers, and no build or smoke job or step is switched off with `if: false`.
 */
export function smokeProjectViolations(workflow: ParsedWorkflow, configText: string): string[] {
  const declared = new Set(playwrightProjects(configText));
  const smoked = smokedProjects(workflow);
  const found: string[] = [];
  for (const project of declared)
    if (!smoked.has(project)) found.push(`${workflow.file}: project ${project} is not smoked`);
  for (const project of smoked)
    if (!declared.has(project)) found.push(`${workflow.file}: unknown project ${project}`);
  for (const entry of matrixEntries(workflow)) {
    const project = entry["project"];
    const want = typeof project === "string" ? PROJECT_BROWSER[project] : undefined;
    if (want !== undefined && entry["browsers"] !== want)
      found.push(
        `${workflow.file}: smoke matrix project ${String(project)} installs ${JSON.stringify(entry["browsers"])}, needs ${want}`,
      );
  }
  const smoke = workflow.jobs["smoke"] ?? {};
  const run = stepWith(smoke, "bun run smoke");
  if (run === undefined || !/--project="?\$PROJECT"?(?:\s|$)/u.test(String(run["run"])))
    found.push(`${workflow.file}: smoke run step does not pass --project="$PROJECT"`);
  if (envOf(run, "PROJECT") !== "${{ matrix.project }}")
    found.push(`${workflow.file}: smoke run step PROJECT is not the matrix project`);
  const install = stepWith(smoke, "playwright install");
  if (install === undefined || !String(install["run"]).includes('"$BROWSERS"'))
    found.push(`${workflow.file}: smoke install step does not install "$BROWSERS"`);
  if (envOf(install, "BROWSERS") !== "${{ matrix.browsers }}")
    found.push(`${workflow.file}: smoke install step BROWSERS is not the matrix browsers`);
  for (const id of ["build", "smoke"]) {
    const job = workflow.jobs[id] ?? {};
    if (isDisabled(job["if"])) found.push(`${workflow.file}: job ${id} is switched off`);
    for (const step of stepsOf(job))
      if (isDisabled(step["if"]))
        found.push(`${workflow.file}: job ${id} step ${String(step["name"])} is switched off`);
  }
  return found;
}

/** Options for setupDriftViolations. */
export interface DriftOptions {
  /** Step names that must be identical in every field (run, env, with, if, timeout) in both jobs. */
  identical?: readonly string[];
  /** Steps allowed in only one of the two jobs, keyed by job id, each with a reason in the call site. */
  onlyIn?: Readonly<Record<string, readonly string[]>>;
}

function stepNames(steps: Record<string, unknown>[]): string[] {
  return steps.map((step) => (typeof step["name"] === "string" ? step["name"] : ""));
}

/**
 * Two jobs that repeat the same setup (METRO-90: `build` and `smoke`) keep the same step names in the same
 * order, the same pinned `uses`, and, for the steps listed in `identical`, the same content. A step present in
 * only one job is a violation unless it is listed in `onlyIn` for that job. Limit: steps that differ on purpose
 * (the browser install, cache keys, the smoke run, the report artifact name) are compared by name and `uses`
 * only, so a change to their content in one job is not caught.
 */
export function setupDriftViolations(
  workflow: ParsedWorkflow,
  first: string,
  second: string,
  options: DriftOptions = {},
): string[] {
  const a = stepsOf(workflow.jobs[first] ?? {});
  const b = stepsOf(workflow.jobs[second] ?? {});
  if (a.length === 0 || b.length === 0)
    return [`${workflow.file}: job ${first} or ${second} has no steps`];
  const found: string[] = [];
  const namesA = stepNames(a);
  const namesB = stepNames(b);
  for (const [job, names, others] of [
    [first, namesA, namesB],
    [second, namesB, namesA],
  ] as const)
    for (const name of names)
      if (!others.includes(name) && !(options.onlyIn?.[job] ?? []).includes(name))
        found.push(`${workflow.file}: step "${name}" is only in ${job}`);
  const commonA = namesA.filter((name) => namesB.includes(name));
  const commonB = namesB.filter((name) => namesA.includes(name));
  if (commonA.join("\n") !== commonB.join("\n"))
    found.push(`${workflow.file}: shared steps of ${first} and ${second} are in a different order`);
  for (const name of commonA) {
    const left = a.find((step) => step["name"] === name) ?? {};
    const right = b.find((step) => step["name"] === name) ?? {};
    if (left["uses"] !== right["uses"])
      found.push(
        `${workflow.file}: step "${name}" uses a different action in ${first} and ${second}`,
      );
    else if (
      (options.identical ?? []).includes(name) &&
      JSON.stringify(left) !== JSON.stringify(right)
    )
      found.push(`${workflow.file}: step "${name}" differs between ${first} and ${second}`);
  }
  return found;
}
