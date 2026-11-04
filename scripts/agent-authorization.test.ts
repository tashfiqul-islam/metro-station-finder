import { expect, test } from "bun:test";
import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  type Context,
  type HookIo,
  MAX_TTL_MS,
  PLANE_ACTIONS,
  classifyPlaneCall,
  decide,
  defaultIo,
  hookOutcome,
  isEntryPoint,
  matchesCodeowners,
  parseCodeowners,
  runEntry,
  runHook,
} from "./agent-authorization";
import { isRecord } from "./guards";

// Paths come from the repository root, never from the process cwd.
const ROOT = resolve(import.meta.dir, "..");
const repo = (...parts: string[]) => join(ROOT, ...parts);
const NOW = new Date("2026-11-04T12:00:00.000Z");
const PROJECT = "D:/work/metro";
const MARKERS = "C:/Users/o/.claude/metro-authorization";
const CODEOWNERS = [
  "# comment",
  "/.github/ @owner",
  "/scripts/ @owner",
  "/package.json @owner",
  "/apps/*/tsconfig.json @owner",
  "/.claude/ @owner",
  "/CLAUDE.md @owner",
  "/docs/agents/ @owner",
  "",
].join("\n");

const marker = (scope: string, from = NOW, ttlMs = 60 * 60 * 1000): string =>
  JSON.stringify({
    scope,
    issuedAt: from.toISOString(),
    expiresAt: new Date(from.getTime() + ttlMs).toISOString(),
    note: "test",
  });

function ctx(markers: Record<string, string> = {}, codeowners: string | null = CODEOWNERS) {
  const context: Context = {
    now: NOW,
    projectDir: PROJECT,
    markerDir: MARKERS,
    codeowners: codeowners ?? undefined,
    readMarker: (scope) => markers[scope],
  };
  return context;
}
const plane = (tool: string, action?: unknown, extra: Record<string, unknown> = {}) => ({
  hook_event_name: "PreToolUse",
  tool_name: `mcp__claude_ai_Plane__${tool}`,
  tool_input: action === undefined ? extra : { action, ...extra },
});
const file = (tool: string, path: unknown, key = "file_path") => ({
  hook_event_name: "PreToolUse",
  tool_name: tool,
  tool_input: { [key]: path },
});
const PLANE_VARIANTS = [
  "mcp__plane__workitem",
  "mcp__claude_ai_plane__workitem",
  "mcp__PLANE__workitem",
  "mcp__claude_ai_Plane__workitem",
  "mcp__plane-mcp__workitem",
  "mcp__plugin_plane_plane__workitem",
  "mcp__my_PlAnE_server__workitem",
];
const planeOk = { "plane-write": marker("plane-write") };
const gateOk = { "gate-edit": marker("gate-edit") };

// ---------- classification table (the table in docs/agents/permissions.md is tested against this) ----------

test("METRO-38 every documented read action classifies as read and every mutating one as mutating", () => {
  for (const [tool, { read, mutating }] of Object.entries(PLANE_ACTIONS)) {
    for (const action of read) expect(classifyPlaneCall(tool, action)).toBe("read");
    for (const action of mutating) expect(classifyPlaneCall(tool, action)).toBe("mutating");
  }
});
// The connector listed 30 tools on 2026-11-04, one of them (get_pql_reference) without an action.
// Update this number together with PLANE_ACTIONS and the docs table when the connector changes.
test("METRO-38 the table covers the whole connector (30 tools minus the action-less one)", () =>
  expect(Object.keys(PLANE_ACTIONS)).toHaveLength(29));
test("METRO-38 unknown or odd actions are mutating, never read", () => {
  for (const action of [
    "",
    "LIST",
    "List",
    "list ",
    "drop",
    "resolve",
    "list;delete",
    undefined,
    7,
    null,
  ])
    expect(classifyPlaneCall("workitem", action)).toBe("mutating");
  expect(classifyPlaneCall("brand_new_tool", "create")).toBe("mutating");
});
test("METRO-38 read is an allow-list: a read-shaped action that is not in the table is mutating", () => {
  expect(classifyPlaneCall("brand_new_tool", "list_things")).toBe("mutating");
  expect(classifyPlaneCall("brand_new_tool", "list")).toBe("mutating");
  expect(classifyPlaneCall("workitem", "list_things")).toBe("mutating");
  expect(classifyPlaneCall("workitem", "get_everything")).toBe("mutating");
  expect(classifyPlaneCall("state", "search")).toBe("mutating");
  expect(classifyPlaneCall("get_pql_reference", "read")).toBe("mutating");
  expect(classifyPlaneCall("get_pql_reference")).toBe("read");
});
test("METRO-38 every action in the read column is read-shaped by name, so a mutating verb cannot be filed as read", () => {
  const shaped =
    /^(?:list|get|retrieve|search|count)(?:_[a-z_]+)?$|^(?:me|read|download_url|worklog_summary)$/u;
  for (const { read, mutating } of Object.values(PLANE_ACTIONS)) {
    for (const action of read) expect(shaped.test(action)).toBe(true);
    for (const action of mutating) expect(read).not.toContain(action);
  }
});
test("METRO-38 workitem_type resolve is mutating because it can create", () =>
  expect(classifyPlaneCall("workitem_type", "resolve")).toBe("mutating"));

// ---------- Plane decisions ----------

