import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { isRecord } from "./guards";
import {
  BOT_TERMS,
  botExclusionViolations,
  concurrencyViolations,
  conjunction,
  credentialedCacheViolations,
  credentialedMiseRetryViolations,
  isCredentialed,
  PULL_REQUEST_EVENT_TERM,
  SAME_REPOSITORY_TERM,
  toParsedWorkflow,
} from "./workflow-policy";

/** Parses every workflow file in a directory, so a new workflow is covered without a fixed list. */
function parseWorkflows(directory: string) {
  return readdirSync(directory)
    .filter((name) => /\.ya?ml$/u.test(name))
    .map((name) =>
      toParsedWorkflow(name, Bun.YAML.parse(readFileSync(join(directory, name), "utf8"))),
    );
}

/** Reads a local composite action the way the policy asks for it. */
function readAction(path: string): unknown {
  for (const name of ["action.yml", "action.yaml"]) {
    try {
      return Bun.YAML.parse(readFileSync(join(path, name), "utf8"));
    } catch {
      continue;
    }
  }
  return undefined;
}

const real = parseWorkflows(".github/workflows");

function find(file: string) {
  const workflow = real.find((candidate) => candidate.file === file);
  if (workflow === undefined) throw new Error(`No workflow ${file}`);
  return workflow;
}

/** Builds a one-job workflow from YAML text. `on` and `extra` are top-level blocks; `job` is the job body. */
function fixture(job: string, options: { on?: string; extra?: string } = {}) {
  const source = `name: Fixture
on:
${options.on ?? "  pull_request:\n"}${options.extra ?? ""}jobs:
  one:
    runs-on: ubuntu-24.04
${job}`;
  return toParsedWorkflow("fixture.yml", Bun.YAML.parse(source));
}

const CACHE_STEP = `    steps:
      - name: Cache
        uses: actions/cache@x
`;
const DEPLOY_STEP = `      - name: Deploy
        run: wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
`;
const PLAIN_JOB = `    steps:
      - name: Say
        run: echo ok
`;

test("METRO-47 every workflow in the directory is parsed, not a fixed list", () => {
  expect(real.length).toBeGreaterThanOrEqual(7);
  expect(real.map((workflow) => workflow.file)).toContain("quality.yml");
});

test("METRO-47 no job holding Cloudflare or Plane credentials restores a cache", () => {
  expect(credentialedCacheViolations(real, readAction)).toEqual([]);
});

test("METRO-47 the cache rule flags actions/cache and mise-action without cache: false", () => {
  const parsed = fixture(`${CACHE_STEP}      - name: Mise
        uses: jdx/mise-action@x
${DEPLOY_STEP}`);
  expect(credentialedCacheViolations([parsed])).toEqual([
    "fixture.yml job one step Cache: restores a cache",
    "fixture.yml job one step Mise: mise-action without cache: false",
  ]);
});

test("METRO-47 the cache rule accepts mise-action with cache: false", () => {
  const parsed = fixture(`    steps:
      - name: Mise
        uses: jdx/mise-action@x
        with:
          cache: false
${DEPLOY_STEP}`);
  expect(credentialedCacheViolations([parsed])).toEqual([]);
});

test("METRO-47 the cache rule ignores jobs without credentials", () => {
  expect(credentialedCacheViolations([fixture(CACHE_STEP)])).toEqual([]);
});

test("METRO-47 a workflow-level env holding a credential makes every job credentialed", () => {
  const parsed = fixture(CACHE_STEP, {
    extra: "env:\n  TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}\n",
  });
  expect(credentialedCacheViolations([parsed])).toEqual([
    "fixture.yml job one step Cache: restores a cache",
  ]);
});

test("METRO-47 a workflow-level env without a credential does not", () => {
  const parsed = fixture(CACHE_STEP, { extra: 'env:\n  MISE_LOCKED: "1"\n' });
  expect(isCredentialed(parsed, parsed.jobs["one"] ?? {})).toBe(false);
});

test("METRO-47 a job with a job-level env credential is credentialed", () => {
  const parsed = fixture(`    env:
      TOKEN: \${{ secrets.ANYTHING }}
${CACHE_STEP}`);
  expect(credentialedCacheViolations([parsed])).toHaveLength(1);
});

test("METRO-47 a GitHub environment makes a job credentialed", () => {
  const parsed = fixture(`    environment: production
${CACHE_STEP}`);
  expect(credentialedCacheViolations([parsed])).toHaveLength(1);
});

test("METRO-47 toJSON(secrets) makes a job credentialed", () => {
  const parsed = fixture(`${CACHE_STEP}      - name: Dump
        run: echo "$ALL"
        env:
          ALL: \${{ toJSON(secrets) }}
`);
  expect(credentialedCacheViolations([parsed])).toHaveLength(1);
});

