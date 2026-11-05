import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { isRecord } from "./guards";

const text = readFileSync(".github/workflows/quality.yml", "utf8");

function record(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${what} is not an object`);
  return value;
}

function job(name: string): Record<string, unknown> {
  const doc = record(Bun.YAML.parse(text), "workflow");
  return record(record(doc["jobs"], "jobs")[name], `jobs.${name}`);
}

function stepsOf(entry: Record<string, unknown>): Record<string, unknown>[] {
  const steps = entry["steps"];
  if (!Array.isArray(steps)) throw new Error("steps is not a list");
  return (steps as unknown[]).map((step, i) => record(step, `step ${i}`));
}

const SKIP_GUARD = "${{ needs.changes.outputs.docs_only != 'true' }}";

test("METRO-62 the changes job is read-only, outputs docs_only and runs only the repo script", () => {
  const changes = job("changes");
  expect(changes["permissions"]).toEqual({ contents: "read" });
  expect(changes["outputs"]).toEqual({ docs_only: "${{ steps.docs.outputs.docs_only }}" });
  expect(changes["if"]).toBeUndefined();
  const steps = stepsOf(changes);
  const run = steps.filter((step) => step["run"] !== undefined).map((step) => step["run"]);
  expect(run).toEqual(["node scripts/changed-files.ts"]);
  const checkout = record(steps[0]?.["with"], "checkout.with");
  expect(checkout["persist-credentials"]).toBe(false);
  expect(checkout["fetch-depth"]).toBe(0);
});

test("METRO-62 build waits for changes and is skipped unless docs_only is exactly true", () => {
  const build = job("build");
  expect(build["needs"]).toEqual(["changes"]);
  expect(build["if"]).toBe(SKIP_GUARD);
});

test("METRO-62 build and preview stay fail-closed: no always() or !cancelled() in their conditions", () => {
  for (const name of ["build", "preview"]) {
    const condition = String(job(name)["if"]);
    expect(condition).not.toMatch(/always\(\)|cancelled\(\)|failure\(\)|success\(\)/u);
  }
});

test("METRO-62 the preview waits for changes and is skipped on docs-only changes", () => {
  const preview = job("preview");
  expect(preview["needs"]).toEqual(["changes", "checks", "build", "security"]);
  expect(String(preview["if"])).toContain("needs.changes.outputs.docs_only != 'true'");
  expect(String(preview["if"])).toContain("github.event_name == 'pull_request'");
});

test("METRO-62 Quality gates always runs, needs all four jobs and keeps its name", () => {
  const quality = job("quality");
  expect(quality["name"]).toBe("Quality gates");
  expect(quality["if"]).toBe("${{ always() }}");
  expect(quality["needs"]).toEqual(["changes", "checks", "build", "security"]);
  const steps = stepsOf(quality);
  const verify = steps.find((step) => step["run"] === "node scripts/ci-results.ts");
  expect(record(verify?.["env"], "env")["REQUIRED_JOB_RESULTS"]).toBe("${{ toJSON(needs) }}");
});

test("METRO-62 checks and security never depend on the docs-only decision", () => {
  for (const name of ["checks", "security"]) {
    const entry = job(name);
    expect(entry["if"]).toBeUndefined();
    expect(entry["needs"]).toBeUndefined();
  }
});

test("METRO-62 the docs-only decision is not made by a workflow-level path filter", () => {
  const on = record(record(Bun.YAML.parse(text), "workflow")["on"], "on");
  for (const trigger of Object.values(on))
    for (const key of ["paths", "paths-ignore"])
      expect(record(trigger, "trigger")[key]).toBeUndefined();
});