test("METRO-38 read-only Plane calls are allowed without a marker", () => {
  for (const [tool, { read }] of Object.entries(PLANE_ACTIONS))
    for (const action of read) expect(decide(plane(tool, action), ctx()).allow).toBe(true);
  expect(decide(plane("get_pql_reference"), ctx()).allow).toBe(true);
});
test("METRO-38 every mutating Plane call is denied without a marker", () => {
  for (const [tool, { mutating }] of Object.entries(PLANE_ACTIONS))
    for (const action of mutating) {
      const decision = decide(plane(tool, action), ctx());
      expect(decision.allow).toBe(false);
    }
});
test("METRO-38 a valid plane-write marker allows mutating Plane calls", () => {
  for (const [tool, { mutating }] of Object.entries(PLANE_ACTIONS))
    for (const action of mutating)
      expect(decide(plane(tool, action), ctx(planeOk)).allow).toBe(true);
});
test("METRO-38 the denial names the tool and action but never the payload", () => {
  const decision = decide(
    plane("workitem", "update", { description_html: "SECRET-BODY", workitem_id: "uuid-1" }),
    ctx(),
  );
  expect(decision.allow).toBe(false);
  if (decision.allow) throw new Error("unreachable");
  expect(decision.reason).toContain("workitem");
  expect(decision.reason).toContain("update");
  expect(decision.reason).not.toContain("SECRET-BODY");
  expect(decision.reason).not.toContain("uuid-1");
});
test("METRO-38 other server spellings of Plane are guarded too", () => {
  for (const tool_name of PLANE_VARIANTS) {
    const call = (action: string) =>
      decide({ tool_name, tool_input: { action }, hook_event_name: "PreToolUse" }, ctx()).allow;
    expect(call("delete")).toBe(false);
    expect(call("list")).toBe(true);
  }
});
test("METRO-38 a Plane call with no, or a non-string, action is denied", () => {
  for (const action of [undefined, 3, null, ["list"], { a: 1 }])
    expect(decide(plane("workitem", action), ctx()).allow).toBe(false);
  expect(decide(plane("brand_new_tool"), ctx()).allow).toBe(false);
  expect(
    decide(
      {
        tool_name: "mcp__claude_ai_Plane__workitem",
        tool_input: "list",
        hook_event_name: "PreToolUse",
      },
      ctx(),
    ).allow,
  ).toBe(false);
});
test("METRO-38 other tools are not this hook's business", () => {
  for (const tool_name of [
    "Bash",
    "Read",
    "mcp__claude_ai_Github_MCP__merge_pull_request",
    "mcp__context7__query-docs",
  ])
    expect(
      decide({ tool_name, tool_input: { command: "ls" }, hook_event_name: "PreToolUse" }, ctx())
        .allow,
    ).toBe(true);
});

// ---------- markers ----------

test("METRO-38 a marker for the other scope does not authorize", () => {
  expect(decide(plane("workitem", "create"), ctx(gateOk)).allow).toBe(false);
  expect(decide(file("Write", `${PROJECT}/scripts/a.ts`), ctx(planeOk)).allow).toBe(false);
});
const bad: [string, string][] = [
  ["not JSON", "{nope"],
  ["an array", "[]"],
  ["null", "null"],
  ["a string", '"plane-write"'],
  ["empty", ""],
  ["missing scope", JSON.stringify({ issuedAt: NOW, expiresAt: NOW })],
  ["wrong scope", marker("gate-edit")],
  ["expired", marker("plane-write", new Date(NOW.getTime() - 2 * 3600_000), 3600_000)],
  ["expiring exactly now", marker("plane-write", new Date(NOW.getTime() - 3600_000), 3600_000)],
  ["issued in the future", marker("plane-write", new Date(NOW.getTime() + 600_000))],
  ["longer than the maximum lifetime", marker("plane-write", NOW, MAX_TTL_MS + 1)],
  ["expiry before issue", marker("plane-write", NOW, -1000)],
  [
    "unparseable dates",
    JSON.stringify({ scope: "plane-write", issuedAt: "yesterday", expiresAt: "tomorrow" }),
  ],
  ["non-string dates", JSON.stringify({ scope: "plane-write", issuedAt: 1, expiresAt: 2 })],
];
for (const [name, raw] of bad)
  test(`METRO-38 an invalid marker (${name}) does not authorize`, () =>
    expect(decide(plane("workitem", "create"), ctx({ "plane-write": raw })).allow).toBe(false));

test("METRO-38 a marker at the maximum lifetime is accepted", () =>
  expect(
    decide(
      plane("workitem", "create"),
      ctx({ "plane-write": marker("plane-write", NOW, MAX_TTL_MS) }),
    ).allow,
  ).toBe(true));
test("METRO-38 a marker issued slightly in the past or within clock skew is accepted", () =>
  expect(
    decide(
      plane("workitem", "create"),
      ctx({ "plane-write": marker("plane-write", new Date(NOW.getTime() + 30_000)) }),
    ).allow,
  ).toBe(true));

// ---------- gate files ----------

