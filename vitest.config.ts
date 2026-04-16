import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

// https://vitest.dev/config
// https://vitest.dev/guide/projects — `projects` replaces deprecated `workspace`
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  test: {
    coverage: {
      exclude: [
        "src/routeTree.gen.ts",
        "src/**/*.d.ts",
        "src/**/*.stories.tsx",
        "src/**/index.ts",
        "src/router.tsx",
      ],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    css: true,
    exclude: ["node_modules", "dist", ".output", ".tanstack", ".nitro", "tests/e2e/**"],
    globals: true,
    hookTimeout: 10_000,
    projects: [
      {
        extends: true,
        test: {
          environment: "node",
          include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/unit/**/*.{test,spec}.{ts,tsx}"],
          name: "unit",
        },
      },
      {
        extends: true,
        test: {
          environment: "jsdom",
          include: ["tests/integration/**/*.{test,spec}.{ts,tsx}"],
          name: "integration",
          setupFiles: ["./tests/setup.ts", "./tests/setup.integration.ts"],
        },
      },
    ],
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 10_000,
  },
});
