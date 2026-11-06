import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { isRecord } from "./guards.ts";

/**
 * METRO-81: run the commands of `package.json` `scripts.check` one by one and print how long each takes,
 * so the hosted Checks job shows where its time goes. The chain is read from `package.json`, never copied
 * here, so the local `check` and the timed run cannot drift.
 *
 * Execution model. A chain is accepted only when it is plain words joined by `&&`. Every command is then
 * spawned directly (no shell, `spawnSync` with an argument array), so the words reach the program exactly
 * as written and no shell syntax can be interpreted differently from `bun run`'s own shell. Anything the
 * splitter cannot reproduce faithfully (`||`, `;`, pipes, redirects, quotes, expansions, globs, a lone `&`,
 * leading `NAME=value` assignments, backslashes, comments, empty segments) is rejected before anything runs.
 * Fail-fast matches `&&`: the first non-zero exit stops the chain and becomes the exit code.
 */

export interface RunResult {
  readonly status: number | null;
  readonly signal?: string | null;
  readonly error?: Error | undefined;
}

export interface Deps {
  readonly run: (argv: readonly string[], cwd: string) => RunResult;
  readonly now: () => number;
  readonly log: (line: string) => void;
  readonly error: (line: string) => void;
}

export interface Row {
  readonly command: string;
  /** Duration in milliseconds; `undefined` when the command never ran. */
  readonly ms?: number;
  /** `pass`, `not run`, or `fail (...)` with the reason. */
  readonly result: string;
}

const WORD = /^[A-Za-z0-9_./:@%+,=-]+$/u;
const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/u;

function reject(chain: string, reason: string): never {
  throw new Error(`timed-check: cannot split "${chain}" faithfully: ${reason}`);
}

/** Splits a chain of plain commands joined by `&&`; throws on anything else. */
export function splitChain(chain: string): string[] {
  // A shell reads a newline like `;`, so any whitespace but a plain space is refused, not folded into one.
  if (/[^\S ]/u.test(chain))
    return reject(chain, "newline, carriage return, tab or other non-space whitespace");
  const words = chain.split(/ +/u).filter((word) => word !== "");
  if (words.length === 0) return reject(chain, "the chain is empty");
  const commands: string[][] = [[]];
  for (const word of words) {
    if (word === "&&") {
      if (commands.at(-1)?.length === 0) return reject(chain, "empty command around &&");
      commands.push([]);
    } else if (!WORD.test(word)) {
      return reject(chain, `unsupported syntax in "${word}" (only plain words and && are allowed)`);
    } else {
      commands.at(-1)?.push(word);
    }
  }
  if (commands.at(-1)?.length === 0) return reject(chain, "empty command after the last &&");
  for (const command of commands) {
    if (ASSIGNMENT.test(command[0] ?? "")) return reject(chain, "environment assignments");
  }
  return commands.map((parts) => parts.join(" "));
}

export function formatSeconds(ms: number): string {
  const total = Math.round(ms / 100) / 10;
  if (total < 60) return `${total.toFixed(1)} s`;
  const minutes = Math.floor(total / 60);
  return `${String(minutes)} m ${(total - minutes * 60).toFixed(1)} s`;
}

export function formatTable(rows: readonly Row[]): string {
  const lines = ["| # | Command | Duration | Result |", "| --- | --- | --- | --- |"];
  rows.forEach((row, index) => {
    const duration = row.ms === undefined ? "-" : formatSeconds(row.ms);
    lines.push(`| ${String(index + 1)} | \`${row.command}\` | ${duration} | ${row.result} |`);
  });
  const total = rows.reduce((sum, row) => sum + (row.ms ?? 0), 0);
  return `${lines.join("\n")}\n\nTotal: ${formatSeconds(total)}`;
}

const realDeps: Deps = {
  run(argv, cwd) {
    const [program, ...args] = argv;
    const result = spawnSync(program ?? "", args, { cwd, stdio: "inherit" });
    return { status: result.status, signal: result.signal, error: result.error };
  },
  now: () => performance.now(),
  log: (line) => console.log(line),
  error: (line) => console.error(line),
};

function readChain(cwd: string): string {
  const manifest: unknown = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  const scripts = isRecord(manifest) ? manifest["scripts"] : undefined;
  const check = isRecord(scripts) ? scripts["check"] : undefined;
  if (typeof check !== "string" || check.trim() === "")
    throw new Error("timed-check: package.json has no scripts.check string");
  return check;
}

/** Runs the chain and returns the process exit code: the failing command's, 1 for a signal, 127 when a command cannot start, 2 for a chain it refuses to run. */
export function timedCheckMain(
  env: Readonly<Record<string, string | undefined>>,
  overrides: Partial<Deps> = {},
  cwd: string = process.cwd(),
): number {
  const deps: Deps = { ...realDeps, ...overrides };
  let commands: string[];
  try {
    commands = splitChain(readChain(cwd));
  } catch (error) {
    deps.error(error instanceof Error ? error.message : String(error));
    return 2;
  }

  const rows: Row[] = [];
  let exitCode = 0;
  for (const [index, command] of commands.entries()) {
    const started = deps.now();
    const result = deps.run(command.split(" "), cwd);
    const ms = deps.now() - started;
    if (result.error) {
      deps.error(`timed-check: could not start "${command}": ${result.error.message}`);
      rows.push({ command, ms, result: "fail (could not start)" });
      exitCode = 127;
    } else if (result.status === null) {
      const signal = result.signal ?? "unknown signal";
      deps.error(`timed-check: "${command}" was stopped by ${signal}`);
      rows.push({ command, ms, result: `fail (${signal})` });
      exitCode = 1;
    } else if (result.status !== 0) {
      rows.push({ command, ms, result: `fail (exit ${String(result.status)})` });
      exitCode = result.status;
    } else {
      rows.push({ command, ms, result: "pass" });
      continue;
    }
    for (const rest of commands.slice(index + 1)) rows.push({ command: rest, result: "not run" });
    break;
  }

  const table = formatTable(rows);
  deps.log(`\nCheck chain timing\n\n${table}`);
  const summary = env["GITHUB_STEP_SUMMARY"];
  if (summary) {
    try {
      appendFileSync(summary, `### Check chain timing\n\n${table}\n`);
    } catch (error) {
      deps.error(
        `timed-check: could not write GITHUB_STEP_SUMMARY: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return exitCode;
}

if (import.meta.main) process.exitCode = timedCheckMain(process.env);
