import { expect, test } from "bun:test";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { cleanGitEnv } from "./git-env";
import { HOOK_INSTALL_COMMAND, hookWarning, missingHooks } from "./hooks-status";

// Empty global and system config keep a developer's own `hk install --global` from leaking in.
const nothing = process.platform === "win32" ? "NUL" : "/dev/null";
const env = () => ({
  ...cleanGitEnv(),
  HK_MISE: "0",
  GIT_CONFIG_GLOBAL: nothing,
  GIT_CONFIG_SYSTEM: nothing,
});

function git(cwd: string, ...args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd, env: env() });
  if (result.exitCode !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr.toString()}`);
}

async function withRepository(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "metro-hooks-status-"));
  try {
    git(root, "init", "-b", "main");
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("METRO-45 names the exact install command when no hook is configured", async () => {
  await withRepository(async (root) => {
    expect(missingHooks(root, env())).toEqual(["pre-commit", "commit-msg", "pre-push"]);
    const warning = hookWarning(root, env());
    expect(HOOK_INSTALL_COMMAND).toBe("mise exec -- hk install --mise");
    expect(warning).toContain(HOOK_INSTALL_COMMAND);
    expect(warning).toContain("pre-commit, commit-msg, pre-push");
  });
});

test("METRO-45 reports nothing after the documented hk install", async () => {
  await withRepository(async (root) => {
    await copyFile(resolve("hk.pkl"), join(root, "hk.pkl"));
    const install = Bun.spawnSync(["hk", "install"], { cwd: root, env: env() });
    expect(install.exitCode).toBe(0);
    expect(missingHooks(root, env())).toEqual([]);
    expect(hookWarning(root, env())).toBeUndefined();
  });
}, 60000);

test("METRO-45 reports only the hooks that are not configured", async () => {
  await withRepository(async (root) => {
    git(root, "config", "hook.hk-pre-commit.event", "pre-commit");
    git(root, "config", "hook.hk-pre-push.event", "pre-push");
    expect(missingHooks(root, env())).toEqual(["commit-msg"]);
  });
});

test("METRO-45 stays silent outside a Git checkout", async () => {
  const root = await mkdtemp(join(tmpdir(), "metro-hooks-nogit-"));
  try {
    expect(hookWarning(root, { ...env(), GIT_CEILING_DIRECTORIES: tmpdir() })).toBeUndefined();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
