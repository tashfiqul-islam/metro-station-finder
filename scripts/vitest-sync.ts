import { isRecord } from "./guards.ts";

/**
 * METRO-77 / ADR-0016: keep the Vitest toolchain on one set of versions. Pure over parsed files so each
 * rule can be proven on an edited copy. Returns one message per problem; an empty list means in sync.
 */
export interface VitestSyncInput {
  /** Parsed root `package.json`. */
  manifest: Record<string, unknown>;
  /** Parsed `bun.lock`. */
  lock: Record<string, unknown>;
  /** Parsed `.github/renovate.json5`. */
  renovate: Record<string, unknown>;
}

const PLUGIN = "@cloudflare/vitest-plugin";
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

function lockVersion(table: Record<string, unknown>, key: string): string | undefined {
  const entry = table[key];
  if (!Array.isArray(entry) || typeof entry[0] !== "string") return undefined;
  return entry[0].slice(entry[0].lastIndexOf("@") + 1);
}

/** The version of the first of these lock keys that exists (nearest first), or undefined. */
function firstVersion(table: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const version = lockVersion(table, key);
    if (version !== undefined) return version;
  }
  return undefined;
}

/** The exact version a lock entry declares for one of its `dependencies` (`[id, registry, { dependencies }, hash]`). */
function declaredDependency(
  table: Record<string, unknown>,
  key: string,
  dependency: string,
): string | undefined {
  const entry = table[key];
  const meta: unknown = Array.isArray(entry) ? entry[2] : undefined;
  const dependencies = isRecord(meta) ? meta["dependencies"] : undefined;
  const version = isRecord(dependencies) ? dependencies[dependency] : undefined;
  return typeof version === "string" ? version : undefined;
}

/** The `vitest` peer range in the plugin's `bun.lock` entry (`[id, registry, { peerDependencies }, integrity]`). */
function pluginVitestPeer(table: Record<string, unknown>): string | undefined {
  const entry = table[PLUGIN];
  const meta: unknown = Array.isArray(entry) ? entry[2] : undefined;
  const peers = isRecord(meta) ? meta["peerDependencies"] : undefined;
  const range = isRecord(peers) ? peers["vitest"] : undefined;
  return typeof range === "string" ? range : undefined;
}

/** `4.156.2` to `4.156`. */
function minor(version: string): string {
  return version.split(".").slice(0, 2).join(".");
}

function groupMembers(renovate: Record<string, unknown>, groupName: string): string[] {
  const rules = renovate["packageRules"];
  if (!Array.isArray(rules)) return [];
  return rules.flatMap((rule): string[] => {
    if (!isRecord(rule) || rule["groupName"] !== groupName) return [];
    const names = rule["matchPackageNames"];
    return Array.isArray(names)
      ? names.filter((name): name is string => typeof name === "string")
      : [];
  });
}

