import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import { cleanGitEnv } from "./git-env.ts";
import {
  createLookups,
  LookupError,
  type FetchJson,
  type Lookups,
  type PrCommit,
  type PullRef,
  type RecordKind,
  type RecordText,
} from "./reviewer-lookups.ts";

/**
 * Decides whether a pull request body records an independent reviewer (METRO-36, docs/agents/workflow.md).
 *
 * What this proves (METRO-134): the `Reviewer` section is present, is not a placeholder, and links to an issue
 * comment or a pull request review on THIS pull request whose text has one `Reviewed-head: <sha>` line, where
 * the SHA is a commit of the pull request and is either the head or followed only by merges that bring in
 * base commits (GitHub's "Update branch"). What it cannot prove: authenticity. Every comment is posted from
 * the owner's account, so this is a disposition record bound to the reviewed code, not proof a review ran.
 *
 * The body and the comment are untrusted text: only ever parsed here as data, never executed or echoed, and
 * every scan is linear and size-bounded so a huge text cannot stall the job. Failure reasons are fixed text.
 * Any lookup error fails closed.
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
/**
 * A link to an issue comment or a pull request review. Review line comments (`#discussion_r<id>`) are not
 * accepted: post the record as an issue comment or a review. Every part is length-bounded, so the scan is linear.
 */
const RECORD_LINK =
  /https:\/\/github\.com\/([\w.-]{1,100})\/([\w.-]{1,100})\/pull\/(\d{1,9})#(issuecomment|pullrequestreview)-(\d{1,18})(?![\w-])/giu;
const MAX_LINKS = 3;
/** A comment body is at most 65,536 characters on GitHub; more than this is refused unread. */
const MAX_RECORD_LENGTH = 70_000;
const HEAD_LINE_START = /^Reviewed-head:/iu;
const HEAD_LINE = /^Reviewed-head: ([0-9a-f]{40})$/u;
/** Most merge commits whose parents are checked against the base; each costs one REST call. */
const MAX_MERGES = 20;
/** GitHub lists at most 250 commits per pull request. */
const COMMIT_CAP = 250;
const COMMIT_ATTEMPTS = 3;
const COMMIT_RETRY_DELAY_MS = 3000;

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

/** The pull request under check and the injected GitHub lookups. */
export interface ReviewContext {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
  readonly head: string;
  readonly lookups: Lookups;
  /** Pause between commit-list reads; injected so tests use no timers. */
  readonly sleep: (milliseconds: number) => Promise<void>;
}

interface RecordLink {
  readonly kind: RecordKind;
  readonly id: string;
}

const fail = (reason: string): ReviewerDecision => ({ ok: false, reason });

/** Links in the section, split into those on this pull request (first few, distinct) and a count of others. */
function readLinks(
  value: string,
  context: ReviewContext,
): { readonly own: RecordLink[]; readonly other: number } {
  const own: RecordLink[] = [];
  let other = 0;
  for (const match of value.matchAll(RECORD_LINK)) {
    const [, owner = "", repo = "", number = "", kind = "", id = ""] = match;
    const sameRepo =
      owner.toLowerCase() === context.owner.toLowerCase() &&
      repo.toLowerCase() === context.repo.toLowerCase();
    if (!sameRepo || Number(number) !== context.number) {
      other += 1;
      continue;
    }
    const recordKind: RecordKind =
      kind.toLowerCase() === "issuecomment" ? "issuecomment" : "pullrequestreview";
    const link = { kind: recordKind, id };
    const seen = own.some((known) => known.kind === link.kind && known.id === link.id);
    if (!seen && own.length < MAX_LINKS) own.push(link);
  }
  return { own, other };
}

/**
 * The one reviewed SHA in a record's text, or a failure reason when there is none, a malformed or a conflicting
 * one. A `Reviewed-head:` line must stand alone on its line: exact key, one space, 40 lowercase hex characters,
 * no trailing space. A line quoted inside a code fence still counts; anything that merely resembles one fails
 * closed.
 */
function readReviewedHead(text: string): { readonly sha: string } | { readonly reason: string } {
  if (text.length > MAX_RECORD_LENGTH)
    return { reason: "The linked comment or review is too large to read; shorten it." };
  const shas = new Set<string>();
  for (const line of text.split(/\r?\n/u)) {
    if (!HEAD_LINE_START.test(line)) continue;
    const sha = HEAD_LINE.exec(line)?.[1];
    if (sha === undefined)
      return {
        reason:
          'A "Reviewed-head:" line in the linked comment or review is malformed. Write exactly "Reviewed-head: " and 40 lowercase hexadecimal characters.',
      };
    shas.add(sha);
  }
  if (shas.size === 0)
    return {
      reason:
        'The linked comment or review has no "Reviewed-head: <40-character commit SHA>" line.',
    };
  const [sha = "", ...rest] = shas;
  return rest.length > 0
    ? { reason: 'The linked comment or review has conflicting "Reviewed-head:" lines.' }
    : { sha };
}

