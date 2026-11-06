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
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
