import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

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
 * a non-blocking error unless the handler sets `onFailure: "block"`. Once running, this script exits
 * 0 or 2 only: every failure path, including reading stdin and building the context, is caught and
 * becomes exit 2. A crash before it runs (missing runtime, a node too old to strip types, a syntax
 * error) exits non-zero, which blocks only because `.claude/settings.json` sets `onFailure: "block"`.
 * Reasons never echo tool input values.
 *
 * Limits are documented in docs/agents/permissions.md; this hook cannot see shell commands.
 */

export type Scope = "plane-write" | "gate-edit";
export type Decision =
  | { readonly allow: true }
  | { readonly allow: false; readonly reason: string };

export interface Context {
  readonly now: Date;
  /** Repository root from CLAUDE_PROJECT_DIR only; undefined fails file edits closed. */
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
 * Allow-list of read-only Plane actions, from the connected schemas as read on 2026-11-04. Only an
 * action listed under `read` for its tool passes without a marker; every other call is mutating.
 * The same table is in docs/agents/permissions.md and a test keeps the two equal. `mutating` is
 * documentation: it is not consulted by the hook.
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

/**
 * The rule the hook applies: a call is read-only only if its tool and action are listed as read in
 * `PLANE_ACTIONS` (matched exactly and case-sensitively), or the tool is an action-less read tool
 * called without an action. Everything else, including a new tool, a new or odd-cased action and a
 * missing or non-string action, is mutating.
 */
export function classifyPlaneCall(tool: string, action?: unknown): "read" | "mutating" {
  if (action === undefined) return ACTIONLESS_READ_TOOLS.has(tool) ? "read" : "mutating";
  if (typeof action !== "string" || !Object.hasOwn(PLANE_ACTIONS, tool)) return "mutating";
  return PLANE_ACTIONS[tool]?.read.includes(action) === true ? "read" : "mutating";
}

/**
 * The tool part of an MCP tool name whose server segment mentions "plane" in any case, so spelling
 * variants (`claude_ai_Plane`, `plane-mcp`, `plugin_plane_plane`) are all guarded. The settings
 * matcher is deliberately wider than this; this function is the authority.
 */
function planeTool(name: string): string | undefined {
  if (!name.startsWith("mcp__")) return undefined;
  const rest = name.slice("mcp__".length);
  const index = rest.indexOf("__");
  return index > 0 && /plane/iu.test(rest.slice(0, index)) ? rest.slice(index + 2) : undefined;
}

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
    // Windows PowerShell 5.1 Set-Content -Encoding UTF8 writes a BOM; UTF-16 stays invalid on purpose.
    value = JSON.parse(raw.replace(/^\uFEFF/u, ""));
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

interface Analysis {
  /** Why the path cannot be classified safely; the edit is denied. */
  readonly problem?: string;
  /** Every reading of the path that could name a real file: as given, and as a Windows drive alias. */
  readonly candidates: readonly Parts[];
}

const DRIVE = /^[A-Za-z]:/u;
/** `/d/...` (Git Bash), `/mnt/d/...` (WSL) and `/cygdrive/d/...` all name drive D. */
const DRIVE_ALIAS = /^\/(?:(?:mnt|cygdrive)\/)?([A-Za-z])(?=\/|$)(.*)$/u;

/** `.` and `..` are resolved; trailing dots and spaces are stripped as Windows does; case is kept for display. */
function cleanSegments(body: string): string[] {
  const segments: string[] = [];
  for (const part of body.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      segments.pop();
      continue;
    }
    const stripped = part.replace(/[. ]+$/u, "");
    if (stripped !== "") segments.push(stripped);
  }
  return segments;
}

/**
 * Platform-independent reading of a tool path. Device (`\\?\`, `\\.\`) and network (`\\host`)
 * prefixes, alternate data streams (`:` after the drive letter) and NUL bytes cannot be resolved
 * against the project and are reported as a problem. A path that is not absolute has one candidate
 * with `absolute: false` and is resolved by the caller.
 */
