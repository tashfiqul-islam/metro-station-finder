import { readFile } from "node:fs/promises";
import { join } from "node:path";

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${name}: expected an object`);
  return value as Record<string, unknown>;
}

export async function validateConfiguration(root: string): Promise<void> {
  async function parse(file: string, toml = false) {
    try {
      const source = await readFile(join(root, file), "utf8");
      return record(toml ? Bun.TOML.parse(source) : JSON.parse(source), file);
    } catch (error) {
      throw new Error(`${file}: ${String(error)}`);
    }
  }
  const manifest = await parse("package.json");
  const engines = record(manifest["engines"], "package.json engines");
  const mise = await parse("mise.toml", true);
  const tools = record(mise["tools"], "mise.toml tools");
  for (const runtime of ["bun", "node"]) {
    const version = engines[runtime];
    if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version))
      throw new Error(`package.json engines.${runtime}: exact stable version required`);
    if (tools[runtime] !== version)
      throw new Error(
        `mise.toml tools.${runtime} must match package.json engines.${runtime} (${version})`,
      );
  }
  if (tools["gitleaks"] !== "8.30.1") throw new Error("mise.toml tools.gitleaks must be 8.30.1");
  if (manifest["packageManager"] !== `bun@${String(engines["bun"])}`)
    throw new Error("package.json packageManager must match engines.bun");
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
