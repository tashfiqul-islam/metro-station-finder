import { readFileSync } from "node:fs";

import { isRecord } from "./guards";

const workflow = readFileSync(".github/workflows/release-draft.yml", "utf8");

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`);
  return value;
}

function draftJob() {
  const doc = record(Bun.YAML.parse(workflow), "workflow");
  const job = record(record(doc["jobs"], "jobs")["draft"], "jobs.draft");
  const steps = job["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return { doc, job, steps: (steps as unknown[]).map((s, i) => record(s, `step ${i}`)) };
}

test("METRO-24 the draft runs only on manual dispatch, never on pull requests or pushes", () => {
  const { doc } = draftJob();
  expect(Object.keys(record(doc["on"], "on"))).toEqual(["workflow_dispatch"]);
  for (const trigger of [
    "pull_request",
    "pull_request_target",
    "workflow_run",
    "push:",
    "schedule",
  ])
    expect(workflow).not.toContain(trigger);
});

test("METRO-24 the job is approval-gated and grants only contents: write", () => {
  const { doc, job } = draftJob();
  expect(doc["permissions"]).toEqual({});
  expect(job["environment"]).toBe("release");
  expect(job["permissions"]).toEqual({ contents: "write" });
  expect(workflow).not.toMatch(/pull-requests|issues:|deployments:|id-token/u);
});

test("METRO-24 the Plane key is set only on the draft step; inputs reach the script only through env", () => {
  const { steps } = draftJob();
  expect(workflow.match(/PLANE_API_KEY:/gu)).toHaveLength(1);
  // METRO-99: checkout, two mise attempts with a pause between them, then the draft step.
  const [checkout = {}, tools = {}, , retry = {}] = steps;
  const draft = steps.at(-1) ?? {};
  expect(steps).toHaveLength(5);
  expect(record(checkout["with"], "checkout.with")["persist-credentials"]).toBe(false);
  for (const attempt of [tools, retry]) {
    expect(record(attempt["with"], "tools.with")["cache"]).toBe(false);
    expect(attempt["env"]).toBeUndefined();
  }
  expect(draft["run"]).toBe("node scripts/release-draft.ts");
  expect(new Set(Object.keys(record(draft["env"], "draft.env")))).toEqual(
    new Set(["GITHUB_TOKEN", "PLANE_API_KEY", "PLANE_WORKSPACE", "RELEASE_TAG", "RELEASE_TARGET"]),
  );
  expect(workflow.split("\n").filter((line) => line.includes("run:"))).toEqual([
    "        run: sleep 30",
    "        run: node scripts/release-draft.ts",
  ]);
  for (const step of steps)
    expect(typeof step["name"] === "string" && step["name"] !== "").toBe(true);
});

test("METRO-24 runs for one tag never overlap or cancel each other", () => {
  const { doc } = draftJob();
  expect(doc["concurrency"]).toEqual({
    group: "release-draft-${{ inputs.tag }}",
    "cancel-in-progress": false,
  });
});
