import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { isRecord } from "./guards";

// METRO-50: the test-hygiene lint rules must reject tests that run code without proving anything.
// Each fixture is a test file linted with the repository's real `.oxlintrc.json`, copied next to it so the
// `**/*.test.ts` override applies. These rules are not type-aware, so the fixture needs no tsconfig.
// Oxlint's jest rules cannot see `bun:test` imports, so fixtures use Bun's injected globals like the real tests.

const OXLINT = resolve("node_modules/oxlint/bin/oxlint");

async function lintFixture(source: string): Promise<{ exitCode: number; output: string }> {
  const root = await mkdtemp(join(tmpdir(), "metro-hygiene-"));
  try {
    const parsed: unknown = Bun.JSON5.parse(await readFile(resolve(".oxlintrc.json"), "utf8"));
    if (!isRecord(parsed)) throw new Error(".oxlintrc.json: expected an object");
    const { $schema: _schema, options: _options, ...config } = parsed;
    await writeFile(join(root, ".oxlintrc.json"), JSON.stringify(config));
    await writeFile(join(root, "fixture.test.ts"), source);
    const result = Bun.spawnSync(
      ["node", OXLINT, "-c", join(root, ".oxlintrc.json"), "--deny-warnings", root],
      { stdout: "pipe", stderr: "pipe" },
    );
    return {
      exitCode: result.exitCode ?? -1,
      output: result.stdout.toString() + result.stderr.toString(),
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("METRO-50 control: a test with an assertion passes the hygiene rules", async () => {
  const result = await lintFixture(`test("adds", () => {\n  expect(1 + 1).toBe(2);\n});\n`);
  expect(result.output).toBe("");
  expect(result.exitCode).toBe(0);
});

test("METRO-50 the project's expectRejection helper counts as an assertion", async () => {
  const result = await lintFixture(
    `import { expectRejection } from "./test-support";\n\ntest("rejects", async () => {\n  await expectRejection(Promise.reject(new Error("x")));\n});\n`,
  );
  expect(result.output).toBe("");
  expect(result.exitCode).toBe(0);
});

test("METRO-50 expect with a custom failure message is valid (Bun's second argument)", async () => {
  const result = await lintFixture(`test("named", () => {\n  expect(1, "one").toBe(1);\n});\n`);
  expect(result.output).toBe("");
  expect(result.exitCode).toBe(0);
});

const REJECTED: readonly (readonly [rule: string, source: string])[] = [
  ["expect-expect", `test("runs code", () => {\n  void (1 + 1);\n});\n`],
  [
    "no-conditional-expect",
    `test("maybe", () => {\n  const ok = Math.random() > 2;\n  if (ok) expect(ok).toBe(true);\n  expect(1).toBe(1);\n});\n`,
  ],
  ["no-standalone-expect", `expect(1).toBe(1);\n\ntest("x", () => {\n  expect(1).toBe(1);\n});\n`],
  ["valid-title", `test("", () => {\n  expect(1).toBe(1);\n});\n`],
  [
    "no-identical-title",
    `test("same", () => {\n  expect(1).toBe(1);\n});\n\ntest("same", () => {\n  expect(2).toBe(2);\n});\n`,
  ],
  ["valid-expect", `test("no matcher", () => {\n  expect(1);\n});\n`],
  [
    "require-to-throw-message",
    `test("any error", () => {\n  expect(() => JSON.parse("{")).toThrow();\n});\n`,
  ],
  ["no-focused-tests", `test.only("alone", () => {\n  expect(1).toBe(1);\n});\n`],
  ["no-disabled-tests", `test.skip("never runs", () => {\n  expect(1).toBe(1);\n});\n`],
  ["no-test-prefixes", `xtest("never runs", () => {\n  expect(1).toBe(1);\n});\n`],
  ["no-done-callback", `test("callback", (done) => {\n  expect(1).toBe(1);\n  done();\n});\n`],
  [
    "prefer-called-with",
    `test("spied", () => {\n  const spy = jest.spyOn(Math, "random");\n  Math.random();\n  expect(spy).toHaveBeenCalled();\n});\n`,
  ],
  [
    "no-restricted-imports",
    `import { expect, test } from "bun:test";\n\ntest("imported", () => {\n  expect(1).toBe(1);\n});\n`,
  ],
];

for (const [rule, source] of REJECTED)
  test(`METRO-50 ${rule} rejects a fixture that proves nothing or hides a test`, async () => {
    const result = await lintFixture(source);
    expect(result.output).toContain(`(${rule})`);
    expect(result.exitCode).not.toBe(0);
  }, 30000);
