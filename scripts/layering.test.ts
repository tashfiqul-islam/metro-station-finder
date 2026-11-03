import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const config = resolve(".dependency-cruiser.mts");
const parser = pathToFileURL(resolve("scripts/dependency-parser.ts")).href;
const cruiser = resolve("node_modules/dependency-cruiser/bin/dependency-cruiser.mjs");

async function cruise(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "metro-layering-"));
  try {
    for (const [file, source] of Object.entries(files)) {
      await mkdir(dirname(join(root, file)), { recursive: true });
      await writeFile(join(root, file), source);
    }
    await mkdir(join(root, "apps"), { recursive: true });
    await mkdir(join(root, "packages"), { recursive: true });
    // Stand-in third-party packages so resolution succeeds and only layering rules can fire.
    for (const name of ["hono", "react", "valibot"]) {
      await mkdir(join(root, "node_modules", name), { recursive: true });
      await writeFile(
        join(root, "node_modules", name, "package.json"),
        `{"name":"${name}","main":"index.js"}`,
      );
      await writeFile(join(root, "node_modules", name, "index.js"), "module.exports = {};\n");
    }
    const result = Bun.spawnSync(
      [
        "node",
        "--import",
        parser,
        cruiser,
        "--config",
        config,
        "--output-type",
        "err",
        "packages",
        "apps",
      ],
      { cwd: root, stdout: "pipe", stderr: "pipe" },
    );
    return { code: result.exitCode, output: result.stdout.toString() + result.stderr.toString() };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const core = { "packages/core/src/index.ts": "export const core = 1;\n" };
const contractsBase = { ...core };

test("FND-R6 a clean layered tree passes", async () => {
  const result = await cruise({
    ...core,
    "packages/contracts/src/index.ts":
      'import { core } from "../../core/src/index.ts";\nimport "valibot";\nexport const c = core;\n',
    "apps/web/src/main.ts":
      'import { c } from "../../../packages/contracts/src/index.ts";\nimport "react";\nexport const m = c;\n',
    "apps/api/src/index.ts":
      'import { c } from "../../../packages/contracts/src/index.ts";\nimport "hono";\nexport const a = c;\n',
  });
  expect(result.output).not.toContain("error");
  expect(result.code).toBe(0);
});

test("FND-R6 core importing contracts is rejected", async () => {
  const result = await cruise({
    ...contractsBase,
    "packages/core/src/index.ts":
      'import "../../contracts/src/index.ts";\nexport const core = 1;\n',
    "packages/contracts/src/index.ts": "export const c = 1;\n",
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("core-imports-only-core");
});

test("FND-R6 core importing a third-party package is rejected", async () => {
  const result = await cruise({
    "packages/core/src/index.ts": 'import "valibot";\nexport const core = 1;\n',
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("core-imports-only-core");
});

for (const dependency of ["hono", "react"]) {
  test(`FND-R6 contracts importing ${dependency} is rejected`, async () => {
    const result = await cruise({
      ...core,
      "packages/contracts/src/index.ts": `import "${dependency}";\nexport const c = 1;\n`,
    });
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("contracts-imports-only-core-and-schema-library");
  });
}

test("FND-R6 contracts importing an app is rejected", async () => {
  const result = await cruise({
    ...core,
    "apps/api/src/index.ts": "export const a = 1;\n",
    "packages/contracts/src/index.ts":
      'import "../../../apps/api/src/index.ts";\nexport const c = 1;\n',
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("contracts-imports-only-core-and-schema-library");
});

test("FND-R6 web importing an api internal module is rejected", async () => {
  const result = await cruise({
    ...core,
    "apps/api/src/app.ts": "export const app = 1;\n",
    "apps/web/src/main.ts": 'import { app } from "../../api/src/app.ts";\nexport const m = app;\n',
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("apps-never-import-each-other");
});

test("FND-R6 api importing web is rejected", async () => {
  const result = await cruise({
    ...core,
    "apps/web/src/main.ts": "export const m = 1;\n",
    "apps/api/src/index.ts": 'import { m } from "../../web/src/main.ts";\nexport const a = m;\n',
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("apps-never-import-each-other");
});
