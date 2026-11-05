import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/** Runs `bun test` in a temporary project that uses the repository's real bunfig.toml. */
async function run(source: string, test_: string) {
  const root = await mkdtemp(join(tmpdir(), "metro-coverage-"));
  try {
    const bunfig = await readFile(resolve(import.meta.dir, "..", "bunfig.toml"), "utf8");
    await writeFile(join(root, "bunfig.toml"), bunfig.slice(bunfig.indexOf("[test]")));
    await writeFile(join(root, "subject.ts"), source);
    await writeFile(join(root, "subject.test.ts"), test_);
    const result = Bun.spawnSync([process.execPath, "test"], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    return { code: result.exitCode, output: result.stdout.toString() + result.stderr.toString() };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
