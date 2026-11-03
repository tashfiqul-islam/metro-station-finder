import { defineConfig, devices } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
const projects = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
  { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
];

// Locally `bun run smoke` exercises Chromium; CI sets CI=true and runs every project.
export default defineConfig({
  testDir: "e2e",
  // `.e2e.ts` keeps `bun test` (which also matches `.spec.ts`) from loading Playwright specs.
  testMatch: "**/*.e2e.ts",
  // A flaky test is a defect: no retries anywhere.
  retries: 0,
  fullyParallel: true,
  forbidOnly: true,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  use: { baseURL: origin, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: ["true", "1"].includes(process.env["CI"] ?? "") ? projects : projects.slice(0, 1),
  webServer: {
    // The built app, served by `vite preview` with the Worker running in workerd.
    command: "node ../../node_modules/vite/bin/vite.js preview",
    cwd: "apps/web",
    url: origin,
    reuseExistingServer: false,
    timeout: 60_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