test("METRO-38 ordinary edits are allowed without a marker", () => {
  for (const [tool, path] of [
    ["Write", `${PROJECT}/apps/web/src/App.tsx`],
    ["Edit", `${PROJECT}/README.md`],
    ["MultiEdit", `${PROJECT}/packages/core/src/a.ts`],
    ["Write", `${PROJECT}/docs/product/glossary.md`],
    ["Write", "D:/elsewhere/scripts/x.ts"],
  ] as const)
    expect(decide(file(tool, path), ctx()).allow).toBe(true);
});
test("METRO-38 gate files are denied without a marker, for every edit tool", () => {
  for (const tool of ["Write", "Edit", "MultiEdit"])
    for (const path of [
      `${PROJECT}/scripts/guards.ts`,
      `${PROJECT}/package.json`,
      `${PROJECT}/CLAUDE.md`,
      `${PROJECT}/.github/CODEOWNERS`,
      `${PROJECT}/.github/workflows/quality.yml`,
      `${PROJECT}/apps/web/tsconfig.json`,
      `${PROJECT}/docs/agents/permissions.md`,
      `${PROJECT}/.claude/settings.json`,
      `${PROJECT}/.claude/agents/independent-reviewer.md`,
    ])
      expect(decide(file(tool, path), ctx()).allow).toBe(false);
  expect(
    decide(file("NotebookEdit", `${PROJECT}/scripts/n.ipynb`, "notebook_path"), ctx()).allow,
  ).toBe(false);
});
test("METRO-38 a valid gate-edit marker allows gate files", () => {
  expect(decide(file("Write", `${PROJECT}/scripts/guards.ts`), ctx(gateOk)).allow).toBe(true);
  expect(decide(file("Edit", `${PROJECT}/.claude/settings.json`), ctx(gateOk)).allow).toBe(true);
});
test("METRO-38 Windows separators, case and dot segments cannot dodge the match", () => {
  for (const path of [
    "D:\\work\\metro\\scripts\\guards.ts",
    "d:\\WORK\\Metro\\SCRIPTS\\guards.ts",
    `${PROJECT}/apps/web/../../scripts/guards.ts`,
    `${PROJECT}/./scripts//guards.ts`,
  ])
    expect(decide(file("Write", path), ctx()).allow).toBe(false);
});
test("METRO-38 a relative path is read against the project directory", () => {
  expect(decide(file("Write", "scripts/guards.ts"), ctx()).allow).toBe(false);
  expect(decide(file("Write", "src/guards.ts"), ctx()).allow).toBe(true);
});
test("METRO-38 a worktree under the project is matched by its own relative path", () => {
  expect(decide(file("Write", `${PROJECT}/.claude/worktrees/a1/scripts/x.ts`), ctx()).allow).toBe(
    false,
  );
  expect(
    decide(file("Write", `${PROJECT}/.claude/worktrees/a1/apps/web/src/x.ts`), ctx()).allow,
  ).toBe(true);
  expect(
    decide(file("Write", `${PROJECT}/.claude/worktrees/a1/.claude/settings.json`), ctx()).allow,
  ).toBe(false);
});
test("METRO-38 settings files are gate files wherever they live", () => {
  for (const path of [
    "C:/Users/o/.claude/settings.json",
    "C:\\Users\\o\\.claude\\settings.local.json",
    "D:/other/repo/.claude/settings.json",
  ])
    expect(decide(file("Edit", path), ctx()).allow).toBe(false);
  expect(decide(file("Edit", "D:/other/repo/settings.json"), ctx()).allow).toBe(true);
});
test("METRO-38 the marker directory is never writable by file tools, even with markers", () => {
  const all = { ...planeOk, ...gateOk };
  for (const path of [
    `${MARKERS}/plane-write.json`,
    "c:\\users\\o\\.claude\\metro-authorization\\gate-edit.json",
  ])
    expect(decide(file("Write", path), ctx(all)).allow).toBe(false);
});
test("METRO-38 a file tool with a missing or non-string path is denied", () => {
  for (const path of [undefined, 7, "", null, ["a"]])
    expect(decide(file("Write", path), ctx()).allow).toBe(false);
  expect(
    decide({ tool_name: "Write", tool_input: "x", hook_event_name: "PreToolUse" }, ctx()).allow,
  ).toBe(false);
});
test("METRO-38 an unreadable or unsupported CODEOWNERS fails closed for project edits", () => {
  expect(decide(file("Write", `${PROJECT}/src/a.ts`), ctx({}, null)).allow).toBe(false);
  expect(decide(file("Write", `${PROJECT}/src/a.ts`), ctx({}, "!/x @o\n")).allow).toBe(false);
  expect(decide(file("Write", "D:/elsewhere/a.ts"), ctx({}, null)).allow).toBe(true);
});

// ---------- CODEOWNERS matching ----------

const m = (text: string, path: string) => matchesCodeowners(parseCodeowners(text), path);
test("METRO-38 CODEOWNERS: anchored directory, file, glob and unanchored patterns", () => {
  expect(m("/docs/agents/ @o", "docs/agents/a.md")).toBe(true);
  expect(m("/docs/agents/ @o", "docs/agents")).toBe(false);
  expect(m("/docs/agents/ @o", "docs/product/a.md")).toBe(false);
  expect(m("/package.json @o", "package.json")).toBe(true);
  expect(m("/package.json @o", "apps/web/package.json")).toBe(false);
  expect(m("/apps/*/package.json @o", "apps/web/package.json")).toBe(true);
  expect(m("/apps/*/package.json @o", "apps/web/x/package.json")).toBe(false);
  expect(m("*.lock @o", "a/b/bun.lock")).toBe(true);
  expect(m("*.lock @o", "bun.lock")).toBe(true);
  expect(m("docs/ @o", "docs/a.md")).toBe(true);
  expect(m("docs/ @o", "x/docs/a.md")).toBe(true);
  expect(m("docs/agents @o", "x/docs/agents/a.md")).toBe(false);
  expect(m("docs/agents @o", "docs/agents/a.md")).toBe(true);
  expect(m("/a/**/z.ts @o", "a/b/c/z.ts")).toBe(true);
  expect(m("/a/**/z.ts @o", "a/z.ts")).toBe(true);
  expect(m("/a/** @o", "a/b/c")).toBe(true);
  expect(m("**/x.ts @o", "q/r/x.ts")).toBe(true);
  expect(m("/a?.ts @o", "ab.ts")).toBe(true);
  expect(m("/a?.ts @o", "a/.ts")).toBe(false);
  expect(m("/scripts @o", "scripts/a.ts")).toBe(true);
  expect(m("/a.b @o", "axb")).toBe(false);
});
test("METRO-38 CODEOWNERS: comments, blanks and owners are ignored; unsupported syntax throws", () => {
  expect(parseCodeowners("# c\n\n  \n/a/ @o # trailing\n")).toHaveLength(1);
  for (const line of ["!/a @o", "/[ab] @o", "/a\\ b @o"])
    expect(() => parseCodeowners(line)).toThrow(/unsupported/u);
});
test("METRO-38 the real CODEOWNERS parses and covers the policy, hook and settings files", async () => {
  const patterns = parseCodeowners(await readFile(repo(".github", "CODEOWNERS"), "utf8"));
  for (const path of [
    "scripts/agent-authorization.ts",
    ".claude/settings.json",
    ".claude/agents/independent-reviewer.md",
    "docs/agents/permissions.md",
    ".github/CODEOWNERS",
    "AGENTS.md",
  ])
    expect(matchesCodeowners(patterns, path)).toBe(true);
  expect(matchesCodeowners(patterns, "apps/web/src/App.tsx")).toBe(false);
});

