import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { isRecord } from "./guards.ts";

/** Platforms every tool must be locked for: the maintainer's Windows machine and the ubuntu-24.04 runner. */
const PLATFORMS = ["windows-x64", "linux-x64"] as const;

/** Download hosts the lock may name. Every URL must be https and contain the pinned version. */
const HOSTS = new Set(["github.com", "nodejs.org"]);

/**
 * Reviewed backend per tool. mise resolves a short name such as `hk` through its registry, which can change
 * between mise versions; pinning the backend here makes a silent backend swap fail the check. A new tool
 * is added here in the same reviewed change as its `mise.toml` pin. Prefixed names (`npm:renovate`) are
 * their own backend.
 */
const BACKENDS: Readonly<Record<string, string>> = {
  bun: "core:bun",
  node: "core:node",
  gitleaks: "aqua:gitleaks/gitleaks",
  hk: "packslip:github.com/jdx/hk",
  pkl: "aqua:apple/pkl",
  actionlint: "aqua:rhysd/actionlint",
  zizmor: "aqua:zizmorcore/zizmor",
};

/** Version a `mise.toml` `[tools]` entry pins, whether written as a string or as `{ version = ... }`. */
function pinnedVersion(spec: unknown): unknown {
  return isRecord(spec) ? spec["version"] : spec;
}

function checkUrl(name: string, platform: string, url: unknown, version: string): void {
  const label = `mise.lock ${name} ${platform} url`;
  let parsed: URL;
  try {
    parsed = new URL(String(url));
  } catch (error) {
    throw new Error(`${label}: not a URL`, { cause: error });
  }
  if (parsed.protocol !== "https:" || !HOSTS.has(parsed.hostname))
    throw new Error(`${label}: must be https on ${[...HOSTS].join(" or ")}, got ${String(url)}`);
  if (!parsed.pathname.includes(version))
    throw new Error(`${label}: must contain the pinned version ${version}, got ${String(url)}`);
}

async function checkNpmGraph(root: string, name: string, entry: Record<string, unknown>) {
  const aube = entry["aube"];
  if (!isRecord(aube) || typeof aube["path"] !== "string" || typeof aube["digest"] !== "string")
    throw new Error(`mise.lock ${name} has no recorded dependency graph (aube)`);
  const path = aube["path"];
  if (
    !path.startsWith(".mise/locks/") ||
    path.split("/").some((part) => part === ".." || part === "")
  )
    throw new Error(`mise.lock ${name} path must stay under .mise/locks/, got ${path}`);
  let bytes: Uint8Array;
  try {
    bytes = await readFile(join(root, path, "aube-lock.yaml"));
  } catch (error) {
    throw new Error(`mise.lock ${name}: dependency graph ${path} is not tracked`, {
      cause: error,
    });
  }
  // mise records the sha256 of the sidecar's aube-lock.yaml bytes (reproduced against mise 2026.10.25).
  const actual = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (aube["digest"] !== actual)
    throw new Error(
      `mise.lock ${name} digest ${aube["digest"]} does not match ${path} (${actual})`,
    );
}

function checkTrustExceptions(name: string, spec: unknown, entry: Record<string, unknown>): void {
  const want: unknown = isRecord(spec) ? spec["trust_policy_excludes"] : undefined;
  const options = entry["options"];
  const recorded = isRecord(options) ? options["trust_policy_excludes"] : undefined;
  let got: unknown;
  try {
    got = typeof recorded === "string" ? JSON.parse(recorded) : recorded;
  } catch (error) {
    throw new Error(`mise.lock ${name} trust_policy_excludes is not JSON`, { cause: error });
  }
  if (JSON.stringify(got ?? null) !== JSON.stringify(want ?? null))
    throw new Error(
      `mise.lock ${name} trust_policy_excludes ${JSON.stringify(got ?? null)} differs from mise.toml ${JSON.stringify(want ?? null)}`,
    );
}

/**
 * METRO-45: `mise.lock` must record exactly the tools pinned in `mise.toml`: same version and specifier,
 * the reviewed backend, an https URL containing the version and a sha256 checksum for every supported
 * platform, and for npm tools a dependency graph whose digest matches its tracked sidecar plus the same
 * trust-policy exceptions. mise itself enforces the lock at install time (`--locked`); this keeps the two
 * files from drifting unnoticed. Lock content comes from a reviewed `mise lock` run, never hand edits.
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
    if (typeof want !== "string" || entry["version"] !== want)
      throw new Error(
        `mise.lock ${name} is ${String(entry["version"])} but mise.toml pins ${String(want)}`,
      );
    if (JSON.stringify(entry["specifiers"]) !== JSON.stringify([want]))
      throw new Error(
        `mise.lock ${name} specifiers ${JSON.stringify(entry["specifiers"])} differ from mise.toml pin ${want}`,
      );
    const backend = name.includes(":") ? name : BACKENDS[name];
    if (backend === undefined)
      throw new Error(`mise.lock ${name} backend is not reviewed: add it to scripts/mise-lock.ts`);
    if (entry["backend"] !== backend)
      throw new Error(`mise.lock ${name} backend ${String(entry["backend"])} must be ${backend}`);
    checkTrustExceptions(name, spec, entry);
    if (name.startsWith("npm:")) {
      await checkNpmGraph(root, name, entry);
      continue;
    }
    for (const platform of PLATFORMS) {
      const platformEntry = entry[`platforms.${platform}`];
      const checksum = isRecord(platformEntry) ? platformEntry["checksum"] : undefined;
      if (typeof checksum !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(checksum))
        throw new Error(`mise.lock ${name} ${platform}: sha256 checksum required`);
      checkUrl(name, platform, isRecord(platformEntry) ? platformEntry["url"] : undefined, want);
    }
  }
}
