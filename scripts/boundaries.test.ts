import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkCoreBoundary } from "./boundaries";

async function fixture(source: string, dependencies = {}) {
  const root = await mkdtemp(join(tmpdir(), "metro-boundary-"));
  await mkdir(join(root, "src"));
  await writeFile(join(root, "package.json"), JSON.stringify({ dependencies }));
  await writeFile(join(root, "src", "fixture.ts"), source);
  return root;
}

test("pure relative core code passes", async () => {
  const root = await fixture(
    "import type { Status } from './status'; export const ready: Status = true;",
  );
  try {
    expect(await checkCoreBoundary(root)).toEqual([]);
  } finally {
    await rm(root, { recursive: true });
  }
});

for (const source of [
  "import { Hono } from 'hono';",
  "export { createRoot } from 'react-dom/client';",
  "const provider = import('cloudflare:workers');",
  "const provider = require('node:fs');",
  "import '../../../apps/api/src/index';",
  'const name = "hono"; import(name);',
]) {
  test(`core rejects dependency: ${source}`, async () => {
    const root = await fixture(source);
    try {
      expect((await checkCoreBoundary(root)).length).toBeGreaterThan(0);
    } finally {
      await rm(root, { recursive: true });
    }
  });
}

test("core rejects declared dependencies even before an import is added", async () => {
  const root = await fixture("export const ready = true;", { hono: "4.13.14" });
  try {
    expect((await checkCoreBoundary(root)).length).toBeGreaterThan(0);
  } finally {
    await rm(root, { recursive: true });
  }
});