const status = (error: unknown): string =>
  error instanceof LookupError && error.status > 0 ? ` (HTTP ${error.status})` : "";

/**
 * Whether the reviewed commit binds to the head: it is the head, or every pull request commit after it is a
 * merge whose first parent is already such a commit and whose other parents are ancestors of the base.
 * Returns a failure reason, or "" when bound.
 */
async function bindingFailure(
  reviewed: string,
  context: ReviewContext,
  commits: readonly PrCommit[],
): Promise<string> {
  const known = new Set(commits.map((commit) => commit.sha));
  if (!known.has(reviewed))
    return "The reviewed commit is not a commit of this pull request (or the pull request has more than 250 commits).";
  if (!known.has(context.head))
    return commits.length >= COMMIT_CAP
      ? "The pull request has 250 or more commits and GitHub lists at most 250, so the head cannot be checked."
      : "GitHub does not list the pull request head yet (it can lag a push). Re-run the check.";
  if (reviewed === context.head) return "";
  const children = new Map<string, string[]>();
  for (const commit of commits)
    for (const parent of commit.parents)
      children.set(parent, [...(children.get(parent) ?? []), commit.sha]);
  const after = new Set<string>();
  const queue = [reviewed];
  for (let next = queue.shift(); next !== undefined; next = queue.shift())
    for (const child of children.get(next) ?? [])
      if (!after.has(child)) {
        after.add(child);
        queue.push(child);
      }
  if (!after.has(context.head))
    return "The reviewed commit is not an ancestor of the pull request head.";
  const content =
    "The pull request has commits after the reviewed commit that are not merges of base commits only. Review the new head and record its SHA.";
  let merges = 0;
  for (const commit of commits) {
    if (!after.has(commit.sha)) continue;
    const [first = "", ...others] = commit.parents;
    if (others.length === 0 || (first !== reviewed && !after.has(first))) return content;
    merges += 1;
    if (merges > MAX_MERGES)
      return "Too many merge commits follow the reviewed commit to check; review the new head.";
    for (const parent of others) {
      let ancestor: boolean;
      try {
        ancestor = await context.lookups.isBaseAncestor(parent);
      } catch (error) {
        return `Could not compare a merge parent with the base branch${status(error)}.`;
      }
      if (!ancestor) return content;
    }
  }
  return "";
}

/** Checks one linked record against this pull request: its owner, its `Reviewed-head` line and the binding. */
async function recordFailure(link: RecordLink, context: ReviewContext): Promise<string> {
  const what = link.kind === "issuecomment" ? "comment" : "review";
  let record: RecordText;
  try {
    record = await context.lookups.record(link.kind, link.id);
  } catch (error) {
    return `Could not read the linked ${what} on this pull request${status(error)}. Check that it exists (a deleted one fails).`;
  }
  const expected = `https://api.github.com/repos/${context.owner}/${context.repo}/${
    link.kind === "issuecomment" ? "issues" : "pulls"
  }/${context.number}`;
  if (record.target !== expected) return `The linked ${what} does not belong to this pull request.`;
  const reviewed = readReviewedHead(record.body);
  if ("reason" in reviewed) return reviewed.reason;
  const commits = await readCommits(context);
  return typeof commits === "string" ? commits : bindingFailure(reviewed.sha, context, commits);
}

/**
 * The pull request commits. GitHub can lag a push, so while the head is not listed and the list is under the
 * cap, the read is retried (3 attempts, 2 pauses of 3 s through the injected `sleep`). Returns a failure
 * reason (a string) when a read fails.
 */
async function readCommits(context: ReviewContext): Promise<readonly PrCommit[] | string> {
  let commits: readonly PrCommit[] = [];
  for (let attempt = 1; attempt <= COMMIT_ATTEMPTS; attempt += 1) {
    try {
      commits = await context.lookups.commits();
    } catch (error) {
      return `Could not read the pull request commits${status(error)}.`;
    }
    if (commits.length >= COMMIT_CAP || commits.some((commit) => commit.sha === context.head))
      break;
    if (attempt < COMMIT_ATTEMPTS) await context.sleep(COMMIT_RETRY_DELAY_MS);
  }
  return commits;
}

