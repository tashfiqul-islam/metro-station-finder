import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

import { isRecord } from "./guards.ts";

/**
 * Claude Code PreToolUse hook (METRO-38). It turns two prose rules into enforcement:
 *
 * 1. no tracker writes without authorization: a Plane call whose action is not provably read-only
 *    is blocked unless a valid `plane-write` marker exists;
 * 2. no edits to gate files without scope: a file edit whose path matches CODEOWNERS (or is a Claude
 *    Code settings file) is blocked unless a valid `gate-edit` marker exists.
 *
 * The decision is a pure function of the hook payload and a `Context`; everything that touches the
 * disk or the clock is injected, so the tests need no Claude Code. Exit semantics (Web-verified,
 * https://code.claude.com/docs/en/hooks, read 2026-11-04): exit 2 blocks the call and stderr is the
 * reason; exit 0 with no output leaves the normal permission flow in place; any other exit code is
 * a non-blocking error unless the handler sets `onFailure: "block"`. This script therefore only ever
 * exits 0 or 2, and `.claude/settings.json` sets `onFailure: "block"` so a crash or a missing
 * runtime blocks as well. Reasons never echo tool input values.
 *
 * Limits are documented in docs/agents/permissions.md; this hook cannot see shell commands.
 */

export type Scope = "plane-write" | "gate-edit";
export type Decision =
  | { readonly allow: true }
  | { readonly allow: false; readonly reason: string };

export interface Context {
  readonly now: Date;
  /** Repository root; undefined when neither CLAUDE_PROJECT_DIR nor the payload `cwd` gave one. */
  readonly projectDir: string | undefined;
  readonly markerDir: string;
  /** Text of .github/CODEOWNERS, or undefined when it could not be read. */
  readonly codeowners: string | undefined;
  /** Raw marker text for a scope, or undefined when the marker does not exist. */
  readonly readMarker: (scope: Scope) => string | undefined;
}

/** A marker may not claim to live longer than this, however far in the future it says it expires. */
export const MAX_TTL_MS = 4 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60 * 1000;

interface PlaneActions {
  readonly read: readonly string[];
  readonly mutating: readonly string[];
}

/**
 * Classification of the connected Plane tools, from their schemas as read on 2026-11-04. The same
 * table is in docs/agents/permissions.md and a test keeps the two equal. The rule below is what the
 * hook applies; this table documents it and is proven to agree with it.
 */
