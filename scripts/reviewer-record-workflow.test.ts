import { readFileSync } from "node:fs";

import { isRecord } from "./guards";

const text = readFileSync(".github/workflows/reviewer-record.yml", "utf8");

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

test("METRO-36 the workflow is named and has the single Reviewer record job", () => {
  const { doc, jobs, job } = parsed();
  expect(doc["name"]).toBe("Reviewer record");
  expect(Object.keys(jobs)).toEqual(["review"]);
  expect(job["name"]).toBe("Reviewer record");
  expect(job["if"]).toBeUndefined();
});

test("METRO-36 it runs only on pull_request, including body edits", () => {
  const { doc } = parsed();
  const on = record(doc["on"], "on");
  expect(Object.keys(on)).toEqual(["pull_request"]);
  const pr = record(on["pull_request"], "on.pull_request");
  expect(pr["types"]).toEqual(["opened", "edited", "synchronize", "reopened"]);
  expect(pr["branches"]).toEqual(["feature/metro-rebuild", "main"]);
  for (const forbidden of ["pull_request_target", "workflow_run", "workflow_dispatch", "push:"])
    expect(text).not.toContain(forbidden);
});

test("METRO-36 it has its own per-pull-request concurrency group, not the Quality one", () => {
  const { doc } = parsed();
  expect(doc["concurrency"]).toEqual({
    group: "reviewer-record-${{ github.event.pull_request.number }}",
    "cancel-in-progress": true,
  });
});

test("METRO-36 permissions are empty at the top and contents read only on the job", () => {
  const { doc, job } = parsed();
  expect(doc["permissions"]).toEqual({});
  expect(job["permissions"]).toEqual({ contents: "read" });
});

test("METRO-36 no secrets, no cache, no persisted credentials, no write access", () => {
  const { steps } = parsed();
  const [checkout = {}, tools = {}] = steps;
  expect(String(checkout["uses"])).toStartWith("actions/checkout@");
  expect(record(checkout["with"], "checkout.with")["persist-credentials"]).toBe(false);
  expect(record(checkout["with"], "checkout.with")["fetch-depth"]).toBe(0);
  expect(String(tools["uses"])).toStartWith("jdx/mise-action@");
  expect(record(tools["with"], "tools.with")["cache"]).toBe(false);
  expect(text).not.toMatch(/secrets\.|actions\/cache|write|GITHUB_TOKEN|github\.token/u);
});

test("METRO-36 every step is named and every action is pinned to a commit", () => {
  const { steps } = parsed();
  for (const step of steps) {
    expect(typeof step["name"] === "string" && step["name"] !== "").toBe(true);
  }
  const actions = steps.flatMap((step) => (typeof step["uses"] === "string" ? [step["uses"]] : []));
  expect(actions.length).toBeGreaterThan(0);
  for (const action of actions) expect(action).toMatch(/@[0-9a-f]{40} *$/u);
  expect(text).toContain("version: 2026.10.25");
});

test("METRO-36 the untrusted body reaches the script only through an environment variable", () => {
  const { steps } = parsed();
  const check = steps.find((step) => step["run"] === "node scripts/reviewer-record.ts");
  expect(check).toBeDefined();
  expect(check?.["env"]).toEqual({
    PR_BODY: "${{ github.event.pull_request.body }}",
    BASE_SHA: "${{ github.event.pull_request.base.sha }}",
    HEAD_SHA: "${{ github.event.pull_request.head.sha }}",
  });
  const runs = steps.flatMap((step) => (typeof step["run"] === "string" ? [step["run"]] : []));
  expect(runs.length).toBeGreaterThan(0);
  for (const run of runs) expect(run).not.toContain("${{");
  expect(text.match(/pull_request\.body/gu)).toHaveLength(2);
});

test("METRO-36 an oversized body fails with a clear message before the body is passed on", () => {
  const { steps } = parsed();
  const index = steps.findIndex(
    (step) => step["name"] === "Reject a body too large to pass safely",
  );
  const check = steps.findIndex((step) => step["run"] === "node scripts/reviewer-record.ts");
  expect(index).toBeGreaterThan(-1);
  expect(index).toBeLessThan(check);
  const guard = steps[index] ?? {};
  expect(guard["env"]).toBeUndefined();
  expect(String(guard["run"])).toContain("$GITHUB_EVENT_PATH");
  expect(String(guard["run"])).toContain("32768");
  expect(String(guard["run"])).toContain("exit 1");
});

test("METRO-36 the Quality workflow no longer carries the reviewer job or the edited trigger", () => {
  const quality = readFileSync(".github/workflows/quality.yml", "utf8");
  expect(quality).not.toMatch(/reviewer|\breview:|\bedited\b/iu);
  const needs = quality.match(/needs: \[changes, checks, build, security\]\n {4}runs-on/u);
  expect(needs).not.toBeNull();
  expect(readFileSync("scripts/ci-results.ts", "utf8")).not.toContain('"review"');
});
