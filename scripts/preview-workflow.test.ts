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
