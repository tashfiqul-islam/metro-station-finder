# METRO-82: run the Bun test suite in parallel

Evidence for the change of `bun test` to `bun test --parallel=4` in the `check` chain. Labels: **Repo-verified** (run here, output quoted), **Hosted** (read from a GitHub Actions log), **Unverified** (not measured). Base: `origin/feature/metro-rebuild` at `a0e7ab8` (METRO-81 merged), later merged with `553dbff`. Machine: Windows 11, 20 logical cores, Bun 1.4.4. Hosted: `ubuntu-24.04`, Bun 1.4.4. All local times are wall seconds of one `mise exec -- bun test ...` run (a PowerShell stopwatch around the command), tests only, no other check. Raw logs were kept in the session scratchpad and are not committed.

## What changed

- `package.json`: the word `bun test` in `scripts.check` is now `bun test --parallel=4`. Nothing else in the manifest changed. `scripts/timed-check.ts` accepts it (its word pattern allows `-` and `=`), so the hosted per-command table shows the row `bun test --parallel=4`.
- Isolation stays on (`--parallel` implies `--isolate`; `--no-isolate` is not used and `scripts/coverage.test.ts` fails if the check script carries it). `bunfig.toml` is unchanged: `randomize = true`, no `seed`, per-file 0.9 line and function thresholds, `coverage/lcov.info`.
- `scripts/coverage.test.ts` reads the flags from `scripts.check` and runs its fixtures with them (see "Coverage gate").
- Seven subprocess tests that spawn git, oxfmt, dependency-cruiser, wrangler or Renovate and used Bun's 5 s default timeout now carry an explicit 30 s timeout, as their siblings already did (see "Flake log").
- `scripts/vitest-sync.test.ts` asserted the literal `bun test && bun run test:vitest`; it now matches `bun test(?: --\S+)* && bun run test:vitest` (same intent: Bun's run is followed by Vitest's).

## Worker count decision

Local, 20 cores, tests only (Repo-verified, wall seconds):

| Mode              | Runs (s)               | Mean |
| ----------------- | ---------------------- | ---- |
| serial            | 95.5, 95.0             | 95.3 |
| `--parallel=2`    | 62.5, 60.0, 52.6       | 58.4 |
| `--parallel=4`    | 35.0, 40.2, 37.7, 36.8 | 37.4 |
| `--parallel=6`    | 32.2, 30.1, 30.8       | 31.0 |
| `--parallel=8`    | 37.4, 33.0, 36.3, 32.2 | 34.7 |
| `--parallel` (20) | 31.3, 29.2, 27.8, 27.1 | 28.9 |

