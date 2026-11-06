import { defineConfig } from "vitest/config";

import { sharedTestOptions } from "./vitest.shared.ts";

// ADR-0016 stage 1: Vitest runs beside `bun test`. The files a project lists run only under Vitest and
// are ignored by bunfig.toml `[test] pathIgnorePatterns`. Add a project here, give it a config that spreads
// `sharedTestOptions`, and add its sources to `coverage.include`.
export default defineConfig({
  test: {
    ...sharedTestOptions,
    projects: ["apps/api"],
    coverage: {
      // Workerd cannot use V8 coverage, so this run is istanbul and separate from Bun's.
      provider: "istanbul",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage/vitest",
      include: ["apps/api/src/**/*.ts"],
      exclude: ["apps/api/src/**/*.test.ts"],
      thresholds: { perFile: true, lines: 90, functions: 90, branches: 90 },
    },
  },
});
