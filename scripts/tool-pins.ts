import { readFile } from "node:fs/promises";
import { join } from "node:path";

export function exactToolVersion(tools: Record<string, unknown>, tool: string): string {
  const version = tools[tool];
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/u.test(version))
    throw new Error(`mise.toml tools.${tool}: exact stable version required`);
  return version;
}

/**
 * The single source of the Gitleaks pin: `tools.gitleaks` in mise.toml. Reads the flat `[tools]`
 * table directly so it runs under Node (the secret scan has no `Bun.TOML`); `validateConfiguration`
 * still parses the whole file with the real TOML parser.
 */
export async function gitleaksVersion(root: string): Promise<string> {
  const source = await readFile(join(root, "mise.toml"), "utf8");
  const table = /^\[tools\]\s*$([\s\S]*?)(?=^\[|(?![\s\S]))/mu.exec(source)?.[1] ?? "";
  const pin = /^gitleaks\s*=\s*"([^"]*)"\s*(?:#.*)?$/mu.exec(table)?.[1];
  return exactToolVersion({ gitleaks: pin }, "gitleaks");
}
