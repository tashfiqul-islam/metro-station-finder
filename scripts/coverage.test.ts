import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { isRecord } from "./guards";

/** Runs `bun test` in a temporary project that uses the repository's real bunfig.toml. */
async function run(source: string, test_: string, args: readonly string[] = []) {
  return runFiles({ "subject.ts": source, "subject.test.ts": test_ }, args);
}

/** Same, for a fixture made of several files; returns the lcov report the run wrote. */
async function runFiles(files: Readonly<Record<string, string>>, args: readonly string[] = []) {
  const root = await mkdtemp(join(tmpdir(), "metro-coverage-"));
  try {
    const bunfig = await readFile(resolve(import.meta.dir, "..", "bunfig.toml"), "utf8");
    await writeFile(join(root, "bunfig.toml"), bunfig.slice(bunfig.indexOf("[test]")));
    for (const [name, content] of Object.entries(files)) await writeFile(join(root, name), content);
    const result = Bun.spawnSync([process.execPath, "test", ...args], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    const lcov = await readFile(join(root, "coverage", "lcov.info"), "utf8").catch(() => "");
    return {
      code: result.exitCode,
      output: result.stdout.toString() + result.stderr.toString(),
      lcov,
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

/** The flags `bun run check` passes to `bun test`, read from package.json so the fixtures cannot drift from it. */
async function checkFlags(): Promise<string[]> {
  const manifest: unknown = JSON.parse(
    await readFile(resolve(import.meta.dir, "..", "package.json"), "utf8"),
  );
  if (!isRecord(manifest) || !isRecord(manifest["scripts"])) throw new Error("no scripts");
  const step = String(manifest["scripts"]["check"])
    .split("&&")
    .map((part) => part.trim())
    .find((part) => part === "bun test" || part.startsWith("bun test "));
  if (step === undefined) throw new Error("the check script has no `bun test` step");
  return step.split(/\s+/u).slice(2);
}

const loader = `import { expect, test } from "bun:test";
import { covered } from "./subject";
test("loads the subject", () => expect(covered()).toBe(1));
`;

test("FND-T1 a fully covered fixture passes the real thresholds", async () => {
  const result = await run("export function covered() { return 1; }\n", loader);
  expect(result.code).toBe(0);
});

test("FND-T1 an uncovered function in a loaded source file fails bun test", async () => {
  const result = await run(
    `export function covered() { return 1; }
export function neverCalled() {
  const a = 1;
  const b = 2;
  const c = 3;
  return a + b + c;
}
`,
    loader,
  );
  expect(result.code).not.toBe(0);
  expect(result.output).toMatch(/subject.tss*|s*50.00s*|s*16.67/u);
});

// METRO-82: `check` runs `bun test --parallel=N`. The gate must hold with exactly those flags.
test("METRO-82 the check script runs bun test in parallel with isolation kept", async () => {
  const flags = await checkFlags();
  expect(flags.some((flag) => /^--parallel(?:=\d+)?$/u.test(flag))).toBe(true);
  expect(flags).not.toContain("--no-isolate");
});

const twoFiles = (uncovered: boolean) => ({
  "a.ts": "export function a() { return 1; }\n",
  "a.test.ts": `import { a } from "./a";\ntest("a", () => expect(a()).toBe(1));\n`,
  "b.ts": uncovered
    ? "export function b() { return 1; }\nexport function never() {\n  const x = 1;\n  const y = 2;\n  const z = 3;\n  return x + y + z;\n}\n"
    : "export function b() { return 1; }\n",
  "b.test.ts": `import { b } from "./b";\ntest("b", () => expect(b()).toBe(1));\n`,
});

test("METRO-82 under the check flags the lcov report holds every file from every worker", async () => {
  const result = await runFiles(twoFiles(false), await checkFlags());
  expect(result.code).toBe(0);
  const sources = [...result.lcov.matchAll(/^SF:(.+)$/gmu)].map((m) => m[1]?.replaceAll("\\", "/"));
  expect(new Set(sources)).toEqual(new Set(["a.ts", "b.ts"]));
  expect(sources).toHaveLength(2);
}, 60000);

test("METRO-82 under the check flags an uncovered function in one worker's file still fails the gate", async () => {
  const result = await runFiles(twoFiles(true), await checkFlags());
  expect(result.code).not.toBe(0);
  expect(result.output).toMatch(/b\.ts/u);
  expect(result.lcov).toMatch(/SF:b\.ts[\s\S]*?LF:6\r?\nLH:1\r?\n/u);
}, 60000);

// METRO-50 decision: the gate measures lines and functions only because Bun 1.4.4 emits no branch data. This is a
// tripwire, not a gate: if a Bun upgrade starts writing BRF/BRH/BRDA, this test fails and the branch threshold
// (90 percent per file, with a failing fixture) should be added instead of deleting the test.
test("METRO-50 Bun's lcov report carries no branch records, so no branch gate is possible", async () => {
  const root = await mkdtemp(join(tmpdir(), "metro-branches-"));
  try {
    await writeFile(
      join(root, "subject.ts"),
      "export function pick(flag: boolean) {\n  return flag ? 'yes' : 'no';\n}\n",
    );
    await writeFile(
      join(root, "subject.test.ts"),
      `import { pick } from "./subject";\ntest("takes one branch", () => {\n  expect(pick(true)).toBe("yes");\n});\n`,
    );
    const result = Bun.spawnSync(
      [process.execPath, "test", "--coverage", "--coverage-reporter=lcov"],
      { cwd: root, stdout: "pipe", stderr: "pipe" },
    );
    expect(result.exitCode).toBe(0);
    const lcov = await readFile(join(root, "coverage", "lcov.info"), "utf8");
    expect(lcov).toContain("SF:");
    expect(lcov).toContain("LF:");
    expect(lcov).not.toMatch(/^(BRF|BRH|BRDA):/mu);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30000);
