import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { isRecord } from "./guards.ts";
import { exactToolVersion } from "./tool-pins.ts";

function record(value: unknown, name: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${name}: expected an object`);
  return value;
}

export async function validateConfiguration(root: string): Promise<void> {
  async function parse(file: string, toml = false) {
    try {
      const source = await readFile(join(root, file), "utf8");
      return record(toml ? Bun.TOML.parse(source) : JSON.parse(source), file);
    } catch (error) {
      throw new Error(`${file}: ${String(error)}`, { cause: error });
    }
  }
  const manifest = await parse("package.json");
  const engines = record(manifest["engines"], "package.json engines");
  const mise = await parse("mise.toml", true);
  const tools = record(mise["tools"], "mise.toml tools");
  for (const runtime of ["bun", "node"]) {
    const version = engines[runtime];
    if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/u.test(version))
      throw new Error(`package.json engines.${runtime}: exact stable version required`);
    if (tools[runtime] !== version)
      throw new Error(
        `mise.toml tools.${runtime} must match package.json engines.${runtime} (${version})`,
      );
  }
  for (const tool of ["gitleaks", "actionlint", "zizmor"]) exactToolVersion(tools, tool);
  for (const [name, task] of Object.entries(record(mise["tasks"], "mise.toml tasks"))) {
    const description = record(task, `mise.toml tasks.${name}`)["description"];
    if (typeof description !== "string" || description.trim() === "")
      throw new Error(`mise.toml tasks.${name}.description is required`);
  }
  if (manifest["packageManager"] !== `bun@${String(engines["bun"])}`)
    throw new Error("package.json packageManager must match engines.bun");
  const trusted = manifest["trustedDependencies"];
  if (
    !Array.isArray(trusted) ||
    trusted.some((entry) => typeof entry !== "string") ||
    JSON.stringify(trusted) !== JSON.stringify(REVIEWED_TRUSTED_DEPENDENCIES)
  )
    throw new Error(
      `package.json trustedDependencies must equal the reviewed list ${JSON.stringify(REVIEWED_TRUSTED_DEPENDENCIES)}`,
    );
  const install = record((await parse("bunfig.toml", true))["install"], "bunfig.toml install");
  for (const [key, value] of Object.entries({
    exact: true,
    auto: "disable",
    linker: "isolated",
    saveTextLockfile: true,
  })) {
    if (install[key] !== value)
      throw new Error(`bunfig.toml install.${key} must be ${String(value)}`);
  }
  if (install["minimumReleaseAge"] !== RELEASE_COOLDOWN_SECONDS)
    throw new Error(`bunfig.toml install.minimumReleaseAge must be ${RELEASE_COOLDOWN_SECONDS}`);
  const renovate = await readRenovate(root);
  const renovateAge = renovate["minimumReleaseAge"];
  if (typeof renovateAge !== "string")
    throw new Error(`${RENOVATE_FILE}: minimumReleaseAge is required`);
  if (durationSeconds(renovateAge) !== install["minimumReleaseAge"])
    throw new Error(
      `${RENOVATE_FILE}: minimumReleaseAge "${renovateAge}" must equal bunfig.toml install.minimumReleaseAge (${RELEASE_COOLDOWN_SECONDS} seconds)`,
    );
}

const RELEASE_COOLDOWN_SECONDS = 259200;
/** Reviewed install-script allow list (METRO-46). Empty: no dependency may run install scripts. */
const REVIEWED_TRUSTED_DEPENDENCIES: readonly string[] = [];
const RENOVATE_FILE = ".github/renovate.json5";

async function readRenovate(root: string): Promise<Record<string, unknown>> {
  try {
    return record(
      Bun.JSON5.parse(await readFile(join(root, RENOVATE_FILE), "utf8")),
      RENOVATE_FILE,
    );
  } catch (error) {
    throw new Error(`${RENOVATE_FILE}: ${String(error)}`, { cause: error });
  }
}

const UNIT_SECONDS: Record<string, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
};

/** Normalizes a Renovate duration such as "3 days" or "72 hours" to seconds. */
export function durationSeconds(duration: string): number {
  const match = /^(\d+) (minute|hour|day|week)s?$/u.exec(duration.trim());
  const unit = match?.[2];
  if (!match || !unit) throw new Error(`Unsupported Renovate duration: ${duration}`);
  return Number(match[1]) * (UNIT_SECONDS[unit] ?? 0);
}

export function validateRuntimes(
  expected: { bun: string; node: string },
  actual: { bun: string; node: string },
): void {
  if (actual.bun !== expected.bun || actual.node !== expected.node) {
    throw new Error(
      `Runtime mismatch: need Bun ${expected.bun} / Node ${expected.node}; got ${actual.bun} / ${actual.node}. Use mise exec --.`,
    );
  }
}
