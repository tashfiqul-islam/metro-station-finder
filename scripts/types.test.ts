import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";

const projects = ["packages/core", "apps/web", "apps/api", "scripts", "."];
async function compile(project: string, source: string) {
  await mkdir(resolve(".local"), { recursive: true });
  const root = await mkdtemp(resolve(".local/types-"));
  try {
    await writeFile(join(root, "fixture.ts"), source);
    await writeFile(
      join(root, "tsconfig.json"),
      JSON.stringify({
        extends: resolve(project === "." ? "tsconfig.test.json" : `${project}/tsconfig.json`),
        include: ["./fixture.ts"],
        exclude: [],
      }),
    );
    return Bun.spawnSync([
      "bun",
      "run",
      "tsc",
      "-p",
      join(root, "tsconfig.json"),
      "--pretty",
      "false",
    ]);
  } finally {
    await rm(root, { recursive: true });
  }
}

for (const project of projects) {
  test(`${project}: safe program passes`, async () => {
    const result = await compile(project, "export const ready: boolean = true;");
    expect(result.stdout.toString() + result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
  });
  for (const [name, source, diagnostic] of [
    ["index", 'export const value: string = ["x"][2];', "2322"],
    ["optional", "export const value: { x?: string } = { x: undefined };", "2375"],
    ["return", "export function value(b: boolean) { if (b) return 1; }", "7030"],
    ["unused", "const unused = 1; export {};", "6133"],
  ] as const) {
    test(`${project}: rejects ${name}`, async () => {
      const result = await compile(project, source);
      expect(result.exitCode).not.toBe(0);
      expect(result.stdout.toString()).toContain(`TS${diagnostic}`);
    });
  }
}
for (const [project, source] of [
  ["packages/core", "export const x = document;"],
  ["packages/core", "export const x = process;"],
  ["packages/core", "export const x = Bun;"],
  ["apps/web", "export const x = Bun;"],
  ["apps/web", "export const x = process;"],
  ["apps/api", "export const x = document;"],
  ["apps/api", "export const x = Bun;"],
  ["scripts", "export const x = document;"],
  ["scripts", "export const x = Bun;"],
] as const) {
  test(`${project}: rejects foreign ambient ${source}`, async () => {
    const result = await compile(project, source);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout.toString()).toMatch(/TS(2580|2584|2304|2591|2868)/);
  });
}
