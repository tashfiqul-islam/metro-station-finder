import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const quality = readFileSync(".github/workflows/quality.yml", "utf8");
const cleanup = readFileSync(".github/workflows/preview-cleanup.yml", "utf8");

/** The text of one top-level job (from `  name:` to the next job or the end). */
function job(text: string, name: string): string {
  const match = new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z-]+:\\n|(?![\\s\\S]))`, "mu").exec(
    text,
  );
  if (match === null) throw new Error(`No job ${name}`);
  return match[1] ?? "";
}

test("METRO-13 the preview job waits for every quality job and only runs for same-repository PRs", () => {
  const preview = job(quality, "preview");
  expect(preview).toContain("needs: [checks, build, security]");
  expect(preview).toContain("github.event_name == 'pull_request'");
  expect(preview).toContain("github.event.pull_request.head.repo.full_name == github.repository");
  expect(preview).toContain("name: preview");
});

test("METRO-13 the required aggregate does not depend on the preview job", () => {
  expect(job(quality, "quality")).toContain("needs: [checks, build, security]");
  expect(job(quality, "quality")).not.toContain("preview");
});

test("METRO-13 Cloudflare secrets exist only in the preview jobs", () => {
  const withoutPreview = quality.replace(job(quality, "preview"), "");
  expect(withoutPreview).not.toContain("CLOUDFLARE_");
  expect(job(quality, "preview")).toContain("scripts/preview.ts secrets");
  expect(cleanup).toContain("scripts/preview.ts secrets");
});

test("METRO-13 the preview deploys the checked commit and exercises rollback", () => {
  const preview = job(quality, "preview");
  expect(preview).toContain("PREVIEW_SHA: ${{ github.sha }}");
  expect(preview).toContain('--var "PREVIEW_SHA:$PREVIEW_SHA"');
  expect(preview).toContain('smoke "$PREVIEW_URL" "$PREVIEW_SHA"');
  expect(preview).toContain("wrangler rollback");
});

test("METRO-13 closing a pull request deletes only that pull request's Worker", () => {
  expect(cleanup).toContain("types: [closed]");
  expect(cleanup).toContain("head.repo.full_name == github.repository");
  expect(cleanup).toContain('wrangler delete --name "$WORKER" --force');
  expect(cleanup).toContain("scripts/preview.ts name");
});

test("METRO-13 the production config stays closed and only the preview env opens workers.dev", () => {
  const config = readFileSync("apps/api/wrangler.jsonc", "utf8");
  expect(config).toMatch(/"workers_dev": false,\s*\n\s*"send_metrics"/u);
  expect(config).toMatch(/"preview": \{[\s\S]*"workers_dev": true/u);
});

test("METRO-13 credentials are scoped to steps, never to a whole job", () => {
  for (const text of [quality, cleanup]) {
    for (const block of text.split(/^ {2}[a-z-]+:\n/mu)) {
      const beforeSteps = block.split(/^ {4}steps:/mu)[0] ?? "";
      expect(beforeSteps).not.toContain("CLOUDFLARE_");
    }
  }
  const preview = job(quality, "preview");
  const steps = preview.split(/^ {6}- /mu).slice(1);
  const holders = steps
    .filter((step) => step.includes("CLOUDFLARE_API_TOKEN"))
    .map((s) => s.split("\n")[0]);
  expect(holders.length).toBeGreaterThanOrEqual(4);
  expect(holders.join("\n")).not.toMatch(/bootstrap|Build/u);
});

test("METRO-13 untrusted-code triggers and fork or bot runs are excluded", () => {
  for (const text of [quality, cleanup]) {
    expect(text).not.toContain("pull_request_target");
    expect(text).not.toContain("workflow_run");
  }
  expect(job(quality, "preview")).toContain("github.actor != 'dependabot[bot]'");
  expect(job(quality, "preview").split("steps:")[0]).toContain("head.repo.full_name");
  expect(job(cleanup, "cleanup").split("steps:")[0]).toContain("head.repo.full_name");
});

test("METRO-13 the preview refuses to deploy for a pull request that is no longer open", () => {
  const preview = job(quality, "preview");
  expect(preview).toContain("pull-requests: read");
  expect(preview).toContain("no longer open");
  expect(preview.indexOf("no longer open")).toBeLessThan(preview.indexOf("wrangler deploy"));
});

test("METRO-13 cleanup treats a missing Worker as success and any other failure as failure", () => {
  expect(cleanup).toContain("10007");
  expect(cleanup).toContain("exit 1");
});
