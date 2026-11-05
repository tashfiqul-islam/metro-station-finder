import { readdirSync, readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isRecord } from "./guards";
import {
  botExclusionViolations,
  concurrencyViolations,
  credentialedCacheViolations,
  toParsedWorkflow,
} from "./workflow-policy";

/** Parses every workflow file in a directory, so a new workflow is covered without a fixed list. */
function parseWorkflows(directory: string) {
  return readdirSync(directory)
    .filter((name) => /\.ya?ml$/u.test(name))
    .map((name) =>
      toParsedWorkflow(name, Bun.YAML.parse(readFileSync(join(directory, name), "utf8"))),
    );
}

const real = parseWorkflows(".github/workflows");

async function parseFixture(source: string) {
  const directory = await mkdtemp(join(tmpdir(), "metro-policy-"));
  try {
    await writeFile(join(directory, "fixture.yml"), source);
    return parseWorkflows(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function fixture(job: string, header = ""): string {
  return `name: Fixture
on:
  pull_request:
${header}jobs:
  one:
    runs-on: ubuntu-24.04
${job}`;
}

test("METRO-47 every workflow in the directory is parsed, not a fixed list", () => {
  expect(real.length).toBeGreaterThanOrEqual(7);
  expect(real.map((workflow) => workflow.file)).toContain("quality.yml");
});

test("METRO-47 no job holding Cloudflare or Plane credentials restores a cache", () => {
  expect(credentialedCacheViolations(real)).toEqual([]);
});

test("METRO-47 the cache rule flags actions/cache and mise-action without cache: false", async () => {
  const parsed = await parseFixture(
    fixture(`    steps:
      - name: Cache
        uses: actions/cache@x
      - name: Mise
        uses: jdx/mise-action@x
      - name: Deploy
        run: wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
`),
  );
  expect(credentialedCacheViolations(parsed)).toEqual([
    "fixture.yml job one step Cache: restores a cache",
    "fixture.yml job one step Mise: mise-action without cache: false",
  ]);
});

test("METRO-47 the cache rule ignores jobs without credentials", async () => {
  const parsed = await parseFixture(
    fixture(`    steps:
      - name: Cache
        uses: actions/cache@x
`),
  );
  expect(credentialedCacheViolations(parsed)).toEqual([]);
});

test("METRO-47 every credentialed pull request job excludes every bot by actor and author", () => {
  expect(botExclusionViolations(real)).toEqual([]);
});

test("METRO-47 the preview job names the bot exclusion in its condition", () => {
  const quality = real.find((workflow) => workflow.file === "quality.yml");
  expect(String(quality?.jobs["preview"]?.["if"])).toContain("!endsWith(github.actor, '[bot]')");
});

test("METRO-47 the bot rule flags a dependabot-only exclusion", async () => {
  const parsed = await parseFixture(
    fixture(`    if: \${{ github.actor != 'dependabot[bot]' }}
    steps:
      - name: Deploy
        run: wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
`),
  );
  expect(botExclusionViolations(parsed)).toHaveLength(2);
});

test("METRO-59 cancel-in-progress is only absent, false or the pull-request expression", () => {
  expect(concurrencyViolations(real)).toEqual([]);
});

test("METRO-59 quality.yml cancels superseded runs only for pull requests", () => {
  const quality = real.find((workflow) => workflow.file === "quality.yml");
  expect(quality?.doc["concurrency"]).toMatchObject({
    "cancel-in-progress": "${{ github.event_name == 'pull_request' }}",
  });
});

test("METRO-59 each integration push gets its own concurrency group so no commit loses its verdict", () => {
  const quality = real.find((workflow) => workflow.file === "quality.yml");
  const concurrency = quality?.doc["concurrency"];
  const group = isRecord(concurrency) ? String(concurrency["group"]) : "";
  expect(group).toContain("github.sha");
  expect(group).toContain("github.event_name == 'pull_request'");
});

test("METRO-59 the rule flags an unconditional cancel and any cancel in credentialed work", async () => {
  const unconditional = await parseFixture(
    fixture(
      `    steps:
      - name: Say
        run: echo ok
`,
      "concurrency:\n  group: g\n  cancel-in-progress: true\n",
    ),
  );
  expect(concurrencyViolations(unconditional)).toEqual([
    "fixture.yml workflow: cancel-in-progress is true",
  ]);
  const credentialed = await parseFixture(
    fixture(
      `    steps:
      - name: Deploy
        run: wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
`,
      "concurrency:\n  group: g\n  cancel-in-progress: ${{ github.event_name == 'pull_request' }}\n",
    ).replace("pull_request:\n", "workflow_dispatch:\n"),
  );
  expect(concurrencyViolations(credentialed)).toEqual([
    "fixture.yml workflow: credentialed work must never cancel in progress",
  ]);
});

test("METRO-59 deploy and release workflows never cancel in progress", () => {
  for (const name of ["production-deploy.yml", "release-sync.yml", "release-draft.yml"]) {
    const workflow = real.find((candidate) => candidate.file === name);
    expect(workflow?.doc["concurrency"]).toMatchObject({ "cancel-in-progress": false });
  }
});
