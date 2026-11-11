import { existsSync, readFileSync } from "node:fs";

import { isRecord } from "./guards";

const SCRIPT = "scripts/tracker-sync.ts";
const PRESENT = `\${{ hashFiles('${SCRIPT}') != '' }}`;
const ABSENT = `\${{ hashFiles('${SCRIPT}') == '' }}`;
const text = readFileSync(".github/workflows/tracker-sync.yml", "utf8");

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`);
  return value;
}

function parsed() {
  const doc = record(Bun.YAML.parse(text), "workflow");
  const job = record(record(doc["jobs"], "jobs")["sync"], "jobs.sync");
  const steps = job["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return { doc, job, steps: (steps as unknown[]).map((s, i) => record(s, `step ${i}`)) };
}

function step(name: string): Record<string, unknown> {
  const found = parsed().steps.find((candidate) => candidate["name"] === name);
  if (found === undefined) throw new Error(`No step ${name}`);
  return found;
}

test("planning#153 it runs only on pull_request and checks out the base commit", () => {
  const { doc } = parsed();
  expect(Object.keys(record(doc["on"], "on"))).toEqual(["pull_request"]);
  for (const forbidden of ["pull_request_target", "workflow_run", "workflow_dispatch"])
    expect(text).not.toContain(forbidden);
  expect(step("Check out the base commit")["with"]).toEqual({
    ref: "${{ github.event.pull_request.base.sha }}",
    "persist-credentials": false,
  });
});

test("planning#153 the script the workflow runs exists, so the skip can only mean the bootstrap pull request", () => {
  // A rename or delete of the script fails here instead of turning every run into a silent skip.
  expect(existsSync(SCRIPT)).toBe(true);
  expect(step("Sync the ticket Status")["run"]).toBe(`node ${SCRIPT}`);
});

test("planning#153 the token and the sync are gated on the same script check, and the skip warns without secrets", () => {
  expect(step("Mint a planning token from the tracker App")["if"]).toBe(PRESENT);
  expect(step("Sync the ticket Status")["if"]).toBe(PRESENT);
  const skip = step("Warn when the base commit has no tracker sync script yet");
  expect(skip["if"]).toBe(ABSENT);
  expect(String(skip["run"])).toStartWith('echo "::warning::');
  expect(skip["env"]).toBeUndefined();
  expect(JSON.stringify(skip)).not.toContain("secrets");
});

test("planning#153 only the sync step receives the token, and nothing installs dependencies", () => {
  const holders = parsed().steps.filter((candidate) =>
    JSON.stringify(candidate).includes("steps.token.outputs.token"),
  );
  expect(holders.map((candidate) => candidate["name"])).toEqual(["Sync the ticket Status"]);
  expect(text).not.toContain("bootstrap");
  expect(text).not.toMatch(/\bbun (?:install|i)\b/u);
});
