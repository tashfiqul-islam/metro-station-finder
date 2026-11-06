# METRO-82: run the Bun test suite in parallel

Evidence for changing `bun test` to `bun test --parallel=4` in the `check` chain. Labels: **Repo-verified** (run in a checkout, output quoted), **Hosted** (read from a GitHub Actions log, run id given), **Unverified** (not measured).

Base: `origin/feature/metro-rebuild` at `a0e7ab8` (METRO-81 merged); the branch was later merged with `553dbff`, `7033449` and the tip that followed. Local machine: Windows 11, 20 logical cores, Bun 1.4.4. Hosted: `ubuntu-24.04`, Bun 1.4.4, `nproc` printed 4.

Source of the local numbers: session measurements, not reproducible from the repository. Each local time is the wall seconds of one `mise exec -- bun test <flags>` run (a PowerShell stopwatch around the command; tests only, no other check). Raw logs were kept in the session scratchpad and are not committed. The lcov comparison (below) was a throwaway script that parsed `SF`, `LF`, `LH`, `FNF`, `FNH` and `DA` records of two `coverage/lcov.info` files; it is not committed either. The coverage-merge claim is also covered by committed tests (see "Coverage gate").

## What changed

- `package.json`: the word `bun test` in `scripts.check` is now `bun test --parallel=4`. Nothing else in the manifest changed. `scripts/timed-check.ts` accepts it (its word pattern allows `-` and `=`).
- Isolation stays on (`--parallel` implies `--isolate`). `scripts/coverage.test.ts` fails unless the check script carries exactly one `--parallel=4` and no isolation-dropping flag (`--no-isolate`, `--isolate=false`, ...). `bunfig.toml`: `randomize = true`, no `seed`, per-file 0.9 line and function thresholds; only a comment about reproduction changed.
- `scripts/coverage.test.ts` reads the flags from `scripts.check` and runs its fixtures with them (see "Coverage gate").
- Seven test sites that spawn git, oxfmt, dependency-cruiser, wrangler or Renovate and used Bun's 5 s default timeout now carry an explicit 30 s timeout (see "Timeouts").
- `scripts/vitest-sync.test.ts` asserted the literal `bun test && bun run test:vitest`; it now matches `(?:^| && )bun test(?: --\S+)* && bun run test:vitest(?: && |$)`.
- The branch history contains a temporary CI probe commit (a workflow step that printed `nproc` and timed `bun test` variants) and the commit that removes it. The net diff of `.github/workflows/quality.yml` against the base is empty.

## Worker count decision

Local, 20 cores, tests only (Repo-verified in the session, wall seconds):

| Mode              | Runs (s)               | Mean |
| ----------------- | ---------------------- | ---- |
| serial            | 95.5, 95.0             | 95.3 |
| `--parallel=2`    | 62.5, 60.0, 52.6       | 58.4 |
| `--parallel=4`    | 35.0, 40.2, 37.7, 36.8 | 37.4 |
| `--parallel=6`    | 32.2, 30.1, 30.8       | 31.0 |
| `--parallel=8`    | 37.4, 33.0, 36.3, 32.2 | 34.7 |
| `--parallel` (20) | 31.3, 29.2, 27.8, 27.1 | 28.9 |

The local gain is about 2.5x at 4 workers (95.3 s to 37.4 s) and about 3.3x at 20.

