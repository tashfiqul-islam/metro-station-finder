import { cleanGitEnv } from "./git-env";

/** The documented per-checkout hook install (docs/agents/maintenance.md). */
export const HOOK_INSTALL_COMMAND = "mise exec -- hk install --mise";

/** Hooks declared in hk.pkl; hk 2.11 on Git 2.54+ registers each as `hook.hk-<name>.event`. */
const REQUIRED_HOOKS = ["pre-commit", "commit-msg", "pre-push"] as const;

/**
 * Hooks that Git does not have configured for this checkout, or `[]` when all are present.
 * Reads the merged Git config, so a per-repo or a global (`hk install --global`) install both count.
 * Returns `[]` outside a Git checkout (a source tarball): there is nothing to install hooks into.
 */
export function missingHooks(
  cwd: string,
  env: Record<string, string> = cleanGitEnv(),
): readonly string[] {
  if (Bun.spawnSync(["git", "rev-parse", "--git-dir"], { cwd, env }).exitCode !== 0) return [];
  // Exit 1 means no matching key; anything else is a real failure.
  const result = Bun.spawnSync(
    ["git", "config", "--get-regexp", String.raw`^hook\.hk-.*\.event$`],
    {
      cwd,
      env,
    },
  );
  if (result.exitCode !== 0 && result.exitCode !== 1)
    throw new Error(`git config failed: ${result.stderr.toString()}`);
  const configured = new Set(
    result.stdout
      .toString()
      .split(/\r?\n/u)
      .map((line) => /^hook\.hk-(.+)\.event (.+)$/u.exec(line))
      .filter((match) => match !== null && match[1] === match[2])
      .map((match) => match?.[1]),
  );
  return REQUIRED_HOOKS.filter((hook) => !configured.has(hook));
}

/** A visible, actionable warning, or `undefined` when every required hook is configured. */
export function hookWarning(
  cwd: string,
  env: Record<string, string> = cleanGitEnv(),
): string | undefined {
  const missing = missingHooks(cwd, env);
  if (missing.length === 0) return undefined;
  return `Git hooks not installed (missing: ${missing.join(", ")}). Commits and pushes skip the local gates; only CI will catch failures. Run: ${HOOK_INSTALL_COMMAND} (needs Git 2.54+; repeat per clone).`;
}