test("METRO-47 secrets: inherit and a local reusable workflow make a job credentialed", () => {
  const inherited = fixture(`    uses: ./.github/workflows/deploy.yml
    secrets: inherit
`);
  expect(isCredentialed(inherited, inherited.jobs["one"] ?? {})).toBe(true);
  const local = fixture("    uses: ./.github/workflows/deploy.yml\n");
  expect(isCredentialed(local, local.jobs["one"] ?? {})).toBe(true);
});

test("METRO-47 every job of a workflow_call workflow is credentialed", () => {
  const parsed = fixture(CACHE_STEP, { on: "  workflow_call:\n" });
  expect(credentialedCacheViolations([parsed])).toHaveLength(1);
});

test("METRO-47 a local composite action is scanned for caches and must be readable", () => {
  const job = `    steps:
      - name: Setup
        uses: ./.github/actions/setup
`;
  const withCache = credentialedCacheViolations([fixture(job)], () => ({
    runs: {
      using: "composite",
      steps: [{ name: "Restore", uses: "actions/cache@x" }],
    },
  }));
  expect(withCache).toEqual([
    "fixture.yml job one step Setup (action ./.github/actions/setup) step Restore: restores a cache",
  ]);
  expect(credentialedCacheViolations([fixture(job)])).toEqual([
    "fixture.yml job one step Setup: local action ./.github/actions/setup cannot be read",
  ]);
  const clean = credentialedCacheViolations([fixture(job)], () => ({
    runs: { using: "composite", steps: [{ name: "Say", run: "echo ok" }] },
  }));
  expect(clean).toEqual([]);
});

function conditionWith(terms: readonly string[]): string {
  return `    if: \${{ ${terms.join(" && ")} }}\n${DEPLOY_JOB}`;
}
const DEPLOY_JOB = `    steps:
${DEPLOY_STEP}`;
const FULL_TERMS = [PULL_REQUEST_EVENT_TERM, SAME_REPOSITORY_TERM, ...BOT_TERMS];

test("METRO-47 every credentialed pull request job excludes every bot by actor, author and account type", () => {
  expect(botExclusionViolations(real)).toEqual([]);
});

test("METRO-47 the preview job's condition is an AND of the required terms with no OR", () => {
  const terms = conjunction(find("quality.yml").jobs["preview"]?.["if"]);
  for (const term of [PULL_REQUEST_EVENT_TERM, SAME_REPOSITORY_TERM, ...BOT_TERMS])
    expect(terms?.includes(term), term).toBe(true);
  const cleanup = conjunction(find("preview-cleanup.yml").jobs["cleanup"]?.["if"]);
  for (const term of [SAME_REPOSITORY_TERM, ...BOT_TERMS])
    expect(cleanup?.includes(term), term).toBe(true);
});

test("METRO-47 the bot rule accepts the full conjunction on a workflow with other triggers", () => {
  const parsed = fixture(conditionWith(FULL_TERMS), {
    on: "  pull_request:\n  push:\n",
  });
  expect(botExclusionViolations([parsed])).toEqual([]);
});

test("METRO-47 the bot rule flags a dependabot-only exclusion", () => {
  const parsed = fixture(`    if: \${{ github.actor != 'dependabot[bot]' }}\n${DEPLOY_JOB}`);
  expect(botExclusionViolations([parsed])).toHaveLength(BOT_TERMS.length + 1);
});

test("METRO-47 the bot rule flags a missing account-type term, same-repository term or event term", () => {
  for (const missing of [
    "github.event.pull_request.user.type != 'Bot'",
    "github.event.sender.type != 'Bot'",
    SAME_REPOSITORY_TERM,
    PULL_REQUEST_EVENT_TERM,
  ]) {
    const parsed = fixture(conditionWith(FULL_TERMS.filter((term) => term !== missing)), {
      on: "  pull_request:\n  push:\n",
    });
    expect(botExclusionViolations([parsed])).toEqual([`fixture.yml job one: if lacks ${missing}`]);
  }
});

test("METRO-47 the bot rule rejects an OR that could bypass the terms", () => {
  const parsed = fixture(`    if: \${{ true || (${FULL_TERMS.join(" && ")}) }}\n${DEPLOY_JOB}`);
  expect(botExclusionViolations([parsed])).toEqual([
    "fixture.yml job one: if is missing or contains ||",
  ]);
  const none = fixture(DEPLOY_JOB);
  expect(botExclusionViolations([none])).toEqual([
    "fixture.yml job one: if is missing or contains ||",
  ]);
});