function analysePath(raw: string): Analysis {
  if (raw.includes("\0")) return { problem: "path contains a NUL byte", candidates: [] };
  const text = raw.replaceAll("\\", "/");
  if (/^\/\/[?.](?:\/|$)/u.test(text)) {
    return { problem: "device path prefixes cannot be classified", candidates: [] };
  }
  if (text.startsWith("//")) {
    return { problem: "network paths cannot be classified", candidates: [] };
  }
  const drive = DRIVE.exec(text)?.[0] ?? "";
  const rest = text.slice(drive.length);
  if (rest.includes(":")) {
    return { problem: "alternate data streams cannot be classified", candidates: [] };
  }
  const absolute = drive !== "" || rest.startsWith("/");
  const candidates: Parts[] = [
    { root: drive.toLowerCase(), segments: cleanSegments(rest), absolute },
  ];
  const alias = drive === "" ? DRIVE_ALIAS.exec(rest) : null;
  if (alias?.[1] !== undefined) {
    candidates.push({
      root: `${alias[1].toLowerCase()}:`,
      segments: cleanSegments(alias[2] ?? ""),
      absolute: true,
    });
  }
  return { candidates };
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

/** First reading of `file` that lies below any reading of `base`. */
function belowAny(bases: readonly Parts[], files: readonly Parts[]): readonly string[] | undefined {
  for (const file of files) {
    for (const base of bases) {
      const found = below(base, file);
      if (found !== undefined) return found;
    }
  }
  return undefined;
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
      'Tracker writes need a valid "plane-write" authorization, which only the owner can create: ask the owner. ' +
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
  const raw = pathInput(input);
  if (raw === undefined)
    return deny("Blocked: file edit without a usable file_path (fail closed).");
  const gate = (why: string, shown: string): Decision => {
    const problem = authorized(ctx, "gate-edit");
    return problem === undefined
      ? NEUTRAL
      : deny(
          `Blocked: ${shown} is a gate file (${why}; ${problem}). ` +
            'Editing it needs a valid "gate-edit" authorization, which only the owner can create: ask the owner. ' +
            "See docs/agents/permissions.md.",
        );
  };
  let analysis = analysePath(raw);
  if (analysis.problem === undefined && analysis.candidates[0]?.absolute !== true) {
    if (ctx.projectDir === undefined) {
      return deny("Blocked: relative path and unknown project directory (fail closed).");
    }
    analysis = analysePath(`${ctx.projectDir}/${raw}`);
  }
  if (analysis.problem !== undefined) return deny(`Blocked: ${analysis.problem} (fail closed).`);
  const files = analysis.candidates;
  if (belowAny(analysePath(ctx.markerDir).candidates, files) !== undefined) {
    return deny("Blocked: the authorization marker directory cannot be edited with file tools.");
  }
  if (files.some((file) => isSettingsFile(file))) {
    return gate("Claude Code settings", raw.replaceAll("\\", "/"));
  }
  if (ctx.projectDir === undefined) {
    return deny("Blocked: project directory unknown, cannot classify the edit (fail closed).");
  }
  const relative = belowAny(analysePath(ctx.projectDir).candidates, files);
  if (relative === undefined) return NEUTRAL;
  if (relative.some((segment) => /~\d/u.test(segment))) {
    return deny("Blocked: 8.3 short names inside the project cannot be classified (fail closed).");
  }
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
  const plane = planeTool(name);
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
    // The payload `cwd` is deliberately not used: a subdirectory or a moved cwd must not shrink the gate.
    const projectDir = io.env["CLAUDE_PROJECT_DIR"];
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

/** Reads all of stdin, then decides. Any failure, including a stdin error, is exit 2. */
export async function runEntry(stdin: AsyncIterable<unknown>, io: HookIo): Promise<HookResult> {
  try {
    const chunks: Uint8Array[] = [];
    for await (const chunk of stdin) {
      if (chunk instanceof Uint8Array) chunks.push(chunk);
      else if (typeof chunk === "string") chunks.push(Buffer.from(chunk));
    }
    return runHook(Buffer.concat(chunks).toString("utf8"), io);
  } catch (error) {
    return block(
      `Blocked: hook failed (${error instanceof Error ? error.message : "unknown"}), fail closed.`,
    );
  }
}

/**
 * Whether this module is the process entry. `import.meta.main` exists in Bun and recent Node; where
 * it is undefined the script path is compared with the module URL, so an older runtime cannot
 * import the module, run nothing and exit 0.
 */
export function isEntryPoint(meta: {
  readonly main?: boolean | undefined;
  readonly url: string;
  readonly argv1?: string | undefined;
}): boolean {
  const { argv1, url: metaUrl } = meta;
  if (meta.main === true) return true;
  if (argv1 === undefined) return false;
  const normal = argv1.replaceAll("\\", "/");
  const absolute =
    DRIVE.test(normal) || normal.startsWith("/") ? normal : resolve(argv1).replaceAll("\\", "/");
  const href = `file://${absolute.startsWith("/") ? "" : "/"}${encodeURI(absolute)}`;
  return href.toLowerCase() === metaUrl.toLowerCase();
}

if (isEntryPoint({ main: import.meta.main, url: import.meta.url, argv1: process.argv[1] })) {
  let result: HookResult;
  try {
    result = await runEntry(process.stdin, defaultIo(process.env));
  } catch (error) {
    result = block(
      `Blocked: hook failed (${error instanceof Error ? error.message : "unknown"}), fail closed.`,
    );
  }
  process.exitCode = result.exitCode;
  process.stderr.write(result.stderr);
  process.stdout.write(result.stdout);
}
