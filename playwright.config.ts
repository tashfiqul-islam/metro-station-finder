import { defineConfig, devices } from "@playwright/test";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Time constants for better maintainability
const SECONDS_IN_MINUTE = 60;
const MILLISECONDS_IN_SECOND = 1000;

// Timeout configuration
const GLOBAL_TIMEOUT_MINUTES = 15;
const TEST_TIMEOUT_SECONDS = 45;
const EXPECT_TIMEOUT_SECONDS = 15;
const WEB_SERVER_TIMEOUT_SECONDS = 180;

// Worker configuration
const DEFAULT_WORKERS = 6;
const CI_WORKERS = 2;
const RETRY_COUNT_CI = 3;
const RETRY_COUNT_LOCAL = 1;

// Calculated timeouts
const GLOBAL_TIMEOUT_MS =
  GLOBAL_TIMEOUT_MINUTES * SECONDS_IN_MINUTE * MILLISECONDS_IN_SECOND;
const TEST_TIMEOUT_MS = TEST_TIMEOUT_SECONDS * MILLISECONDS_IN_SECOND;
const EXPECT_TIMEOUT_MS = EXPECT_TIMEOUT_SECONDS * MILLISECONDS_IN_SECOND;
const WEB_SERVER_TIMEOUT_MS =
  WEB_SERVER_TIMEOUT_SECONDS * MILLISECONDS_IN_SECOND;

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1920, height: 1080 },
  mobile: { width: 375, height: 667 },
  pixel5: { width: 393, height: 851 },
  iphone12: { width: 390, height: 844 },
  galaxyS3: { width: 360, height: 640 },
  ipad: { width: 1024, height: 1366 },
  iphone14: { width: 390, height: 844 },
  galaxyS21: { width: 384, height: 854 },
  surfacePro: { width: 912, height: 1368 },
} as const;

// Dhaka coordinates for metro station testing
const DHAKA_COORDINATES = {
  longitude: 90.4125,
  latitude: 23.8103,
} as const;

// Environment detection
const isCI = Boolean(process.env["CI"]);
const isDebug = Boolean(process.env["DEBUG"]);

// ============================================================================
// PROJECT CONFIGURATION
// ============================================================================

