import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { validateConfiguration, validateRuntimes } from "./configuration";
import { isRecord } from "./guards";
import { hookWarning } from "./hooks-status";

const root = fileURLToPath(new URL("..", import.meta.url));
await validateConfiguration(root);

const manifest: unknown = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const engines = isRecord(manifest) ? manifest["engines"] : undefined;
const wantBun = isRecord(engines) ? engines["bun"] : undefined;
const wantNode = isRecord(engines) ? engines["node"] : undefined;
if (typeof wantBun !== "string" || typeof wantNode !== "string")
  throw new Error("package.json engines must declare bun and node");
const node = Bun.spawnSync(["node", "--version"]);
if (node.exitCode !== 0) throw new Error("Node is required. Run the documented mise setup.");
const actualNode = node.stdout.toString().trim().replace(/^v/u, "");
validateRuntimes({ bun: wantBun, node: wantNode }, { bun: Bun.version, node: actualNode });
console.log(`Tools: Bun ${Bun.version}; Node ${actualNode}`);
// Visible, non-blocking: CI checkouts never install hooks, and CI is the backstop for a skipped gate.
if (process.env["CI"] !== "true") {
  const warning = hookWarning(root);
  if (warning !== undefined) console.warn(`WARNING: ${warning}`);
}
