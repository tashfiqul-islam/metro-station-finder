/**
 * Environment for processes that must act on an explicit repository.
 * Git exports GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE and similar variables to hooks
 * (notably from linked worktrees); inherited, they redirect `git init/config/commit`
 * in disposable fixtures into the caller's real repository.
 */
export function cleanGitEnv(
  base: Readonly<Record<string, string | undefined>> = process.env,
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && !key.toUpperCase().startsWith("GIT_")) env[key] = value;
  }
  return env;
}
