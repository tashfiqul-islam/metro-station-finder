import { readFileSync } from "node:fs";

import { isRecord } from "./guards";
import {
  browserInstallTimeoutViolations,
  credentialedCacheViolations,
  isCredentialed,
  playwrightProjects,
  setupDriftViolations,
  smokeProjectViolations,
  toParsedWorkflow,
  type ParsedWorkflow,
} from "./workflow-policy";

const text = readFileSync(".github/workflows/quality.yml", "utf8");
const config = readFileSync("playwright.config.ts", "utf8");
const quality = toParsedWorkflow("quality.yml", Bun.YAML.parse(text));

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

function stepAt(steps: Record<string, unknown>[], index: number): Record<string, unknown> {
  const step = steps[index];
  if (step === undefined) throw new Error(`No step ${index}`);
  return step;
}

/** A one-job workflow with a single Playwright install step; `limit` is the YAML lines for its timeout. */
function installFixture(limit: string): ParsedWorkflow {
  return toParsedWorkflow(
    "fixture.yml",
    Bun.YAML.parse(`on: pull_request
jobs:
  one:
    runs-on: ubuntu-24.04
    steps:
      - name: Install browsers
${limit}        run: bun run playwright install --with-deps chromium
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

test("METRO-90 the smoke check flags a dropped project and an unknown one", () => {
  const dropped = cloneQuality();
  const include = matrixInclude(dropped);
  include.pop();
  expect(smokeProjectViolations(dropped, config)).toEqual([
    "quality.yml: project mobile-chrome is not smoked",
  ]);
  include.push({ project: "opera", browsers: "chromium" });
  expect(smokeProjectViolations(dropped, config)).toContain("quality.yml: unknown project opera");
});

test("METRO-90 build and smoke repeat the same setup steps with the same pinned actions", () => {
  expect(setupDriftViolations(quality, "build", "smoke")).toEqual([]);
});

test("METRO-90 the setup check flags a changed pin and an extra step", () => {
  const drifted = cloneQuality();
  const smoke = stepsOf(job(drifted, "smoke"));
  stepAt(smoke, 0)["uses"] = "actions/checkout@0000000000000000000000000000000000000000";
  stepAt(smoke, 3)["name"] = "Renamed";
  expect(setupDriftViolations(drifted, "build", "smoke")).toEqual([
    'quality.yml: step 1 differs: build has "Check out the repository | actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1", smoke has "Check out the repository | actions/checkout@0000000000000000000000000000000000000000"',
    'quality.yml: step 4 differs: build has "Resolve Playwright version and runner image | run", smoke has "Renamed | run"',
  ]);
});

test("METRO-90 every Playwright install step has a step timeout of at most ten minutes", () => {
  expect(browserInstallTimeoutViolations([quality])).toEqual([]);
  for (const id of ["build", "smoke"]) {
    const install = stepsOf(job(quality, id)).find(
      (step) => step["name"] === "Install Playwright browsers",
    );
    expect(install?.["timeout-minutes"], id).toBe(5);
    // Bounded attempts: every attempt is cut by `timeout` (it also ends a root child started with sudo).
    expect(textOf(install?.["run"]), id).toContain("for attempt in 1 2; do");
    expect(textOf(install?.["run"]), id).toContain(
      "timeout --kill-after=5s 140s bun run playwright install --with-deps",
    );
  }
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

test("METRO-90 the system package cache is keyed by image and Playwright version and saved only after the install", () => {
  for (const id of ["build", "smoke"]) {
    const steps = stepsOf(job(quality, id));
    const names = steps.map((step) => textOf(step["name"]));
    const restore = steps.find((step) => step["name"] === "Restore the system package cache");
    const withInputs = restore?.["with"];
    expect(isRecord(withInputs) ? withInputs["path"] : undefined, id).toBe("~/apt-archives");
    const key = isRecord(withInputs) ? textOf(withInputs["key"]) : "";
    expect(key, id).toContain("steps.playwright.outputs.image");
    expect(key, id).toContain("steps.playwright.outputs.version");
    expect(names.indexOf("Restore the system package cache"), id).toBeLessThan(
      names.indexOf("Install Playwright browsers"),
    );
    expect(names.indexOf("Install Playwright browsers"), id).toBeLessThan(
      names.indexOf("Prepare the system package cache for saving"),
    );
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
