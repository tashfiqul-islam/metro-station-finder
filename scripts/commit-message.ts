import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { cleanGitEnv } from "./git-env.ts";

const TYPES = "feat|fix|refactor|docs|test|chore|perf|ci|style|build|revert";
const CONVENTIONAL = new RegExp(`^(?:${TYPES})(?:\\([a-z0-9][a-z0-9._/-]*\\))?!?: \\S`);
// Subjects Git itself generates for merges and reverts.
const GIT_GENERATED = /^(?:Merge |Revert ")\S/;

/** Returns an error message for an invalid subject, or null when it is accepted. */
export function validateSubject(subject: string): string | null {
  if (CONVENTIONAL.test(subject) || GIT_GENERATED.test(subject)) return null;
  return `Invalid commit subject: "${subject}". Expected "<type>[(scope)][!]: <description>" with type one of ${TYPES.replaceAll("|", ", ")}, or a Git merge/revert subject.`;
}

/** Validates the first non-comment line of a commit message; the body is free-form. */
export function validateMessage(message: string): string | null {
  const subject = message.split(/\r?\n/).find((line) => !line.startsWith("#"));
  return validateSubject(subject ?? "");
}

function validateRange(range: string): string[] {
  const output = execFileSync("git", ["log", "--format=%H%x00%s", range], {
    encoding: "utf8",
    env: cleanGitEnv(),
  });
  const commits = output.split("\n").filter(Boolean);
  return commits.flatMap((entry) => {
    const [sha = "", subject = ""] = entry.split("\0");
    const error = validateSubject(subject);
    return error ? [`${sha.slice(0, 12)}: ${error}`] : [];
  });
}

if (import.meta.main) {
  const [flag, value] = process.argv.slice(2);
  try {
    const problems =
      flag === "--range" && value
        ? validateRange(value)
        : flag && !flag.startsWith("-")
          ? [validateMessage(readFileSync(flag, "utf8"))].filter((error) => error !== null)
          : (() => {
              throw new Error("Usage: commit-message.ts <message-file> | --range <base>..<head>");
            })();
    if (problems.length) {
      console.error(problems.join("\n"));
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