// ---------- malformed input and exit codes ----------

function io(
  markers: Record<string, string> = {},
  codeowners: string | undefined = CODEOWNERS,
): HookIo {
  return {
    now: NOW,
    markerDir: MARKERS,
    env: { CLAUDE_PROJECT_DIR: PROJECT },
    readText: (path) => {
      if (path.endsWith("CODEOWNERS")) return codeowners;
      const scope = /([a-z-]+)\.json$/u.exec(path)?.[1] ?? "";
      return markers[scope];
    },
  };
}
const json = (value: unknown) => JSON.stringify(value);

test("METRO-38 malformed hook input fails closed with exit 2 and a reason on stderr", () => {
  for (const stdin of [
    "",
    "not json",
    "[]",
    "null",
    "7",
    json({}),
    json({ tool_name: 5, tool_input: {} }),
    json({ tool_name: "Bash" }),
    json({ tool_name: "Bash", tool_input: "x" }),
    json({ tool_name: "Bash", tool_input: {}, hook_event_name: "PostToolUse" }),
    json({ tool_name: "Bash", tool_input: {}, hook_event_name: "PreToolUse" }).slice(0, 20),
  ]) {
    const result = runHook(stdin, io());
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr.length).toBeGreaterThan(0);
  }
});
test("METRO-38 a denial exits 2 with the reason; an allow exits 0 and prints nothing", () => {
  const denied = runHook(json(plane("workitem", "create")), io());
  expect(denied.exitCode).toBe(2);
  expect(denied.stdout).toBe("");
  expect(denied.stderr).toContain("plane-write");
  const allowed = runHook(json(plane("workitem", "list")), io());
  expect(allowed).toEqual({ exitCode: 0, stdout: "", stderr: "" });
  expect(runHook(json(plane("workitem", "create")), io(planeOk)).exitCode).toBe(0);
});
test("METRO-38 the payload cwd never widens trust: without CLAUDE_PROJECT_DIR file edits fail closed", () => {
  const noEnv: HookIo = { ...io(), env: {} };
  for (const path of [`${PROJECT}/scripts/a.ts`, `${PROJECT}/src/a.ts`, "D:/x/a.ts", "src/a.ts"])
    expect(runHook(json({ ...file("Write", path), cwd: PROJECT }), noEnv).exitCode).toBe(2);
  expect(runHook(json({ ...plane("workitem", "list"), cwd: PROJECT }), noEnv).exitCode).toBe(0);
});
test("METRO-38 an unexpected exception in the decision fails closed", () => {
  const throwing: HookIo = {
    ...io(),
    readText: () => {
      throw new Error("disk on fire");
    },
  };
  const result = runHook(json(plane("workitem", "create")), throwing);
  expect(result.exitCode).toBe(2);
  expect(result.stderr).toContain("disk on fire");
});

// ---------- documented exit-code semantics ----------

test("METRO-38 exit 2 blocks; exit 0 and exit 1 do not; onFailure block turns every failure into a block", () => {
  expect(hookOutcome(2)).toBe("blocks");
  expect(hookOutcome(0)).toBe("continues");
  expect(hookOutcome(1)).toBe("continues");
  expect(hookOutcome(127)).toBe("continues");
  expect(hookOutcome(1, "continue")).toBe("continues");
  expect(hookOutcome(1, "block")).toBe("blocks");
  expect(hookOutcome(127, "block")).toBe("blocks");
  expect(hookOutcome(0, "block")).toBe("continues");
  expect(hookOutcome(2, "continue")).toBe("blocks");
});

// ---------- the tracked hook configuration, run for real ----------

const parseJson = (text: string): unknown => JSON.parse(text);
const names = (cell: string): string[] =>
  [...cell.matchAll(/`([a-z_]+)`/gu)].map((match) => match[1] ?? "");
/** Walks objects and arrays without assertions; anything missing is undefined. */
function at(value: unknown, ...path: (string | number)[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    if (Array.isArray(current) && typeof key === "number") current = current[key];
    else if (isRecord(current) && typeof key === "string") current = current[key];
    else return undefined;
  }
  return current;
}
const same = (left: Iterable<string>, right: Iterable<string>) =>
  expect(new Set(left)).toEqual(new Set(right));
