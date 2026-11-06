import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { cleanGitEnv } from "./git-env.ts";

/**
 * Bun's per-file coverage gate only measures files that some test loads. This check closes that gap
 * for product source: every tracked non-test file under `apps/*\/src` and `packages/*\/src` must
 * appear in `coverage/lcov.info` (Bun) or `coverage/vitest/lcov.info` (one Vitest istanbul run: `apps/api` in workerd and `apps/web` in happy-dom, ADR-0016), except
 * the documented exemptions below.
 */
export const EXEMPT_PRODUCT_SOURCES: readonly (readonly [string, string])[] = [
  [
    "packages/core/src/fares/fare-matrix.ts",
    "Type-only module with no executable code, so there is nothing to measure.",
  ],
];

const PRODUCT = /^(?:apps|packages)\/[^/]+\/src\/.+\.tsx?$/u;

export function isProductSource(file: string): boolean {
  return PRODUCT.test(file) && !/\.test\.tsx?$/u.test(file) && !file.endsWith(".d.ts");
}

function normalize(path: string): string {
  return path.replaceAll("\\", "/");
}

/** Product source files absent from the lcov report and not exempt. */
export function unmeasuredProductSources(
  lcov: string,
  files: readonly string[],
  exempt: readonly string[] = EXEMPT_PRODUCT_SOURCES.map(([file]) => file),
): string[] {
  const measured = [...lcov.matchAll(/^SF:(.+)$/gmu)].map((match) => normalize(match[1] ?? ""));
  return files
    .filter(isProductSource)
    .filter((file) => !exempt.includes(file))
    .filter((file) => !measured.some((entry) => entry === file || entry.endsWith(`/${file}`)));
}

/** The lcov files that together measure product source: Bun's and the Vitest (workerd) run's. */
export const LCOV_FILES = [
  ["coverage", "lcov.info"],
  ["coverage", "vitest", "lcov.info"],
] as const;

/** CLI body: reads every lcov file under `root` and sets the exit code. */
export async function runCoverageScope(root: string, files: readonly string[]): Promise<void> {
  const reports = await Promise.all(
    LCOV_FILES.map((parts) =>
      readFile(join(root, ...parts), "utf8").catch(() => {
        throw new Error(
          `${parts.join("/")} is missing; run \`bun test\` and \`bun run test:vitest\` first`,
        );
      }),
    ),
  );
  const lcov = reports.join("\n");
  const missing = unmeasuredProductSources(lcov, files);
  if (missing.length) {
    console.error(
      `Product source files that no test loads (not covered by the per-file gate):\n${missing.join("\n")}`,
    );
    process.exitCode = 1;
  } else console.log("Coverage scope ok: every product source file is measured or exempt");
}

/** Tracked and new non-ignored files under `root`, so unstaged new sources are checked too. */
export function trackedFiles(root: string): string[] {
  return execFileSync(
    "git",
    ["-C", root, "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    {
      encoding: "utf8",
      env: cleanGitEnv(),
    },
  )
    .split("\0")
    .filter(Boolean);
}

if (import.meta.main) {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  await runCoverageScope(root, trackedFiles(root));
}
