import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { validateConfiguration, validateRuntimes } from "./configuration";

await validateConfiguration(fileURLToPath(new URL("..", import.meta.url)));

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const node = Bun.spawnSync(["node", "--version"]);
if (node.exitCode !== 0) throw new Error("Node is required. Run the documented mise setup.");
const actualNode = node.stdout.toString().trim().replace(/^v/u, "");
validateRuntimes(manifest.engines, { bun: Bun.version, node: actualNode });
console.log(`Tools: Bun ${Bun.version}; Node ${actualNode}`);
