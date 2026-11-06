import { cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

import { cleanGitEnv } from "./git-env";
import { isRecord } from "./guards";

/**
 * METRO-42. Two compiler-level gates:
 *  - `erasableSyntaxOnly` makes the compiler reject syntax that Node's type stripping cannot run
 *    (enums, runtime namespaces, parameter properties), so source stays runnable without a transform.
 *  - one `tsc -b` over the solution file checks every project, and a type error in any one of them
 *    fails the command and names that project.
 * Fixtures live in a disposable copy under `.local/`, so tracked files are never touched.
 */

const root = resolve(import.meta.dir, "..");

const PROJECTS = [
  { config: "apps/web/tsconfig.json", fixture: "apps/web/src/zz-fixture.ts" },
  { config: "tsconfig.dom-test.json", fixture: "apps/web/src/zz-fixture.test.tsx" },
  { config: "apps/api/tsconfig.json", fixture: "apps/api/src/zz-fixture.ts" },
  { config: "apps/api/tsconfig.worker-test.json", fixture: "apps/api/src/zz-fixture.test.ts" },
  { config: "packages/contracts/tsconfig.json", fixture: "packages/contracts/src/zz-fixture.ts" },
  { config: "packages/core/tsconfig.json", fixture: "packages/core/src/zz-fixture.ts" },
  { config: "scripts/tsconfig.json", fixture: "scripts/zz-fixture.ts" },
  { config: "tsconfig.e2e.json", fixture: "e2e/zz-fixture.ts" },
  { config: "tsconfig.test.json", fixture: "scripts/zz-fixture.test.ts" },
] as const;

async function readConfig(path: string): Promise<Record<string, unknown>> {
  // tsconfig files are JSON; none uses comments or trailing commas (the parse would fail loudly).
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!isRecord(parsed)) throw new Error(`${path} is not an object`);
  return parsed;
}

const exists = (path: string) =>
  stat(path).then(
    () => true,
    () => false,
  );

/** Copy the project structure (no dependencies, no VCS) and link the installed dependencies. */
async function scratchCopy(run: (copy: string) => Promise<void>) {
  await mkdir(join(root, ".local"), { recursive: true });
  const copy = await mkdtemp(join(root, ".local", "tsc-build-"));
  try {
    const skip = new Set(["node_modules", ".git", ".local", ".claude", "docs", "coverage", "dist"]);
    for (const entry of [
      "package.json",
      "tsconfig.base.json",
      "tsconfig.json",
      "tsconfig.test.json",
      "tsconfig.dom-test.json",
      "tsconfig.e2e.json",
      "playwright.config.ts",
      "vitest.config.ts",
      ".dependency-cruiser.mts",
      "apps",
      "packages",
      "scripts",
      "e2e",
    ]) {
      await cp(join(root, entry), join(copy, entry), {
        recursive: true,
        filter: (source) =>
          !relative(root, source)
            .split(sep)
            .some((part) => skip.has(part) || part.endsWith(".tsbuildinfo")),
      });
    }
    for (const dependencies of [
      "node_modules",
      "apps/web/node_modules",
      "apps/api/node_modules",
      "packages/contracts/node_modules",
      "packages/core/node_modules",
    ]) {
      if (await exists(join(root, dependencies)))
        await symlink(join(root, dependencies), join(copy, dependencies), "junction");
    }
    await run(copy);
  } finally {
    await removeWithRetry(copy);
  }
}

/**
 * Windows can briefly hold the copy (EBUSY) right after tsc exits, and Bun's `rm` does not retry that code
 * itself. Only EBUSY is retried, a bounded number of times, and the last error is rethrown, so a copy that
 * really cannot be removed still fails the test.
 */
async function removeWithRetry(path: string): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      const busy = error instanceof Error && "code" in error && error.code === "EBUSY";
      if (!busy || attempt >= 10) throw error;
      await Bun.sleep(300);
    }
  }
}

