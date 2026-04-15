import { defineConfig, devices } from "@playwright/test";

// https://playwright.dev/docs/test-configuration
// https://playwright.dev/docs/test-global-setup-teardown — use project
// dependencies (not `globalSetup`) as the 2026 recommended approach.

const BASE_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:3000";
const IS_CI = !!process.env["CI"];

export default defineConfig({
  expect: {
    timeout: 5000,
  },

  forbidOnly: IS_CI,
  fullyParallel: true,

  // Project dependencies pattern: `setup` runs first, all browser
  // projects depend on it. This is the 2026 recommended approach
  // over the legacy `globalSetup` file because it integrates with
  // the HTML reporter, traces, and fixtures.
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts$/,
    },
    {
      dependencies: ["setup"],
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      dependencies: ["setup"],
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      dependencies: ["setup"],
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      dependencies: ["setup"],
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      dependencies: ["setup"],
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],

  reporter: IS_CI
    ? [
        ["github"],
        ["html", { open: "never" }],
        ["junit", { outputFile: "test-results/junit.xml" }],
        ["blob", { outputDir: "test-results/blob" }],
      ]
    : [["list"], ["html", { open: "never" }]],

  retries: IS_CI ? 2 : 0,
  testDir: "./tests/e2e",

  use: {
    actionTimeout: 10_000,
    baseURL: BASE_URL,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    testIdAttribute: "data-testid",
    trace: "on-first-retry",
    video: "retain-on-failure",
  },

  webServer: {
    command: "bun run dev",
    reuseExistingServer: !IS_CI,
    stderr: "pipe",
    stdout: "ignore",
    timeout: 120_000,
    url: BASE_URL,
  },

  workers: IS_CI ? 2 : undefined,
});