test("METRO-47 the bot rule skips workflows that never run on pull requests", () => {
  const parsed = fixture(DEPLOY_JOB, { on: "  workflow_dispatch:\n" });
  expect(botExclusionViolations([parsed])).toEqual([]);
});

test("METRO-59 cancel-in-progress is only absent, false or the pull-request expression", () => {
  expect(concurrencyViolations(real)).toEqual([]);
});

test("METRO-59 quality.yml cancels superseded runs only for pull requests", () => {
  expect(find("quality.yml").doc["concurrency"]).toMatchObject({
    "cancel-in-progress": "${{ github.event_name == 'pull_request' }}",
  });
});

test("METRO-59 each integration push gets its own concurrency group so no commit loses its verdict", () => {
  const concurrency = find("quality.yml").doc["concurrency"];
  const group = isRecord(concurrency) ? String(concurrency["group"]) : "";
  expect(group).toContain("github.sha");
  expect(group).toContain("github.event_name == 'pull_request'");
});

test("METRO-59 the rule flags an unconditional cancel and any cancel in credentialed work", () => {
  const unconditional = fixture(PLAIN_JOB, {
    extra: "concurrency:\n  group: g\n  cancel-in-progress: true\n",
  });
  expect(concurrencyViolations([unconditional])).toEqual([
    "fixture.yml workflow: cancel-in-progress is true",
  ]);
  const credentialed = fixture(DEPLOY_JOB, {
    on: "  workflow_dispatch:\n",
    extra:
      "concurrency:\n  group: g\n  cancel-in-progress: ${{ github.event_name == 'pull_request' }}\n",
  });
  expect(concurrencyViolations([credentialed])).toEqual([
    "fixture.yml workflow: credentialed work must never cancel in progress",
  ]);
});

test("METRO-59 a credentialed job's own group never cancels, even in a pull request workflow", () => {
  const parsed = fixture(`    concurrency:
      group: g
      cancel-in-progress: \${{ github.event_name == 'pull_request' }}
${DEPLOY_JOB}`);
  expect(concurrencyViolations([parsed])).toEqual([
    "fixture.yml job one: credentialed work must never cancel in progress",
  ]);
});

test("METRO-59 deploy, release and token-check workflows never cancel in progress", () => {
  for (const name of [
    "production-deploy.yml",
    "release-sync.yml",
    "release-draft.yml",
    "cloudflare-token-check.yml",
  ])
    expect(find(name).doc["concurrency"]).toMatchObject({ "cancel-in-progress": false });
});

test("METRO-59 the preview job and the cleanup job keep cancel-in-progress exactly false", () => {
  expect(find("quality.yml").jobs["preview"]?.["concurrency"]).toMatchObject({
    "cancel-in-progress": false,
  });
  expect(find("preview-cleanup.yml").jobs["cleanup"]?.["concurrency"]).toMatchObject({
    "cancel-in-progress": false,
  });
});

// METRO-99: the METRO-97 retry rule holds for every credentialed job that installs mise, in every workflow.
const RETRY_JOBS: readonly (readonly [string, string, number])[] = [
  ["quality.yml", "preview", 3],
  ["production-deploy.yml", "deploy", 3],
  ["preview-cleanup.yml", "cleanup", 2],
  ["cloudflare-token-check.yml", "check", 2],
  ["release-sync.yml", "sync", 2],
  ["release-draft.yml", "draft", 2],
];

function miseOf(steps: Record<string, unknown>[]) {
  return steps.filter(
    (step) => typeof step["uses"] === "string" && step["uses"].startsWith("jdx/mise-action"),
  );
}

function stepList(workflow: ReturnType<typeof find>, id: string): Record<string, unknown>[] {
  const steps = workflow.jobs[id]?.["steps"];
  if (!Array.isArray(steps)) return [];
  return (steps as unknown[]).filter(isRecord);
}

/** Applies `change` to a deep copy of one real workflow and returns the retry violations of that copy. */
function mutated(file: string, id: string, change: (steps: Record<string, unknown>[]) => void) {
  const copy = structuredClone(find(file));
  const steps = stepList(copy, id);
  change(steps);
  const job = copy.jobs[id];
  if (job !== undefined) job["steps"] = steps;
  return credentialedMiseRetryViolations([copy]);
}

function pick(steps: Record<string, unknown>[], name: string): Record<string, unknown> {
  const step = steps.find((candidate) => candidate["name"] === name);
  if (step === undefined) throw new Error(name);
  return step;
}

