import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  type Context,
  type HookIo,
  MAX_TTL_MS,
  PLANE_ACTIONS,
  classifyPlaneCall,
  decide,
  defaultIo,
  hookOutcome,
  matchesCodeowners,
  parseCodeowners,
  runHook,
} from "./agent-authorization";
import { isRecord } from "./guards";

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
const planeOk = { "plane-write": marker("plane-write") };
const gateOk = { "gate-edit": marker("gate-edit") };

// ---------- classification table (the table in docs/agents/permissions.md is tested against this) ----------

test("METRO-38 every documented read action classifies as read and every mutating one as mutating", () => {
  for (const [tool, { read, mutating }] of Object.entries(PLANE_ACTIONS)) {
    for (const action of read) expect(classifyPlaneCall(tool, action)).toBe("read");
    for (const action of mutating) expect(classifyPlaneCall(tool, action)).toBe("mutating");
  }
});
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
test("METRO-38 an unknown tool with a read-shaped action is read", () =>
  expect(classifyPlaneCall("brand_new_tool", "list_things")).toBe("read"));
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
  for (const tool_name of [
    "mcp__plane__workitem",
    "mcp__claude_ai_plane__workitem",
    "mcp__PLANE__workitem",
  ])
    expect(
      decide({ tool_name, tool_input: { action: "delete" }, hook_event_name: "PreToolUse" }, ctx())
        .allow,
    ).toBe(false);
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
  const patterns = parseCodeowners(await readFile(resolve(".github", "CODEOWNERS"), "utf8"));
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
test("METRO-38 the project directory falls back to the payload cwd, and fails closed without either", () => {
  const input = { ...file("Write", `${PROJECT}/scripts/a.ts`), cwd: PROJECT };
  const noEnv: HookIo = { ...io(), env: {} };
  expect(runHook(json(input), noEnv).exitCode).toBe(2);
  expect(runHook(json({ ...input, cwd: undefined }), noEnv).exitCode).toBe(2);
  expect(runHook(json({ ...file("Write", "D:/x/a.ts"), cwd: undefined }), noEnv).exitCode).toBe(2);
  expect(runHook(json(plane("workitem", "list")), noEnv).exitCode).toBe(0);
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
  return parseJson(await readFile(resolve(".claude", "settings.json"), "utf8"));
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
  expect(planeMatcher.test("mcp__plane__workitem")).toBe(true);
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
  const root = process.cwd();
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
  const text = await readFile(resolve("docs", "agents", "permissions.md"), "utf8");
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
  const text = await readFile(resolve("docs", "agents", "permissions.md"), "utf8");
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
