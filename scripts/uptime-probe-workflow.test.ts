import { readFileSync } from "node:fs";

import { isRecord } from "./guards";
import { isCredentialed, toParsedWorkflow } from "./workflow-policy";

const FILE = ".github/workflows/uptime-probe.yml";
const text = readFileSync(FILE, "utf8");

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`);
  return value;
}

function probeJob() {
  const doc = record(Bun.YAML.parse(text), "workflow");
  const job = record(record(doc["jobs"], "jobs")["probe"], "jobs.probe");
  const steps = job["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return { doc, job, steps: (steps as unknown[]).map((s, i) => record(s, `step ${i}`)) };
}

test("METRO-44 the probe runs only on a schedule and by hand, never on pull requests", () => {
  const { doc } = probeJob();
  const triggers = record(doc["on"], "on");
  expect(new Set(Object.keys(triggers))).toEqual(new Set(["schedule", "workflow_dispatch"]));
  const schedule = triggers["schedule"];
  expect(Array.isArray(schedule) && schedule.length === 1).toBe(true);
  expect(schedule).toEqual([{ cron: "7,37 * * * *" }]);
  for (const trigger of ["pull_request", "pull_request_target", "workflow_run", "push:"])
    expect(text).not.toContain(trigger);
  const inputs = record(record(triggers["workflow_dispatch"], "dispatch")["inputs"], "inputs");
  expect(record(inputs["base-url"], "base-url")["required"]).toBe(false);
  expect(text).toContain("Inert until the default-branch switch");
});

test("METRO-44 a scheduled run with no PRODUCTION_URL skips the job; a dispatch never does", () => {
  const { job } = probeJob();
  // Job level, not a step-level exit 0: a skipped job is shown as Skipped, sends no notification and is not counted.
  expect(job["if"]).toBe("${{ github.event_name != 'schedule' || vars.PRODUCTION_URL != '' }}");
  // The skip applies to the schedule only, so a dispatch with no URL reaches the script, which fails it.
  expect(String(job["if"])).toContain("github.event_name != 'schedule'");
  const steps = job["steps"];
  expect(JSON.stringify(steps)).not.toMatch(/exit 0|continue-on-error/u);
});

test("METRO-44 the job holds no secret, no environment and only read access", () => {
  const { doc, job } = probeJob();
  expect(doc["permissions"]).toEqual({});
  expect(job["permissions"]).toEqual({ contents: "read" });
  expect(job["environment"]).toBeUndefined();
  expect(text).not.toMatch(/secrets\.|id-token|contents: write|CLOUDFLARE_|PLANE_/u);
  // Not credentialed, so the repository policy requires mise's own cache to stay on (METRO-97).
  expect(isCredentialed(toParsedWorkflow("uptime-probe.yml", Bun.YAML.parse(text)), job)).toBe(
    false,
  );
});

test("METRO-44 bounded run, one queue that never cancels, every action pinned to a commit", () => {
  const { doc, job, steps } = probeJob();
  expect(job["timeout-minutes"]).toBe(8);
  expect(doc["concurrency"]).toEqual({ group: "uptime-probe", "cancel-in-progress": false });
  for (const step of steps) expect(typeof step["name"]).toBe("string");
  const uses = steps.map((step) => step["uses"]).filter((value) => typeof value === "string");
  expect(uses).toHaveLength(2);
  for (const value of uses) expect(value).toMatch(/@[0-9a-f]{40}$/u);
  const tools = steps.find((step) => String(step["uses"]).startsWith("jdx/mise-action@")) ?? {};
  expect(record(tools["with"], "tools.with")["cache"]).toBeUndefined();
  expect(record(tools["with"], "tools.with")["install_args"]).toBe("bun");
});

test("METRO-44 the URL reaches the script through the environment, never script text", () => {
  const { steps } = probeJob();
  const last = steps.at(-1) ?? {};
  expect(last["run"]).toBe("bun scripts/uptime-probe.ts");
  expect(last["timeout-minutes"]).toBe(2);
  expect(record(last["env"], "env")).toEqual({
    PROBE_BASE_URL: "${{ inputs.base-url || vars.PRODUCTION_URL }}",
  });
  for (const step of steps) {
    const run = typeof step["run"] === "string" ? step["run"] : "";
    expect(run).not.toContain("${{");
  }
});
