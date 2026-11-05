import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { cleanGitEnv } from "./git-env.ts";

const TYPES = "feat|fix|refactor|docs|test|chore|perf|ci|style|build|revert";
const CONVENTIONAL = new RegExp(`^(?:${TYPES})(?:\\([a-z0-9][a-z0-9._/-]*\\))?!?: \\S`, "u");
// Subjects Git itself generates for merges and reverts.
const GIT_GENERATED = /^(?:Merge |Revert ")\S/u;

/** Returns an error message for an invalid subject, or null when it is accepted. */
export function validateSubject(subject: string): string | null {
  if (CONVENTIONAL.test(subject) || GIT_GENERATED.test(subject)) return null;
  return `Invalid commit subject: "${subject}". Expected "<type>[(scope)][!]: <description>" with type one of ${TYPES.replaceAll("|", ", ")}, or a Git merge/revert subject.`;
}

const POLICY = "docs/agents/attribution.md";
const TRAILER_LINE = /^([A-Za-z0-9-]+):[ \t]+(\S.*)$/u;
// Names and addresses of AI agents; a human Signed-off-by never matches these.
const AGENT_IDENTITY =
  /anthropic\.com|\bclaude\b|\bcopilot\b|\bcodex\b|\bgemini\b|\bcursor\b|\baider\b|\[bot\]/iu;

/** Returns the key/value pairs of the final trailer block (every line a trailer), or []. */
function trailerBlock(lines: string[]): [string, string][] {
  const body = lines.filter((line) => !line.startsWith("#"));
  while (body.length > 0 && body.at(-1)?.trim() === "") body.pop();
  let start = body.length;
  while (start > 0 && body[start - 1]?.trim() !== "") start -= 1;
  // The subject paragraph is never a trailer block.
  if (start === 0) return [];
  const block = body.slice(start).map((line) => TRAILER_LINE.exec(line));
  return block.every((match) => match !== null)
    ? block.map((match) => [match[1] ?? "", match[2] ?? ""])
    : [];
}

/**
 * Agents never add Signed-off-by (see docs/agents/attribution.md): reject one whose value names an
 * agent, or one beside an agent Co-Authored-By trailer. Human-only commits are unaffected.
 */
export function validateTrailers(message: string): string | null {
  const trailers = trailerBlock(message.split(/\r?\n/u));
  const signed = trailers.filter(([key]) => key.toLowerCase() === "signed-off-by");
  if (signed.length === 0) return null;
  if (signed.some(([, value]) => AGENT_IDENTITY.test(value)))
    return `Signed-off-by names an AI agent. Agents never add Signed-off-by; see ${POLICY}.`;
  const agentCoAuthor = trailers.some(
    ([key, value]) => key.toLowerCase() === "co-authored-by" && AGENT_IDENTITY.test(value),
  );
  return agentCoAuthor
    ? `Signed-off-by appears beside an agent Co-Authored-By trailer. Agents never add Signed-off-by; see ${POLICY}.`
    : null;
}

/** Validates the first non-comment line of a commit message and its trailers; the body is free-form. */
export function validateMessage(message: string): string | null {
  const subject = message.split(/\r?\n/u).find((line) => !line.startsWith("#"));
  return validateSubject(subject ?? "") ?? validateTrailers(message);
}

/** Validates every commit message (subject and trailers) in a Git range; `cwd` selects the repository. */
export function validateRange(range: string, cwd?: string): string[] {
  const output = execFileSync("git", ["log", "--format=%H%x00%B%x1e", range], {
    encoding: "utf8",
    env: cleanGitEnv(),
    ...(cwd ? { cwd } : {}),
  });
  const commits = output.split("\x1e").filter((entry) => entry.trim() !== "");
  return commits.flatMap((entry) => {
    const [sha = "", message = ""] = entry.trim().split("\0");
    const error = validateMessage(message);
    return error ? [`${sha.slice(0, 12)}: ${error}`] : [];
  });
}

/** CLI body: returns the problems found for `<message-file>` or `--range <base>..<head>`. */
export function runCommitMessageCli(args: string[]): string[] {
  const [flag, value] = args;
  if (flag === "--range" && value) return validateRange(value);
  if (flag && !flag.startsWith("-"))
    return [validateMessage(readFileSync(flag, "utf8"))].filter((error) => error !== null);
  throw new Error("Usage: commit-message.ts <message-file> | --range <base>..<head>");
}

/** Runs the CLI and returns the process exit code (0 = valid). */
export function commitMessageMain(args: string[]): number {
  try {
    const problems = runCommitMessageCli(args);
    if (problems.length) console.error(problems.join("\n"));
    return problems.length ? 1 : 0;
  } catch (error) {
    console.error(String(error));
    return 1;
  }
}

if (import.meta.main) process.exitCode = commitMessageMain(process.argv.slice(2));
