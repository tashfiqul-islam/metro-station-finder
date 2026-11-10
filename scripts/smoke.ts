import { fileURLToPath } from "node:url";

import { runSmoke } from "./smoke-port.ts";

/**
 * `bun run smoke` (METRO-130): picks a free port (or honours SMOKE_PORT), exports it as SMOKE_PORT and runs
 * Playwright, so parallel worktrees never wait on one fixed port. Extra arguments go to `playwright test`.
 */
const cli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
try {
  process.exitCode = await runSmoke(process.argv.slice(2), process.env, cli);
} catch (error) {
  // Only our own fixed port message; anything else could carry a path or URL.
  const known = error instanceof Error && error.message.startsWith("SMOKE_PORT must");
  process.stderr.write(`${known ? error.message : "the smoke run could not start"}\n`);
  process.exitCode = 1;
}
