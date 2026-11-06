import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";

const projects = ["packages/core", "apps/web", "apps/api", "scripts", "."];
const DOM_TEST = "tsconfig.dom-test.json";

const REJECTS = [
  ["index", 'export const value: string = ["x"][2];', "2322"],
  ["optional", "export const value: { x?: string } = { x: undefined };", "2375"],
  ["return", "export function value(b: boolean) { if (b) return 1; }", "7030"],
  ["unused", "const unused = 1; export {};", "6133"],
] as const;

const FOREIGN = [
  ["packages/core", "export const x = document;"],
  ["packages/core", "export const x = process;"],
  ["packages/core", "export const x = Bun;"],
  ["apps/web", "export const x = Bun;"],
  ["apps/web", "export const x = process;"],
  ["apps/api", "export const x = document;"],
  ["apps/api", "export const x = Bun;"],
  ["scripts", "export const x = document;"],
  ["scripts", "export const x = Bun;"],
] as const;

const SAFE = "export const ready: boolean = true;";
const DOM_SAFE =
  'import { expect } from "vitest"; export const title: string = document.title; export const check = expect;';
const DOM_NO_BUN = "export const runtime: string = Bun.version;";
const DOM_STRICT = 'export const value: string = ["x"][2];';

/**
 * METRO-83. Each project is compiled once, with every fixture for it as its own module in one temporary
 * project, instead of one `tsc` process per fixture. A diagnostic is attributed to its fixture by file name,
 * so each test still sees only its own verdict, and the safe fixture also requires that no diagnostic at all
 * is unattributed (the original asserted an empty output). Fixtures are separate modules (`export`), so one
 * cannot change another's result.
 */
interface Outcome {
  readonly lines: readonly string[];
  readonly unattributed: readonly string[];
  readonly exitCode: number;
}

const cache = new Map<string, Promise<ReadonlyMap<string, Outcome>>>();

function compileProject(
  project: string,
  cases: readonly (readonly [id: string, source: string])[],
): Promise<ReadonlyMap<string, Outcome>> {
  let pending = cache.get(project);
  if (pending === undefined) {
    pending = run(project, cases);
    cache.set(project, pending);
  }
  return pending;
}

async function run(
  project: string,
  cases: readonly (readonly [id: string, source: string])[],
): Promise<ReadonlyMap<string, Outcome>> {
  await mkdir(resolve(".local"), { recursive: true });
  const root = await mkdtemp(resolve(".local/types-"));
  try {
    const files = cases.map(([id, source], index) => ({ id, name: `case-${index}.ts`, source }));
    for (const file of files) await writeFile(join(root, file.name), file.source);
    await writeFile(
      join(root, "tsconfig.json"),
      JSON.stringify({
        extends: resolve(
          project === "."
            ? "tsconfig.test.json"
            : project.endsWith(".json")
              ? project
              : `${project}/tsconfig.json`,
        ),
        include: files.map((file) => `./${file.name}`),
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
    // One entry per diagnostic: tsc indents the continuation lines of a message, so they join the head line.
    const lines: string[] = [];
    for (const line of (result.stdout.toString() + result.stderr.toString()).split("\n")) {
      const text = line.replace("\r", "");
      if (text === "") continue;
      const last = lines.length - 1;
      if (text.startsWith(" ") && last >= 0) lines[last] += `\n${text}`;
      else lines.push(text);
    }
    const attributed = lines.filter((line) => files.some((f) => line.includes(`/${f.name}(`)));
    // Every batch holds fixtures that must fail, so a run with no attributed diagnostic means tsc itself broke.
    if (attributed.length === 0 || result.exitCode === 0)
      throw new Error(
        `tsc -p for ${project} did not report the expected diagnostics: ${lines.join(" | ")}`,
      );
    const unattributed = lines.filter((line) => !attributed.includes(line));
    const outcomes = new Map<string, Outcome>();
    for (const file of files) {
      const own = lines.filter((line) => line.includes(`/${file.name}(`));
      outcomes.set(file.id, { lines: own, unattributed, exitCode: own.length === 0 ? 0 : 1 });
    }
    return outcomes;
  } finally {
    await rm(root, { recursive: true });
  }
}

function casesFor(project: string) {
  return [
    ["safe", SAFE] as const,
    ...REJECTS.map(([name, source]) => [name, source] as const),
    ...FOREIGN.filter(([foreign]) => foreign === project).map(
      ([, source]) => [`foreign ${source}`, source] as const,
    ),
  ];
}

const DOM_CASES = [
  ["safe", DOM_SAFE],
  ["no-bun", DOM_NO_BUN],
  ["strict", DOM_STRICT],
] as const;

async function outcome(project: string, id: string): Promise<Outcome> {
  const cases = project === DOM_TEST ? DOM_CASES : casesFor(project);
  const found = (await compileProject(project, cases)).get(id);
  if (found === undefined) throw new Error(`no fixture ${id} for ${project}`);
  return found;
}

for (const project of projects) {
  test(`${project}: safe program passes`, async () => {
    const result = await outcome(project, "safe");
    expect(result.lines.join("\n")).toBe("");
    expect(result.unattributed.join("\n")).toBe("");
  });
  for (const [name, , diagnostic] of REJECTS) {
    test(`${project}: rejects ${name}`, async () => {
      const result = await outcome(project, name);
      expect(result.exitCode).not.toBe(0);
      expect(result.lines.join("\n")).toContain(`TS${diagnostic}`);
    });
  }
}
for (const [project, source] of FOREIGN) {
  test(`${project}: rejects foreign ambient ${source}`, async () => {
    const result = await outcome(project, `foreign ${source}`);
    expect(result.exitCode).not.toBe(0);
    expect(result.lines.join("\n")).toMatch(/TS(2580|2584|2304|2591|2868)/u);
  });
}

test("FND-T4 DOM-test files compile with DOM and Vitest types", async () => {
  const result = await outcome(DOM_TEST, "safe");
  expect(result.lines.join("\n")).toBe("");
  expect(result.unattributed.join("\n")).toBe("");
  expect(result.exitCode).toBe(0);
});

test("METRO-79 the DOM-test project has no Bun types", async () => {
  const result = await outcome(DOM_TEST, "no-bun");
  expect(result.exitCode).not.toBe(0);
  expect(result.lines.join("\n")).toMatch(/TS(2304|2868)/u);
});

test("FND-T4 the DOM-test project still enforces strict compiler flags", async () => {
  const result = await outcome(DOM_TEST, "strict");
  expect(result.exitCode).not.toBe(0);
  expect(result.lines.join("\n")).toContain("TS2322");
});