export const PLANE_ACTIONS: Readonly<Record<string, PlaneActions>> = {
  collection: {
    read: ["list", "retrieve", "list_pages", "search_pages", "list_members"],
    mutating: [
      "create",
      "update",
      "delete",
      "add_pages",
      "remove_page",
      "add_member",
      "update_member",
      "remove_member",
    ],
  },
  customer: {
    read: ["list", "retrieve", "list_workitems"],
    mutating: ["create", "update", "delete", "manage_workitems"],
  },
  customer_property: {
    read: ["list", "retrieve", "get_values"],
    mutating: ["create", "update", "delete", "set_values"],
  },
  customer_request: { read: ["list", "retrieve"], mutating: ["create", "update", "delete"] },
  cycle: {
    read: ["list", "retrieve", "list_workitems"],
    mutating: [
      "create",
      "update",
      "delete",
      "manage_workitems",
      "transfer_workitems",
      "complete",
      "archive",
      "unarchive",
    ],
  },
  initiative: {
    read: ["list", "retrieve", "list_projects", "list_workitems"],
    mutating: ["create", "update", "delete", "add_projects", "remove_projects", "manage_workitems"],
  },
  intake: { read: ["list", "retrieve"], mutating: ["create", "update", "delete"] },
  label: { read: ["list", "retrieve"], mutating: ["create", "update", "delete"] },
  member: {
    read: ["me", "list_workspace", "list_project", "list_roles", "retrieve_role"],
    mutating: [],
  },
  milestone: {
    read: ["list", "retrieve", "list_workitems"],
    mutating: ["create", "update", "delete", "manage_workitems"],
  },
  module: {
    read: ["list", "retrieve", "list_workitems"],
    mutating: ["create", "update", "delete", "manage_workitems", "archive", "unarchive"],
  },
  page: {
    read: ["list", "retrieve", "list_workitem_pages"],
    mutating: [
      "create",
      "update",
      "archive",
      "delete",
      "set_collection",
      "attach_to_workitem",
      "detach_from_workitem",
    ],
  },
  project: {
    read: ["list", "retrieve", "worklog_summary", "get_features"],
    mutating: ["create", "update", "delete", "archive", "unarchive", "update_features"],
  },
  project_estimate: {
    read: ["retrieve", "list_points"],
    mutating: [
      "create",
      "update",
      "delete",
      "link",
      "create_points",
      "update_point",
      "delete_point",
    ],
  },
  release: {
    read: ["list", "retrieve", "get_changelog", "list_workitems"],
    mutating: ["create", "update", "delete", "update_changelog", "manage_workitems"],
  },
  release_label: { read: ["list"], mutating: ["create", "update", "delete", "attach", "detach"] },
  release_tag: { read: ["list", "retrieve"], mutating: ["create", "update", "delete"] },
  state: { read: ["list", "retrieve"], mutating: ["create", "update", "delete"] },
  template: { read: ["list"], mutating: ["create", "update", "delete"] },
  work_log: { read: ["list"], mutating: ["create", "update", "delete"] },
  workitem: {
    read: ["list", "list_archived", "retrieve", "retrieve_by_identifier", "search", "count"],
    mutating: ["create", "update", "delete", "archive", "manage_assignee", "manage_label"],
  },
  workitem_activity: { read: ["list", "retrieve"], mutating: [] },
  workitem_attachment: {
    read: ["list", "read", "download_url"],
    mutating: ["upload_from_url", "delete"],
  },
  workitem_comment: { read: ["list", "retrieve"], mutating: ["create", "update", "delete"] },
  workitem_link: { read: ["list", "retrieve"], mutating: ["create", "update", "delete"] },
  workitem_property: {
    read: ["list", "retrieve", "list_options", "retrieve_option", "get_value"],
    mutating: [
      "create",
      "update",
      "delete",
      "manage_type_properties",
      "create_option",
      "update_option",
      "delete_option",
      "set_value",
      "delete_value",
    ],
  },
  workitem_relation: {
    read: ["list", "list_definitions"],
    mutating: ["create", "delete", "create_definition", "update_definition", "delete_definition"],
  },
  workitem_type: {
    read: ["list", "retrieve"],
    mutating: ["resolve", "create", "update", "delete", "import_to_project"],
  },
  workspace: { read: ["retrieve", "get_features"], mutating: ["update_features"] },
};

/** Plane tools that take no `action` and only read. */
export const ACTIONLESS_READ_TOOLS: ReadonlySet<string> = new Set(["get_pql_reference"]);

const READ_PREFIX = /^(?:list|get|retrieve|search|count)(?:_[a-z_]+)?$/u;
const READ_EXACT: ReadonlySet<string> = new Set(["me", "read", "download_url", "worklog_summary"]);

/**
 * The rule the hook applies: an action is read-only only if its name is read-shaped (list, get,
 * retrieve, search, count, with an optional suffix) or one of four listed exceptions. Anything
 * else, including a new, odd-cased or non-string action, is treated as mutating.
 */
export function classifyPlaneCall(tool: string, action: unknown): "read" | "mutating" {
  if (action === undefined && ACTIONLESS_READ_TOOLS.has(tool.toLowerCase())) return "read";
  if (typeof action !== "string") return "mutating";
  return READ_PREFIX.test(action) || READ_EXACT.has(action) ? "read" : "mutating";
}

