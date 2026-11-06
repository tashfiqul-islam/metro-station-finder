import { cleanGitEnv } from "./git-env";

/** The documented per-checkout hook install (docs/agents/maintenance.md). */
export const HOOK_INSTALL_COMMAND = "mise exec -- hk install --mise";

/** Hooks declared in hk.pkl (a test ties the two); hk 2.11 on Git 2.54+ registers each as `hook.hk-<name>.event`. */
export const REQUIRED_HOOKS = ["pre-commit", "commit-msg", "pre-push"] as const;

export type HookStatus =
  | { state: "ok" }
  | { state: "no-repository" }
  | { state: "missing"; hooks: readonly string[] }
  | { state: "unknown"; reason: string };

export type GitResult = { exitCode: number; stdout: string; stderr: string };

/** Runs git without ever throwing: a missing git binary is reported as exit code -1. */
function git(
  args: string[],
  cwd: string,
  env: Record<string, string>,
  gitBinary: string,
): GitResult {
  try {
    const result = Bun.spawnSync([gitBinary, ...args], { cwd, env });
    return {
      exitCode: result.exitCode ?? -1,
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
    };
  } catch (error) {
    return { exitCode: -1, stdout: "", stderr: String(error) };
  }
}

/**
 * Whether Git has the hk hooks configured for this checkout. Reads the merged Git config, so a per-repo
 * or a global (`hk install --global`) install both count. Never throws: when Git cannot answer the result
 * is `unknown`, which callers must surface rather than treat as installed.
 */
export function hookStatus(
  cwd: string,
  env: Record<string, string> = cleanGitEnv(),
  gitBinary = "git",
): HookStatus {
  return statusFromGit(git(["rev-parse", "--git-dir"], cwd, env, gitBinary), () =>
    git(["config", "--get-regexp", String.raw`^hook\.hk-.*\.event$`], cwd, env, gitBinary),
  );
}

/**
 * The decision over Git's answers. `readConfig` is called only when `rev-parse` found a repository, so the
 * second Git process is never started for a result that is already decided.
 */
export function statusFromGit(inside: GitResult, readConfig: () => GitResult): HookStatus {
  if (inside.exitCode === -1) return { state: "unknown", reason: inside.stderr.trim() };
  // 128 is Git's "not a git repository" (a source tarball): nothing to install hooks into.
  if (inside.exitCode === 128) return { state: "no-repository" };
  if (inside.exitCode !== 0) return { state: "unknown", reason: inside.stderr.trim() };
  // Exit 1 means no matching key; anything else is a real failure.
  const result = readConfig();
  if (result.exitCode !== 0 && result.exitCode !== 1)
    return { state: "unknown", reason: result.stderr.trim() };
  const configured = new Set<string>();
  for (const line of result.stdout.split(/\r?\n/u)) {
    const match = /^hook\.hk-(.+)\.event (.+)$/u.exec(line);
    if (match?.[1] !== undefined && match[1] === match[2]) configured.add(match[1]);
  }
  const hooks = REQUIRED_HOOKS.filter((hook) => !configured.has(hook));
  return hooks.length === 0 ? { state: "ok" } : { state: "missing", hooks };
}

/**
 * A visible, actionable warning, or `undefined` when nothing needs saying: every hook is configured, this
 * is not a Git checkout, or `CI=true` (CI checkouts never install hooks and CI is the backstop).
 */
export function hookWarning(
  cwd: string,
  env: Record<string, string> = cleanGitEnv(),
  gitBinary = "git",
): string | undefined {
  if (env["CI"] === "true") return undefined;
  const status = hookStatus(cwd, env, gitBinary);
  if (status.state === "missing")
    return `Git hooks not installed (missing: ${status.hooks.join(", ")}). Commits and pushes skip the local gates; only CI will catch failures. Run: ${HOOK_INSTALL_COMMAND} (needs Git 2.54+; repeat per clone).`;
  if (status.state === "unknown")
    return `Could not determine whether Git hooks are installed (${status.reason || "git failed"}). If they are not, run: ${HOOK_INSTALL_COMMAND}`;
  return undefined;
}
