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

/**
 * METRO-91. Bun fails a test after 5000 ms and kills the child of a running `Bun.spawnSync`. On a hosted runner
 * the first test of a project pays for its safe and rejected `tsc` runs (5.5 to 6.6 s under `--parallel=4`), the kill
 * left the rejected batch with empty output, and the cached empty result then failed the other tests of that project
 * with "produced no diagnostic". `jest.setTimeout` (the injected global form of bun:test setDefaultTimeout) gives every test in this file the limit, so a test added later cannot fall back to 5 s.
 */
const TSC_TIMEOUT_MS = 60_000;
jest.setTimeout(TSC_TIMEOUT_MS);
/** A hung tsc ends 5 s before the test limit, so it fails with the named "tsc was killed" error. */
const SPAWN_TIMEOUT_MS = TSC_TIMEOUT_MS - 5000;

const SAFE = "export const ready: boolean = true;";
const DOM_SAFE =
  'import { expect } from "vitest"; export const title: string = document.title; export const check = expect;';
const DOM_NO_BUN = "export const runtime: string = Bun.version;";
const DOM_STRICT = 'export const value: string = ["x"][2];';

/**
 * METRO-83. Each project is compiled twice instead of once per fixture. The safe fixture keeps its own
 * `tsc -p` run, so "passes" is still the real exit code 0 with empty output. All fixtures that must be
 * rejected are separate modules in one temporary project; a diagnostic is attributed to its fixture by file
 * name, and each test asserts a real `error TS<code>` line for its own file plus the real non-zero exit code
 * of that run. Diagnostics that belong to no fixture are returned too, so a broken project setup cannot hide.
 */
interface Outcome {
  readonly lines: readonly string[];
  readonly unattributed: readonly string[];
  readonly exitCode: number;
  /** How the tsc process ended, for the failure message of a run that produced no diagnostic. */
  readonly trace: string;
}

interface ProjectRun {
  readonly safe: { readonly output: string; readonly exitCode: number };
  readonly rejected: ReadonlyMap<string, Outcome>;
}

const cache = new Map<string, Promise<ProjectRun>>();

function compileProject(
  project: string,
  safeSource: string,
  rejects: readonly (readonly [id: string, source: string])[],
): Promise<ProjectRun> {
  let pending = cache.get(project);
  if (pending === undefined) {
    pending = run(project, safeSource, rejects);
    cache.set(project, pending);
  }
  return pending;
}

function tsc(root: string) {
  const started = performance.now();
  const result = Bun.spawnSync(
    ["bun", "run", "tsc", "-p", join(root, "tsconfig.json"), "--pretty", "false"],
    { timeout: SPAWN_TIMEOUT_MS, killSignal: "SIGKILL" },
  );
  const trace =
    `exitCode=${result.exitCode} signalCode=${String(result.signalCode ?? "none")} ` +
    `stdout=${result.stdout.byteLength}B stderr=${result.stderr.byteLength}B ` +
    `duration=${Math.round(performance.now() - started)}ms`;
  // A killed process has no exit code; fail with the real cause instead of an empty result that tests misread.
  if (result.exitCode === null || result.exitedDueToTimeout === true)
    throw new Error(`tsc was killed in ${root} (${trace})`);
  return Object.assign(result, { trace });
}

/** One entry per diagnostic: tsc indents the continuation lines of a message, so they join the head line. */
function diagnostics(result: { stdout: Uint8Array; stderr: Uint8Array }): string[] {
  const lines: string[] = [];
  for (const line of (result.stdout.toString() + result.stderr.toString()).split("\n")) {
    const text = line.replace("\r", "");
    // `bun run` appends its own wrapper line when tsc fails (Linux); it is not a diagnostic.
    if (text === "" || text.startsWith('error: "tsc" exited with code')) continue;
    const last = lines.length - 1;
    if (text.startsWith(" ") && last >= 0) lines[last] += `\n${text}`;
    else lines.push(text);
  }
  return lines;
}

async function projectDirectory(
  project: string,
  files: readonly { name: string; source: string }[],
): Promise<string> {
  await mkdir(resolve(".local"), { recursive: true });
  const root = await mkdtemp(resolve(".local/types-"));
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
  return root;
}