function typecheck(copy: string) {
  const result = Bun.spawnSync(["bun", "run", "typecheck"], { cwd: copy, env: cleanGitEnv() });
  return {
    exitCode: result.exitCode,
    // bun echoes the script line ("$ tsc ..."), which would name configs by itself; drop it.
    output: (result.stdout.toString() + result.stderr.toString())
      .split(/\r?\n/u)
      .filter((line) => !line.startsWith("$ "))
      .join("\n"),
  };
}

test("METRO-42 the base config enables erasableSyntaxOnly and no project turns it off", async () => {
  const base = await readConfig(join(root, "tsconfig.base.json"));
  const baseOptions = base["compilerOptions"];
  if (!isRecord(baseOptions)) throw new Error("tsconfig.base.json has no compilerOptions");
  expect(baseOptions["erasableSyntaxOnly"]).toBe(true);
  const overrides: string[] = [];
  for (const { config } of PROJECTS) {
    const options = (await readConfig(join(root, config)))["compilerOptions"];
    if (isRecord(options) && options["erasableSyntaxOnly"] !== undefined) overrides.push(config);
  }
  expect(overrides).toEqual([]);
}, 30000);

for (const [name, source] of [
  ["an enum", "export enum Color {\n  Red,\n}\n"],
  ["a runtime namespace", "export namespace Runtime {\n  export const value = 1;\n}\n"],
  [
    "a constructor parameter property",
    "export class Holder {\n  constructor(public readonly value: string) {}\n}\n",
  ],
] as const) {
  test(
    `METRO-42 the scripts project rejects ${name}`,
    () =>
      scratchCopy(async (copy) => {
        await writeFile(join(copy, "scripts", "zz-fixture.ts"), source);
        const result = Bun.spawnSync(
          ["bun", "run", "tsc", "-p", join(copy, "scripts", "tsconfig.json"), "--pretty", "false"],
          { cwd: copy, env: cleanGitEnv() },
        );
        const output = result.stdout.toString() + result.stderr.toString();
        expect(output).toContain("zz-fixture.ts");
        expect(output).toContain("TS1294");
        expect(result.exitCode).not.toBe(0);
      }),
    60000,
  );
}

test("METRO-42 the typecheck script is a single tsc -b over the solution file", async () => {
  const manifest = await readConfig(join(root, "package.json"));
  const scripts = manifest["scripts"];
  if (!isRecord(scripts)) throw new Error("package.json has no scripts");
  expect(scripts["typecheck"]).toBe("tsc -b");
}, 30000);

test(
  "METRO-42 tsc -b checks all nine referenced projects",
  () =>
    scratchCopy(async (copy) => {
      const verbose = Bun.spawnSync(["bun", "run", "tsc", "-b", "--verbose"], {
        cwd: copy,
        env: cleanGitEnv(),
      });
      const output = verbose.stdout.toString() + verbose.stderr.toString();
      expect(verbose.exitCode).toBe(0);
      for (const { config } of PROJECTS) expect(output).toContain(`Building project '${config}'`);
      expect(typecheck(copy).exitCode).toBe(0);
    }),
  120000,
);

for (const { config, fixture } of PROJECTS) {
  // Plain `tsc -b` prints the failing file, not the project config; each fixture lives in exactly
  // one project, so its path identifies the project. Every other project still builds and is silent.
  test(
    `METRO-42 a type error in ${config} fails the typecheck and names its file`,
    () =>
      scratchCopy(async (copy) => {
        await writeFile(join(copy, fixture), 'export const broken: number = "not a number";\n');
        const result = typecheck(copy);
        expect(result.exitCode).not.toBe(0);
        expect(result.output).toContain(`${fixture}(1,14): error TS2322`);
        for (const other of PROJECTS.filter((project) => project.fixture !== fixture))
          expect(result.output).not.toContain(other.fixture);
      }),
    120000,
  );
}
