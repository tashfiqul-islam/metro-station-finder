import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineProject } from "vitest/config";

import { sharedTestOptions } from "../../vitest.shared.ts";

// The API tests run inside workerd (the runtime the Worker deploys to) through the Cloudflare plugin.
// Coverage and thresholds are root-only options and live in the root vitest.config.ts.
export default defineProject({
  plugins: [
    cloudflareTest({
      // The real Worker config is the single source (name, entry, compatibility date, assets routing).
      // Only the assets directory is supplied here: @cloudflare/vite-plugin fills it with the client build
      // in the real build, and the test pool does not run that plugin.
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: { assets: { directory: "./test-assets" } },
    }),
  ],
  test: {
    ...sharedTestOptions,
    name: "api",
    include: ["src/**/*.test.ts"],
  },
});
