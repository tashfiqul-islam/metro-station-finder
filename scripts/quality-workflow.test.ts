import { readFileSync } from "node:fs";

import { isRecord } from "./guards";
import {
  browserInstallTimeoutViolations,
  credentialedCacheViolations,
  credentialedMiseRetryViolations,
  installBudgetSeconds,
  installBudgetViolations,
  isCredentialed,
  playwrightProjects,
  setupDriftViolations,
  smokeProjectViolations,
  toParsedWorkflow,
  uncredentialedMiseCacheViolations,
  type DriftOptions,
  type ParsedWorkflow,
} from "./workflow-policy";

const text = readFileSync(".github/workflows/quality.yml", "utf8");
const config = readFileSync("playwright.config.ts", "utf8");
const quality = toParsedWorkflow("quality.yml", Bun.YAML.parse(text));

/** The steps that must be identical between `build` and `smoke`, and the one step only `build` has. */
const DRIFT_IDENTICAL = [
  "Check out the repository",
  "Install pinned tools with mise",
  "Install dependencies",
  "Resolve Playwright version and runner image",
  "Keep downloaded system packages in a cacheable directory",
  "Prepare the system package cache for saving",
  "Build the application",
];

const DRIFT: DriftOptions = {
  identical: DRIFT_IDENTICAL,
  // The bundle budget is checked once, by the Chromium job, because the bundle does not depend on the browser.
  onlyIn: { build: ["Check the bundle budget"] },
};

function job(workflow: ParsedWorkflow, id: string): Record<string, unknown> {
  const found = workflow.jobs[id];
  if (found === undefined) throw new Error(`No job ${id}`);
  return found;
}

