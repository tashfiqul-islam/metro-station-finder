import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Configuration flags from environment
const isCI = Boolean(process.env["CI"]);
const isDebug = Boolean(process.env["DEBUG"]);
const isCoverage = Boolean(process.env["COVERAGE"]);
const isWatch = Boolean(process.env["WATCH"]);

// Coverage thresholds
const COVERAGE_THRESHOLDS = {
  branches: 90,
  functions: 90,
  lines: 90,
  statements: 90,
} as const;

// Timeout constants
const TEST_TIMEOUT = 10_000;
const HOOK_TIMEOUT = 10_000;
const TEARDOWN_TIMEOUT = 5000;

// Concurrency constants
const CI_MAX_CONCURRENCY = 2;
const DEV_MAX_CONCURRENCY = 5;

// Performance configuration
const PERFORMANCE_CONFIG = {
  pool: "threads" as const,
  poolOptions: {
    threads: {
      isolate: true,
      useAtomics: false,
      singleThread: false,
    },
  },
  maxConcurrency: isCI ? CI_MAX_CONCURRENCY : DEV_MAX_CONCURRENCY,
  fileParallelism: true,
  isolate: true,
} as const;

export default defineConfig({
  test: {
    // Test file patterns
    include: ["**/*.{test,spec}.{js,ts,jsx,tsx,mjs,cjs}"],
    exclude: [
      "node_modules",
      ".next",
      "dist",
      "out",
      "coverage",
      "playwright-report",
      "**/{storybook,cypress,e2e}/**",
      "**/*.stories.*",
      "**/*.config.*",
      "**/vitest.config.*",
      "**/tsconfig.*",
    ],

    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],

    ...PERFORMANCE_CONFIG,

    testTimeout: TEST_TIMEOUT,
    hookTimeout: HOOK_TIMEOUT,
    teardownTimeout: TEARDOWN_TIMEOUT,
    retry: isCI ? 2 : 0,

    passWithNoTests: true,
    allowOnly: !isCI,
    reporters: [
      "default",
      ...(isCI ? ["junit"] : []),
      ...(isDebug ? ["verbose"] : []),
    ],

    coverage: {
      provider: "v8",
      enabled: isCoverage,
      all: true,
      clean: true,
      thresholds: {
        global: COVERAGE_THRESHOLDS,
        "lib/**/*.ts": COVERAGE_THRESHOLDS,
        "components/**/*.{ts,tsx}": COVERAGE_THRESHOLDS,
      },
      include: [
        "lib/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "app/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
        "utils/**/*.{ts,tsx}",
      ],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "**/{dist,build,out,storybook,e2e,cypress}/**",
        "**/*.stories.*",
        "**/*.test.*",
        "**/*.spec.*",
        "**/types/**",
        "vitest.config.ts",
        "tsconfig*.json",
      ],
      reportsDirectory: "./coverage",
      reporter: [
        ["text", { skipFull: false }],
        ["text-summary"],
        ["json", { file: "coverage.json" }],
        ["json-summary", { file: "coverage-summary.json" }],
        ["html", { subdir: "html" }],
        ["lcov"],
        ["clover"],
      ],
    },

    outputFile: {
      junit: "./test-results/junit.xml",
    },

    env: {
      nodeEnv: "test",
      nextPublicAppName: "Metro Station Finder",
      nextPublicAppVersion: "2.0.0",
      vitest: "true",
      testing: "true",
    },

    deps: {
      optimizer: {
        web: {
          include: [
            "@testing-library/react",
            "@testing-library/jest-dom",
            "@testing-library/user-event",
            "react",
            "react-dom",
          ],
          exclude: ["playwright", "@playwright/test", "cypress", "storybook"],
        },
      },
    },

    typecheck: {
      enabled: true,
      checker: "tsc",
      include: ["**/*.{test,spec}.{ts,tsx}"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        "**/out/**",
        "**/.next/**",
      ],
      tsconfig: "./tsconfig.test.json",
    },

    watch: !isCI && isWatch,
    inspect: isDebug,
    inspectBrk: false,
    ui: isDebug,
    open: isDebug,
  },

  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "~": resolve(__dirname, "."),
      "@/components": resolve(__dirname, "./components"),
      "@/ui": resolve(__dirname, "./components/ui"),
      "@/lib": resolve(__dirname, "./lib"),
      "@/utils": resolve(__dirname, "./lib/utils"),
      "@/types": resolve(__dirname, "./lib/types"),
      "@/hooks": resolve(__dirname, "./hooks"),
      "@/styles": resolve(__dirname, "./styles"),
      "@/app": resolve(__dirname, "./app"),
      "@/test": resolve(__dirname, "./test"),
      "@/__mocks__": resolve(__dirname, "./__mocks__"),
    },
    conditions: ["import", "module", "browser", "default"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  },

  esbuild: {
    target: "node24",
    jsx: "automatic",
    format: "esm",
    platform: "node",
    sourcemap: true,
  },

  define: {
    // biome-ignore lint/style/useNamingConvention: Global constants for Vitest
    __VITEST__: true,
    // biome-ignore lint/style/useNamingConvention: Global constants for Vitest
    __TEST__: true,
    "import.meta.vitest": "true",
    "process.env.nodeEnv": '"test"',
  },
});
