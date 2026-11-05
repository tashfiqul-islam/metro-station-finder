import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { cleanGitEnv } from "./git-env";
import { isRecord } from "./guards";

/**
 * METRO-49 (ADR-0014). Each project's `target` and `lib` are chosen from what its runtime runs, so a
 * change to either is a decision, not an accident of inheritance. `tsc --showConfig` resolves
 * `extends`, so this fails when a base-config edit moves a project, not only when its own file changes.
 * The Workers API types come from the generated `worker-configuration.d.ts` alone.
 */

const root = resolve(import.meta.dir, "..");
// Same lookup as tsconfig-projects.test.ts: Bun links `tsc.exe` on Windows and `tsc` elsewhere.
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

function showConfig(config: string): Record<string, unknown> {
  const result = Bun.spawnSync([tsc, "-p", join(root, config), "--showConfig"], {
    cwd: root,
    env: cleanGitEnv(),
  });
  if (result.exitCode !== 0)
    throw new Error(
      `tsc could not read ${config}: ${result.stdout.toString()}${result.stderr.toString()}`,
    );
  const parsed: unknown = JSON.parse(result.stdout.toString());
  if (!isRecord(parsed)) throw new Error(`${config} did not resolve to an object`);
  return parsed;
}

function options(config: string): Record<string, unknown> {
  const found = showConfig(config)["compilerOptions"];
  if (!isRecord(found)) throw new Error(`${config} has no compilerOptions`);
  return found;
}

test.each(Object.entries(expected))(
  "METRO-49 %s resolves to the target and lib in ADR-0014",
  (config, want) => {
    const found = options(config);
    expect({ target: found["target"], lib: found["lib"] }).toEqual(want);
  },
  60000,
);

test("METRO-49 apps/api takes its Workers types from the generated file alone", () => {
  const config = showConfig("apps/api/tsconfig.json");
  expect(options("apps/api/tsconfig.json")["types"]).toEqual([]);
  expect(config["include"]).toContain("worker-configuration.d.ts");
  expect(config["files"]).toContain("./worker-configuration.d.ts");
}, 60000);

test("METRO-49 no package.json depends on @cloudflare/workers-types", async () => {
  const listed = Bun.spawnSync(
    [
      "git",
      "ls-files",
      "-z",
      "--",
      "package.json",
      "apps/*/package.json",
      "packages/*/package.json",
    ],
    { cwd: root, env: cleanGitEnv() },
  )
    .stdout.toString()
    .split("\0")
    .filter((file) => file !== "");
  expect(listed.length).toBeGreaterThan(1);
  const declaring: string[] = [];
  for (const file of listed) {
    const manifest: unknown = JSON.parse(await readFile(join(root, file), "utf8"));
    if (!isRecord(manifest)) throw new Error(`${file} is not an object`);
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      const group = manifest[field];
      if (isRecord(group) && "@cloudflare/workers-types" in group)
        declaring.push(`${file} ${field}`);
    }
  }
  expect(declaring).toEqual([]);
}, 60000);