(The orchestrator's earlier single runs were 91.7 s serial, 35.8 s at 4 and 31.4 s at 8, consistent with these.)

Hosted (Hosted, run 42178087779 on PR #83 at `8c71a17`, one temporary probe step, since removed; `nproc` printed `4`):

| Mode           | Wall s | Result    |
| -------------- | ------ | --------- |
| serial         | 80     | 1012 pass |
| `--parallel=2` | 62     | 1012 pass |
| `--parallel=4` | 62     | 1012 pass |
| `--parallel=8` | 61     | 1012 pass |
| `--parallel`   | 64     | 1012 pass |
| `--parallel=4` | 63     | 1012 pass |

The same run's per-command table (METRO-81) shows `bun test --parallel=4` at 1 m 3.8 s and a chain total of 1 m 16.2 s. The previous push run on the base (run 42174535176, `a0e7ab8`) shows `bun test` at 1 m 38.7 s and a chain total of 1 m 55.4 s.

Reading: on the 4-vCPU hosted runner the count between 2 and 8 does not matter (61 to 64 s), so the hosted gain is about 20 s against the probe's serial run and about 35 s against the serial run inside the chain, much less than the local 2.5x. Locally more workers help (20 workers 28.9 s against 37.4 s at 4). Decision: a fixed `--parallel=4`.

- It equals the hosted core count, so the hosted run does the same thing a plain `--parallel` would (the default is the CPU core count, `bun test --help`), and local, pre-push and CI use one identical command and one concurrency level.
- A fixed number does not grow with the machine: a 64-core machine would otherwise start 64 workers, each spawning tsc, oxlint or git subprocesses.
- Cost: about 8 s per local run against the default on this 20-core machine. Anyone who wants the speed can run `bun test --parallel` by hand; the check chain stays at 4.
- The stress side was covered separately: 20 workers ran the suite 10 times without a failure after the fixes below (see the flake log), so a higher count is not unsafe, it is only not needed.

Unverified: hosted numbers are one probe run (one sample per mode) and one before/after pair of chain runs, not medians. Hosted run-to-run noise was not measured.

## Coverage gate under `--parallel`

Repo-verified (this session):

- File set: `coverage/lcov.info` from a serial run and from a 20-worker run both list 41 `SF:` entries, the identical set. Per file, `LF`, `LH`, `FNF`, `FNH` and the set of lines with a nonzero `DA` hit count are equal for all 41 files (script compared them; 0 differences), and the totals are `LF 3215`, `LH 3154` in both. Raw `DA` hit counts also agree where a file's code runs a fixed number of times (for example `scripts/git-env.ts` line 7, 435 hits in both), so the report sums the workers; it is not "last worker wins". Only loop-driven counts differ by a few hundred (for example 39066 against 39934 on one line), which varies run to run.
- After merging `553dbff` a 4-worker run lists 42 files: the 41 plus `scripts/timed-check.ts` from METRO-81; the other 41 are identical to the serial report. `node scripts/coverage-scope.ts` prints `Coverage scope ok: every product source file is measured or exempt`.
- Red fixtures, run with the exact flags read from `scripts.check`:
  - `METRO-82 under the check flags the lcov report holds every file from every worker` (two test files, two sources): exit 0 and `SF:a.ts`, `SF:b.ts` both present.
  - `METRO-82 under the check flags an uncovered function in one worker's file still fails the gate`: `b.ts` has an uncalled function; exit code is not 0, the output names `b.ts`, and its record reads `LF:6`, `LH:1`.
  - `METRO-82 the check script runs bun test in parallel with isolation kept`: this one was red first. Before the `package.json` edit, `bun test scripts/coverage.test.ts` gave `5 pass, 1 fail` with `Expected: true, Received: false` at the `--parallel` assertion; after the edit all pass.
  - The existing serial fixtures (`FND-T1`, `METRO-50`) are unchanged and still pass.

Note: the first two new fixtures pass on the old serial command too (Bun's gate was already correct); they exist so a future change to the flags, such as adding `--no-isolate` or a runner that does not merge coverage, cannot weaken the gate without failing here.

## Flake log: ten consecutive runs, and what was fixed

Each run is a full `bun test` with the stated flags, wall seconds, exit code, pass and fail counts. Sources are static checks plus the runs.

Static audit of the test files that spawn processes or touch the filesystem (Repo-verified, `rg` for `.local`, `tmpdir()`, `chdir`, `process.env` assignments, `listen(` and `port:` in `scripts/*.test.ts`): every fixture directory comes from `mkdtemp` (under `os.tmpdir()` or under `.local/` with a random suffix, for example `gates-`, `format-`, `secrets-index-`, `order-`, `types-`, `tsc-build-`), none uses a fixed scratch path, fixed port, `process.chdir` or a process-wide env assignment, and fixture git processes use `cleanGitEnv()`. `scripts/tsc-build.test.ts` already removes its copy with a bounded EBUSY-only retry (METRO-42) and uses a unique `mkdtemp` per test, so concurrent copies do not share a path; no EBUSY occurred in any run below. Under isolation each file has its own module registry and globals, so `process.exitCode` or spies in one file cannot leak into another worker.

Runs on the first version (before the timeouts), 20 workers (`--parallel`):

| Run    | Wall s       | Exit | Result                                                                                                                |
| ------ | ------------ | ---- | --------------------------------------------------------------------------------------------------------------------- |
| 1 - 10 | 27.9 to 34.2 | 1    | 1011 pass, 1 fail every time: `METRO-77 check runs Vitest ...` expected the literal `bun test && bun run test:vitest` |

That failure was deterministic, not a flake: my own `package.json` edit made the old assertion stale; fixed in `vitest-sync.test.ts` (see above).

20 workers, after that fix (10 runs): runs 1 to 4 and 6 to 10 passed (1012 pass, 0 fail; 29.7 to 34.7 s); run 5 failed once (1011 pass, 1 fail, 33.6 s): `METRO-62 real git ranges: docs-only, mixed and rename [5069.37ms]` with `killed 1 dangling process`. That test takes 0.42 s alone (junit report of the file). It runs about seven synchronous `git` processes, and under 20-way load one run stalled past Bun's 5 s default test timeout. It is a timeout budget problem, not shared state (it uses its own `mkdtemp` and `cleanGitEnv()`). Root cause fix: an explicit 30 s timeout like the neighbouring subprocess tests (not a retry, no assertion changed).

To find the other tests with the same exposure, one run with `--parallel --timeout=1000` (a default budget of 1 s for tests without their own timeout) failed exactly seven: `METRO-36 a rename from code to docs ...` (reviewer-record), `METRO-62 real git ranges ...` (changed-files), `FND-T1 validateRange and commitMessageMain ...` (cli), `formatter jsonc ...` (format; the `json` and `toml` variants did not trip), `FND-R5 the committed Worker binding types are up to date` (binding-types), `FND-R6 contracts importing hono is rejected` (layering) and `FND-S2 the real Renovate configuration passes the pinned strict validator` (configuration). All seven got the explicit 30 s timeout (the `react` and `json`/`toml` siblings share the same loop body, so the loop tests carry it too). A 2.5 s probe (`--timeout=2500`) had shown only the Renovate test above 2.5 s at 20 workers.

After the fixes, 20 workers (`--parallel`), 10 consecutive runs, all exit 0, 1012 pass, 0 fail: 27.6, 31.6, 30.9, 28.8, 29.0, 30.9, 28.4, 28.4, 30.6, 30.1 s.

Final command (`--parallel=4`, after merging `553dbff`; 1013 tests), 10 consecutive runs, all exit 0, 1013 pass, 0 fail: 31.8, 35.3, 34.9, 33.5, 30.6, 35.4, 35.6, 36.3, 40.1, 36.4 s (mean 35.0).

No test needed a serial lane; none is proposed. Unverified: Linux-specific collisions beyond the one hosted run (1012 pass at 2, 4, 8, 4 and default workers, all green, one sample each).

## Seed reproduction in parallel mode

Experiment (Repo-verified; a throwaway project with eight files of six tests each, `randomize = true`, each test appends `file:test` to a log; seed 12345):

- Within a file, the test order depends only on the seed: identical for two serial runs, three `--parallel=4` runs, one `--parallel=2` run and the serial run (all eight files matched). Seed 999 gave a different order.
- The order in which files start is not the same in serial and parallel mode and changes with the worker count (serial `f4,f8,f3,f7,f6,f1,f2,f5`; four workers `f4,f8,f7,f1,f5,f3,f6,f2` three times in a row; two workers `f4,f8,f3,f7,f2,f5,f1,f6`). The full interleaving of tests across files matched across the three four-worker runs, but that was a small, fast fixture and is not a guarantee.

So `bun test --seed N` still reproduces in-file order, and file order is the part that shifts with the worker count. To reproduce a CI failure, use the same command as the check, `bun test --parallel=4 --seed N`, taken from the `--seed=N` line of the log; with isolation each file has its own globals, so what can still differ is cross-file coupling through the filesystem or processes, and a narrowed single-file run is still not guaranteed to reproduce.

## `--timings` and `--update-timings`

Repo-verified: `bun test --parallel=4 --timings <file> --update-timings` wrote a 3 KB JSON of per-file milliseconds (the slowest: `scripts/tsc-build.test.ts` 25526, `scripts/layering.test.ts` 19033, `scripts/gates.test.ts` 9444). Four alternating pairs of runs, `--parallel=4` with that file against `--parallel=4` without: with timings 30.8, 33.7, 37.0, 33.8 s (mean 33.8); without 31.9, 33.4, 37.6, 32.2 s (mean 33.8). No measurable gain, and the file holds machine-specific durations that change with every update, so it would be a file that changes on every run. Not adopted; nothing was committed. Revisit with `--shard` only if the suite is split across jobs.

## Hosted result

Recorded in the pull request after the final push (see the PR description); not repeated here so this file holds only numbers that are already read. Earlier hosted `Checks` jobs for comparison: 2 m 59 s (PR #78, METRO-77) and 2 m 44 s (PR #80), both from [METRO-81](metro-81.md), and 2 m 8 s as given in the ticket (source not re-read here); the push run 42174535176 on the base took 2 m 13 s (06:27:26 to 06:29:39 UTC, from the job start and end times), with `bun test` at 1 m 38.7 s of its 1 m 55.4 s chain.