async function readSettings(): Promise<unknown> {
  return parseJson(await readFile(repo(".claude", "settings.json"), "utf8"));
}

test("METRO-38 settings.json wires PreToolUse for Plane and file edits, fails closed, and grants nothing", async () => {
  const settings = await readSettings();
  same(isRecord(settings) ? Object.keys(settings) : [], ["$schema", "hooks"]);
  expect(at(settings, "hooks", "PreToolUse")).toHaveLength(2);
  for (const group of [0, 1]) {
    const handlers = ["hooks", "PreToolUse", group, "hooks"] as const;
    expect(at(settings, ...handlers)).toHaveLength(1);
    expect(at(settings, ...handlers, 0, "type")).toBe("command");
    expect(at(settings, ...handlers, 0, "command")).toBe("node");
    expect(at(settings, ...handlers, 0, "args")).toEqual([
      "${CLAUDE_PROJECT_DIR}/scripts/agent-authorization.ts",
    ]);
    expect(at(settings, ...handlers, 0, "onFailure")).toBe("block");
    const timeout = at(settings, ...handlers, 0, "timeout");
    expect(typeof timeout === "number" && timeout > 0 && timeout <= 30).toBe(true);
  }
  const planeMatcher = new RegExp(String(at(settings, "hooks", "PreToolUse", 0, "matcher")), "u");
  for (const tool of [...Object.keys(PLANE_ACTIONS), "get_pql_reference"])
    expect(planeMatcher.test(`mcp__claude_ai_Plane__${tool}`)).toBe(true);
  for (const name of PLANE_VARIANTS) expect(planeMatcher.test(name)).toBe(true);
  expect(planeMatcher.test("mcp__claude_ai_Github_MCP__merge_pull_request")).toBe(false);
  expect(planeMatcher.test("Bash")).toBe(false);
  same(String(at(settings, "hooks", "PreToolUse", 1, "matcher")).split("|"), [
    "Edit",
    "MultiEdit",
    "NotebookEdit",
    "Write",
  ]);
});

