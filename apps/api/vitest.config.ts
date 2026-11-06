import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineProject } from "vitest/config";

// The API tests run inside workerd (the runtime the Worker deploys to) through the Cloudflare plugin.
// Order, coverage and thresholds are global options and live in the root vitest.config.ts.
export default defineProject({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.vitest.jsonc" } })],
  test: { name: "api", include: ["src/**/*.test.ts"] },
});