/**
 * Metro Station Finder - Playwright Configuration
 *
 * Configuration for end-to-end testing of the metro station finder application.
 * Includes browser testing, device testing, accessibility testing, and API testing.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // ============================================================================
  // TEST DISCOVERY & EXECUTION
  // ============================================================================

  // Test file discovery patterns
  testDir: "./e2e",
  testMatch: ["**/*.spec.{js,ts}", "**/*.test.{js,ts}", "**/*.e2e.{js,ts}"],
  testIgnore: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/test-results/**",
    "**/playwright-report/**",
  ],

  // Parallel execution configuration
  fullyParallel: true,
  workers: isCI ? CI_WORKERS : DEFAULT_WORKERS,

  // Timeout configuration
  globalTimeout: GLOBAL_TIMEOUT_MS,
  timeout: TEST_TIMEOUT_MS,

  // Retry strategy for reliability
  retries: isCI ? RETRY_COUNT_CI : RETRY_COUNT_LOCAL,
  forbidOnly: isCI,

  // ============================================================================
  // REPORTING & DEBUGGING
  // ============================================================================

  // Reporter configuration
  reporter: [
    [
      "html",
      {
        outputFolder: "playwright-report",
        open: isDebug ? "on-failure" : "never",
        attachments: "on-first-retry",
      },
    ],
    [
      "json",
      {
        outputFile: "test-results/results.json",
        includeProjectInTestId: true,
      },
    ],
    [
      "junit",
      {
        outputFile: "test-results/results.xml",
        includeProjectInTestId: true,
      },
    ],
    ...(isCI ? [["github"] as const] : []),
    ...(isCI ? [["list", { printSteps: true }] as const] : []),
    ...(isDebug ? [["line"] as const] : []),
    ...(isDebug ? [["dot"] as const] : []),
  ],

  // ============================================================================
  // ASSERTION CONFIGURATION
  // ============================================================================

  expect: {
    // Assertion timeout
    timeout: EXPECT_TIMEOUT_MS,

    // Visual regression testing configuration
    toHaveScreenshot: {
      maxDiffPixels: 500,
      threshold: 0.3,
    },

    // Snapshot comparison settings
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.15,
      threshold: 0.3,
    },
  },

  // ============================================================================
  // GLOBAL TEST SETTINGS
  // ============================================================================

  use: {
    // Base URL configuration
    baseURL: "http://localhost:3000",

    // Debugging and trace collection
    trace: isDebug ? "on" : "on-first-retry",
    video: isDebug ? "on" : "on-first-retry",
    screenshot: isDebug ? "on" : "only-on-failure",

    // Browser context options
    contextOptions: {
      reducedMotion: "reduce",
      colorScheme: "light",
      locale: "en-BD",
      forcedColors: "none",
    },

    // Geolocation for metro station testing
    geolocation: DHAKA_COORDINATES,
    permissions: ["geolocation", "notifications"],

    // Timezone configuration
    timezoneId: "Asia/Dhaka",

    // Mobile-first viewport
    viewport: VIEWPORTS.mobile,

    // Network configuration
    ignoreHTTPSErrors: true,
    acceptDownloads: true,
    offline: false,
    serviceWorkers: "allow",

    // Performance optimization
    actionTimeout: 15_000,
    navigationTimeout: 45_000,

    // User agent for consistent testing
    userAgent: "Metro Station Finder E2E Tests",

    // Additional testing features
    launchOptions: {
      args: ["--enable-gpu", "--enable-accelerated-2d-canvas"],
    },
  },

  // ============================================================================
  // BROWSER & DEVICE PROJECTS
  // ============================================================================

  projects: [
    // ============================================================================
    // DESKTOP BROWSERS
    // ============================================================================

    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: VIEWPORTS.desktop,
        contextOptions: {
          reducedMotion: "no-preference",
        },
      },
    },

    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        viewport: VIEWPORTS.desktop,
        contextOptions: {
          reducedMotion: "no-preference",
        },
      },
    },

    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        viewport: VIEWPORTS.desktop,
        contextOptions: {
          reducedMotion: "no-preference",
        },
      },
    },

    // ============================================================================
    // MOBILE DEVICES
    // ============================================================================

    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        viewport: VIEWPORTS.pixel5,
        contextOptions: {
          reducedMotion: "reduce",
        },
      },
    },

    {
      name: "Mobile Safari",
      use: {
        ...devices["iPhone 12"],
        viewport: VIEWPORTS.iphone12,
        contextOptions: {
          reducedMotion: "reduce",
        },
      },
    },

    {
      name: "Mobile Edge",
      use: {
        ...devices["Galaxy S III"],
        viewport: VIEWPORTS.galaxyS3,
        contextOptions: {
          reducedMotion: "reduce",
        },
      },
    },

    {
      name: "iPhone 14",
      use: {
        ...devices["iPhone 14"],
        viewport: VIEWPORTS.iphone14,
        contextOptions: {
          reducedMotion: "reduce",
        },
      },
    },

    {
      name: "Galaxy S21",
      use: {
        ...devices["Galaxy S21"],
        viewport: VIEWPORTS.galaxyS21,
        contextOptions: {
          reducedMotion: "reduce",
        },
      },
    },

    // ============================================================================
    // TABLET DEVICES
    // ============================================================================

    {
      name: "iPad",
      use: {
        ...devices["iPad Pro"],
        viewport: VIEWPORTS.ipad,
        contextOptions: {
          reducedMotion: "no-preference",
        },
      },
    },

    {
      name: "Surface Pro",
      use: {
        ...devices["Desktop Edge"],
        viewport: VIEWPORTS.surfacePro,
        contextOptions: {
          reducedMotion: "no-preference",
        },
      },
    },

    // ============================================================================
    // ACCESSIBILITY TESTING PROJECT
    // ============================================================================

    {
      name: "accessibility",
      use: {
        ...devices["Desktop Chrome"],
        viewport: VIEWPORTS.desktop,
        contextOptions: {
          reducedMotion: "reduce",
          colorScheme: "light",
          forcedColors: "none",
        },
        permissions: ["geolocation", "notifications"],
      },
      // Run accessibility tests with specific tags
      grep: /@accessibility/,
    },

    // ============================================================================
    // PERFORMANCE TESTING PROJECT
    // ============================================================================

    {
      name: "performance",
      use: {
        ...devices["Desktop Chrome"],
        viewport: VIEWPORTS.desktop,
        contextOptions: {
          reducedMotion: "no-preference",
        },
        video: "off",
        screenshot: "off",
        trace: "off",
      },
      // Run performance tests with specific tags
      grep: /@performance/,
    },

    // ============================================================================
    // API TESTING PROJECT
    // ============================================================================

    {
      name: "api",
      use: {
        ...devices["Desktop Chrome"],
        viewport: VIEWPORTS.desktop,
        contextOptions: {
          reducedMotion: "no-preference",
        },
        video: "off",
        screenshot: "only-on-failure",
        trace: "off",
      },
      // Run API tests with specific tags
      grep: /@api/,
    },
  ],

  // ============================================================================
  // WEB SERVER CONFIGURATION
  // ============================================================================

  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000",
    timeout: WEB_SERVER_TIMEOUT_MS,
    reuseExistingServer: !isCI,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      // biome-ignore lint/style/useNamingConvention: Environment variables must be uppercase
      NODE_ENV: "test",
      // biome-ignore lint/style/useNamingConvention: Environment variables must be uppercase
      PLAYWRIGHT_TEST: "true",
      // biome-ignore lint/style/useNamingConvention: Environment variables must be uppercase
      NEXT_TELEMETRY_DISABLED: "1",
      // biome-ignore lint/style/useNamingConvention: Environment variables must be uppercase
      NEXT_PUBLIC_TEST_MODE: "true",
    },
  },
});
