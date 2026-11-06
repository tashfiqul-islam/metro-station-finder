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
async function createScratchCopy(): Promise<string> {
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
      "vitest.shared.ts",
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
    return copy;
  } catch (error) {
    await removeWithRetry(copy);
    throw error;
  }
}

const BROKEN = 'export const broken: number = "not a number";\n';
const SYNTAX_FIXTURES = [
  ["an enum", "scripts/zz-enum.ts", "export enum Color {\n  Red,\n}\n"],
  [
    "a runtime namespace",
    "scripts/zz-namespace.ts",
    "export namespace Runtime {\n  export const value = 1;\n}\n",
  ],
  [
    "a constructor parameter property",
    "scripts/zz-parameter-property.ts",
    "export class Holder {\n  constructor(public readonly value: string) {}\n}\n",
  ],
] as const;

/**
 * METRO-83. One disposable copy and three `tsc -b` runs serve every test in this file, instead of one copy
 * and one cold build per test. The copy is per test-file process (`mkdtemp`), never shared across files, so
 * `--parallel` workers cannot collide. The runs, in order: (1) a verbose build of the pristine copy; (2)
 * `bun run typecheck` on it; (3) `bun run typecheck` after writing one broken fixture into every project
 * at once, plus the three non-erasable syntax fixtures into the scripts project. The nine projects have no
 * `references` between them, so one project's error cannot skip another (a later `references` entry would
 * make a dependent's own test fail visibly, not pass silently). The tests below assert on these outputs.
 */
let copyDir: string | undefined;
let shared:
  | Promise<{
      copy: string;
      cold: { exitCode: number; output: string };
      pristine: { exitCode: number };
      broken: { exitCode: number; output: string };
    }>
  | undefined;
function sharedRun() {
  shared ??= (async () => {
    const copy = await createScratchCopy();
    copyDir = copy;
    const verbose = Bun.spawnSync(["bun", "run", "tsc", "-b", "--verbose"], {
      cwd: copy,
      env: cleanGitEnv(),
    });
    const pristine = typecheck(copy);
    for (const { fixture } of PROJECTS) await writeFile(join(copy, fixture), BROKEN);
    for (const [, file, source] of SYNTAX_FIXTURES) await writeFile(join(copy, file), source);
    return {
      copy,
      cold: {
        exitCode: verbose.exitCode,
        output: verbose.stdout.toString() + verbose.stderr.toString(),
      },
      pristine,
      broken: typecheck(copy),
    };
  })();
  return shared;
}

afterAll(async () => {
  try {
    await shared;
  } catch {
    // The test that awaited the same promise reports the failure; here only the copy is removed.
  }
  if (copyDir !== undefined) await removeWithRetry(copyDir);
});

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

for (const [name, file] of SYNTAX_FIXTURES) {
  test(`METRO-42 the scripts project rejects ${name}`, async () => {
    const { broken } = await sharedRun();
    const lines = broken.output.split(/\r?\n/u).filter((line) => line.startsWith(`${file}(`));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("error TS1294");
    expect(broken.exitCode).not.toBe(0);
  }, 120000);
}

test("METRO-42 the typecheck script is a single tsc -b over the solution file", async () => {
  const manifest = await readConfig(join(root, "package.json"));
  const scripts = manifest["scripts"];
  if (!isRecord(scripts)) throw new Error("package.json has no scripts");
  expect(scripts["typecheck"]).toBe("tsc -b");
}, 30000);

test("METRO-42 tsc -b checks all nine referenced projects", async () => {
  // The verbose `tsc -b` ran once on the pristine copy; its output is the evidence here.
  const { cold, pristine } = await sharedRun();
  expect(cold.exitCode).toBe(0);
  for (const { config } of PROJECTS) expect(cold.output).toContain(`Building project '${config}'`);
  expect(pristine.exitCode).toBe(0);
}, 120000);

for (const { config, fixture } of PROJECTS) {
  // Plain `tsc -b` prints the failing file, not the project config; each fixture lives in exactly
  // one project, so its path identifies the project. Every project got its own fixture in the same run, so
  // each fixture must be reported exactly once: a second report would mean another project also picked it up.
  test(`METRO-42 a type error in ${config} fails the typecheck and names its file`, async () => {
    const { broken } = await sharedRun();
    expect(broken.exitCode).not.toBe(0);
    expect(broken.output).toContain(`${fixture}(1,14): error TS2322`);
    expect(broken.output.split(`${fixture}(`).length - 1).toBe(1);
  }, 120000);
}
