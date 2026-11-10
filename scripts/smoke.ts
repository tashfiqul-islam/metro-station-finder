import { fileURLToPath } from "node:url";

import { smokeMain } from "./smoke-port.ts";

/**
 * `bun run smoke` (METRO-130): picks a free port (or honours SMOKE_PORT), exports it as SMOKE_PORT and runs
 * Playwright, so parallel worktrees never wait on one fixed port. Extra arguments go to `playwright test`.
 */
const cli = fileURLToPath(new URL("../node_modules/@playwright/test/cli.js", import.meta.url));
process.exitCode = await smokeMain(process.argv.slice(2), process.env, cli);