test("METRO-99 every credentialed job that installs mise is found, retried, cache-free and SHA pinned", () => {
  const found: string[] = [];
  for (const workflow of real)
    for (const [id, job] of Object.entries(workflow.jobs))
      if (isCredentialed(workflow, job) && miseOf(stepList(workflow, id)).length > 0)
        found.push(`${workflow.file}/${id}`);
  const expected = RETRY_JOBS.map(([file, id]) => `${file}/${id}`);
  expect(found).toHaveLength(expected.length);
  expect(new Set(found)).toEqual(new Set(expected));
  expect(credentialedMiseRetryViolations(real)).toEqual([]);
  expect(credentialedCacheViolations(real, readAction)).toEqual([]);
  for (const [file, id, count] of RETRY_JOBS) {
    const attempts = miseOf(stepList(find(file), id));
    expect(attempts, `${file} ${id}`).toHaveLength(count);
    for (const step of attempts) {
      expect(String(step["uses"])).toMatch(/^jdx\/mise-action@[0-9a-f]{40}$/u);
      expect(step["timeout-minutes"]).toBe(4);
      expect(isRecord(step["with"]) ? step["with"]["cache"] : undefined).toBe(false);
    }
  }
});

test("METRO-99 each weakening of the chain is reported for every credentialed workflow", () => {
  const first = "Install pinned tools with mise";
  const second = "Install pinned tools with mise (second attempt)";
  const wait = "Wait before the second tool install";
  for (const [file, id, count] of RETRY_JOBS) {
    const at = `${file} job ${id} step `;
    const last = count === 3 ? "Install pinned tools with mise (third attempt)" : second;
    const gate = `${at}${second}: must run only when steps.mise1.outcome == 'failure'`;
    expect(
      mutated(file, id, (s) => delete pick(s, first)["continue-on-error"]),
      file,
    ).toEqual([`${at}${first}: an earlier attempt must set continue-on-error: true`]);
    expect(
      mutated(file, id, (s) => (pick(s, last)["continue-on-error"] = true)),
      file,
    ).toEqual([`${at}${last}: the last attempt must not continue on error`]);
    expect(
      mutated(file, id, (s) => delete pick(s, second)["timeout-minutes"]),
      file,
    ).toEqual([`${at}${second}: needs timeout-minutes between 1 and 5`]);
    expect(
      mutated(file, id, (s) => (pick(s, second)["if"] = "${{ always() }}")),
      file,
    ).toEqual([gate]);
    for (const extra of ["|| true", "&& always()"])
      expect(
        mutated(
          file,
          id,
          (s) => (pick(s, second)["if"] = `\${{ steps.mise1.outcome == 'failure' ${extra} }}`),
        ),
        file,
      ).toEqual([gate]);
    expect(
      mutated(file, id, (s) => (pick(s, wait)["run"] = "sleep 600")),
      file,
    ).toEqual([`${at}${second}: needs a "sleep N" step (N <= 120) directly before it`]);
    expect(
      mutated(file, id, (s) => (pick(s, first)["if"] = "${{ always() }}")),
      file,
    ).toEqual([`${file} job ${id}: the first mise attempt must not have an if`]);
    expect(
      mutated(file, id, (s) => (pick(s, second)["uses"] = "jdx/mise-action@v5")),
      file,
    ).toEqual([`${at}${second}: differs from the first attempt in uses or with`]);
    expect(
      mutated(file, id, (s) => {
        for (let i = s.length - 1; i >= 0; i--) {
          const name = String(s[i]?.["name"]);
          if (name.startsWith("Wait before") || name.includes("attempt)")) s.splice(i, 1);
        }
        delete pick(s, first)["continue-on-error"];
      }),
      file,
    ).toEqual([`${file} job ${id}: mise install has no retry attempt`]);
  }
});

test("METRO-99 each credentialed job's timeout-minutes covers its retry budget", () => {
  for (const [file, id, count] of RETRY_JOBS) {
    const limit = find(file).jobs[id]?.["timeout-minutes"];
    const chain = count * 4 * 60 + (count === 3 ? 90 : 30);
    expect(typeof limit === "number" && limit * 60 > chain + 180, `${file} ${id}`).toBe(true);
    for (const value of [Math.ceil((chain + 180) / 60) - 1, undefined]) {
      const copy = structuredClone(find(file));
      const target = copy.jobs[id] ?? {};
      if (value === undefined) delete target["timeout-minutes"];
      else target["timeout-minutes"] = value;
      expect(credentialedMiseRetryViolations([copy]), `${file} ${id} ${String(value)}`).toEqual([
        `${file} job ${id}: retry chain ${chain} s plus 180 s margin does not fit in timeout-minutes ${JSON.stringify(value) ?? "undefined"}`,
      ]);
    }
  }
});
