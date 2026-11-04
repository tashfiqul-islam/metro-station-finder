import { spawnSync } from "node:child_process";

import { cleanGitEnv } from "./git-env.ts";

/**
 * Decides whether a pull request body records an independent reviewer (METRO-36, docs/agents/workflow.md).
 * The body is untrusted text: it is only ever parsed here as data, never executed or echoed, and every
 * scan is linear so a huge body cannot stall the job.
 */

export interface ReviewerDecision {
  readonly ok: boolean;
  readonly reason: string;
}

const MARKER = /^none \(docs only\)/iu;
const HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/u;
const REVIEWER_HEADING = /^ {0,3}#{1,6}[ \t]*reviewer[ \t]*#*[ \t]*$/iu;
const DOCS_PATH = /^(?:docs\/(?:[^/\\]+\/)*[^/\\]+\.md|[^/\\]+\.md)$/u;
const MIN_VALUE_LENGTH = 10;

/** Removes HTML comments (GitHub hides them); an unterminated comment hides the rest, as it renders. */
function stripComments(text: string): string {
  let result = "";
  let position = 0;
  for (;;) {
    const start = text.indexOf("<!--", position);
    if (start === -1) return result + text.slice(position);
    result += text.slice(position, start);
    const end = text.indexOf("-->", start + 4);
    if (end === -1) return result;
    position = end + 3;
  }
}

/** The visible text under the first `Reviewer` heading, or "" when absent. */
export function readReviewerValue(body: string): string {
  const lines = stripComments(body).split("\n");
  const start = lines.findIndex((line) => REVIEWER_HEADING.test(line));
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => HEADING.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
}

/** True only for markdown under `docs/` or at the repository root; an empty change is never docs-only. */
export function isDocsOnly(paths: readonly string[]): boolean {
  return paths.length > 0 && paths.every((path) => DOCS_PATH.test(path) && !path.includes(".."));
}

/** Identity text left once links are removed; a bare link or a short placeholder carries none. */
function hasIdentityText(value: string): boolean {
  const text = value.replaceAll(/https?:\/\/\S+/giu, " ").replaceAll(/[^\p{L}\p{N}]+/gu, "");
  return text.length >= MIN_VALUE_LENGTH;
}

export function evaluateReviewer(
  body: string | null | undefined,
  changedPaths: readonly string[],
): ReviewerDecision {
  const value = readReviewerValue(body ?? "");
  if (value === "")
    return {
      ok: false,
      reason:
        'The "Reviewer" section of the pull request body is missing or empty. Record the reviewer agent definition, the session or run reference and the disposition link (docs/agents/workflow.md).',
    };
  if (MARKER.test(value))
    return isDocsOnly(changedPaths)
      ? { ok: true, reason: "Documentation-only change; no independent reviewer required." }
      : {
          ok: false,
          reason:
            'The "none (docs only)" marker is allowed only when every changed file is markdown under docs/ or at the repository root.',
        };
  if (!hasIdentityText(value))
    return {
      ok: false,
      reason:
        'The "Reviewer" section is a placeholder or only a link. Name the reviewer agent or person, the session or run, and the disposition.',
    };
  return { ok: true, reason: "Reviewer recorded." };
}

/** Changed paths from the merge base to the head; fails visibly when git cannot answer. */
export function gitChangedPaths(base: string, head: string): string[] {
  const result = spawnSync("git", ["diff", "--name-only", "-z", `${base}...${head}`, "--"], {
    encoding: "utf8",
    shell: false,
    env: cleanGitEnv(),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git diff failed: ${result.stderr.trim()}`);
  return result.stdout.split("\0").filter((path) => path !== "");
}

export interface Deps {
  readonly changedPaths: (base: string, head: string) => string[];
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
}

const SHA = /^[0-9a-f]{40}$/u;

/** Process entry. The body arrives in `PR_BODY`, never on a command line or in script text. */
export function reviewerRecordMain(
  env: Readonly<Record<string, string | undefined>>,
  deps: Deps = {
    changedPaths: gitChangedPaths,
    log: (m) => console.log(m),
    error: (m) => console.error(m),
  },
): void {
  try {
    const base = env["BASE_SHA"] ?? "";
    const head = env["HEAD_SHA"] ?? "";
    if (!SHA.test(base) || !SHA.test(head))
      throw new Error("BASE_SHA and HEAD_SHA must be full commit ids");
    const decision = evaluateReviewer(env["PR_BODY"], deps.changedPaths(base, head));
    if (!decision.ok) {
      deps.error(decision.reason);
      process.exitCode = 1;
      return;
    }
    deps.log(decision.reason);
  } catch (error) {
    deps.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (import.meta.main) reviewerRecordMain(process.env);
