import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { isRecord } from "./guards";

const text = readFileSync(".github/workflows/quality.yml", "utf8");

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`);
  return value;
}

function parsed() {
  const doc = record(Bun.YAML.parse(text), "workflow");
  const jobs = record(doc["jobs"], "jobs");
  const job = record(jobs["review"], "jobs.review");
  const steps = job["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return { doc, jobs, job, steps: (steps as unknown[]).map((s, i) => record(s, `step ${i}`)) };
}

test("METRO-36 the reviewer job is part of the Quality gates aggregate", () => {
  const { jobs } = parsed();
  const quality = record(jobs["quality"], "jobs.quality");
  expect(quality["needs"]).toEqual(["checks", "build", "security", "review"]);
  expect(quality["if"]).toBe("${{ always() }}");
});

test("METRO-36 the aggregate script requires the reviewer job", () => {
  expect(readFileSync("scripts/ci-results.ts", "utf8")).toContain('"review"');
});

test("METRO-36 pull request body edits re-run the check", () => {
  const { doc } = parsed();
  const pr = record(record(doc["on"], "on")["pull_request"], "on.pull_request");
  expect(pr["types"]).toEqual(["opened", "synchronize", "reopened", "edited"]);
});

test("METRO-36 the job has least privilege and no secrets, cache or persisted credentials", () => {
  const { job, steps } = parsed();
  expect(job["permissions"]).toEqual({ contents: "read" });
  expect(job["if"]).toBeUndefined();
  const [checkout = {}, tools = {}] = steps;
  expect(record(checkout["with"], "checkout.with")["persist-credentials"]).toBe(false);
  expect(record(checkout["with"], "checkout.with")["fetch-depth"]).toBe(0);
  expect(record(tools["with"], "tools.with")["cache"]).toBe(false);
  const jobText = JSON.stringify(job);
  expect(jobText).not.toMatch(/secrets\.|actions\/cache|pull-requests|write/u);
});

test("METRO-36 every step is named and every action is pinned to a commit", () => {
  const { steps } = parsed();
  for (const step of steps) {
    expect(typeof step["name"] === "string" && step["name"] !== "").toBe(true);
    if (typeof step["uses"] === "string") expect(step["uses"]).toMatch(/@[0-9a-f]{40}$/u);
  }
});

test("METRO-36 the untrusted body reaches the script only through an environment variable", () => {
  const { steps } = parsed();
  const check = steps.find((step) => step["run"] === "node scripts/reviewer-record.ts");
  expect(check).toBeDefined();
  expect(check?.["if"]).toBe("${{ github.event_name == 'pull_request' }}");
  expect(check?.["env"]).toEqual({
    PR_BODY: "${{ github.event.pull_request.body }}",
    BASE_SHA: "${{ github.event.pull_request.base.sha }}",
    HEAD_SHA: "${{ github.event.pull_request.head.sha }}",
  });
  for (const step of steps)
    if (typeof step["run"] === "string") expect(step["run"]).not.toContain("${{");
  expect(text.match(/pull_request\.body/gu)).toHaveLength(1);
});
