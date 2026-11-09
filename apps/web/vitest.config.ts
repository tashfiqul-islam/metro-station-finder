import { fileURLToPath } from "node:url";

import { defineProject } from "vitest/config";

import { sharedTestOptions } from "../../vitest.shared.ts";

// The web component tests run in happy-dom inside Vitest's own worker (ADR-0016 stage 2). Each test file gets
// a fresh DOM, so no file registers or unregisters globals. Coverage and thresholds are root-only options
// and live in the root vitest.config.ts.
export default defineProject({
  test: {
    ...sharedTestOptions,
    name: "web",
    environment: "happy-dom",
    // Unit tests must never see a real Maps key from the shell or a `.env` file: blank means "no key".
    env: { VITE_GOOGLE_MAPS_API_KEY: "" },
    // Absolute: scripts/test-order.test.ts merges this config with a fixture root, where a relative path breaks.
    setupFiles: [fileURLToPath(new URL("./vitest.setup.ts", import.meta.url))],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
