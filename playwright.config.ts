import { defineConfig, devices } from "@playwright/test";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Time constants for better maintainability
const SECONDS_IN_MINUTE = 60;
const MILLISECONDS_IN_SECOND = 1000;

// Timeout configuration
const GLOBAL_TIMEOUT_MINUTES = 10;
const TEST_TIMEOUT_SECONDS = 30;
const EXPECT_TIMEOUT_SECONDS = 10;
const WEB_SERVER_TIMEOUT_SECONDS = 120;

// Worker configuration for optimal performance
const DEFAULT_WORKERS = 4;
const CI_WORKERS = 1;

// Calculated timeouts
const GLOBAL_TIMEOUT_MS =
  GLOBAL_TIMEOUT_MINUTES * SECONDS_IN_MINUTE * MILLISECONDS_IN_SECOND;
const TEST_TIMEOUT_MS = TEST_TIMEOUT_SECONDS * MILLISECONDS_IN_SECOND;
const EXPECT_TIMEOUT_MS = EXPECT_TIMEOUT_SECONDS * MILLISECONDS_IN_SECOND;
const WEB_SERVER_TIMEOUT_MS =
  WEB_SERVER_TIMEOUT_SECONDS * MILLISECONDS_IN_SECOND;

// Viewport configurations for comprehensive testing
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 375, height: 667 },
  pixel5: { width: 393, height: 851 },
  iphone12: { width: 390, height: 844 },
  galaxyS3: { width: 360, height: 640 },
  ipad: { width: 1024, height: 1366 },
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
 * Metro Station Finder - Modern Playwright Configuration
 *
 * This configuration implements the latest Playwright best practices for 2025:
 * - Modern TypeScript patterns with strict typing
 * - Comprehensive browser and device testing
 * - Accessibility-first testing approach
 * - Performance-optimized parallel execution
 * - CI/CD integration with proper reporting
 * - Mobile-first design testing for public transportation apps
 *
 * @see https://playwright.dev/docs/test-configuration
 * @see https://playwright.dev/docs/best-practices
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
  retries: isCI ? 2 : 0,
  forbidOnly: isCI,

  // ============================================================================
  // REPORTING & DEBUGGING
  // ============================================================================

  // Modern reporter configuration with conditional CI reporting
  reporter: [
    // HTML reporter for local development and CI
    [
      "html",
      {
        outputFolder: "playwright-report",
        open: isDebug ? "on-failure" : "never",
        attachments: "on-first-retry",
      },
    ],
    // JSON reporter for CI integration
    [
      "json",
      {
        outputFile: "test-results/results.json",
        includeProjectInTestId: true,
      },
    ],
    // JUnit reporter for CI systems
    [
      "junit",
      {
        outputFile: "test-results/results.xml",
        includeProjectInTestId: true,
      },
    ],
    // List reporter for CI logs (cleaner output)
    ...(isCI ? [["list", { printSteps: true }] as const] : []),
    // Line reporter for local development
    ...(isDebug ? [["line"] as const] : []),
  ],

  // ============================================================================
  // ASSERTION CONFIGURATION
  // ============================================================================

  expect: {
    // Assertion timeout
    timeout: EXPECT_TIMEOUT_MS,

    // Visual regression testing configuration
    toHaveScreenshot: {
      // Allow minor pixel differences for cross-browser compatibility
      maxDiffPixels: 100,
      // Threshold for pixel difference ratio
      threshold: 0.2,
    },

    // Snapshot comparison settings
    toMatchSnapshot: {
      // Allow 10% pixel difference for cross-browser compatibility
      maxDiffPixelRatio: 0.1,
      // Threshold for pixel difference ratio
      threshold: 0.2,
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
      // Accessibility testing - respect user preferences
      reducedMotion: "reduce",
      // Color scheme for accessibility testing
      colorScheme: "light",
      // Locale for internationalization testing
      locale: "en-BD", // Bangladesh English
    },

    // Geolocation for metro station testing
    geolocation: DHAKA_COORDINATES,
    permissions: ["geolocation"],

    // Timezone configuration
    timezoneId: "Asia/Dhaka",

    // Mobile-first viewport (metro apps are primarily mobile)
    viewport: VIEWPORTS.mobile,

    // Network configuration
    ignoreHTTPSErrors: true,
    acceptDownloads: true,

    // Performance optimization
    actionTimeout: 10_000, // 10 seconds for actions
    navigationTimeout: 30_000, // 30 seconds for navigation

    // User agent for consistent testing
    userAgent: "Metro Station Finder E2E Tests",
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
        // Desktop-specific settings
        contextOptions: {
          reducedMotion: "no-preference", // Desktop users may prefer animations
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
    // MOBILE DEVICES (Primary focus for metro apps)
    // ============================================================================

    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 5"],
        viewport: VIEWPORTS.pixel5,
        // Mobile-specific optimizations
        contextOptions: {
          reducedMotion: "reduce", // Mobile users often prefer reduced motion
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

    // ============================================================================
    // ACCESSIBILITY TESTING PROJECT
    // ============================================================================

    {
      name: "accessibility",
      use: {
        ...devices["Desktop Chrome"],
        viewport: VIEWPORTS.desktop,
        // Enhanced accessibility testing settings
        contextOptions: {
          reducedMotion: "reduce",
          colorScheme: "light",
          forcedColors: "none",
        },
        // Additional permissions for accessibility testing
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
        // Performance testing optimizations
        contextOptions: {
          reducedMotion: "no-preference",
        },
        // Disable unnecessary features for performance testing
        video: "off",
        screenshot: "off",
        trace: "off",
      },
      // Run performance tests with specific tags
      grep: /@performance/,
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
    // Health check configuration
    env: {
      nodeEnv: "test",
      playwrightTest: "true",
    },
  },
});
