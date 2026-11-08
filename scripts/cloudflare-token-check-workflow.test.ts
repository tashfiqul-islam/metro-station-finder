import { readFileSync } from "node:fs";

import { isRecord } from "./guards";

const workflow = readFileSync(".github/workflows/cloudflare-token-check.yml", "utf8");

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`);
  return value;
}

function checkJob() {
  const doc = record(Bun.YAML.parse(workflow), "workflow");
  const job = record(record(doc["jobs"], "jobs")["check"], "jobs.check");
  const steps = job["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return { doc, job, steps: (steps as unknown[]).map((s, i) => record(s, `step ${i}`)) };
}

test("METRO-33 the check runs only on manual dispatch and a weekly schedule", () => {
  const { doc } = checkJob();
  const triggers = record(doc["on"], "on");
  expect(new Set(Object.keys(triggers))).toEqual(new Set(["schedule", "workflow_dispatch"]));
  const schedule = triggers["schedule"];
  expect(Array.isArray(schedule) && schedule.length === 1).toBe(true);
  for (const trigger of ["pull_request", "pull_request_target", "workflow_run", "push:"])
    expect(workflow).not.toContain(trigger);
});

test("METRO-33 the job holds the preview environment with no permissions beyond reading contents", () => {
  const { doc, job } = checkJob();
  expect(doc["permissions"]).toEqual({});
  expect(job["environment"]).toBe("preview");
  expect(job["permissions"]).toEqual({ contents: "read" });
  expect(workflow).not.toMatch(/id-token|pull-requests|issues:|deployments:|contents: write/u);
});

test("METRO-33 the credentialed job is cache-free", () => {
  const { steps } = checkJob();
  expect(workflow).not.toContain("actions/cache");
  const [checkout = {}, tools = {}] = steps;
  expect(record(checkout["with"], "checkout.with")["persist-credentials"]).toBe(false);
  expect(record(tools["with"], "tools.with")["cache"]).toBe(false);
  expect(String(tools["uses"])).toStartWith("jdx/mise-action@");
});

test("METRO-33 the token is set only on the one check step and nothing is echoed", () => {
  const { steps } = checkJob();
  // METRO-99: checkout, two mise attempts with a pause between them, then the check step.
  expect(steps).toHaveLength(5);
  expect(workflow.match(/CLOUDFLARE_API_TOKEN:/gu)).toHaveLength(1);
  const check = steps.at(-1) ?? {};
  expect(check["run"]).toBe("node scripts/cloudflare-token-check.ts");
  // METRO-99: the job limit grew to fit the install retries; the check itself keeps a tight bound.
  expect(check["timeout-minutes"]).toBe(3);
  expect(record(check["env"], "check.env")).toEqual({
    CLOUDFLARE_API_TOKEN: "${{ secrets.CLOUDFLARE_API_TOKEN }}",
    CLOUDFLARE_ACCOUNT_ID: "${{ vars.CLOUDFLARE_ACCOUNT_ID }}",
  });
  expect(workflow.split("\n").filter((line) => line.includes("run:"))).toEqual([
    "        run: sleep 30",
    "        run: node scripts/cloudflare-token-check.ts",
  ]);
  for (const step of steps.slice(0, -1)) expect(step["env"]).toBeUndefined();
});

test("METRO-33 every step is named and the action pins match release-sync", () => {
  const { steps } = checkJob();
  for (const step of steps)
    expect(typeof step["name"] === "string" && step["name"] !== "").toBe(true);
  const sync = readFileSync(".github/workflows/release-sync.yml", "utf8");
  for (const action of ["actions/checkout@", "jdx/mise-action@"]) {
    const pin = (text: string): string | undefined =>
      text.split("\n").find((l) => l.includes(action));
    expect(pin(workflow)).toBeDefined();
    expect(pin(workflow)?.trim()).toBe(pin(sync)?.trim());
  }
  expect(workflow).toContain("version: 2026.10.25");
});
