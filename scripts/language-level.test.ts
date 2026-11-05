import { join, resolve } from "node:path";

import { cleanGitEnv } from "./git-env";
import { isRecord } from "./guards";

/**
 * METRO-49 (ADR-0014). Each project's `target` and `lib` are chosen from what its runtime runs, so a
 * change to either is a decision, not an accident of inheritance. `tsc --showConfig` resolves
 * `extends`, so this fails when a base-config edit moves a project, not only when its own file changes.
 */

const root = resolve(import.meta.dir, "..");
const tsc = join(root, "node_modules", ".bin", process.platform === "win32" ? "tsc.exe" : "tsc");

// `--showConfig` prints `lib` entries lower-case.
const floor = { target: "es2022", lib: ["es2022"] };
const webFloor = { target: "es2022", lib: ["es2022", "dom", "dom.iterable"] };

const expected: Record<string, { target: string; lib: string[] }> = {
  // Node 26 (V8 14.6) runs the scripts; the Worker runs workerd (V8 15.x).
  "scripts/tsconfig.json": { target: "es2025", lib: ["es2025"] },
  "apps/api/tsconfig.json": { target: "es2025", lib: ["es2025"] },
  "tsconfig.e2e.json": { target: "es2025", lib: ["es2025", "dom", "dom.iterable"] },
  // Shared code runs in the Worker, the browser and Node: it keeps the web floor.
  "packages/core/tsconfig.json": floor,
  "packages/contracts/tsconfig.json": { target: "es2022", lib: ["es2022", "dom"] },
  // Browser matrix not written yet: Vite 8 default targets, so the floor stays.
  "apps/web/tsconfig.json": webFloor,
  "tsconfig.dom-test.json": webFloor,
  "tsconfig.test.json": floor,
};

function resolved(config: string): { target: unknown; lib: unknown } {
  const result = Bun.spawnSync([tsc, "-p", join(root, config), "--showConfig"], {
    cwd: root,
    env: cleanGitEnv(),
  });
  if (result.exitCode !== 0)
    throw new Error(`tsc could not read ${config}: ${result.stdout.toString()}`);
  const parsed: unknown = JSON.parse(result.stdout.toString());
  const options = isRecord(parsed) ? parsed["compilerOptions"] : undefined;
  if (!isRecord(options)) throw new Error(`${config} has no compilerOptions`);
  return { target: options["target"], lib: options["lib"] };
}

test.each(Object.entries(expected))(
  "METRO-49 %s resolves to the target and lib in ADR-0014",
  (config, want) => {
    expect(resolved(config)).toEqual(want);
  },
  60000,
);
