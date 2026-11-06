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
  const fromMiniflare = lockVersion(table, `${PLUGIN}/miniflare/workerd`);
  const fromWrangler = lockVersion(table, `${PLUGIN}/wrangler/workerd`);
  if (fromMiniflare === undefined || fromWrangler === undefined)
    problems.push(
      `bun.lock must resolve workerd under both ${PLUGIN}/miniflare and ${PLUGIN}/wrangler (nested entries missing)`,
    );
  else if (fromMiniflare !== fromWrangler)
    problems.push(
      `${PLUGIN} resolves two workerd versions: miniflare ${fromMiniflare}, wrangler ${fromWrangler}`,
    );
  const pluginWrangler = lockVersion(table, `${PLUGIN}/wrangler`);
  const rootWrangler = lockVersion(table, "wrangler");
  if (pluginWrangler === undefined || rootWrangler === undefined)
    problems.push("bun.lock must resolve wrangler for the repository and for the plugin");
  else if (minor(pluginWrangler) !== minor(rootWrangler))
    problems.push(
      `plugin wrangler ${pluginWrangler} and repository wrangler ${rootWrangler} must share major.minor`,
    );

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