export async function evaluateReviewer(
  body: string | null | undefined,
  changedPaths: readonly string[],
  context: ReviewContext,
): Promise<ReviewerDecision> {
  const value = readReviewerValue(body ?? "");
  if (value === "")
    return {
      ok: false,
      reason:
        'The "Reviewer" section of the pull request body is missing or empty. Record the reviewer agent definition and a link to the comment or review on this pull request that holds the disposition (docs/agents/workflow.md).',
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
  const { own, other } = readLinks(value, context);
  if (own.length === 0)
    return fail(
      other > 0
        ? 'The "Reviewer" section links only to other pull requests or repositories. Link a comment or review on this pull request.'
        : 'The "Reviewer" section has no link to a comment or review on this pull request. Add https://github.com/<owner>/<repo>/pull/<number>#issuecomment-<id> or #pullrequestreview-<id>; a #<number> or a session or run token no longer counts.',
    );
  let firstFailure = "";
  for (const link of own) {
    const failure = await recordFailure(link, context);
    if (failure === "")
      return {
        ok: true,
        reason:
          "Reviewer record found on this pull request and bound to the reviewed head (authenticity is not proven).",
      };
    firstFailure ||= failure;
  }
  return fail(firstFailure);
}

/** The environment for the git subprocess: no GIT_* redirects and never a GitHub token (GH_TOKEN or GITHUB_TOKEN). */
export function gitProcessEnv(
  base: Readonly<Record<string, string | undefined>> = process.env,
): Record<string, string> {
  const env = cleanGitEnv(base);
  delete env["GH_TOKEN"];
  delete env["GITHUB_TOKEN"];
  return env;
}

/** Changed paths from the merge base to the head; fails visibly when git cannot answer. */
export function gitChangedPaths(base: string, head: string, cwd?: string): string[] {
  // --no-renames lists the old path of a move too, so a code file renamed into docs/ still counts as code.
  const result = spawnSync(
    "git",
    ["diff", "--name-only", "--no-renames", "-z", `${base}...${head}`, "--"],
    { encoding: "utf8", shell: false, env: gitProcessEnv(), ...(cwd === undefined ? {} : { cwd }) },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`git diff failed: ${result.stderr.trim()}`);
  return result.stdout.split("\0").filter((path) => path !== "");
}

export interface Deps {
  readonly changedPaths: (base: string, head: string) => string[];
  readonly log: (message: string) => void;
  readonly error: (message: string) => void;
  readonly lookups: (pull: PullRef, token: string) => Lookups;
  readonly sleep: (milliseconds: number) => Promise<void>;
}

const SHA = /^[0-9a-f]{40}$/u;
/** Each part starts with a word character, so `.` and `..` can never form a path segment. */
const REPOSITORY = /^(\w[\w.-]{0,99})\/(\w[\w.-]{0,99})$/u;
const PR_NUMBER = /^[1-9]\d{0,8}$/u;
const realFetch: FetchJson = (url, init) => fetch(url, init);

/**
 * Process entry. The body arrives in `PR_BODY`, never on a command line or in script text. `GH_TOKEN`
 * (`github.token`, read-only) is used only as a request header and is never printed.
 */
export async function reviewerRecordMain(
  env: Readonly<Record<string, string | undefined>>,
  deps: Deps = {
    changedPaths: (base, head) => gitChangedPaths(base, head),
    log: (m) => console.log(m),
    error: (m) => console.error(m),
    lookups: (pull, token) => createLookups(realFetch, token, pull),
    sleep: delay,
  },
): Promise<void> {
  try {
    const base = env["BASE_SHA"] ?? "";
    const head = env["HEAD_SHA"] ?? "";
    if (!SHA.test(base) || !SHA.test(head))
      throw new Error("BASE_SHA and HEAD_SHA must be full commit ids");
    const repository = REPOSITORY.exec(env["REPOSITORY"] ?? "");
    const number = env["PR_NUMBER"] ?? "";
    const token = env["GH_TOKEN"] ?? "";
    if (repository === null || !PR_NUMBER.test(number) || token === "")
      throw new Error("REPOSITORY, PR_NUMBER and GH_TOKEN must be set");
    const [, owner = "", repo = ""] = repository;
    const pull = { owner, repo, number: Number(number), base };
    const decision = await evaluateReviewer(env["PR_BODY"], deps.changedPaths(base, head), {
      ...pull,
      head,
      lookups: deps.lookups(pull, token),
      sleep: deps.sleep,
    });
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

if (import.meta.main) await reviewerRecordMain(process.env);
