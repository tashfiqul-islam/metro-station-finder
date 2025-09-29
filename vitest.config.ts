import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Environment detection
const isCI = Boolean(process.env["CI"]);
const isDebug = Boolean(process.env["DEBUG"]);
const isCoverage = Boolean(process.env["COVERAGE"]);

// Coverage thresholds for quality gates
const COVERAGE_THRESHOLDS = {
  branches: 90,
  functions: 90,
  lines: 90,
  statements: 90,
} as const;

// Test file patterns
const TEST_PATTERNS = {
  include: [
    "**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    "**/*.{test,spec}.{js,ts,jsx,tsx}",
  ],
  exclude: [
    "node_modules",
    "dist",
    ".next",
    "out",
    "coverage",
    "test-results",
    "playwright-report",
    "**/*.stories.*",
    "**/storybook/**",
    "**/e2e/**",
    "**/cypress/**",
  ],
};

// Coverage exclusion patterns
const COVERAGE_EXCLUDE = [
  "node_modules/",
  "test/",
  "**/*.d.ts",
  "**/*.config.*",
  "**/coverage/**",
  "**/.next/**",
  "**/out/**",
  "**/dist/**",
  "**/build/**",
  "**/*.stories.*",
  "**/storybook/**",
  "**/e2e/**",
  "**/cypress/**",
  "**/playwright-report/**",
  "**/test-results/**",
  "**/coverage/**",
  "**/types/**",
  "**/*.test.*",
  "**/*.spec.*",
];

// ============================================================================
// VITEST CONFIGURATION
// ============================================================================

/**
 * Metro Station Finder - Modern Vitest Configuration
 *
 * This configuration implements the latest Vitest best practices for 2025:
 * - Modern TypeScript patterns with strict typing
 * - Comprehensive test coverage and quality gates
 * - Performance-optimized test execution
 * - CI/CD integration with proper reporting
 * - Metro app specific testing patterns
 *
 * @see https://vitest.dev/guide/
 * @see https://vitest.dev/config/
 */
export default defineConfig({
  // ============================================================================
  // TEST CONFIGURATION
  // ============================================================================

  test: {
    // ============================================================================
    // TEST DISCOVERY & EXECUTION
    // ============================================================================

    // Test file patterns
    include: TEST_PATTERNS.include,
    exclude: TEST_PATTERNS.exclude,

    // Test environment
    environment: "jsdom",
    globals: true,

    // Setup files
    setupFiles: ["./test/setup.ts"],

    // ============================================================================
    // PERFORMANCE & CONCURRENCY
    // ============================================================================

    // Thread pool configuration for optimal performance
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: false, // Avoid segfaults in older Node versions
      },
    },

    // Test execution settings
    isolate: true,
    fileParallelism: true,
    maxConcurrency: 5,

    // ============================================================================
    // TIMEOUTS & RELIABILITY
    // ============================================================================

    // Timeout configuration
    testTimeout: 10_000, // 10 seconds
    hookTimeout: 10_000, // 10 seconds
    teardownTimeout: 5000, // 5 seconds

    // Retry configuration for flaky tests
    retry: isCI ? 2 : 0,

    // ============================================================================
    // COVERAGE CONFIGURATION
    // ============================================================================

    coverage: {
      // Coverage provider
      provider: "v8",

      // Coverage collection
      enabled: isCoverage,
      all: true,
      clean: true,
      cleanOnRerun: true,

      // Coverage thresholds for quality gates
      thresholds: {
        global: COVERAGE_THRESHOLDS,
        // Per-file thresholds for critical modules
        "lib/**/*.ts": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        "components/**/*.{ts,tsx}": {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },

      // Coverage inclusion/exclusion
      include: [
        "lib/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "app/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
        "utils/**/*.{ts,tsx}",
      ],
      exclude: COVERAGE_EXCLUDE,

      // Coverage reporting options
      reportsDirectory: "./coverage",
      // Detailed reporter configuration
      reporter: [
        ["text", { skipFull: false }],
        ["text-summary", { skipFull: false }],
        ["json", { file: "coverage.json" }],
        ["json-summary", { file: "coverage-summary.json" }],
        ["html", { subdir: "html" }],
        ["lcov", { file: "lcov.info" }],
        ["clover", { file: "clover.xml" }],
      ],
    },

    // ============================================================================
    // REPORTING & OUTPUT
    // ============================================================================

    // Reporters configuration
    reporters: [
      "default",
      ...(isCI ? ["junit"] : []),
      ...(isDebug ? ["verbose"] : []),
    ],

    // Output file configuration
    outputFile: {
      junit: "./test-results/junit.xml",
    },

    // ============================================================================
    // WATCH MODE & DEVELOPMENT
    // ============================================================================

    // Watch mode configuration
    watch: !isCI,

    // ============================================================================
    // DEBUGGING & INSPECTION
    // ============================================================================

    // Debug configuration
    inspect: isDebug,
    inspectBrk: isDebug,

    // ============================================================================
    // METRO APP SPECIFIC CONFIGURATION
    // ============================================================================

    // Environment variables for testing
    env: {
      nodeEnv: "test",
      vitest: "true",
      // Metro app specific environment variables
      nextPublicAppName: "Metro Station Finder",
      nextPublicAppVersion: "2.0.0",
    },

    // Mock configuration for external dependencies
    deps: {
      optimizer: {
        web: {
          include: [
            // Dependencies that should be transformed
            "@testing-library/react",
            "@testing-library/jest-dom",
          ],
          exclude: [
            // External dependencies that shouldn't be transformed
            "playwright",
            "@playwright/test",
          ],
        },
      },
    },

    // ============================================================================
    // TYPECHECKING INTEGRATION
    // ============================================================================

    // TypeScript typechecking
    typecheck: {
      enabled: true,
      checker: "tsc",
      include: ["**/*.{test,spec}.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**"],
      tsconfig: "./tsconfig.json",
    },
  },

  // ============================================================================
  // MODULE RESOLUTION & ALIASES
  // ============================================================================

  resolve: {
    alias: {
      // Root aliases
      "@": resolve(__dirname, "./"),
      "~": resolve(__dirname, "./"),

      // Component aliases
      "@/components": resolve(__dirname, "./components"),
      "@/ui": resolve(__dirname, "./components/ui"),

      // Library aliases
      "@/lib": resolve(__dirname, "./lib"),
      "@/utils": resolve(__dirname, "./lib/utils"),

      // Type aliases
      "@/types": resolve(__dirname, "./lib/types"),

      // Hook aliases
      "@/hooks": resolve(__dirname, "./hooks"),

      // Style aliases
      "@/styles": resolve(__dirname, "./styles"),

      // App aliases
      "@/app": resolve(__dirname, "./app"),

      // Test aliases
      "@/test": resolve(__dirname, "./test"),
      "@/__mocks__": resolve(__dirname, "./__mocks__"),
    },
  },

  // ============================================================================
  // VITE INTEGRATION
  // ============================================================================

  // Vite-specific configuration
  esbuild: {
    target: "node18",
  },

  // Define global constants
  define: {
    __vitest__: true,
    __test__: true,
  },
});