Hosted (run 42178087779, PR #83 at `8c71a17`; one temporary probe step, since removed; `nproc` printed `4`). The probe ran the variants in a fixed order in one job, once each, serial first, so cache effects and order effects are possible and the probe order was not randomized:

| Order | Mode           | Wall s | Result    |
| ----- | -------------- | ------ | --------- |
| 1     | serial         | 80     | 1012 pass |
| 2     | `--parallel=2` | 62     | 1012 pass |
| 3     | `--parallel=4` | 62     | 1012 pass |
| 4     | `--parallel=8` | 61     | 1012 pass |
| 5     | `--parallel`   | 64     | 1012 pass |
| 6     | `--parallel=4` | 63     | 1012 pass |

The same run's per-command table (METRO-81) shows `bun test --parallel=4` at 1 m 3.8 s, but that chain ran after the six probe runs, so caches were warm.

Reading. Hosted, the four parallel modes came out at 61 to 64 s against 80 s for the serial run that went first. That is a single sample per mode on one job, and the probe step no longer exists to repeat it, so it does not show that the worker count never matters on the hosted runner, only that no difference showed in that sample. Hosted run-to-run noise was not measured by the probe; the identical-commit re-run below varies by about 20 s. Locally more workers help (20 workers 28.9 s against 37.4 s at 4).

Decision: a fixed `--parallel=4`.

- It equals the hosted core count, so the hosted run does what a plain `--parallel` would (the default is the CPU core count, `bun test --help`), and local, pre-push and CI use one command and one concurrency level.
- A fixed number does not grow with the machine: a 64-core machine would otherwise start 64 workers, each spawning tsc, oxlint or git subprocesses.
- Cost: about 8 s per local run against the default on this 20-core machine (28.9 s against 37.4 s). Anyone who wants the speed can run `bun test --parallel` by hand; the check chain stays at 4.
- Stress: 20 workers ran the suite 10 times in a row without a failure after the fixes below, so a higher count was not unsafe in that sample.

Unverified: hosted medians; the cause of the small hosted gain (candidates: four vCPUs shared by workers that each spawn subprocesses, and a long tail of subprocess-bound files; neither was isolated).

## Coverage gate under `--parallel`

- Serial against parallel lcov (session measurement, throwaway script): `coverage/lcov.info` from a serial run and from a 20-worker run both list 41 `SF:` entries, the identical set. For all 41 files `LF`, `LH`, `FNF`, `FNH` and the set of lines with a nonzero `DA` count are equal (0 differences); totals are `LF 3215`, `LH 3154` in both. A line that runs a fixed number of times has the same count in both (for example `scripts/git-env.ts` line 7: 435 hits), so the report adds the workers' counts; loop-driven counts differ by a few hundred between any two runs. After merging METRO-81 a 4-worker run lists 42 files: the 41 plus `scripts/timed-check.ts`. `node scripts/coverage-scope.ts` prints `Coverage scope ok: every product source file is measured or exempt`.
- Committed tests in `scripts/coverage.test.ts`, run with the flags read from `scripts.check` (`--parallel=4`):
  - Every file from every worker is in the report (two test files, two sources: `SF:a.ts` and `SF:b.ts` present).
  - An uncovered function in one worker's file fails: exit code not 0, `b.ts` row at 50.00 functions / 16.67 lines, zero failed tests, record `LF:6`, `LH:1`.
  - Union across workers: `shared.ts` has `f` and `g`; `x.test.ts` calls only `f`, `y.test.ts` only `g`. Each test file records its pid and waits for the other's marker file, so the test can only finish if the two files run at the same time, and files inside one worker run one after the other; the test also asserts two distinct pids. Expected: exit 0, `FNF:2`, `FNH:2`, and `LF` equals `LH` for `shared.ts` (a last-worker-wins merge would leave one function uncovered).
  - Negative: neither test calls `g`: exit code not 0, `shared.ts` row at 50.00 / 50.00, zero failed tests, `FNF:2`, `FNH:1`.
  - Bun 1.4.4 prints no sentence containing "threshold" in these failures (checked: the output is only the coverage table and the summary); the tests therefore assert the exit code, the sub-90 table row and `0 fail`, which together show the exit code comes from the coverage gate and not from a failed test.
  - The flag test pins `--parallel=4` and rejects an isolation-dropping flag. It was red first: before the `package.json` edit `bun test scripts/coverage.test.ts` gave `5 pass, 1 fail` (`Expected: true, Received: false` at the `--parallel` assertion); after the edit all pass.
- The pre-existing serial fixtures (`FND-T1`, `METRO-50`) are unchanged and still pass. The first two fixtures above pass on the old serial command too (Bun's gate was already correct); they exist so a later flag change cannot weaken the gate silently.

## Flake log and timeouts

Static audit (Repo-verified, `rg` for `.local`, `tmpdir()`, `chdir`, `process.env` assignments, `listen(` and `port:` in `scripts/*.test.ts`): every fixture directory comes from `mkdtemp` (under `os.tmpdir()` or under `.local/` with a random suffix: `gates-`, `format-`, `secrets-index-`, `order-`, `types-`, `tsc-build-`), none uses a fixed scratch path, fixed port, `process.chdir` or process-wide env assignment, and fixture git processes use `cleanGitEnv()`. `scripts/tsc-build.test.ts` removes its copy with a bounded EBUSY-only retry (METRO-42) and uses a unique `mkdtemp` per test; no EBUSY occurred in any run below. Under isolation each file has its own module registry and globals.

Local runs (session measurements; wall seconds, exit code, counts):

- First version, 20 workers, 10 runs: every run exit 1, 1011 pass, 1 fail (27.9 to 34.2 s): `METRO-77 check runs Vitest ...` expected the literal `bun test && bun run test:vitest`. Deterministic, not a flake: the `package.json` edit made that assertion stale; fixed in `vitest-sync.test.ts`.
- After that fix, 20 workers, 10 runs: nine passed (1012 pass, 0 fail; 29.7 to 34.7 s); run 5 failed (1011 pass, 1 fail, 33.6 s): `METRO-62 real git ranges: docs-only, mixed and rename [5069.37ms]`, `killed 1 dangling process`. Alone that test takes 0.42 s. It runs about seven synchronous `git` processes and once stalled past Bun's 5 s default timeout under 20-way load; it uses its own `mkdtemp` and `cleanGitEnv()`, so this was a timeout budget, not shared state.
- After the timeout changes, 20 workers, 10 consecutive runs, all exit 0, 1012 pass, 0 fail: 27.6, 31.6, 30.9, 28.8, 29.0, 30.9, 28.4, 28.4, 30.6, 30.1 s.
- Final command `--parallel=4` (1013 tests), 10 consecutive runs, all exit 0, 1013 pass, 0 fail: 31.8, 35.3, 34.9, 33.5, 30.6, 35.4, 35.6, 36.3, 40.1, 36.4 s (mean 35.0).

Timeouts, stated plainly. One observed flake: `METRO-62 real git ranges` (changed-files, run 5 of 10 at 20 workers). The other six sites are precautionary, not observed failures: a single stress run with `--parallel --timeout=1000` (a 1 s default budget for tests without their own timeout) failed seven test cases, and those were given an explicit 30 s timeout: `METRO-36 a rename from code to docs ...` (reviewer-record), `METRO-62 real git ranges ...` (changed-files, the observed flake), `FND-T1 validateRange and commitMessageMain ...` (cli), `formatter jsonc ...` (format), `FND-R5 the committed Worker binding types are up to date` (binding-types), `FND-R6 contracts importing hono is rejected` (layering) and `FND-S2 the real Renovate configuration passes the pinned strict validator` (configuration). That is seven edit sites; because `format` and `layering` define their tests in loops, the timeout also applies to the loop siblings (`json`, `toml`, `react`), so ten test cases carry it. A `--timeout=2500` probe had shown only the Renovate case above 2.5 s. Tests that the 1 s probe did not flag still run under the 5 s default, so a slow enough stall in one of them could still fail; no such failure was seen in the 20 runs after the timeout changes. No retries were added and no assertion changed. No test needed a serial lane; none is proposed.

Unverified: Linux-specific collisions beyond the hosted runs listed below (all green).

## Seed reproduction in parallel mode

Experiment (session measurement, throwaway project outside the repository; eight files of six tests each, `randomize = true`, each test appends `file:test` to a log):

- Seed 12345: two serial runs, three `--parallel=4` runs and one `--parallel=2` run all produced the same order of tests inside each of the eight files. A run with seed 999 (`--parallel=4`) produced a different order.
- The order in which files started differed between serial, two workers and four workers (serial `f4,f8,f3,f7,f6,f1,f2,f5`; four workers `f4,f8,f7,f1,f5,f3,f6,f2` in all three runs; two workers `f4,f8,f3,f7,f2,f5,f1,f6`). The three four-worker runs agreed on the whole interleaving, but that fixture was tiny and fast.

What this supports: the order of tests inside a file is determined by the seed. Cross-file interleaving and which worker takes which file depend on timing and the worker count, and are not guaranteed to reproduce even at the same worker count. To reproduce a CI failure run `bun test --parallel=4 --seed N` with the seed from the log; if it does not reproduce, try a serial `bun test --seed N`, and treat a timing-dependent failure as possible. A narrowed single-file run is still not guaranteed to reproduce.

## `--timings` and `--update-timings`

Session measurement: `bun test --parallel=4 --timings <file> --update-timings` wrote a 3 KB JSON of per-file milliseconds (slowest: `scripts/tsc-build.test.ts` 25526, `scripts/layering.test.ts` 19033, `scripts/gates.test.ts` 9444). Four alternating pairs, `--parallel=4` with the file against without: with 30.8, 33.7, 37.0, 33.8 s (mean 33.8); without 31.9, 33.4, 37.6, 32.2 s (mean 33.8). No measurable gain, and the file holds machine-specific durations that change on every update. Not adopted; nothing committed. Revisit with `--shard` only if the suite is split across jobs.

## Hosted result

Hosted, from the Actions logs (the `bun test` row of the METRO-81 table; `Checks` job time from the job start and end times):

| Run                                                         | `bun test` row | Chain total | `Checks` job                             |
| ----------------------------------------------------------- | -------------- | ----------- | ---------------------------------------- |
| 42174535176, base `a0e7ab8`, serial                         | 1 m 38.7 s     | 1 m 55.4 s  | 2 m 13 s                                 |
| 42178780615, base `553dbff`, serial                         | 1 m 20.0 s     | 1 m 33.1 s  | 1 m 49 s                                 |
| 42178087779, PR #83 `8c71a17` `--parallel=4` (after probes) | 1 m 3.8 s      | 1 m 16.2 s  | not comparable (probe step added 6 runs) |
| 42180849982 attempt 1, PR #83 `e0fdb1f`, `--parallel=4`     | 1 m 38.6 s     | 1 m 58.6 s  | 2 m 20 s                                 |
| 42180849982 attempt 2 (re-run of the same commit)           | 1 m 18.5 s     | 1 m 35.3 s  | 1 m 56 s                                 |
| 42181897244, PR #83 `06c0e5f`, `--parallel=4`               | 1 m 32.4 s     | not read    | 2 m 11 s                                 |

Earlier `Checks` jobs from [METRO-81](metro-81.md): 2 m 59 s (PR #78) and 2 m 44 s (PR #80).

Reading. The `bun test` row under `--parallel=4` was 63.8, 98.6, 78.5 and 92.4 s against 98.7 and 80.0 s serial, so the hosted gain is inside run-to-run noise (identical commits varied by about 20 s). The probe's paired comparison (80 s serial against 61 to 64 s) is the only controlled-looking sample and is a single sample per mode with the order caveats above. The local gain is large (95 s to 37 s on 20 cores); the hosted benefit is small and not proven by these samples, and a median over more hosted runs would be needed (Unverified). The slowest subprocess-bound files are the remaining time; that is METRO-83.
