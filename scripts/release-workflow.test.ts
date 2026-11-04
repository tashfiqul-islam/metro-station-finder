import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { isRecord } from "./guards";

const workflow = readFileSync(".github/workflows/release-sync.yml", "utf8");

test("METRO-14 the sync runs on release events and a manual tag, never on pull requests", () => {
  expect(workflow).toContain("types: [published, edited, unpublished, deleted]");
  expect(workflow).toContain("workflow_dispatch:");
  for (const trigger of ["pull_request", "pull_request_target", "workflow_run", "push:"])
    expect(workflow).not.toContain(trigger);
});

test("METRO-14 the Plane key lives only on the sync step, in the approval-gated environment", () => {
  expect(workflow).toContain("environment: release");
  expect(workflow.match(/PLANE_API_KEY:/gu)).toHaveLength(1);
  const [beforeSteps = ""] = workflow.split(/^ {4}steps:/mu);
  expect(beforeSteps).not.toContain("PLANE_API_KEY");
  expect(workflow).toContain("PLANE_API_KEY: ${{ secrets.PLANE_API_KEY }}");
});

test("METRO-14 permissions are minimal and the tag reaches the script only through the environment", () => {
  expect(workflow).toContain("permissions: {}");
  expect(workflow).toMatch(/contents: read\n\s+deployments: read/u);
  expect(workflow).not.toMatch(/contents: write|pull-requests|issues:/u);
  expect(workflow).toContain("RELEASE_TAG: ${{ github.event.release.tag_name || inputs.tag }}");
  const run = workflow.split("\n").filter((line) => line.includes("run:"));
  expect(run).toEqual(["        run: node scripts/release-sync.ts"]);
});

test("METRO-14 runs for one tag never overlap or cancel each other", () => {
  expect(workflow).toContain("release-sync-${{ github.event.release.tag_name || inputs.tag }}");
  expect(workflow).toContain("cancel-in-progress: false");
});

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`);
  return value;
}

function syncJob() {
  const doc = record(Bun.YAML.parse(workflow), "workflow");
  const job = record(record(doc["jobs"], "jobs")["sync"], "jobs.sync");
  const steps = job["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return { job, steps: (steps as unknown[]).map((step, index) => record(step, `step ${index}`)) };
}

test("METRO-14 the parsed job is gated, minimal and has no cache or persisted credentials", () => {
  const { job, steps } = syncJob();
  expect(job["environment"]).toBe("release");
  expect(job["permissions"]).toEqual({ contents: "read", deployments: "read" });
  expect(steps).toHaveLength(3);
  const [checkout = {}, tools = {}, sync = {}] = steps;
  expect(String(checkout["uses"])).toContain("actions/checkout@");
  expect(record(checkout["with"], "checkout.with")["persist-credentials"]).toBe(false);
  expect(record(tools["with"], "tools.with")["cache"]).toBe(false);
  expect(sync["run"]).toBe("node scripts/release-sync.ts");
  expect(new Set(Object.keys(record(sync["env"], "sync.env")))).toEqual(
    new Set(["GITHUB_TOKEN", "PLANE_API_KEY", "PLANE_WORKSPACE", "RELEASE_TAG"]),
  );
  for (const step of steps)
    expect(typeof step["name"] === "string" && step["name"] !== "").toBe(true);
});