const PLANE_TOOL = /^mcp__(?:claude_ai_)?plane__(.+)$/iu;
const FILE_TOOLS: ReadonlySet<string> = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const NEUTRAL: Decision = { allow: true };

function deny(reason: string): Decision {
  return { allow: false, reason };
}

/** Returns undefined for a valid, unexpired, correctly scoped marker, else the reason it is invalid. */
function markerProblem(raw: string | undefined, scope: Scope, now: Date): string | undefined {
  if (raw === undefined) return "no marker file";
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return "marker is not valid JSON";
  }
  if (!isRecord(value) || value["scope"] !== scope) return `marker scope is not "${scope}"`;
  const issued = typeof value["issuedAt"] === "string" ? Date.parse(value["issuedAt"]) : Number.NaN;
  const expires =
    typeof value["expiresAt"] === "string" ? Date.parse(value["expiresAt"]) : Number.NaN;
  if (Number.isNaN(issued) || Number.isNaN(expires)) return "marker dates are missing or invalid";
  if (issued > now.getTime() + CLOCK_SKEW_MS) return "marker is dated in the future";
  if (expires <= issued) return "marker expires before it was issued";
  if (expires - issued > MAX_TTL_MS) return "marker lifetime exceeds the maximum";
  if (expires <= now.getTime()) return "marker has expired";
  return undefined;
}

function authorized(ctx: Context, scope: Scope): string | undefined {
  return markerProblem(ctx.readMarker(scope), scope, ctx.now);
}

// ---------- paths ----------

interface Parts {
  readonly root: string;
  readonly segments: readonly string[];
  readonly absolute: boolean;
}

/** Platform-independent split: backslashes, drive letters, `.` and `..` are normalized; case is folded. */
function splitPath(raw: string): Parts {
  const text = raw.replaceAll("\\", "/");
  const drive = /^[A-Za-z]:/u.exec(text)?.[0] ?? "";
  const rest = text.slice(drive.length);
  const absolute = drive !== "" || rest.startsWith("/");
  const segments: string[] = [];
  for (const part of rest.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") segments.pop();
    else segments.push(part);
  }
  return { root: drive.toLowerCase(), segments, absolute };
}

function startsWithSegments(path: readonly string[], prefix: readonly string[]): boolean {
  return prefix.every((part, index) => path[index]?.toLowerCase() === part.toLowerCase());
}

/** Segments of the absolute path `file` below `base`, or undefined when it is outside. */
function below(base: Parts, file: Parts): readonly string[] | undefined {
  if (file.root !== base.root || !startsWithSegments(file.segments, base.segments))
    return undefined;
  return file.segments.slice(base.segments.length);
}

function pathInput(input: Record<string, unknown>): string | undefined {
  for (const key of ["file_path", "notebook_path"]) {
    const value = input[key];
    if (typeof value === "string" && value !== "") return value;
  }
  return undefined;
}

// ---------- CODEOWNERS ----------

function escapeRegex(text: string): string {
  return text.replaceAll(/[.+^${}()|\\]/gu, String.raw`\$&`);
}