export function checkVitestSync(input: VitestSyncInput): string[] {
  const problems: string[] = [];
  const dev = input.manifest["devDependencies"];
  const pins = isRecord(dev) ? dev : {};
  const versions: Record<string, string> = {};
  for (const name of ["vitest", "@vitest/coverage-istanbul", PLUGIN]) {
    const pin = pins[name];
    if (typeof pin !== "string") problems.push(`package.json devDependencies.${name} is required`);
    else if (!EXACT.test(pin)) problems.push(`${name} must be an exact pin, got ${pin}`);
    else versions[name] = pin;
  }
  const vitest = versions["vitest"];
  const coverage = versions["@vitest/coverage-istanbul"];
  if (vitest !== undefined && coverage !== undefined && vitest !== coverage)
    problems.push(`@vitest/coverage-istanbul ${coverage} must equal vitest ${vitest}`);

  const table = input.lock["packages"];
  if (!isRecord(table)) return [...problems, "bun.lock has no packages table"];
  // METRO-80: the pinned vitest must satisfy the peer range the pinned plugin declares in its lock entry, so
  // first make sure that lock entry is the plugin version the manifest pins.
  const pluginPin = versions[PLUGIN];
  const locked = lockVersion(table, PLUGIN);
  const peer = pluginVitestPeer(table);
  if (pluginPin !== undefined && locked !== pluginPin)
    problems.push(
      `bun.lock resolves ${PLUGIN} ${locked ?? "nothing"} but package.json pins ${pluginPin}`,
    );
  else if (peer === undefined) problems.push(`bun.lock lists no vitest peer range for ${PLUGIN}`);
  else if (vitest !== undefined && !Bun.semver.satisfies(vitest, peer))
    problems.push(`vitest ${vitest} is outside the peer range "${peer}" that ${PLUGIN} declares`);
  // Bun lists a copy under the plugin only when the root one does not satisfy the plugin's pin; otherwise the
  // plugin uses the root copy (METRO-164: plugin 1.8.2 pins the repository's wrangler, so only its miniflare is
  // nested). Resolve the way Bun does, nearest entry first, so both layouts are held to the same rule.
  const pluginWranglerNested = lockVersion(table, `${PLUGIN}/wrangler`) !== undefined;
  const fromMiniflare = firstVersion(table, [
    `${PLUGIN}/miniflare/workerd`,
    `${PLUGIN}/workerd`,
    "workerd",
  ]);
  const fromWrangler = firstVersion(
    table,
    pluginWranglerNested
      ? [`${PLUGIN}/wrangler/workerd`, `${PLUGIN}/workerd`, "workerd"]
      : ["wrangler/workerd", "workerd"],
  );
  if (fromMiniflare === undefined || fromWrangler === undefined)
    problems.push(
      `bun.lock must resolve workerd for both the ${PLUGIN} miniflare and its wrangler (no entry found)`,
    );
  else if (fromMiniflare !== fromWrangler)
    problems.push(
      `${PLUGIN} resolves two workerd versions: miniflare ${fromMiniflare}, wrangler ${fromWrangler}`,
    );
  const pluginWrangler = firstVersion(table, [`${PLUGIN}/wrangler`, "wrangler"]);
  const rootWrangler = lockVersion(table, "wrangler");
  if (pluginWrangler === undefined || rootWrangler === undefined)
    problems.push("bun.lock must resolve wrangler for the repository and for the plugin");
  else if (minor(pluginWrangler) !== minor(rootWrangler))
    problems.push(
      `plugin wrangler ${pluginWrangler} and repository wrangler ${rootWrangler} must share major.minor`,
    );

  // The versions the lock entries themselves declare must be the versions the fallback resolved. This is what
  // keeps the check meaningful when Bun lists no nested copy: the plugin pins its wrangler, and its miniflare and
  // that wrangler pin their workerd, so a root entry that drifted from those pins is caught here.
  const miniflareKey =
    lockVersion(table, `${PLUGIN}/miniflare`) === undefined ? "miniflare" : `${PLUGIN}/miniflare`;
  const wranglerKey = pluginWranglerNested ? `${PLUGIN}/wrangler` : "wrangler";
  for (const [owner, dependency, resolved] of [
    [PLUGIN, "wrangler", pluginWrangler],
    [miniflareKey, "workerd", fromMiniflare],
    [wranglerKey, "workerd", fromWrangler],
  ] as const) {
    const wanted = declaredDependency(table, owner, dependency);
    if (wanted !== undefined && resolved !== undefined && wanted !== resolved)
      problems.push(`${owner} declares ${dependency} ${wanted} but bun.lock resolves ${resolved}`);
  }

  const vitestGroup = groupMembers(input.renovate, "vitest");
  for (const name of ["vitest", "@vitest/**"])
    if (!vitestGroup.includes(name))
      problems.push(`Renovate group "vitest" must match ${name} so the versions move together`);
  const cloudflareGroup = groupMembers(input.renovate, "cloudflare");
  for (const name of ["wrangler", "@cloudflare/**"])
    if (!cloudflareGroup.includes(name))
      problems.push(
        `Renovate group "cloudflare" must match ${name} so ${PLUGIN} moves with wrangler`,
      );
  return problems;
}
