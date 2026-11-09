import { defineConfig, devices } from "@playwright/test";

const origin = "http://127.0.0.1:4173";
// The lab web-vitals spec runs on Chromium only (METRO-44 part C): see docs/evidence/metro-44c.md.
// The brand-asset regeneration check needs Chromium to rasterise (METRO-107).
const chromiumOnly = ["**/web-vitals-lab.e2e.ts", "**/brand-assets.e2e.ts"];
const projects = [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "firefox", testIgnore: chromiumOnly, use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", testIgnore: chromiumOnly, use: { ...devices["Desktop Safari"] } },
  { name: "mobile-chrome", testIgnore: chromiumOnly, use: { ...devices["Pixel 7"] } },
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
  // Service workers are blocked unless a spec opts in with `test.use({ serviceWorkers: "allow" })` (METRO-106,
  // `e2e/offline-shell.e2e.ts` and the lab web-vitals spec): a registered worker after idle would add requests
  // to journeys that assert exact request lists, and would carry state between tests of one context.
  use: {
    baseURL: origin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    serviceWorkers: "block",
  },
  projects: ["true", "1"].includes(process.env["CI"] ?? "") ? projects : projects.slice(0, 1),
  webServer: {
    // The built app, served by `vite preview` with the Worker running in workerd. The web app is rebuilt
    // first with the fake key below (METRO-88): the key is compiled in, and `bun run build` has none. A
    // variable set here wins over any `.env` file, so a smoke run can never carry a real key, and the
    // Google hosts are stubbed in the tests, so it never reaches Google either.
    command:
      "node ../../node_modules/vite/bin/vite.js build && node ../../node_modules/vite/bin/vite.js preview",
    cwd: "apps/web",
    env: { VITE_GOOGLE_MAPS_API_KEY: "fake-key-for-tests" },
    url: origin,
    reuseExistingServer: false,
    timeout: 60_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
