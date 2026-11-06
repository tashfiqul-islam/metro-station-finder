import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { changedFilesMain, docsOnlyFor } from "./changed-files";
import { cleanGitEnv } from "./git-env";
import { gitChangedPaths } from "./reviewer-record";

const BASE = "a".repeat(40);
const HEAD = "b".repeat(40);
const pr = { EVENT_NAME: "pull_request", BASE_SHA: BASE, HEAD_SHA: HEAD };

function prEnv(base: string, head: string) {
  return { EVENT_NAME: "pull_request", BASE_SHA: base, HEAD_SHA: head };
}

function decide(paths: readonly string[], env: Record<string, string | undefined> = pr) {
  return docsOnlyFor(env, () => [...paths]);
}

test("METRO-62 markdown at the root and under docs/ is docs-only", () => {
  expect(decide(["README.md", "docs/agents/quality-gates.md", "docs/a/b/c.md"])).toBe(true);
});
test("METRO-62 any code, workflow, script, lockfile or config path makes the change not docs-only", () => {
  for (const path of [
    "apps/web/src/main.tsx",
    ".github/workflows/quality.yml",
    "scripts/ci-results.ts",
    "package.json",
    "bun.lock",
    "hk.pkl",
    "mise.toml",
    "e2e/smoke.spec.ts",
    ".claude/settings.json",
    ".github/CODEOWNERS",
    "docs/agents/skills.lock.json",
    "docs/diagram.png",
    "LICENSE",
  ])
    expect(decide(["README.md", path])).toBe(false);
});
test("METRO-62 package and app READMEs run everything", () => {
  expect(decide(["packages/core/README.md"])).toBe(false);
  expect(decide(["apps/web/docs/x.md"])).toBe(false);
});
test("METRO-62 markdown in a hidden or workflow directory is not docs-only", () => {
  expect(decide([".github/workflows/notes.md"])).toBe(false);
  expect(decide([".github/pull_request_template.md"])).toBe(false);
});
test("METRO-62 an empty diff is not docs-only", () => expect(decide([])).toBe(false));
test("METRO-62 a rename between docs and code lists both paths and is not docs-only", () => {
  expect(decide(["docs/old.md", "apps/web/src/new.ts"])).toBe(false);
  expect(decide(["apps/web/src/old.ts", "docs/new.md"])).toBe(false);
});
test("METRO-62 extension matching is case-sensitive, so FOO.MD runs everything", () => {
  expect(decide(["docs/FOO.MD"])).toBe(false);
  expect(decide(["docs/FOO.md"])).toBe(true);
});
test("METRO-62 traversal-like and odd names are not docs-only", () => {
  for (const path of [
    "docs/../scripts/x.md",
    "../README.md",
    "docs\\x.md",
    "docs/x.md.ts",
    "docs/",
  ])
    expect(decide([path])).toBe(false);
});
test("METRO-62 events other than pull_request are never docs-only", () => {
  for (const name of ["push", "workflow_dispatch", "merge_group", ""])
    expect(decide(["README.md"], { ...pr, EVENT_NAME: name })).toBe(false);
});
test("METRO-62 an unset event name is not docs-only", () =>
  expect(decide(["README.md"], { BASE_SHA: BASE, HEAD_SHA: HEAD })).toBe(false));
test("METRO-62 bad or missing commit ids fail safe", () => {
  expect(decide(["README.md"], { ...pr, BASE_SHA: "main" })).toBe(false);
  expect(decide(["README.md"], { EVENT_NAME: "pull_request" })).toBe(false);
});
test("METRO-62 a git failure fails safe", () => {
  expect(
    docsOnlyFor(pr, () => {
      throw new Error("git diff failed");
    }),
  ).toBe(false);
});
test("METRO-62 a huge change list is decided without error", () => {
  const docs = Array.from({ length: 20_000 }, (_, i) => `docs/f${i}.md`);
  expect(decide(docs)).toBe(true);
  expect(decide([...docs, "scripts/x.ts"])).toBe(false);
});

function run(paths: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "changed-files-"));
  try {
    const output = join(dir, "out");
    writeFileSync(output, "");
    const logs: string[] = [];
    changedFilesMain(
      { ...pr, GITHUB_OUTPUT: output },
      { changedPaths: () => paths, log: (m) => logs.push(m) },
    );
    return readFileSync(output, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
test("METRO-62 main appends docs_only to GITHUB_OUTPUT", () => {
  expect(run(["README.md"])).toBe("docs_only=true\n");
  expect(run(["README.md", "package.json"])).toBe("docs_only=false\n");
});
test("METRO-62 main prints the value when GITHUB_OUTPUT is unset and never throws", () => {
  const logs: string[] = [];
  changedFilesMain(pr, {
    changedPaths: () => {
      throw new Error("boom");
    },
    log: (m) => logs.push(m),
  });
  expect(logs.join("\n")).toContain("docs_only=false");
});

test("METRO-62 the default reader fails safe on commits that do not exist", () => {
  const spy = jest.spyOn(console, "log").mockImplementation(() => {});
  try {
    changedFilesMain(prEnv(BASE, HEAD));
    expect(spy).toHaveBeenCalledWith("docs_only=false");
  } finally {
    spy.mockRestore();
  }
});

// A disposable repository proves rename and range behaviour with the real git diff.
test("METRO-62 real git ranges: docs-only, mixed and rename", () => {
  const dir = mkdtempSync(join(tmpdir(), "changed-files-git-"));
  const git = (...args: string[]) => {
    const r = Bun.spawnSync(
      [
        "git",
        "-c",
        "user.name=t",
        "-c",
        "user.email=t@example.com",
        "-c",
        "commit.gpgsign=false",
        ...args,
      ],
      { cwd: dir, env: cleanGitEnv() },
    );
    if (r.exitCode !== 0) throw new Error(r.stderr.toString());
    return r.stdout.toString().trim();
  };
  try {
    git("init", "-q", "-b", "main");
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "README.md"), "a\n");
    writeFileSync(join(dir, "docs", "a.md"), "doc one\ndoc one\ndoc one\n");
    git("add", ".");
    git("commit", "-q", "-m", "base");
    const base = git("rev-parse", "HEAD");
    writeFileSync(join(dir, "README.md"), "b\n");
    git("commit", "-q", "-am", "docs");
    const docs = git("rev-parse", "HEAD");
    mkdirSync(join(dir, "src"));
    git("mv", "docs/a.md", "src/a.md");
    git("commit", "-q", "-m", "move");
    const moved = git("rev-parse", "HEAD");
    const list = (b: string, h: string) => gitChangedPaths(b, h, dir);
    expect(docsOnlyFor(prEnv(base, docs), list)).toBe(true);
    expect(new Set(list(base, moved))).toEqual(new Set(["README.md", "docs/a.md", "src/a.md"]));
    expect(docsOnlyFor(prEnv(base, moved), list)).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 30000);
