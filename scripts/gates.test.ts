import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

async function fixture(run: (root: string) => Promise<void>) {
  await mkdir(".local", { recursive: true });
  const root = await mkdtemp(resolve(".local/gates-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

for (const kind of ["cycle", "unresolved"]) {
  test(`import gate rejects ${kind}`, () =>
    fixture(async (root) => {
      await writeFile(
        join(root, "a.ts"),
        kind === "cycle" ? 'import "./b";' : 'import "./absent";',
      );
      if (kind === "cycle") await writeFile(join(root, "b.ts"), 'import "./a";');
      const result = Bun.spawnSync(["bun", "run", "imports", root]);
      expect(result.stdout.toString() + result.stderr.toString()).toContain(
        kind === "cycle" ? "no-cycles" : "no-unresolved",
      );
      expect(result.exitCode).not.toBe(0);
    }));
}

test("bundle gate rejects absent production artifacts", () =>
  fixture(async (root) => {
    const result = Bun.spawnSync(["node", resolve("scripts/bundle.ts"), root]);
    expect(result.stderr.toString()).toContain("No production JS/CSS artifacts found");
    expect(result.exitCode).not.toBe(0);
  }));

test(
  "secret gate rejects a generated fake credential in tracked temporary source",
  () =>
    fixture(async (root) => {
      expect(Bun.spawnSync(["git", "init", root]).exitCode).toBe(0);
      const token = ["gh", "p_", "Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4zAB7c"].join("");
      await writeFile(join(root, "fixture.ts"), `export const token = ${JSON.stringify(token)};`);
      expect(Bun.spawnSync(["git", "-C", root, "add", "fixture.ts"]).exitCode).toBe(0);
      const result = Bun.spawnSync(["node", resolve("scripts/secrets.ts"), root]);
      expect(result.stdout.toString() + result.stderr.toString()).toContain("leaks found");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);

test("type gate rejects malformed existing domain data", () =>
  fixture(async (root) => {
    await writeFile(
      join(root, "fixture.ts"),
      `import type { ScaffoldStatus } from ${JSON.stringify(resolve("packages/core/src/domain/scaffold-status").replaceAll("\\", "/"))}; export const data: ScaffoldStatus = { kind: 'real-service', ready: false };`,
    );
    await writeFile(
      join(root, "tsconfig.json"),
      JSON.stringify({
        extends: resolve("packages/core/tsconfig.json"),
        include: ["./fixture.ts"],
        exclude: [],
      }),
    );
    const result = Bun.spawnSync([
      "bun",
      "run",
      "tsc",
      "-p",
      join(root, "tsconfig.json"),
      "--pretty",
      "false",
    ]);
    expect(result.stdout.toString()).toContain("TS2322");
    expect(result.exitCode).not.toBe(0);
  }));

test("bundle gate rejects oversized production artifacts", () =>
  fixture(async (root) => {
    await writeFile(join(root, "large.js"), "x".repeat(470_001));
    const result = Bun.spawnSync(["node", resolve("scripts/bundle.ts"), root]);
    expect(result.stderr.toString()).toContain("Bundle budget exceeded");
    expect(result.exitCode).not.toBe(0);
  }));
