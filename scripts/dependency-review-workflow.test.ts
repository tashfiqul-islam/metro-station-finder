import { readFileSync } from "node:fs";

import { isRecord } from "./guards";
import {
  botExclusionViolations,
  concurrencyViolations,
  credentialedCacheViolations,
  isCredentialed,
  toParsedWorkflow,
} from "./workflow-policy";

const FILE = ".github/workflows/dependency-review.yml";
const text = readFileSync(FILE, "utf8");
const doc: unknown = Bun.YAML.parse(text);
const parsed = toParsedWorkflow("dependency-review.yml", doc);

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`);
  return value;
}

function reviewJob() {
  const jobs = Object.values(parsed.jobs);
  if (jobs.length !== 1) throw new Error(`Expected exactly one job, got ${jobs.length}`);
  const job = record(jobs[0], "job");
  const steps = job["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return { job, steps: (steps as unknown[]).map((s, i) => record(s, `step ${i}`)) };
}

test("METRO-48 dependency review runs on pull requests only", () => {
  const triggers = record(parsed.doc["on"], "on");
  expect(Object.keys(triggers)).toEqual(["pull_request"]);
  expect(record(triggers["pull_request"], "pull_request")["branches"]).toEqual([
    "feature/metro-rebuild",
    "main",
  ]);
  for (const trigger of ["pull_request_target", "workflow_run", "push:", "schedule", "workflow_"])
    expect(text).not.toContain(trigger);
});

test("METRO-48 permissions are empty at workflow level and contents read on the job", () => {
  expect(parsed.doc["permissions"]).toEqual({});
  const { job } = reviewJob();
  expect(job["permissions"]).toEqual({ contents: "read" });
  expect(text).not.toMatch(/pull-requests|security-events|write/u);
});

test("METRO-48 the action is pinned to the v5.0.0 commit and every step is named", () => {
  const { steps } = reviewJob();
  expect(steps).toHaveLength(1);
  const [review = {}] = steps;
  expect(review["uses"]).toBe(
    "actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294",
  );
  expect(text).toContain("# v5.0.0");
  expect(typeof review["name"] === "string" && review["name"] !== "").toBe(true);
  expect(record(review["with"], "with")["fail-on-severity"]).toBe("high");
  expect(record(review["with"], "with")["comment-summary-in-pr"]).toBeUndefined();
});

test("METRO-48 no secrets, no environment, no cache, no local action: the job holds no credential", () => {
  expect(text).not.toMatch(/secrets\.|secrets:|environment:|CLOUDFLARE_|PLANE_/u);
  expect(text).not.toContain("actions/cache");
  expect(text).not.toContain("jdx/mise-action");
  expect(text).not.toContain("uses: ./");
  expect(isCredentialed(parsed, reviewJob().job)).toBe(false);
  expect(credentialedCacheViolations([parsed])).toEqual([]);
  expect(botExclusionViolations([parsed])).toEqual([]);
  expect(concurrencyViolations([parsed])).toEqual([]);
});

test("METRO-48 dependency review is not part of the required Quality gates aggregate", () => {
  const quality = readFileSync(".github/workflows/quality.yml", "utf8");
  expect(quality).not.toContain("dependency-review");
  expect(quality).not.toContain("dependency_review");
  const aggregate = record(
    record(record(Bun.YAML.parse(quality), "quality")["jobs"], "jobs")["quality"],
    "quality",
  );
  expect(JSON.stringify(aggregate["needs"])).not.toContain("dependency");
});
