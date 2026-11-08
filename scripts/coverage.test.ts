import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { isRecord } from "./guards";

/** Runs `bun test` in a temporary project that uses the repository's real bunfig.toml. */
async function run(source: string, test_: string, args: readonly string[] = []) {
  return runFiles({ "subject.ts": source, "subject.test.ts": test_ }, args);
}

/** Same, for a fixture made of several files; returns the lcov report the run wrote. */
async function runFiles(
  files: Readonly<Record<string, string>>,
  args: readonly string[] = [],
  collect: readonly string[] = [],
) {
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
    const extra: Record<string, string> = {};
    for (const name of collect)
      extra[name] = await readFile(join(root, name), "utf8").catch(() => "");
    return {
      code: result.exitCode,
      output: result.stdout.toString() + result.stderr.toString(),
      lcov,
      extra,
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

// METRO-94: the Bun gate is 100 percent lines and functions per file. One missed function in a hundred (99 percent) must fail.
const hundredFunctions = (called: number) => ({
  "subject.ts": Array.from(
    { length: 100 },
    (_, index) => `export function f${index}() {
  return ${index};
}
`,
  ).join(""),
  "subject.test.ts":
    `import { ${Array.from({ length: called }, (_, index) => `f${index}`).join(", ")} } from "./subject";
` +
    `test("calls ${called}", () => {
${Array.from(
  { length: called },
  (_, index) => `  expect(f${index}()).toBe(${index});
`,
).join("")}});
`,
});

test("METRO-94 a file with 99 of 100 functions covered fails the 100 percent gate", async () => {
  const result = await runFiles(hundredFunctions(99));
  expect(result.code).not.toBe(0);
  expect(result.output).toMatch(/subject\.ts\s*\|\s*99\.00\s*\|/u);
  expect(result.output).toMatch(/\n\s*0 fail\n/u);
});

test("METRO-94 a file with 100 of 100 functions covered passes the gate", async () => {
  const result = await runFiles(hundredFunctions(100));
  expect(result.code).toBe(0);
});

// METRO-82: `check` runs `bun test --parallel=4`. The gate must hold with exactly those flags.
test("METRO-82 the check script pins --parallel=4 and keeps isolation on", async () => {
  const flags = await checkFlags();
  expect(flags.filter((flag) => flag.startsWith("--parallel"))).toEqual(["--parallel=4"]);
  // Any spelling that drops isolation (`--no-isolate`, `--isolate=false`, ...) would let files see each other's state.
  expect(flags.filter((flag) => /isolate/iu.test(flag) && flag !== "--isolate")).toEqual([]);
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
  // Bun 1.4.4 prints no "threshold" sentence: the failure is the exit code plus the table row below 100 with no failed test.
  expect(result.output).toMatch(/b\.ts\s*\|\s*50\.00\s*\|\s*16\.67/u);
  expect(result.output).toMatch(/\n\s*0 fail\n/u);
  expect(result.lcov).toMatch(/SF:b\.ts[\s\S]*?LF:6\r?\nLH:1\r?\n/u);
}, 60000);

// One source loaded by two test files that run in two workers at the same time, each covering a different function.
// Each test file records its pid, then waits for the other's pid file. Both can only finish if they run concurrently,
// and files in one worker run one after the other, so passing proves two different worker processes.
const body = (name: string, mine: string, other: string, call: string) =>
  `import { appendFileSync, existsSync } from "node:fs";\n` +
  `import { f, g } from "./shared";\n` +
  `test("${name}", async () => {\n` +
  `  ${call}\n` +
  `  appendFileSync("pids.txt", "${mine} " + process.pid + "\\n");\n` +
  `  appendFileSync("${mine}.done", "1");\n` +
  `  for (let i = 0; i < 400 && !existsSync("${other}.done"); i++) await Bun.sleep(25);\n` +
  `  expect(existsSync("${other}.done")).toBe(true);\n` +
  `  expect(typeof g).toBe("function");\n` +
  `});\n`;
const shared = (callG: boolean) => {
  return {
    "shared.ts":
      "export function f() {\n  const a = 1;\n  const b = 2;\n  return a + b;\n}\n" +
      "export function g() {\n  const a = 1;\n  const b = 2;\n  return a + b;\n}\n",
    "x.test.ts": body("x", "x", "y", "f();"),
    "y.test.ts": body("y", "y", "x", callG ? "g();" : "f();"),
  };
};

test("METRO-82 a source loaded by two workers keeps the union of what each covered", async () => {
  const flags = await checkFlags();
  const result = await runFiles(shared(true), flags, ["pids.txt"]);
  expect(result.output).not.toMatch(/\(fail\)/u);
  expect(result.code).toBe(0);
  const pids = new Set(
    (result.extra["pids.txt"] ?? "")
      .trim()
      .split(/\r?\n/u)
      .map((line) => line.split(" ")[1]),
  );
  expect(pids.size).toBe(2);
  const record = /SF:shared\.ts\r?\n[\s\S]*?LF:(\d+)\r?\nLH:(\d+)\r?\n/u.exec(result.lcov);
  expect(record).not.toBeNull();
  expect(record?.[1]).toBe(record?.[2]);
  expect(result.lcov).toMatch(/SF:shared\.ts\r?\nFNF:2\r?\nFNH:2\r?\n/u);
}, 60000);

test("METRO-82 a function that no worker covers still fails the gate with no failed test", async () => {
  const result = await runFiles(shared(false), await checkFlags());
  expect(result.code).not.toBe(0);
  // No "threshold" sentence in Bun 1.4.4 output: the table row below 100 and zero failed tests show the cause.
  expect(result.output).toMatch(/shared\.ts\s*\|\s*50\.00\s*\|\s*50\.00/u);
  expect(result.output).toMatch(/\n\s*0 fail\n/u);
  expect(result.lcov).toMatch(/SF:shared\.ts\r?\nFNF:2\r?\nFNH:1\r?\n/u);
}, 60000);

// METRO-50 decision: the gate measures lines and functions only because Bun 1.4.4 emits no branch data. This is a
// tripwire, not a gate: if a Bun upgrade starts writing BRF/BRH/BRDA, this test fails and the branch threshold
// (90 percent per file, matching the Vitest apps, with a failing fixture) should be added instead of deleting the test.
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
