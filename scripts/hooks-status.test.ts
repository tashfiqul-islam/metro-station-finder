import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { cleanGitEnv } from "./git-env";
import { HOOK_INSTALL_COMMAND, REQUIRED_HOOKS, hookStatus, hookWarning } from "./hooks-status";

// Empty global and system config keep a developer's own `hk install --global` from leaking in; CI is
// cleared so the suite behaves the same on a developer machine and on the runner.
const nothing = process.platform === "win32" ? "NUL" : "/dev/null";
const env = (extra: Record<string, string> = {}) => ({
  ...cleanGitEnv(),
  CI: "",
  HK_MISE: "0",
  GIT_CONFIG_GLOBAL: nothing,
  GIT_CONFIG_SYSTEM: nothing,
  ...extra,
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

function configureAllHooks(root: string) {
  for (const hook of REQUIRED_HOOKS) git(root, "config", `hook.hk-${hook}.event`, hook);
}

/** Why the real `hk install --mise` test cannot run here, or undefined when it can. */
function realInstallSkipReason(): string | undefined {
  if (Bun.which("hk") === null) return "hk is not on PATH (run under `mise exec --`)";
  const version = /git version (\d+)\.(\d+)/u.exec(
    Bun.spawnSync(["git", "--version"]).stdout.toString(),
  );
  const [major, minor] = [Number(version?.[1]), Number(version?.[2])];
  if (!(major > 2 || (major === 2 && minor >= 54)))
    return `Git ${String(version?.[0])} is older than 2.54, which hk needs for config-based hooks`;
  return undefined;
}
const skipReason = realInstallSkipReason();
if (skipReason !== undefined) console.warn(`SKIPPED real hk install test: ${skipReason}`);

test("METRO-45 REQUIRED_HOOKS equals the hooks defined in hk.pkl", async () => {
  const pkl = await readFile(resolve("hk.pkl"), "utf8");
  const hooks = /^hooks \{\r?\n([\s\S]*?)^\}/mu.exec(pkl)?.[1] ?? "";
  const defined = [...hooks.matchAll(/^ {2}\["([a-z-]+)"\] \{/gmu)].map((match) => match[1]);
  expect(new Set(defined)).toEqual(new Set(REQUIRED_HOOKS));
  expect(defined.length).toBeGreaterThan(0);
});

test("METRO-45 names the exact install command when no hook is configured", async () => {
  await withRepository(async (root) => {
    expect(hookStatus(root, env())).toEqual({
      state: "missing",
      hooks: ["pre-commit", "commit-msg", "pre-push"],
    });
    const warning = hookWarning(root, env());
    expect(HOOK_INSTALL_COMMAND).toBe("mise exec -- hk install --mise");
    expect(warning).toContain(`Run: ${HOOK_INSTALL_COMMAND}`);
    expect(warning).toContain("pre-commit, commit-msg, pre-push");
  });
});

// A named function, so the jest rules see its assertions as part of a test: they do not follow the curried
// `test.skipIf(...)(...)` form and would call the assertions standalone.
async function realInstallReportsNothing(): Promise<void> {
  await withRepository(async (root) => {
    await copyFile(resolve("hk.pkl"), join(root, "hk.pkl"));
    const install = Bun.spawnSync(["hk", "install", "--mise"], { cwd: root, env: env() });
    expect(install.stderr.toString() + install.stdout.toString()).not.toContain("PANIC");
    expect(install.exitCode).toBe(0);
    expect(hookStatus(root, env())).toEqual({ state: "ok" });
    expect(hookWarning(root, env())).toBeUndefined();
  });
}

test.skipIf(skipReason !== undefined)(
  "METRO-45 reports nothing after the documented hk install --mise",
  realInstallReportsNothing,
  60000,
);

test("METRO-45 reports only the hooks that are not configured", async () => {
  await withRepository(async (root) => {
    git(root, "config", "hook.hk-pre-commit.event", "pre-commit");
    git(root, "config", "hook.hk-pre-push.event", "pre-push");
    expect(hookStatus(root, env())).toEqual({ state: "missing", hooks: ["commit-msg"] });
  });
});

test("METRO-45 ignores a hook whose event does not match its name", async () => {
  await withRepository(async (root) => {
    configureAllHooks(root);
    git(root, "config", "hook.hk-pre-push.event", "post-commit");
    expect(hookStatus(root, env())).toEqual({ state: "missing", hooks: ["pre-push"] });
  });
});

test("METRO-45 stays silent when CI=true and outside a Git checkout", async () => {
  await withRepository(async (root) => {
    expect(hookWarning(root, env({ CI: "true" }))).toBeUndefined();
  });
  const root = await mkdtemp(join(tmpdir(), "metro-hooks-nogit-"));
  try {
    const outside = env({ GIT_CEILING_DIRECTORIES: tmpdir() });
    expect(hookStatus(root, outside)).toEqual({ state: "no-repository" });
    expect(hookWarning(root, outside)).toBeUndefined();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("METRO-45 says it could not determine the state when git cannot run", async () => {
  await withRepository(async (root) => {
    // Bun resolves the binary from its own PATH, not the env option, so name a binary that does not exist.
    const missingGit = resolve(root, "no-such-git");
    const status = hookStatus(root, env(), missingGit);
    expect(status.state).toBe("unknown");
    const warning = hookWarning(root, env(), missingGit);
    expect(warning).toContain("Could not determine");
    expect(warning).toContain(HOOK_INSTALL_COMMAND);
  });
});

// Real Git exits 128 for every config failure it can reach here (and `rev-parse` fails the same way first), so
// the "neither 0 nor 1" branch needs a stand-in git. Bun refuses to pass the `^hook...$` pattern to a .cmd file
// on Windows, so this runs on POSIX only (CI is Ubuntu); a named function keeps the jest rules working.
async function configFailureIsUnknown(): Promise<void> {
  await withRepository(async (root) => {
    // `rev-parse` succeeds, every other command fails with exit code 2 (neither 0 nor 1).
    const fakeGit = join(root, "fake-git");
    await writeFile(
      fakeGit,
      '#!/bin/sh\nif [ "$1" = "rev-parse" ]; then echo .git; exit 0; fi\necho config exploded >&2\nexit 2\n',
      { mode: 0o755 },
    );
    expect(hookStatus(root, env(), fakeGit)).toEqual({
      state: "unknown",
      reason: "config exploded",
    });
  });
}

test.skipIf(process.platform === "win32")(
  "METRO-92 reports unknown with Git's message when reading the hook config exits with a real failure",
  configFailureIsUnknown,
);

async function bootstrapOutput(cwd: string, extra: Record<string, string>) {
  const result = Bun.spawnSync([process.execPath, resolve("scripts/tools.ts")], {
    cwd,
    env: { ...env(extra), PATH: process.env["PATH"] ?? "" },
  });
  return {
    exitCode: result.exitCode,
    output: result.stdout.toString() + result.stderr.toString(),
  };
}

test("METRO-45 bootstrap warns with the exact install command, once hooks exist it is silent", async () => {
  await withRepository(async (root) => {
    const warned = await bootstrapOutput(root, {});
    expect(warned.exitCode).toBe(0);
    expect(warned.output).toContain("Tools: Bun");
    expect(warned.output).toContain(`WARNING: Git hooks not installed`);
    expect(warned.output).toContain(`Run: ${HOOK_INSTALL_COMMAND}`);

    configureAllHooks(root);
    const quiet = await bootstrapOutput(root, {});
    expect(quiet.exitCode).toBe(0);
    expect(quiet.output).not.toContain("WARNING");
  });
}, 60000);

test("METRO-45 bootstrap is silent under CI=true and outside a Git checkout", async () => {
  await withRepository(async (root) => {
    const ci = await bootstrapOutput(root, { CI: "true" });
    expect(ci.exitCode).toBe(0);
    expect(ci.output).not.toContain("WARNING");
  });
  const plain = await mkdtemp(join(tmpdir(), "metro-bootstrap-nogit-"));
  try {
    const outside = await bootstrapOutput(plain, { GIT_CEILING_DIRECTORIES: tmpdir() });
    expect(outside.exitCode).toBe(0);
    expect(outside.output).not.toContain("WARNING");
  } finally {
    await rm(plain, { recursive: true, force: true });
  }
}, 60000);
