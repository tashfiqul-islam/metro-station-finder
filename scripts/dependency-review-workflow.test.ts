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
});

test("METRO-48 permissions are empty at workflow level and contents read on the job", () => {
  expect(parsed.doc["permissions"]).toEqual({});
  const { job } = reviewJob();
  expect(job["permissions"]).toEqual({ contents: "read" });
  expect(new Set(Object.keys(parsed.doc))).toEqual(
    new Set(["concurrency", "jobs", "name", "on", "permissions"]),
  );
  expect(Object.values(record(job["permissions"], "permissions"))).not.toContain("write");
});

test("METRO-48 the action is pinned to the v5.0.0 commit and every step is named", () => {
  const { steps } = reviewJob();
  expect(steps).toHaveLength(1);
  const [review = {}] = steps;
  expect(review["uses"]).toBe(
    "actions/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294",
  );
  const usesLine = text.split("\n").find((line) => line.includes("dependency-review-action@"));
  expect(usesLine?.trimEnd().endsWith("# v5.0.0")).toBe(true);
  expect(typeof review["name"] === "string" && review["name"] !== "").toBe(true);
  expect(record(review["with"], "with")["fail-on-severity"]).toBe("high");
  expect(record(review["with"], "with")["comment-summary-in-pr"]).toBeUndefined();
});

test("METRO-48 no secrets, no environment, no cache, no local action: the job holds no credential", () => {
  const { job, steps } = reviewJob();
  expect(JSON.stringify(parsed.doc)).not.toMatch(/secrets|CLOUDFLARE_|PLANE_/u);
  expect(job["environment"]).toBeUndefined();
  expect(job["secrets"]).toBeUndefined();
  expect(parsed.doc["env"]).toBeUndefined();
  for (const step of steps) {
    const uses = typeof step["uses"] === "string" ? step["uses"] : "";
    expect(uses.startsWith("./")).toBe(false);
    expect(uses.startsWith("actions/cache")).toBe(false);
    expect(uses.startsWith("jdx/mise-action")).toBe(false);
  }
  expect(isCredentialed(parsed, job)).toBe(false);
  expect(credentialedCacheViolations([parsed])).toEqual([]);
  expect(botExclusionViolations([parsed])).toEqual([]);
  expect(concurrencyViolations([parsed])).toEqual([]);
});

test("METRO-48 dependency review is not part of the required Quality gates aggregate", () => {
  const quality = readFileSync(".github/workflows/quality.yml", "utf8");
  const jobs = record(record(Bun.YAML.parse(quality), "quality")["jobs"], "jobs");
  const aggregate = record(jobs["quality"], "quality");
  expect(aggregate["needs"]).toEqual(["changes", "checks", "build", "security"]);
  for (const job of Object.values(jobs))
    expect(JSON.stringify(job)).not.toContain("dependency-review-action");
});
