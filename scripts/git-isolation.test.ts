import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { cleanGitEnv } from "./git-env";

test("cleanGitEnv removes every GIT_* variable and keeps the rest", () => {
  const cleaned = cleanGitEnv({
    GIT_DIR: "/real/.git",
    GIT_WORK_TREE: "/real",
    GIT_INDEX_FILE: "/real/.git/index",
    git_prefix: "lowercase",
    PATH: "/bin",
    UNSET: undefined,
  });
  expect(cleaned).toEqual({ PATH: "/bin" });
});

// Git exports GIT_DIR to hooks run from linked worktrees. Fixture suites invoked by a hook
// must not write commits or config into that repository.
test("fixture suites never touch a repository named by an inherited GIT_DIR", async () => {
  const decoy = await mkdtemp(join(tmpdir(), "metro-decoy-"));
  const git = (...args: string[]) =>
    Bun.spawnSync(["git", "-C", decoy, ...args], { env: cleanGitEnv() });
  try {
    expect(Bun.spawnSync(["git", "init", decoy], { env: cleanGitEnv() }).exitCode).toBe(0);
    const config = git("config", "--local", "--list").stdout.toString();
    const result = Bun.spawnSync(["bun", "test", "scripts/hooks.test.ts"], {
      env: { ...process.env, GIT_DIR: join(decoy, ".git"), GIT_WORK_TREE: decoy },
    });
    expect(result.stdout.toString() + result.stderr.toString()).toContain(" 0 fail");
    expect(result.exitCode).toBe(0);
    expect(git("rev-list", "--all", "--count").stdout.toString().trim()).toBe("0");
    expect(git("config", "--local", "--list").stdout.toString()).toBe(config);
  } finally {
    await rm(decoy, { recursive: true, force: true });
  }
}, 180000);
