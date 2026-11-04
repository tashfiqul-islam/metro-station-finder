import { spawnSync } from "node:child_process";

import { cleanGitEnv } from "./git-env.ts";

/**
 * Decides whether a pull request body records an independent reviewer (METRO-36, docs/agents/workflow.md).
 *
 * What this proves: the `Reviewer` section is present, is not a placeholder, and carries a reference a reader
 * can follow. What it cannot prove: that a review happened. The linked reviewer output and disposition are
 * the evidence.
 *
 * The body is untrusted text: it is only ever parsed here as data, never executed or echoed, and every scan
 * is linear so a huge body cannot stall the job.
 */

export interface ReviewerDecision {
  readonly ok: boolean;
  readonly reason: string;
}

const MARKER = /^none \(docs only\)/iu;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]|$)/u;
const REVIEWER_HEADING = /^ {0,3}#{1,6}[ \t]*reviewer[ \t]*#*[ \t]*$/iu;
const FENCE = /^ {0,3}(`{3,}|~{3,})/u;
const DOCS_PATH = /^(?:docs\/(?:[^/\\]+\/)*[^/\\]+\.md|[^/\\]+\.md)$/u;
const MIN_VALUE_LENGTH = 10;
/** Phrases that mean the review has not happened yet or the value was never filled in. */
const PLACEHOLDER =
  /\b(?:pending|tbd|todo|placeholder)\b|\bto be (?:recorded|added|done|filled|completed|determined)\b|\bn\/a\b|\bnone yet\b|\bnot yet\b|\bwill be\b|\bfill(?:ed)? in\b/iu;
/** Something a reader can follow: a URL, a `#<number>` pull request or comment reference, or `session:` / `run:`. */
const REFERENCE = /https?:\/\/\S+|#\d+\b|\b(?:session|run)[ \t]*:/iu;

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

/** Heading level of each line (0 for none); lines inside fenced code blocks are never headings. */
function headingLevels(lines: readonly string[]): number[] {
  const levels: number[] = [];
  let fence = "";
  for (const line of lines) {
    const marker = FENCE.exec(line)?.[1] ?? "";
    if (fence === "") {
      levels.push(marker === "" ? (HEADING.exec(line)?.[1]?.length ?? 0) : 0);
      fence = marker;
    } else {
      levels.push(0);
      const closes =
        line.trim() === marker && marker[0] === fence[0] && marker.length >= fence.length;
      if (closes) fence = "";
    }
  }
  return levels;
}

/**
 * The visible text under the first non-empty `Reviewer` heading, or "" when absent. A section ends at a
 * heading of the same or a higher level. Setext (underlined) headings are not supported.
 */
export function readReviewerValue(body: string): string {
  const lines = stripComments(body).split(/\r?\n/u);
  const levels = headingLevels(lines);
  for (const [start, line] of lines.entries()) {
    const level = levels[start] ?? 0;
    if (level === 0 || !REVIEWER_HEADING.test(line)) continue;
    let end = start + 1;
    while (end < lines.length && !((levels[end] ?? 0) > 0 && (levels[end] ?? 0) <= level)) end += 1;
    const value = lines
      .slice(start + 1, end)
      .join("\n")
      .trim();
    if (value !== "") return value;
  }
  return "";
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
  if (PLACEHOLDER.test(value) || !hasIdentityText(value))
    return {
      ok: false,
      reason:
        'The "Reviewer" section is a placeholder or has no identity text. Name the reviewer agent or person; do not write that the review is pending.',
    };
  if (!REFERENCE.test(value))
    return {
      ok: false,
      reason:
        'The "Reviewer" section has no reference a reader can follow. Add a URL, a #<number> pull request or comment reference, or a "session:" / "run:" token.',
    };
  return {
    ok: true,
    reason: "Reviewer section present, not a placeholder, and carries a reference.",
  };
}

/** Changed paths from the merge base to the head; fails visibly when git cannot answer. */
export function gitChangedPaths(base: string, head: string, cwd?: string): string[] {
  // --no-renames lists the old path of a move too, so a code file renamed into docs/ still counts as code.
  const result = spawnSync(
    "git",
    ["diff", "--name-only", "--no-renames", "-z", `${base}...${head}`, "--"],
    { encoding: "utf8", shell: false, env: cleanGitEnv(), ...(cwd === undefined ? {} : { cwd }) },
  );
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
    changedPaths: (base, head) => gitChangedPaths(base, head),
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