test("METRO-38 the configured command blocks and allows over a real process boundary", async () => {
  const settings = await readSettings();
  const handler = ["hooks", "PreToolUse", 0, "hooks", 0] as const;
  const command = at(settings, ...handler, "command");
  const args = at(settings, ...handler, "args");
  if (typeof command !== "string" || !Array.isArray(args)) throw new Error("no handler");
  const root = ROOT;
  const home = await mkdtemp(join(tmpdir(), "metro-auth-"));
  try {
    const run = (stdin: string) =>
      Bun.spawnSync(
        [command, ...args.map((a) => String(a).replace("${CLAUDE_PROJECT_DIR}", root))],
        {
          stdin: new TextEncoder().encode(stdin),
          cwd: root,
          env: { ...process.env, CLAUDE_PROJECT_DIR: root, HOME: home, USERPROFILE: home },
        },
      );
    const create = json(plane("workitem", "create", { name: "synthetic" }));
    const blocked = run(create);
    expect(blocked.exitCode).toBe(2);
    expect(blocked.stdout.toString()).toBe("");
    expect(blocked.stderr.toString()).toContain("plane-write");
    expect(run(json(plane("workitem", "list"))).exitCode).toBe(0);
    expect(run(json(file("Write", join(root, "scripts", "x.ts")))).exitCode).toBe(2);
    expect(run(json(file("Write", join(root, "apps", "web", "src", "x.ts")))).exitCode).toBe(0);
    expect(run("garbage").exitCode).toBe(2);
    const dir = join(home, ".claude", "metro-authorization");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "plane-write.json"), marker("plane-write", new Date()));
    expect(run(create).exitCode).toBe(0);
    expect(run(json(file("Write", join(dir, "plane-write.json")))).exitCode).toBe(2);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

// ---------- docs and real I/O ----------

test("METRO-38 docs/agents/permissions.md carries the same classification table as the code", async () => {
  const text = await readFile(repo("docs", "agents", "permissions.md"), "utf8");
  const block =
    /<!-- plane-actions:start -->([\s\S]*?)<!-- plane-actions:end -->/u.exec(text)?.[1] ?? "";
  const documented: Record<string, { read: string[]; mutating: string[] }> = {};
  for (const line of block.split("\n").filter((row) => row.startsWith("| `"))) {
    const [, tool, read, mutating] = line.split("|").map((cell) => cell.trim());
    documented[names(tool ?? "")[0] ?? ""] = {
      read: names(read ?? ""),
      mutating: names(mutating ?? ""),
    };
  }
  const expected = Object.fromEntries(
    Object.entries(PLANE_ACTIONS).map(([tool, value]) => [
      tool,
      { read: [...value.read], mutating: [...value.mutating] },
    ]),
  );
  expect(documented).toEqual(expected);
});
test("METRO-38 the recommended allow rules in the docs are valid whole-tool rules for the Plane server", async () => {
  const text = await readFile(repo("docs", "agents", "permissions.md"), "utf8");
  const blocks = [...text.matchAll(/```json\n([\s\S]*?)```/gu)].map((match) => match[1] ?? "");
  // The marker example is the JSON block without a permissions key.
  const lists = blocks
    .map((block) => {
      const rules = at(parseJson(block), "permissions", "allow");
      return Array.isArray(rules) ? rules.map(String) : [];
    })
    .filter((rules) => rules.length > 0);
  expect(lists).toHaveLength(2);
  for (const rule of lists.flat()) {
    expect(rule).toMatch(/^mcp__claude_ai_Plane__[a-z_]+$/u);
    const tool = rule.replace("mcp__claude_ai_Plane__", "");
    expect(tool === "get_pql_reference" || tool in PLANE_ACTIONS).toBe(true);
  }
  const fullyRead = [
    ...Object.entries(PLANE_ACTIONS)
      .filter(([, value]) => value.mutating.length === 0)
      .map(([tool]) => tool),
    "get_pql_reference",
  ];
  same(
    (lists[0] ?? []).map((rule) => rule.replace("mcp__claude_ai_Plane__", "")),
    fullyRead,
  );
  expect(lists[0]).toHaveLength(fullyRead.length);
});

test("METRO-38 defaultIo reads real files, treats a missing file as absent and puts markers under the home directory", async () => {
  const home = await mkdtemp(join(tmpdir(), "metro-io-"));
  try {
    const real = defaultIo({ A: "b" }, home);
    expect(real.markerDir).toBe(`${home.replaceAll("\\", "/")}/.claude/metro-authorization`);
    expect(real.env["A"]).toBe("b");
    expect(Math.abs(real.now.getTime() - Date.now())).toBeLessThan(5000);
    await writeFile(join(home, "f.txt"), "hello");
    expect(real.readText(join(home, "f.txt"))).toBe("hello");
    expect(real.readText(join(home, "missing.txt"))).toBeUndefined();
    expect(() => real.readText(home)).toThrow();
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});

// ---------- review round: messages, markers, entry point, paths ----------

test("METRO-38 block messages never reveal the marker path, only that the owner must act", () => {
  const cases = [
    decide(plane("workitem", "create"), ctx()),
    decide(file("Write", `${PROJECT}/scripts/a.ts`), ctx()),
    decide(file("Write", `${MARKERS}/gate-edit.json`), ctx(gateOk)),
  ];
  for (const decision of cases) {
    expect(decision.allow).toBe(false);
    if (decision.allow) throw new Error("unreachable");
    expect(decision.reason).not.toContain("metro-authorization");
    expect(decision.reason).not.toContain("C:/Users");
  }
  const first = cases[0];
  expect(first && !first.allow ? first.reason : "").toContain("ask the owner");
});
test("METRO-38 a UTF-8 byte order mark before the JSON does not invalidate a marker", () =>
  expect(
    decide(plane("workitem", "create"), ctx({ "plane-write": `\uFEFF${marker("plane-write")}` }))
      .allow,
  ).toBe(true));
test("METRO-38 a marker written as UTF-16 text is rejected, not trusted", () =>
  expect(
    decide(
      plane("workitem", "create"),
      ctx({ "plane-write": Buffer.from(marker("plane-write"), "utf16le").toString("latin1") }),
    ).allow,
  ).toBe(false));

// entry point
async function* chunks(...items: unknown[]): AsyncGenerator {
  await Promise.resolve();
  for (const item of items) yield item;
}
test("METRO-38 runEntry reads text and byte chunks, then decides", async () => {
  const text = json(plane("workitem", "create"));
  const half = Math.floor(text.length / 2);
  const result = await runEntry(
    chunks(text.slice(0, half), new TextEncoder().encode(text.slice(half)), 42),
    io(),
  );
  expect(result.exitCode).toBe(2);
  expect(result.stderr).toContain("plane-write");
  expect((await runEntry(chunks(json(plane("workitem", "list"))), io())).exitCode).toBe(0);
});
test("METRO-38 runEntry fails closed when reading stdin or building the context throws", async () => {
  const broken: AsyncIterable<unknown> = {
    [Symbol.asyncIterator]: () => ({ next: () => Promise.reject(new Error("stdin exploded")) }),
  };
  const read = await runEntry(broken, io());
  expect(read.exitCode).toBe(2);
  expect(read.stderr).toContain("stdin exploded");
  const ctxFailure = await runEntry(chunks(json(plane("workitem", "create"))), {
    ...io(),
    readText: () => {
      throw new Error("no disk");
    },
  });
  expect(ctxFailure.exitCode).toBe(2);
  expect((await runEntry(chunks(), io())).exitCode).toBe(2);
});
test("METRO-38 running the script by path blocks with exit 2", () => {
  const result = Bun.spawnSync(["node", repo("scripts", "agent-authorization.ts")], {
    stdin: new TextEncoder().encode(json(plane("workitem", "delete"))),
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: ROOT,
      HOME: tmpdir(),
      USERPROFILE: tmpdir(),
    },
  });
  expect(result.exitCode).toBe(2);
});

// paths
const denyPath = (path: string, markers: Record<string, string> = {}, tool = "Write") =>
  expect(decide(file(tool, path), ctx(markers)).allow).toBe(false);
const allowPath = (path: string, markers: Record<string, string> = {}, tool = "Write") =>
  expect(decide(file(tool, path), ctx(markers)).allow).toBe(true);

test("METRO-38 device and network path prefixes are denied even with a gate-edit marker", () => {
  for (const path of [
    "\\\\?\\D:\\work\\metro\\scripts\\a.ts",
    "\\\\?\\D:\\work\\metro\\src\\a.ts",
    "\\\\.\\D:\\work\\metro\\src\\a.ts",
    "//?/D:/work/metro/src/a.ts",
    "\\\\server\\share\\scripts\\a.ts",
    "//server/share/a.ts",
  ]) {
    denyPath(path);
    denyPath(path, gateOk);
  }
});
test("METRO-38 alternate data streams and NUL bytes are denied", () => {
  for (const path of [
    "D:/work/metro/src/a.ts:stream",
    "D:/work/metro/package.json::$DATA",
    "D:\\work\\metro\\scripts\\a.ts:hidden",
    "D:/elsewhere/a.ts:s",
    "D:/work/metro/src/a.ts\0.txt",
  ])
    denyPath(path, gateOk);
  allowPath("D:/work/metro/src/a.ts");
});
test("METRO-38 trailing dots and spaces on a segment do not dodge the gate match", () => {
  for (const path of [
    "D:/work/metro/scripts./a.ts",
    "D:/work/metro/scripts /a.ts",
    "D:/work/metro/package.json.",
    "D:/work/metro/package.json ",
    "D:/work/metro/package.json. .",
    "D:/work/metro/.claude./settings.json",
    "D:/work/metro/.claude/settings.json.",
  ])
    denyPath(path);
  allowPath("D:/work/metro/src./a.ts");
});
test("METRO-38 8.3 short names inside the project are denied; outside the project they are not this hook's business", () => {
  denyPath("D:/work/metro/SCRIPT~1/a.ts", gateOk);
  denyPath("D:/work/metro/src/PACKAG~1.JSO", gateOk);
  allowPath("D:/other/PROGRA~1/x.ts");
});
test("METRO-38 MSYS, WSL and Cygwin drive roots resolve to the same files", () => {
  for (const root of ["/d", "/mnt/d", "/cygdrive/d", "/D", "/mnt/D"]) {
    denyPath(`${root}/work/metro/scripts/a.ts`);
    denyPath(`${root}/work/metro/.claude/settings.json`);
    allowPath(`${root}/work/metro/scripts/a.ts`, gateOk);
    allowPath(`${root}/work/metro/src/a.ts`);
    allowPath(`${root}/other/a.ts`);
  }
  for (const root of ["/c", "/mnt/c"]) {
    denyPath(`${root}/Users/o/.claude/metro-authorization/gate-edit.json`, {
      ...planeOk,
      ...gateOk,
    });
    denyPath(`${root}/Users/o/.claude/settings.json`);
  }
});
test("METRO-38 a POSIX project directory is matched without drive translation getting in the way", () => {
  const posix: Context = {
    ...ctx(),
    projectDir: "/home/u/repo",
    markerDir: "/home/u/.claude/metro-authorization",
  };
  const run = (path: string, c = posix) => decide(file("Write", path), c).allow;
  expect(run("/home/u/repo/scripts/a.ts")).toBe(false);
  expect(run("/home/u/repo/src/a.ts")).toBe(true);
  expect(run("/home/u/.claude/metro-authorization/plane-write.json")).toBe(false);
  expect(run("/home/u/.claude/settings.json")).toBe(false);
  expect(
    run("/home/u/repo/scripts/a.ts", {
      ...posix,
      readMarker: (scope) => (scope === "gate-edit" ? gateOk["gate-edit"] : undefined),
    }),
  ).toBe(true);
  expect(run("/tmp/a.ts")).toBe(true);
});
test("METRO-38 paths outside the project stay allowed, except settings files and the marker directory", () => {
  allowPath("D:/elsewhere/scripts/guards.ts");
  allowPath("E:/data/package.json");
  allowPath("/tmp/package.json");
  denyPath("E:/data/.claude/settings.json");
  denyPath(`${MARKERS}/plane-write.json`, planeOk);
});

// docs
test("METRO-38 the documented marker timestamp format is what the hook parses reliably", async () => {
  const text = await readFile(repo("docs", "agents", "permissions.md"), "utf8");
  expect(text).toContain('$f="yyyy-MM-ddTHH:mm:ss.fffZ"');
  expect(text).toContain("InvariantCulture");
  const sample = /"issuedAt": "([^"]+)"[\s\S]*?"expiresAt": "([^"]+)"/u.exec(text);
  for (const value of [sample?.[1] ?? "", sample?.[2] ?? ""]) {
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
    expect(new Date(Date.parse(value)).toISOString()).toBe(value);
  }
  const issued = new Date(Date.parse(sample?.[1] ?? ""));
  const raw = JSON.stringify({
    scope: "plane-write",
    issuedAt: sample?.[1],
    expiresAt: sample?.[2],
  });
  const later = new Date(issued.getTime() + 60_000);
  expect(
    decide(plane("workitem", "create"), { ...ctx({ "plane-write": raw }), now: later }).allow,
  ).toBe(true);
  expect(text).toContain("UTF8Encoding]::new($false)");
  expect(text).toMatch(/UTF-16/u);
});
test("METRO-38 the docs carry the operating procedure and the stated limits", async () => {
  const text = (await readFile(repo("docs", "agents", "permissions.md"), "utf8")).toLowerCase();
  for (const needle of [
    "operating procedure",
    "gate-edit",
    "before any gate-touching work",
    "settings.local.json",
    "global",
    "wsl",
    "create_or_update_file",
    "push_files",
    "powershell",
    "option b",
    "only after",
    "paths outside the project",
    "claude_project_dir",
    "does not protect",
    "model, not a proof",
  ])
    expect(text).toContain(needle);
});

// ---------- second review round ----------

test("METRO-38 a drive letter not followed by a separator is denied (drive-relative paths)", () => {
  for (const path of [
    "D:scripts\\guards.ts",
    "D:scripts/guards.ts",
    "D:..\\scripts\\guards.ts",
    "d:package.json",
    "C:",
    "E:data.txt",
  ]) {
    denyPath(path);
    denyPath(path, gateOk);
  }
  allowPath("D:/work/metro/src/a.ts");
  allowPath("D:\\work\\metro\\src\\a.ts");
});
test("METRO-38 ~, $VAR and %VAR% prefixes are denied, including the marker directory through ~", () => {
  for (const path of [
    "~/.claude/metro-authorization/plane-write.json",
    "~\\.claude\\metro-authorization\\gate-edit.json",
    "~",
    "~user/x.ts",
    "$HOME/.claude/metro-authorization/plane-write.json",
    "${HOME}/x.ts",
    "$env:USERPROFILE\\x.ts",
    "%USERPROFILE%\\.claude\\metro-authorization\\plane-write.json",
    "%APPDATA%/x.ts",
  ]) {
    denyPath(path);
    denyPath(path, { ...planeOk, ...gateOk });
  }
  allowPath("D:/work/metro/src/~notes.ts");
  allowPath("D:/work/metro/src/a$b.ts");
});
test("METRO-38 segments made only of dots and spaces are denied, not dropped", () => {
  for (const path of [
    "D:/work/metro/src/.. /scripts/x.ts",
    "D:/work/metro/src/... /scripts/x.ts",
    "D:/work/metro/src/ /x.ts",
    "D:/work/metro/src/.../x.ts",
    "src/.. /scripts/x.ts",
  ]) {
    denyPath(path);
    denyPath(path, gateOk);
  }
  allowPath("D:/work/metro/src/../src/x.ts");
  allowPath("D:/work/metro/src/./x.ts");
});
test("METRO-38 gate messages echo only a project-relative path, and the Plane message a sanitized truncated action", () => {
  const gate = decide(file("Write", "D:\\work\\metro\\scripts\\guards.ts"), ctx());
  const settings = decide(file("Write", "C:\\Users\\o\\.claude\\settings.json"), ctx());
  const action = `de'lete"${"x".repeat(100)}\n<secret>`;
  const planeCall = decide(plane("workitem", action), ctx());
  for (const decision of [gate, settings, planeCall]) {
    expect(decision.allow).toBe(false);
    if (decision.allow) throw new Error("unreachable");
    expect(decision.reason).not.toContain("D:");
    expect(decision.reason).not.toContain("C:");
    expect(decision.reason).not.toContain("Users");
    expect(decision.reason).not.toContain("\n<secret>");
    expect(decision.reason).not.toContain("<");
  }
  if (!gate.allow) expect(gate.reason).toContain("scripts/guards.ts");
  if (!settings.allow) expect(settings.reason).toContain(".claude/settings.json");
  if (!planeCall.allow) {
    expect(planeCall.reason).toContain("de?lete?");
    expect(planeCall.reason).not.toContain("x".repeat(41));
  }
});

// entry point with real files
test("METRO-38 isEntryPoint compares the real path of argv1 with the module URL, absolute or relative", async () => {
  const dir = await mkdtemp(join(tmpdir(), "metro-entry-"));
  try {
    const script = join(dir, "agent-authorization.ts");
    await writeFile(script, "// entry");
    const url = pathToFileURL(realpathSync(script)).href;
    expect(isEntryPoint({ url, argv1: script })).toBe(true);
    expect(isEntryPoint({ url, argv1: relative(process.cwd(), script) })).toBe(true);
    expect(isEntryPoint({ url, argv1: join(dir, "other.ts") })).toBe(false);
    expect(isEntryPoint({ url })).toBe(false);
    expect(isEntryPoint({ main: true, url: "file:///nowhere.ts" })).toBe(true);
    expect(isEntryPoint({ main: false, url, argv1: join(dir, "missing.ts") })).toBe(false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// docs
test("METRO-38 the docs say who creates markers, give the one-line commands, and cover recovery and scope", async () => {
  const text = await readFile(repo("docs", "agents", "permissions.md"), "utf8");
  const lower = text.toLowerCase();
  for (const needle of [
    "! pwsh -noprofile -command",
    "owner's own words",
    "never create or extend a marker",
    "agent messages are never consent",
    "technically",
    "process, not by the hook",
    "recovery",
    "mise shim",
    "no shell",
    "unverified until",
    "/packages/contracts/",
    "/e2e/",
    "/docs/specifications/",
    "/apps/*/package.json",
    "gate-edit marker",
    "over-block",
  ])
    expect(lower).toContain(needle);
  for (const scope of ["plane-write", "gate-edit"]) {
    expect(text).toContain(`${scope}.json`);
    expect(text).toMatch(new RegExp(`! pwsh -NoProfile -Command '.*${scope}.*'`, "u"));
  }
  expect(text).toMatch(/Remove-Item -LiteralPath .*plane-write\.json/u);
  expect(text).toMatch(/Remove-Item -LiteralPath .*gate-edit\.json/u);
  expect(lower).not.toContain("tested on node 26");
});
test("METRO-38 the one-line owner commands in the docs produce a marker the hook accepts", async () => {
  const text = await readFile(repo("docs", "agents", "permissions.md"), "utf8");
  const body = /^! pwsh -NoProfile -Command '(.*plane-write.*)'$/mu.exec(text)?.[1];
  expect(body).toBeDefined();
  expect(body).not.toContain("'");
  const home = await mkdtemp(join(tmpdir(), "metro-owner-"));
  try {
    const run = Bun.spawnSync(["pwsh", "-NoProfile", "-Command", body ?? ""], {
      env: { ...process.env, HOME: home, USERPROFILE: home },
    });
    expect(run.stderr.toString()).toBe("");
    const raw = await readFile(
      join(home, ".claude", "metro-authorization", "plane-write.json"),
      "utf8",
    );
    expect(raw.codePointAt(0)).not.toBe(0xfe_ff);
    const created = new Date();
    expect(
      decide(plane("workitem", "create"), { ...ctx({ "plane-write": raw }), now: created }).allow,
    ).toBe(true);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
