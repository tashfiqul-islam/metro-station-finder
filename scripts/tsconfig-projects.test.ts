import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { cleanGitEnv } from "./git-env";
import { isRecord } from "./guards";

/**
 * METRO-26. An editor's language server opens a file in the nearest `tsconfig.json` that includes it,
 * or else in an "inferred project" with no `types`, where `bun:test`, `node:*`, `process` and `Bun`
 * do not exist. The repository's real projects live in several config files (test code is kept out of
 * the production projects on purpose), so the root `tsconfig.json` must be a solution file that
 * references every project; then each file opens in the project the gates check it with.
 */

const root = resolve(import.meta.dir, "..");
const tsc = join(root, "node_modules", ".bin", process.platform === "win32" ? "tsc.exe" : "tsc");

const git = (...args: string[]) =>
  Bun.spawnSync(["git", ...args], { cwd: root, env: cleanGitEnv() }).stdout.toString();

const tracked = (patterns: string[]) =>
  git("ls-files", "-z", "--", ...patterns)
    .split("\0")
    .filter((file) => file !== "");

async function referencedConfigs(): Promise<string[]> {
  const parsed: unknown = JSON.parse(await readFile(join(root, "tsconfig.json"), "utf8"));
  if (!isRecord(parsed)) throw new Error("tsconfig.json is not an object");
  expect(parsed["files"]).toEqual([]);
  expect(parsed["include"]).toBeUndefined();
  const references = parsed["references"];
  if (!Array.isArray(references)) throw new Error("tsconfig.json has no references");
  return (references as unknown[]).map((entry) => {
    const path = isRecord(entry) ? entry["path"] : undefined;
    if (typeof path !== "string") throw new Error("A reference has no path");
    const resolved = resolve(root, path);
    return resolved.endsWith(".json") ? resolved : join(resolved, "tsconfig.json");
  });
}

function filesOf(config: string): string[] {
  const result = Bun.spawnSync([tsc, "-p", config, "--listFilesOnly"], {
    cwd: root,
    env: cleanGitEnv(),
  });
  if (result.exitCode !== 0)
    throw new Error(`tsc could not read ${config}: ${result.stdout.toString()}`);
  return result.stdout
    .toString()
    .split(/\r?\n/u)
    .filter((line) => line !== "" && !line.includes("node_modules"))
    .map((line) => resolve(line));
}

test("METRO-26 every project config is referenced from the root tsconfig.json", async () => {
  const referenced = new Set(await referencedConfigs());
  const configs = tracked([
    "tsconfig*.json",
    "apps/*/tsconfig*.json",
    "packages/*/tsconfig*.json",
    "scripts/tsconfig*.json",
  ])
    .map((file) => resolve(root, file))
    .filter(
      (file) => file !== join(root, "tsconfig.json") && file !== join(root, "tsconfig.base.json"),
    );
  expect(configs.length).toBeGreaterThan(0);
  for (const config of configs) expect(referenced.has(config)).toBe(true);
  for (const config of referenced) expect(configs).toContain(config);
}, 60000);

test("METRO-26 every tracked TypeScript file belongs to a referenced project", async () => {
  const owned = new Set<string>();
  for (const config of await referencedConfigs())
    for (const file of filesOf(config)) owned.add(file);
  const sources = tracked(["*.ts", "*.tsx", "*.mts", "*.cts"]);
  // A failed `git ls-files` would otherwise yield an empty list and pass vacuously.
  expect(sources.length).toBeGreaterThan(0);
  expect(owned.size).toBeGreaterThan(0);
  const orphans = sources
    .map((file) => resolve(root, file))
    .filter((file) => !file.endsWith(".d.ts") && !owned.has(file));
  expect(orphans).toEqual([]);
}, 120000);