function compilePattern(pattern: string): RegExp {
  if (pattern.startsWith("!") || /[[\\]/u.test(pattern)) {
    throw new Error(`unsupported CODEOWNERS pattern: ${pattern}`);
  }
  const directory = pattern.endsWith("/");
  const trimmed = directory ? pattern.slice(0, -1) : pattern;
  const anchored = trimmed.startsWith("/") || trimmed.includes("/");
  const body = trimmed
    .replace(/^\//u, "")
    .split("**/")
    .map((chunk) =>
      escapeRegex(chunk)
        .replaceAll("/**", "/.*")
        .replaceAll("**", ".*")
        .replaceAll("*", "[^/]*")
        .replaceAll("?", "[^/]"),
    )
    .join("(?:.*/)?");
  const tail = directory ? "/.+$" : "(?:/.*)?$";
  return new RegExp(`^${anchored ? "" : "(?:.*/)?"}${body}${tail}`, "iu");
}

/** Patterns from CODEOWNERS text. Owners are ignored: any listed path is a gate. Throws on syntax it cannot match safely. */
export function parseCodeowners(text: string): RegExp[] {
  const patterns: RegExp[] = [];
  for (const line of text.split(/\r?\n/u)) {
    const pattern = line.replace(/#.*$/u, "").trim().split(/\s+/u)[0] ?? "";
    if (pattern !== "") patterns.push(compilePattern(pattern));
  }
  return patterns;
}

export function matchesCodeowners(patterns: readonly RegExp[], relativePath: string): boolean {
  return patterns.some((pattern) => pattern.test(relativePath));
}

// ---------- decisions ----------

function decidePlane(tool: string, input: Record<string, unknown>, ctx: Context): Decision {
  const action: unknown = input["action"];
  if (classifyPlaneCall(tool, action) === "read") return NEUTRAL;
  const shown =
    typeof action === "string" ? JSON.stringify(action.slice(0, 40)) : "(none or not a string)";
  const problem = authorized(ctx, "plane-write");
  if (problem === undefined) return NEUTRAL;
  return deny(
    `Blocked: Plane ${tool} action ${shown} is not provably read-only (${problem}). ` +
      `Tracker writes need a valid "plane-write" marker created by the owner at ${ctx.markerDir}/plane-write.json. ` +
      "See docs/agents/permissions.md.",
  );
}

function isSettingsFile(parts: Parts): boolean {
  const last = parts.segments.at(-1)?.toLowerCase();
  const parent = parts.segments.at(-2)?.toLowerCase();
  return parent === ".claude" && (last === "settings.json" || last === "settings.local.json");
}

function stripWorktree(segments: readonly string[]): readonly string[] {
  const [first, second, , ...rest] = segments;
  return first?.toLowerCase() === ".claude" &&
    second?.toLowerCase() === "worktrees" &&
    rest.length > 0
    ? rest
    : segments;
}

function decideEdit(input: Record<string, unknown>, ctx: Context): Decision {
  const path = pathInput(input);
  if (path === undefined)
    return deny("Blocked: file edit without a usable file_path (fail closed).");
  const gate = (why: string, shown: string): Decision => {
    const problem = authorized(ctx, "gate-edit");
    return problem === undefined
      ? NEUTRAL
      : deny(
          `Blocked: ${shown} is a gate file (${why}; ${problem}). ` +
            `Editing it needs a valid "gate-edit" marker created by the owner at ${ctx.markerDir}/gate-edit.json. ` +
            "See docs/agents/permissions.md.",
        );
  };
  let parts = splitPath(path);
  if (!parts.absolute) {
    if (ctx.projectDir === undefined) {
      return deny("Blocked: relative path and unknown project directory (fail closed).");
    }
    parts = splitPath(`${ctx.projectDir}/${path}`);
  }
  if (below(splitPath(ctx.markerDir), parts) !== undefined) {
    return deny("Blocked: the authorization marker directory cannot be edited with file tools.");
  }
  if (isSettingsFile(parts)) return gate("Claude Code settings", path.replaceAll("\\", "/"));
  if (ctx.projectDir === undefined) {
    return deny("Blocked: project directory unknown, cannot classify the edit (fail closed).");
  }
  const relative = below(splitPath(ctx.projectDir), parts);
  if (relative === undefined) return NEUTRAL;
  if (ctx.codeowners === undefined) {
    return deny(
      "Blocked: .github/CODEOWNERS could not be read, cannot classify the edit (fail closed).",
    );
  }
  const repoPath = stripWorktree(relative).join("/");
  let patterns: RegExp[];
  try {
    patterns = parseCodeowners(ctx.codeowners);
  } catch (error) {
    return deny(
      `Blocked: ${error instanceof Error ? error.message : "CODEOWNERS unreadable"} (fail closed).`,
    );
  }
  return matchesCodeowners(patterns, repoPath) ? gate("listed in CODEOWNERS", repoPath) : NEUTRAL;
}

/** Pure decision for one PreToolUse payload. Malformed payloads are denied. */
export function decide(payload: unknown, ctx: Context): Decision {
  if (!isRecord(payload) || typeof payload["tool_name"] !== "string") {
    return deny("Blocked: hook input has no tool_name (fail closed).");
  }
  if (payload["hook_event_name"] !== "PreToolUse") {
    return deny("Blocked: hook input is not a PreToolUse event (fail closed).");
  }
  const input = payload["tool_input"];
  if (!isRecord(input)) return deny("Blocked: hook input has no tool_input object (fail closed).");
  const name = payload["tool_name"];
  const plane = PLANE_TOOL.exec(name)?.[1];
  if (plane !== undefined) return decidePlane(plane, input, ctx);
  if (FILE_TOOLS.has(name)) return decideEdit(input, ctx);
  return NEUTRAL;
}

// ---------- process boundary ----------

export interface HookIo {
  readonly now: Date;
  readonly markerDir: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  /** File text, or undefined when the file does not exist. Other failures throw. */
  readonly readText: (path: string) => string | undefined;
}

export interface HookResult {
  readonly exitCode: 0 | 2;
  readonly stdout: string;
  readonly stderr: string;
}

/** Whether a hook that ended with `exitCode` stops the action (documented Claude Code semantics). */
export function hookOutcome(exitCode: number, onFailure?: string): "blocks" | "continues" {
  if (exitCode === 2) return "blocks";
  if (exitCode === 0) return "continues";
  return onFailure === "block" ? "blocks" : "continues";
}

function block(reason: string): HookResult {
  return {
    exitCode: 2,
    stdout: "",
    stderr: `${reason}
`,
  };
}

export function runHook(stdin: string, io: HookIo): HookResult {
  try {
    let payload: unknown;
    try {
      payload = JSON.parse(stdin);
    } catch {
      return block("Blocked: hook input is not valid JSON (fail closed).");
    }
    const cwd = isRecord(payload) ? payload["cwd"] : undefined;
    const projectDir = io.env["CLAUDE_PROJECT_DIR"] ?? (typeof cwd === "string" ? cwd : undefined);
    const ctx: Context = {
      now: io.now,
      projectDir,
      markerDir: io.markerDir,
      codeowners:
        projectDir === undefined ? undefined : io.readText(`${projectDir}/.github/CODEOWNERS`),
      readMarker: (scope) => io.readText(`${io.markerDir}/${scope}.json`),
    };
    const decision = decide(payload, ctx);
    return decision.allow ? { exitCode: 0, stdout: "", stderr: "" } : block(decision.reason);
  } catch (error) {
    return block(
      `Blocked: hook failed (${error instanceof Error ? error.message : "unknown"}), fail closed.`,
    );
  }
}

/** Real clock, disk and environment. The marker directory is outside every repository checkout. */
export function defaultIo(
  env: Readonly<Record<string, string | undefined>>,
  home = homedir(),
): HookIo {
  return {
    now: new Date(),
    markerDir: `${home.replaceAll("\\", "/")}/.claude/metro-authorization`,
    env,
    // A missing file is "no marker"; any other failure (permissions, a directory) throws and blocks.
    readText: (path) => (existsSync(path) ? readFileSync(path, "utf8") : undefined),
  };
}

if (import.meta.main) {
  const chunks: Uint8Array[] = [];
  for await (const chunk of process.stdin) {
    if (chunk instanceof Uint8Array) chunks.push(chunk);
    else if (typeof chunk === "string") chunks.push(Buffer.from(chunk));
  }
  const result = runHook(Buffer.concat(chunks).toString("utf8"), defaultIo(process.env));
  process.stderr.write(result.stderr);
  process.stdout.write(result.stdout);
  process.exitCode = result.exitCode;
}
