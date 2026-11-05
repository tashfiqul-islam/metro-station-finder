import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { lintWorkflows } from "./workflows";

const CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1";

function workflow(options: { uses?: string; run?: string; permissions?: string }): string {
  return `name: Fixture
on:
  pull_request:
${options.permissions ?? "permissions:\n  contents: read"}
concurrency:
  group: fixture-\${{ github.ref }}
jobs:
  fixture:
    name: Fixture job
    runs-on: ubuntu-latest
    steps:
      - name: Check out
        uses: ${options.uses ?? CHECKOUT}
        with:
          persist-credentials: false
      - name: Say ok
        run: ${options.run ?? "echo ok"}
`;
}

async function lint(source: string) {
  const directory = await mkdtemp(join(tmpdir(), "metro-workflows-"));
  try {
    await writeFile(join(directory, "fixture.yml"), source);
    return lintWorkflows(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("FND-S4 accepts a pinned, least-privilege fixture", async () => {
  const result = await lint(workflow({}));
  expect(result.output).toBe("");
  expect(result.ok).toBe(true);
});

test("FND-S4 rejects an unpinned action", async () => {
  const result = await lint(workflow({ uses: "actions/checkout@v4" }));
  expect(result.ok).toBe(false);
  expect(result.output).toContain("unpinned-uses");
}, 60000);

test("FND-S4 rejects pull request title template injection in run", async () => {
  const result = await lint(workflow({ run: 'echo "${{ github.event.pull_request.title }}"' }));
  expect(result.ok).toBe(false);
  expect(result.output).toContain("template-injection");
}, 60000);

test("FND-S4 rejects permissions: write-all", async () => {
  const result = await lint(workflow({ permissions: "permissions: write-all" }));
  expect(result.ok).toBe(false);
  expect(result.output).toContain("excessive-permissions");
}, 60000);

test("FND-S4 the real workflows pass", () => {
  const result = lintWorkflows(resolve(".github/workflows"));
  expect(result.output).toBe("");
  expect(result.ok).toBe(true);
}, 60000);

test("FND-S4 an empty directory fails visibly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "metro-workflows-empty-"));
  try {
    expect(lintWorkflows(directory).ok).toBe(false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("METRO-23 rejects a step without a name", async () => {
  const unnamed = workflow({}).replace("      - name: Say ok\n        run:", "      - run:");
  const result = await lint(unnamed);
  expect(result.ok).toBe(false);
  expect(result.output).toContain("step without a name");
}, 60000);