async function run(
  project: string,
  safeSource: string,
  rejects: readonly (readonly [id: string, source: string])[],
): Promise<ProjectRun> {
  const safeRoot = await projectDirectory(project, [{ name: "safe.ts", source: safeSource }]);
  let safe: ProjectRun["safe"];
  try {
    const result = tsc(safeRoot);
    safe = {
      output: diagnostics(result).join("\n"),
      exitCode: result.exitCode,
    };
  } finally {
    await rm(safeRoot, { recursive: true });
  }
  const files = rejects.map(([id, source], index) => ({ id, name: `case-${index}.ts`, source }));
  const root = await projectDirectory(project, files);
  try {
    const result = tsc(root);
    const lines = diagnostics(result);
    const attributed = new Set(
      lines.filter((line) => files.some((f) => line.includes(`/${f.name}(`))),
    );
    const unattributed = lines.filter((line) => !attributed.has(line));
    const rejected = new Map<string, Outcome>();
    for (const file of files) {
      const own = lines.filter((line) => line.includes(`/${file.name}(`));
      rejected.set(file.id, {
        lines: own,
        unattributed,
        exitCode: result.exitCode,
        trace: result.trace,
      });
    }
    return { safe, rejected };
  } finally {
    await rm(root, { recursive: true });
  }
}

function rejectsFor(project: string) {
  return [
    ...REJECTS.map(([name, source]) => [name, source] as const),
    ...FOREIGN.filter(([foreign]) => foreign === project).map(
      ([, source]) => [`foreign ${source}`, source] as const,
    ),
  ];
}

const DOM_REJECTS = [
  ["no-bun", DOM_NO_BUN],
  ["strict", DOM_STRICT],
] as const;

async function projectRun(project: string): Promise<ProjectRun> {
  return project === DOM_TEST
    ? compileProject(project, DOM_SAFE, DOM_REJECTS)
    : compileProject(project, SAFE, rejectsFor(project));
}

/** The diagnostics for one fixture that must be rejected, with the batch's real exit code. */
async function rejection(project: string, id: string): Promise<Outcome> {
  const found = (await projectRun(project)).rejected.get(id);
  if (found === undefined) throw new Error(`no fixture ${id} for ${project}`);
  // A fixture with no diagnostic of its own, or a run that exits 0, is a failure that names the fixture.
  expect(
    found.lines.join("\n"),
    `${project}: fixture ${id} produced no diagnostic (tsc ${found.trace})`,
  ).toMatch(/error TS\d+/u);
  expect(found.exitCode, `${project}: the batch with fixture ${id} exited 0`).not.toBe(0);
  return found;
}

for (const project of projects) {
  test(`${project}: safe program passes`, async () => {
    const { safe, rejected } = await projectRun(project);
    expect(safe.output).toBe("");
    expect(safe.exitCode).toBe(0);
    // No diagnostic in the rejected batch may belong to no fixture (a broken project setup would show here).
    for (const outcome of rejected.values()) expect(outcome.unattributed.join("\n")).toBe("");
  });
  for (const [name, , diagnostic] of REJECTS) {
    test(`${project}: rejects ${name}`, async () => {
      const result = await rejection(project, name);
      expect(result.lines.join("\n")).toContain(`error TS${diagnostic}`);
    });
  }
}
for (const [project, source] of FOREIGN) {
  test(`${project}: rejects foreign ambient ${source}`, async () => {
    const result = await rejection(project, `foreign ${source}`);
    expect(result.lines.join("\n")).toMatch(/error TS(2580|2584|2304|2591|2868)/u);
  });
}

test("FND-T4 DOM-test files compile with DOM and Vitest types", async () => {
  const { safe, rejected } = await projectRun(DOM_TEST);
  expect(safe.output).toBe("");
  expect(safe.exitCode).toBe(0);
  for (const outcome of rejected.values()) expect(outcome.unattributed.join("\n")).toBe("");
});

test("METRO-79 the DOM-test project has no Bun types", async () => {
  const result = await rejection(DOM_TEST, "no-bun");
  expect(result.lines.join("\n")).toMatch(/error TS(2304|2868)/u);
});

test("FND-T4 the DOM-test project still enforces strict compiler flags", async () => {
  const result = await rejection(DOM_TEST, "strict");
  expect(result.lines.join("\n")).toContain("error TS2322");
});
