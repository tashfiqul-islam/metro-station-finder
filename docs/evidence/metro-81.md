# METRO-81: per-command timing for the Checks job

Labels: **Repo-verified** (run here), **Unverified** (not measured). Base: `origin/feature/metro-rebuild` at `e16b8da`.

## Why

After METRO-77 the hosted `Checks` job grew (baseline median 1 m 50 s in [CI timings](ci-timings-2026-11.md); hosted runs of 2 m 56 s to 2 m 59 s and 2 m 07 s since), and the step log shows only the whole `bun run check` step, so the growth could not be located.

## What was built

- `scripts/timed-check.ts` (Node, dependency-free) reads `scripts.check` from `package.json`, splits it on `&&`, runs each command in order and prints a markdown table (command, duration, result, total) at the end, also on failure. Fail-fast matches `&&`: the first non-zero exit stops the chain and is the exit code (1 for a signal, 127 when a command cannot start). Commands after a failure are listed as `not run`.
- Commands are spawned directly (`spawnSync`, argument array, `stdio: inherit`, no shell). Only plain words and `&&` are accepted; `||`, `;`, pipes, redirects, quotes, `$`, backticks, globs, `NAME=value`, backslashes, comments, a lone `&` and empty segments are refused before anything runs (exit code 2). Reason: a shell would interpret the words and could differ from `bun run`'s own shell; direct spawning cannot mis-split what the splitter accepts. Limit: a command that is itself a chain (`bun run check:fast`) is one row, so its inner steps are not timed separately.
- With `GITHUB_STEP_SUMMARY` set the table is appended there as markdown; a write failure only warns.
- `package.json` `check:timed` runs the wrapper; the `Checks` job step `Run all checks with per-command timing` runs `bun run check:timed`. Local `bun run check`, `hk.pkl` and `mise.toml` are unchanged. No action or pin changed.
- `scripts/timed-check.test.ts` (written first, red: module missing) covers splitting, rejection, fail-fast and exit-code propagation (fake runner and real processes), the table on failure, summary output, and a drift test that the wrapper runs exactly the commands of `package.json` `check`.

## Not done yet

The 5-run or larger median and the per-command breakdown need hosted runs on this change. They are a follow-up; no hosted number is stated here. The first hosted table is in the pull request.
