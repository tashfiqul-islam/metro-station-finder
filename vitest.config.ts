import { defineConfig } from "vitest/config";

// ADR-0016 stage 1: Vitest runs beside `bun test`. The files a project lists run only under Vitest and
// are ignored by bunfig.toml `[test] pathIgnorePatterns`.
export default defineConfig({
  test: {
    projects: ["apps/api"],
    // Random order exposes shared-state coupling. Vitest picks a new seed per run and prints it
    // (`Running tests with seed "N"`); reproduce with `--sequence.seed=N`. Never set `seed` here:
    // a fixed seed is a fixed order (scripts/configuration.ts enforces both).
    sequence: { shuffle: true },
    coverage: {
      // Workerd cannot use V8 coverage, so this run is istanbul and separate from Bun's.
      provider: "istanbul",
      reporter: [["text", { skipFull: false }], "lcov"],
      reportsDirectory: "coverage/vitest",
      include: ["apps/api/src/**/*.ts"],
      exclude: ["apps/api/src/**/*.test.ts"],
      thresholds: { perFile: true, lines: 90, functions: 90, branches: 90 },
    },
  },
});