function stepsOf(entry: Record<string, unknown>): Record<string, unknown>[] {
  const steps = entry["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return steps.filter(isRecord);
}

/** A string field, or "" when absent, so no value is ever stringified as an object. */
function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cloneQuality(): ParsedWorkflow {
  return toParsedWorkflow("quality.yml", structuredClone(Bun.YAML.parse(text)));
}

function matrixInclude(workflow: ParsedWorkflow): unknown[] {
  const strategy = job(workflow, "smoke")["strategy"];
  const matrix = isRecord(strategy) ? strategy["matrix"] : undefined;
  const include = isRecord(matrix) ? matrix["include"] : undefined;
  if (!Array.isArray(include)) throw new Error("smoke has no matrix include");
  return include;
}

function stepNamed(workflow: ParsedWorkflow, id: string, name: string): Record<string, unknown> {
  const found = stepsOf(job(workflow, id)).find((step) => step["name"] === name);
  if (found === undefined) throw new Error(`No step ${name} in ${id}`);
  return found;
}

/** A one-job workflow with a single Playwright install step; `limit` is the YAML lines for its timeout. */
function installFixture(limit: string, command = "bun run playwright install"): ParsedWorkflow {
  return toParsedWorkflow(
    "fixture.yml",
    Bun.YAML.parse(`on: pull_request
jobs:
  one:
    runs-on: ubuntu-24.04
    steps:
      - name: Install browsers
${limit}        run: ${command} --with-deps chromium
`),
  );
}

/** A deep copy of quality.yml with one more step appended to a job, so the real file is never mutated. */
function withExtraStep(id: string, step: Record<string, unknown>): ParsedWorkflow {
  const copy = cloneQuality();
  const steps = job(copy, id)["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  steps.push(step);
  return copy;
}

test("METRO-90 the required check names are unchanged", () => {
  const names = Object.fromEntries(
    Object.entries(quality.jobs).map(([id, entry]) => [id, entry["name"]]),
  );
  expect(names["changes"]).toBe("Changes");
  expect(names["checks"]).toBe("Checks");
  expect(names["build"]).toBe("Build and smoke");
  expect(names["security"]).toBe("Security");
  expect(names["quality"]).toBe("Quality gates");
  expect(names["preview"]).toBe("Cloudflare preview");
});

test("METRO-90 Quality gates and the preview wait for the parallel smoke job", () => {
  const all = ["changes", "checks", "build", "smoke", "security"];
  expect(job(quality, "quality")["needs"]).toEqual(all);
  expect(job(quality, "preview")["needs"]).toEqual(all);
  expect(job(quality, "smoke")["needs"]).toEqual(["changes"]);
  expect(job(quality, "smoke")["if"]).toBe(job(quality, "build")["if"]);
});

test("METRO-90 the smoke runs every Playwright project, in the build job or the smoke matrix", () => {
  expect(playwrightProjects(config)).toEqual(["chromium", "firefox", "webkit", "mobile-chrome"]);
  expect(smokeProjectViolations(quality, config)).toEqual([]);
});

test("METRO-90 the smoke check flags a dropped project, an unknown one and a wrong browser", () => {
  const dropped = cloneQuality();
  const include = matrixInclude(dropped);
  include.pop();
  expect(smokeProjectViolations(dropped, config)).toEqual([
    "quality.yml: project mobile-chrome is not smoked",
  ]);
  include.push({ project: "opera", browsers: "chromium" });
  expect(smokeProjectViolations(dropped, config)).toContain("quality.yml: unknown project opera");
  const wrong = cloneQuality();
  const entry = matrixInclude(wrong)[0];
  if (!isRecord(entry)) throw new Error("matrix entry is not an object");
  entry["browsers"] = "webkit";
  expect(smokeProjectViolations(wrong, config)).toEqual([
    'quality.yml: smoke matrix project firefox installs "webkit", needs firefox',
  ]);
});

test("METRO-90 the smoke check flags a run step that ignores the matrix project or browsers", () => {
  const fixed = cloneQuality();
  stepNamed(fixed, "smoke", "Run browser smoke tests")["run"] = "bun run smoke -- --shuffle";
  expect(smokeProjectViolations(fixed, config)).toEqual([
    'quality.yml: smoke run step does not pass --project="$PROJECT"',
  ]);
  const env = cloneQuality();
  const run = stepNamed(env, "smoke", "Run browser smoke tests");
  run["env"] = { PROJECT: "chromium" };
  expect(smokeProjectViolations(env, config)).toEqual([
    "quality.yml: smoke run step PROJECT is not the matrix project",
  ]);
  const browsers = cloneQuality();
  const install = stepNamed(browsers, "smoke", "Install Playwright browsers");
  install["run"] = textOf(install["run"]).replaceAll('"$BROWSERS"', "chromium");
  install["env"] = { BROWSERS: "chromium" };
  expect(smokeProjectViolations(browsers, config)).toEqual([
    'quality.yml: smoke install step does not install "$BROWSERS"',
    "quality.yml: smoke install step BROWSERS is not the matrix browsers",
  ]);
});

test("METRO-90 the smoke check flags a switched-off job or step", () => {
  const off = cloneQuality();
  job(off, "smoke")["if"] = false;
  stepNamed(off, "build", "Run browser smoke tests")["if"] = "${{ false }}";
  stepNamed(off, "smoke", "Build the application")["if"] = "false";
  expect(smokeProjectViolations(off, config)).toEqual([
    "quality.yml: job build step Run browser smoke tests is switched off",
    "quality.yml: job smoke is switched off",
    "quality.yml: job smoke step Build the application is switched off",
  ]);
});

test("METRO-90 build and smoke repeat the same setup with the same pinned actions", () => {
  expect(setupDriftViolations(quality, "build", "smoke", DRIFT)).toEqual([]);
});

test("METRO-90 the setup check flags a changed pin, changed run text and an unlisted tail step", () => {
  const drifted = cloneQuality();
  stepNamed(drifted, "smoke", "Check out the repository")["uses"] =
    "actions/checkout@0000000000000000000000000000000000000000";
  stepNamed(drifted, "smoke", "Install dependencies")["run"] = "bun install";
  expect(setupDriftViolations(drifted, "build", "smoke", DRIFT)).toEqual([
    'quality.yml: step "Check out the repository" uses a different action in build and smoke',
    'quality.yml: step "Install dependencies" differs between build and smoke',
  ]);
  // The bundle check is allowed only in build; without the allow-list it is a drift.
  expect(setupDriftViolations(quality, "build", "smoke", { identical: DRIFT_IDENTICAL })).toEqual([
    'quality.yml: step "Check the bundle budget" is only in build',
  ]);
  // A tail step dropped from build (the report upload) is reported as only in smoke.
  const dropped = cloneQuality();
  const buildSteps = job(dropped, "build")["steps"];
  if (!Array.isArray(buildSteps)) throw new Error("steps is not a list");
  buildSteps.splice(
    buildSteps.findIndex(
      (step) => isRecord(step) && step["name"] === "Upload Playwright report and traces",
    ),
    1,
  );
  expect(setupDriftViolations(dropped, "build", "smoke", DRIFT)).toEqual([
    'quality.yml: step "Upload Playwright report and traces" is only in smoke',
  ]);
});

test("METRO-90 the setup check flags shared steps in a different order and a job without steps", () => {
  const swapped = cloneQuality();
  const smokeSteps = job(swapped, "smoke")["steps"];
  if (!Array.isArray(smokeSteps)) throw new Error("steps is not a list");
  const list: unknown[] = smokeSteps;
  const head = list.splice(0, 2);
  list.unshift(head[1], head[0]);
  expect(setupDriftViolations(swapped, "build", "smoke", DRIFT)).toEqual([
    "quality.yml: shared steps of build and smoke are in a different order",
  ]);
  expect(setupDriftViolations(quality, "build", "missing", DRIFT)).toEqual([
    "quality.yml: job build or missing has no steps",
  ]);
  expect(setupDriftViolations(quality, "missing", "smoke")).toEqual([
    "quality.yml: job missing or smoke has no steps",
  ]);
});

test("METRO-90 every Playwright install step has a step timeout of at most ten minutes", () => {
  expect(browserInstallTimeoutViolations([quality])).toEqual([]);
  for (const id of ["build", "smoke"]) {
    const install = stepNamed(quality, id, "Install Playwright browsers");
    expect(install["timeout-minutes"], id).toBe(6);
    const run = textOf(install["run"]);
    // Bounded attempts: every attempt is cut by `timeout` (it also ends a root child started with sudo).
    expect(run, id).toContain("for attempt in 1 2; do");
    expect(run, id).toContain(
      "timeout --kill-after=5s 140s bun run playwright install --with-deps",
    );
    // The killed attempt leaves its root apt-get running; the retry would fail on the dpkg lock without this.
    expect(run, id).toContain("sudo pkill -x apt-get");
    expect(run, id).toContain("sudo dpkg --configure -a || true");
    // The mirror switch runs only between attempts, cannot abort the step, and says whether it worked. A run step
    // without `shell:` uses `bash -e {0}` (no pipefail), so the script must not rely on pipefail; it has no pipes.
    expect(run, id).toContain('if [ "$attempt" = 1 ]; then');
    expect(run, id).toContain(
      'if compgen -G "/etc/apt/sources.list.d/*.sources" > /dev/null; then',
    );
    expect(run, id).toContain("http://archive.ubuntu.com/ubuntu/");
    expect(run, id).toContain("|| true\n");
    // The notice needs the original token to be present before the sed and gone after it.
    expect(run, id).toContain(
      'if grep -qs "mirror+file:/etc/apt/apt-mirrors.txt" /etc/apt/sources.list.d/*.sources; then',
    );
    expect(run, id).toContain(
      'if ! grep -qs "mirror+file:/etc/apt/apt-mirrors.txt" /etc/apt/sources.list.d/*.sources; then switched=yes; fi',
    );
    expect(run, id).not.toMatch(/[^|]\|[^|]/u);
    expect(run, id).toContain("::notice::Retrying the Playwright install from archive.ubuntu.com");
    expect(run, id).toContain("::warning::Could not switch the apt mirror");
  }
});

test("METRO-90 the retry budget fits inside the step timeout", () => {
  expect(installBudgetViolations([quality])).toEqual([]);
  for (const id of ["build", "smoke"]) {
    const run = textOf(stepNamed(quality, id, "Install Playwright browsers")["run"]);
    expect(installBudgetSeconds(run), id).toBe(2 * (5 + 140) + 15);
  }
});

test("METRO-90 the budget check flags a step limit that cuts the retry and a missing loop", () => {
  const tight = cloneQuality();
  stepNamed(tight, "build", "Install Playwright browsers")["timeout-minutes"] = 5;
  expect(installBudgetViolations([tight])).toEqual([
    "quality.yml job build step Install Playwright browsers: retry budget 305 s does not fit in timeout-minutes 5",
  ]);
  const noLoop = installFixture("        timeout-minutes: 5\n");
  expect(installBudgetViolations([noLoop])).toEqual([
    "fixture.yml job one step Install browsers: no bounded retry loop",
  ]);
  const unset = cloneQuality();
  delete stepNamed(unset, "smoke", "Install Playwright browsers")["timeout-minutes"];
  expect(installBudgetViolations([unset])).toEqual([
    "quality.yml job smoke step Install Playwright browsers: retry budget 305 s does not fit in timeout-minutes undefined",
  ]);
});

test("METRO-90 the timeout check flags a missing, zero, oversized or non-numeric limit", () => {
  expect(browserInstallTimeoutViolations([installFixture("        timeout-minutes: 5\n")])).toEqual(
    [],
  );
  for (const [limit, found] of [
    ["", "undefined"],
    ["        timeout-minutes: 0\n", "0"],
    ["        timeout-minutes: 30\n", "30"],
    ['        timeout-minutes: "5"\n', '"5"'],
  ] as const)
    expect(browserInstallTimeoutViolations([installFixture(limit)])).toEqual([
      `fixture.yml job one step Install browsers: needs timeout-minutes between 1 and 10, found ${found}`,
    ]);
});

test("METRO-90 the timeout check sees an install command with extra spaces or tabs", () => {
  for (const command of ["bun run playwright  install", "bunx playwright\tinstall"])
    expect(browserInstallTimeoutViolations([installFixture("", command)])).toEqual([
      "fixture.yml job one step Install browsers: needs timeout-minutes between 1 and 10, found undefined",
    ]);
});

test("METRO-90 the caches are restored before the install and saved right after it, before the build and smoke steps", () => {
  for (const id of ["build", "smoke"]) {
    const steps = stepsOf(job(quality, id));
    const names = steps.map((step) => textOf(step["name"]));
    const at = (name: string) => names.indexOf(name);
    for (const [restore, save, path] of [
      ["Restore the system package cache", "Save the system package cache", "~/apt-archives"],
      [
        "Restore the Playwright browser cache",
        "Save the Playwright browser cache",
        "~/.cache/ms-playwright",
      ],
    ] as const) {
      const restoreStep = stepNamed(quality, id, restore);
      const saveStep = stepNamed(quality, id, save);
      expect(textOf(restoreStep["uses"]), id).toMatch(/^actions\/cache\/restore@[0-9a-f]{40}$/u);
      expect(textOf(saveStep["uses"]), id).toMatch(/^actions\/cache\/save@[0-9a-f]{40}$/u);
      expect(restoreStep["with"], id).toMatchObject({ path });
      expect(saveStep["with"], id).toMatchObject({ path });
      // Saved only when the restore missed, and under the exact key the restore tried.
      expect(textOf(saveStep["if"]), id).toContain("cache-hit != 'true'");
      expect(textOf(isRecord(saveStep["with"]) ? saveStep["with"]["key"] : ""), id).toContain(
        "cache-primary-key",
      );
      expect(at(restore), id).toBeLessThan(at("Install Playwright browsers"));
      expect(at(save), id).toBeGreaterThan(at("Install Playwright browsers"));
      // The build, smoke and report upload steps run after the save (bootstrap and the install ran before it).
      expect(at(save), id).toBeLessThan(at("Build the application"));
    }
    const inputs = stepNamed(quality, id, "Restore the system package cache")["with"];
    const key = textOf(isRecord(inputs) ? inputs["key"] : undefined);
    expect(key, id).toContain("steps.playwright.outputs.image");
    expect(key, id).toContain("steps.playwright.outputs.version");
  }
});

test("METRO-90 the preview job holds the Cloudflare token and restores no cache or shared artifact", () => {
  const preview = job(quality, "preview");
  expect(isCredentialed(quality, preview)).toBe(true);
  const uses = stepsOf(preview).map((step) => textOf(step["uses"]));
  expect(uses.filter((value) => /^actions\/(cache|download-artifact)/u.test(value))).toEqual([]);
  const mise = stepsOf(preview).find((step) => textOf(step["uses"]).startsWith("jdx/mise-action"));
  expect(isRecord(mise?.["with"]) ? mise["with"]["cache"] : undefined).toBe(false);
  expect(credentialedCacheViolations([quality])).toEqual([]);
});

test("METRO-90 the jobs that do restore caches hold no credential, so the cache rule does not reach them", () => {
  for (const id of ["checks", "build", "smoke", "security", "changes", "quality"])
    expect(isCredentialed(quality, job(quality, id)), id).toBe(false);
});

test("METRO-90 the credentialed cache rule fails when the preview job restores a cache", () => {
  for (const [step, expected] of [
    [
      { name: "Restore a cache", uses: "actions/cache@x", with: { path: "p", key: "k" } },
      "quality.yml job preview step Restore a cache: restores a cache",
    ],
    [
      { name: "Restore only", uses: "actions/cache/restore@x", with: { path: "p", key: "k" } },
      "quality.yml job preview step Restore only: restores a cache",
    ],
    [
      { name: "Save only", uses: "actions/cache/save@x", with: { path: "p", key: "k" } },
      "quality.yml job preview step Save only: restores a cache",
    ],
    [
      { name: "Fetch the build", uses: "actions/download-artifact@x", with: { name: "dist" } },
      "quality.yml job preview step Fetch the build: downloads a shared artifact",
    ],
    [
      { name: "Mise with cache", uses: "jdx/mise-action@x", with: { cache: true } },
      "quality.yml job preview step Mise with cache: mise-action without cache: false",
    ],
  ] as const)
    expect(credentialedCacheViolations([withExtraStep("preview", step)])).toEqual([expected]);
});

test("METRO-90 a composite action in the preview job is read and its cache is flagged", () => {
  const parsed = withExtraStep("preview", { name: "Setup", uses: "./.github/actions/setup" });
  expect(
    credentialedCacheViolations([parsed], () => ({
      runs: { using: "composite", steps: [{ name: "Cache", uses: "actions/cache@x" }] },
    })),
  ).toEqual([
    "quality.yml job preview step Setup (action ./.github/actions/setup) step Cache: restores a cache",
  ]);
});

const isMise = (step: Record<string, unknown>) =>
  textOf(step["uses"]).startsWith("jdx/mise-action");

function previewSteps(workflow: ParsedWorkflow): Record<string, unknown>[] {
  return stepsOf(job(workflow, "preview"));
}

test("METRO-97 the uncredentialed jobs keep mise-action's cache on and the rule rejects cache: false", () => {
  expect(uncredentialedMiseCacheViolations([quality])).toEqual([]);
  for (const id of ["changes", "checks", "build", "smoke", "security", "quality"])
    expect(stepsOf(job(quality, id)).filter(isMise), id).toHaveLength(1);
  for (const value of [false, "false"]) {
    const copy = cloneQuality();
    const mise = stepsOf(job(copy, "changes")).find(isMise);
    if (mise === undefined || !isRecord(mise["with"])) throw new Error("no mise step");
    mise["with"]["cache"] = value;
    expect(uncredentialedMiseCacheViolations([copy])).toEqual([
      "quality.yml job changes step Install pinned tools with mise: mise-action disables its cache",
    ]);
  }
  // The credentialed preview job is not this rule's business (it must disable the cache).
  const extra = withExtraStep("preview", { uses: "jdx/mise-action@x" });
  expect(uncredentialedMiseCacheViolations([extra])).toEqual([]);
});

test("METRO-97 the preview job installs mise without a cache but with a bounded retry chain", () => {
  expect(credentialedMiseRetryViolations([quality])).toEqual([]);
  const attempts = previewSteps(quality).filter(isMise);
  expect(attempts).toHaveLength(3);
  for (const step of attempts)
    expect(isRecord(step["with"]) ? step["with"]["cache"] : undefined).toBe(false);
  expect(credentialedCacheViolations([quality])).toEqual([]);
  // Every mise-action step in every job pins the same commit.
  const pins = new Set(
    Object.values(quality.jobs).flatMap((entry) =>
      stepsOf(entry)
        .filter(isMise)
        .map((step) => step["uses"]),
    ),
  );
  expect(pins.size).toBe(1);
});

const FIRST = "Install pinned tools with mise";
const SECOND = "Install pinned tools with mise (second attempt)";
const THIRD = "Install pinned tools with mise (third attempt)";
const WAIT_2 = "Wait before the second tool install";
const WAIT_3 = "Wait before the third tool install";

function named(steps: Record<string, unknown>[], name: string): Record<string, unknown> {
  const found = steps.find((step) => step["name"] === name);
  if (found === undefined) throw new Error(name);
  return found;
}

function mutatePreview(change: (steps: Record<string, unknown>[]) => void): string[] {
  const copy = cloneQuality();
  const steps = previewSteps(copy);
  change(steps);
  job(copy, "preview")["steps"] = steps;
  return credentialedMiseRetryViolations([copy]);
}

test("METRO-97 the retry rule fails a preview job whose chain is weakened", () => {
  const where = "quality.yml job preview step ";
  const single = mutatePreview((steps) => {
    for (const name of [SECOND, THIRD, WAIT_2, WAIT_3])
      steps.splice(steps.indexOf(named(steps, name)), 1);
    named(steps, FIRST)["continue-on-error"] = false;
  });
  expect(single).toEqual(["quality.yml job preview: mise install has no retry attempt"]);
  expect(mutatePreview((steps) => delete named(steps, FIRST)["continue-on-error"])).toEqual([
    `${where}${FIRST}: an earlier attempt must set continue-on-error: true`,
  ]);
  expect(mutatePreview((steps) => (named(steps, THIRD)["continue-on-error"] = true))).toEqual([
    `${where}${THIRD}: the last attempt must not continue on error`,
  ]);
  expect(mutatePreview((steps) => delete named(steps, SECOND)["timeout-minutes"])).toEqual([
    `${where}${SECOND}: needs timeout-minutes between 1 and 5`,
  ]);
  expect(mutatePreview((steps) => (named(steps, THIRD)["timeout-minutes"] = 6))).toEqual([
    `${where}${THIRD}: needs timeout-minutes between 1 and 5`,
  ]);
  expect(mutatePreview((steps) => (named(steps, SECOND)["if"] = "${{ always() }}"))).toEqual([
    `${where}${SECOND}: must run only when steps.mise1.outcome == 'failure'`,
  ]);
  expect(mutatePreview((steps) => delete named(steps, FIRST)["id"])).toEqual([
    `${where}${SECOND}: must run only when steps.undefined.outcome == 'failure'`,
  ]);
  expect(mutatePreview((steps) => (named(steps, WAIT_2)["run"] = "sleep 600"))).toEqual([
    `${where}${SECOND}: needs a "sleep N" step (N <= 120) directly before it`,
  ]);
  expect(mutatePreview((steps) => (named(steps, WAIT_3)["run"] = "echo hi"))).toEqual([
    `${where}${THIRD}: needs a "sleep N" step (N <= 120) directly before it`,
  ]);
});

test("METRO-97 the retry rule ignores uncredentialed jobs and credentialed jobs without mise", () => {
  expect(credentialedMiseRetryViolations([dropPreview(cloneQuality())])).toEqual([]);
  const bare = toParsedWorkflow(
    "fixture.yml",
    Bun.YAML.parse(
      "on: pull_request\njobs:\n  one:\n    environment: x\n    steps:\n      - run: echo\n",
    ),
  );
  expect(credentialedMiseRetryViolations([bare])).toEqual([]);
});

function dropPreview(workflow: ParsedWorkflow): ParsedWorkflow {
  const { preview: _removed, ...rest } = workflow.jobs;
  return { ...workflow, jobs: rest };
}
