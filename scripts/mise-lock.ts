import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { isRecord } from "./guards.ts";

/** Platforms every tool must be locked for: the maintainer's Windows machine and the ubuntu-24.04 runner. */
const PLATFORMS = ["windows-x64", "linux-x64"] as const;

/** Version a `mise.toml` `[tools]` entry pins, whether written as a string or as `{ version = ... }`. */
function pinnedVersion(spec: unknown): unknown {
  return isRecord(spec) ? spec["version"] : spec;
}

/**
 * METRO-45: `mise.lock` must record exactly the tools pinned in `mise.toml`, at the same versions, with a
 * checksum for every supported platform (npm tools: a dependency-graph digest and its tracked sidecar).
 * mise itself enforces the lock at install time (`--locked`); this keeps the two files from drifting
 * unnoticed. Lock content comes from a reviewed `mise lock` run, never hand edits.
 */
export async function validateMiseLock(
  root: string,
  mise: Record<string, unknown>,
  tools: Record<string, unknown>,
): Promise<void> {
  const settings = isRecord(mise["settings"]) ? mise["settings"] : {};
  if (settings["lockfile"] !== true) throw new Error("mise.toml settings.lockfile must be true");
  if (JSON.stringify(settings["lockfile_platforms"]) !== JSON.stringify(PLATFORMS))
    throw new Error(`mise.toml settings.lockfile_platforms must be ${JSON.stringify(PLATFORMS)}`);

  let lock: unknown;
  try {
    lock = Bun.TOML.parse(await readFile(join(root, "mise.lock"), "utf8"));
  } catch (error) {
    throw new Error(`mise.lock: ${String(error)} (run \`mise lock\` and commit it)`, {
      cause: error,
    });
  }
  const locked = isRecord(lock) && isRecord(lock["tools"]) ? lock["tools"] : {};
  for (const name of Object.keys(locked))
    if (!(name in tools))
      throw new Error(`mise.lock records ${name}, which mise.toml does not pin`);
  for (const [name, spec] of Object.entries(tools)) {
    const entries = locked[name];
    const entry: unknown = Array.isArray(entries) && entries.length === 1 ? entries[0] : undefined;
    if (!isRecord(entry)) throw new Error(`mise.lock has no single entry for ${name}`);
    const want = pinnedVersion(spec);
    if (entry["version"] !== want)
      throw new Error(
        `mise.lock ${name} is ${String(entry["version"])} but mise.toml pins ${String(want)}`,
      );
    if (name.startsWith("npm:")) {
      const aube = entry["aube"];
      if (!isRecord(aube) || typeof aube["path"] !== "string" || typeof aube["digest"] !== "string")
        throw new Error(`mise.lock ${name} has no recorded dependency graph (aube)`);
      try {
        await access(join(root, aube["path"], "aube-lock.yaml"));
      } catch (error) {
        throw new Error(`mise.lock ${name}: dependency graph ${aube["path"]} is not tracked`, {
          cause: error,
        });
      }
      continue;
    }
    for (const platform of PLATFORMS) {
      const platformEntry = entry[`platforms.${platform}`];
      const checksum = isRecord(platformEntry) ? platformEntry["checksum"] : undefined;
      if (typeof checksum !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(checksum))
        throw new Error(`mise.lock ${name} ${platform}: sha256 checksum required`);
    }
  }
}
