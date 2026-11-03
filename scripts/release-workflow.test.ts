import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

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
