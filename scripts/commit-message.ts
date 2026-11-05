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
const SIGNED_OFF = /^signed-off-by[ \t]*:[ \t]*(.*)$/iu;
// Exact AI-agent email addresses (case-insensitive, whole address). The name is never matched, so a
// person called Claude or Gemini passes. Ordinary automation bots (Renovate, Dependabot) are not AI
// assistants and are not listed.
const AGENT_EMAILS = [
  /^noreply@anthropic\.com$/iu,
  /^\d+\+claude\[bot\]@users\.noreply\.github\.com$/iu,
  /^\d+\+copilot@users\.noreply\.github\.com$/iu,
  /^\d+\+(?:copilot-swe-agent|github-copilot-cli)\[bot\]@users\.noreply\.github\.com$/iu,
];

/** Folded continuation lines (leading whitespace) are joined to the previous line. */
function lastParagraphLines(message: string): string[] {
  const lines = message.split(/\r?\n/u).filter((line) => !line.startsWith("#"));
  while (lines.length > 0 && lines.at(-1)?.trim() === "") lines.pop();
  let start = lines.length;
  while (start > 0 && lines[start - 1]?.trim() !== "") start -= 1;
  // A message of one paragraph is only a subject (and body prose), never a trailer block.
  if (start === 0) return [];
  const logical: string[] = [];
  for (const line of lines.slice(start)) {
    if (/^[ \t]/u.test(line) && logical.length > 0)
      logical[logical.length - 1] += ` ${line.trim()}`;
    else logical.push(line);
  }
  return logical;
}

function isAgentIdentity(value: string): boolean {
  const email = /<([^<>]*)>\s*$/u.exec(value)?.[1]?.trim();
  return email !== undefined && AGENT_EMAILS.some((pattern) => pattern.test(email));
}

/**
 * Rejects a Signed-off-by in the last paragraph whose email is an AI agent identity (see
 * docs/agents/attribution.md). It cannot tell who typed any other Signed-off-by.
 */
export function validateTrailers(message: string): string | null {
  const agentSigned = lastParagraphLines(message).some((line) => {
    const value = SIGNED_OFF.exec(line)?.[1];
    return value !== undefined && isAgentIdentity(value);
  });
  return agentSigned
    ? `Signed-off-by uses an AI agent identity. Agents never add Signed-off-by; see ${POLICY}.`
    : null;
}

/** Validates the first non-comment line of a commit message and its trailers; the body is free-form. */
export function validateMessage(message: string): string | null {
  const subject = message.split(/\r?\n/u).find((line) => !line.startsWith("#"));
  return validateSubject(subject ?? "") ?? validateTrailers(message);
}

/** Validates every commit message (subject and trailers) in a Git range; `cwd` selects the repository. */
export function validateRange(range: string, cwd?: string): string[] {
  let output: string;
  try {
    output = execFileSync("git", ["log", "--format=%H%x00%B%x1e", range], {
      encoding: "utf8",
      env: cleanGitEnv(),
      maxBuffer: 64 * 1024 * 1024,
      ...(cwd ? { cwd } : {}),
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOBUFS")
      throw new Error(`Commit messages in ${range} exceed the 64 MiB read limit.`, {
        cause: error,
      });
    throw error;
  }
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
