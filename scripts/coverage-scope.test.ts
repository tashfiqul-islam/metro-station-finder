import { afterEach, expect, spyOn, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import {
  EXEMPT_PRODUCT_SOURCES,
  isProductSource,
  runCoverageScope,
  trackedFiles,
  unmeasuredProductSources,
} from "./coverage-scope";
import { expectRejection } from "./test-support";

afterEach(() => {
  process.exitCode = 0;
});

const lcov = (...files: string[]) => files.map((file) => `SF:${file}\nend_of_record\n`).join("");

test("FND-T1 product source means non-test TypeScript under apps/*/src and packages/*/src", () => {
  for (const file of [
    "apps/api/src/app.ts",
    "apps/web/src/App.tsx",
    "packages/core/src/application/scaffold-status.ts",
  ])
    expect(isProductSource(file)).toBe(true);
  for (const file of [
    "apps/api/src/app.test.ts",
    "apps/web/src/App.test.tsx",
    "apps/api/worker-configuration.d.ts",
    "scripts/links.ts",
    "e2e/fixtures.ts",
    "apps/web/vite.config.ts",
  ])
    expect(isProductSource(file)).toBe(false);
});

test("FND-T1 a product source file that no test loads is reported", () => {
  const files = ["apps/api/src/app.ts", "apps/api/src/forgotten.ts"];
  expect(unmeasuredProductSources(lcov("apps/api/src/app.ts"), files, [])).toEqual([
    "apps/api/src/forgotten.ts",
  ]);
});

test("FND-T1 lcov paths with backslashes or absolute prefixes still match", () => {
  const files = ["apps/api/src/app.ts"];
  expect(unmeasuredProductSources(lcov("apps\\api\\src\\app.ts"), files, [])).toEqual([]);
  expect(unmeasuredProductSources(lcov("D:\\repo\\apps\\api\\src\\app.ts"), files, [])).toEqual([]);
});

test("FND-T1 documented exemptions are the only files allowed to stay unmeasured", () => {
  expect(new Set(EXEMPT_PRODUCT_SOURCES.map(([file]) => file))).toEqual(
    new Set(["apps/web/src/main.tsx", "packages/core/src/domain/scaffold-status.ts"]),
  );
  for (const [, reason] of EXEMPT_PRODUCT_SOURCES) expect(reason.length).toBeGreaterThan(10);
  const exempt = EXEMPT_PRODUCT_SOURCES.map(([file]) => file);
  expect(unmeasuredProductSources(lcov(), ["apps/web/src/main.tsx"], exempt)).toEqual([]);
});

test("FND-T1 runCoverageScope fails visibly for a missing lcov file and an unmeasured file", async () => {
  const error = spyOn(console, "error").mockImplementation(() => {});
  const log = spyOn(console, "log").mockImplementation(() => {});
  const root = await mkdtemp(join(tmpdir(), "metro-scope-"));
  try {
    await expectRejection(runCoverageScope(root, ["apps/api/src/app.ts"]), "lcov.info");
    await mkdir(join(root, "coverage"));
    await writeFile(join(root, "coverage", "lcov.info"), lcov("apps/api/src/app.ts"));
    await runCoverageScope(root, ["apps/api/src/app.ts"]);
    expect(process.exitCode ?? 0).toBe(0);
    expect(log).toHaveBeenCalled();
    await runCoverageScope(root, ["apps/api/src/app.ts", "apps/api/src/forgotten.ts"]);
    expect(process.exitCode).toBe(1);
    expect(String(error.mock.calls[0]?.[0])).toContain("apps/api/src/forgotten.ts");
  } finally {
    error.mockRestore();
    log.mockRestore();
    await rm(dirname(join(root, "coverage")), { recursive: true, force: true });
  }
});

test("FND-T1 trackedFiles lists the files Git tracks", () => {
  const files = trackedFiles(process.cwd());
  expect(files).toContain("package.json");
  expect(files).toContain("scripts/coverage-scope.ts");
});
