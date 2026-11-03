import { expect, test } from "bun:test";
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
