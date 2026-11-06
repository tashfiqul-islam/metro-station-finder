# METRO-90 evidence: hosted Quality speed and the Playwright install stall

Frozen record (do not edit; add a new file for new measurements). Measured 2026-11-06 and 2026-11-07 (UTC dates in the logs). Base revision `2f0bd88` (`feature/metro-rebuild`); change under test: branch `ticket/metro-90-ci-speed`, pull request #92, final workflow commit `3c7a016`.

All durations are **hosted** (GitHub-hosted `ubuntu-24.04`, public repository, 4 vCPU) unless a row says local. Nothing here was timed on the local Windows machine. Job time is `completed_at - started_at` from `gh api repos/tashfiqul-islam/metro-station-finder/actions/runs/<id>/jobs` (queue time excluded). "Gate path" is the time from the first job start to the end of `Quality gates`; "wall" is first job start to last job end, including the `Cloudflare preview` job, which is outside the gate.

Labels: Repo-verified (read in this repository), Hosted-measured (a hosted run), Context7-verified (Context7 docs), Unverified.

## Before (hosted, 10 successful code-change Quality runs)

Runs (newest first): 42269983394, 42269088366, 42268938711, 42268286460, 42267141271, 42265281052, 42263237185, 42262568142, 42192643460, 42191552012. These are the 10 most recent successful runs that built the application and needed no rerun (runs 42264164855 and 42270413526 succeeded only after the stalled attempts below were cancelled and rerun, so they are excluded and counted as stall evidence). Workflow at those runs: one `Build and smoke` job running all four Playwright projects in one process.

| Job                | Median | Worst |
| ------------------ | ------ | ----- |
| Changes            | 10 s   | 15 s  |
| Checks             | 64 s   | 86 s  |
| Build and smoke    | 190 s  | 273 s |
| Security           | 17 s   | 23 s  |
| Cloudflare preview | 34 s   | 48 s  |
| Quality gates      | 10 s   | 12 s  |
| Gate path          | 218 s  | 299 s |
| Wall               | 239 s  | 326 s |

Where the minutes went (steps of `Build and smoke`, median / worst): Run browser smoke tests 126 / 138 s; Install Playwright browsers 37 / 99 s; Restore the Playwright browser cache 8 / 10 s; Install pinned tools with mise 7 / 8 s; Restore the Bun install cache 5 / 6 s; Install dependencies under 1 s; Build 4 s. In `Checks`: Run all checks 47 / 70 s, mise 5 / 7 s, Bun cache restore 4 / 5 s. Setup in every job (checkout, mise, Bun cache restore, install) is 10 to 18 s and runs in parallel, so only the setup of the job on the gate path matters. The gate path is `Changes` then `Build and smoke` then `Quality gates`; `Build and smoke` is 87 percent of its median, and 66 percent of that is the serial browser smoke.

Docs-only changes: the 10 most recent docs-only runs (42178259675, 42176820210, 42175250224, 42094025992, 42090499364, 42089922279, 42088618456, 42088607937, 42088069368, 42087167195) ran an older `Checks` (`bun run check` before the parallel `bun test` and timed output), median `Checks` 152 s, wall 165 s. They do not represent the current workflow, and no docs-only run of the new workflow exists before merge (the workflow under test is the pull request's own change, so the pull request is never docs-only). The docs-only gate path is `Changes`, `Checks`, `Quality gates`; none of those jobs changed in kind (only the Bun cache restore of 3 to 6 s left `Checks`), so a docs-only gain would be about that restore, which is inside noise. Unverified on a real docs-only run.

## The stall

Four hosted installs stalled or crawled before this work, two more were hit while building it (six in total, all `playwright install --with-deps`):

| Where                                    | Run / job                  | Result                                                 |
| ---------------------------------------- | -------------------------- | ------------------------------------------------------ |
| PR #86                                   | 42264164855 / 128051677655 | cancelled after 13 min in the install step             |
| PR #88                                   | 42270413526 / 128073296288 | cancelled after 16 min in the install step             |
| METRO-83 (from the ticket, logs unread)  | not collected              | hit the 20 min job limit                               |
| throwaway experiment, firefox only       | 42277020062 / 128095839146 | 1195 s in the install step, ended by the 20 min limit  |
| throwaway mirror comparison, azure leg 4 | 42285234972                | ended by an 8 min step limit                           |
| PR #92 first run, webkit                 | 42282857929                | attempt 1 reached the 140 s limit at package 20 of 182 |

Best-supported cause (Hosted-measured): the system packages download of `apt-get install` from `azure.archive.ubuntu.com`, not the browser download. The two stalled logs (jobs 128051677655 and 128073296288) show the browser cache restored, then `Installing dependencies...`, `Need to get 114 MB of archives`, a `Get:N` line for each package, and nothing after `Get:20 ... libcodec2-1.2 [8998 kB]` (first job, last line 17:53:29, then silence until the cancel at 17:56:20) and `Get:31 ... libsvtav1enc1d1` (second job, last line 18:40:28, silence until 18:41:22; gaps of 56 s and 27 s precede it). The same packages (the ffmpeg libraries pulled in for WebKit) sat at the stall point in the PR #92 webkit attempt. Normal runs fetch the same 114 MB in 11 to 63 s. The apt call is made by Playwright as root, and `timeout` stops bun and `sudo` but not that root `apt-get` (reproduced: the next attempt fails with `E: Could not get lock /var/lib/dpkg/lock-frontend. It is held by process ... (apt-get)` in PR #92 run 42282857929 and in throwaway run 42283626854).

Controlled comparison (throwaway branch, run 42285234972, `bun run playwright install-deps webkit`, one repetition per job, 4 jobs per mirror, same time, then the throwaway branch was deleted):

| Mirror                             | Seconds per job                          |
| ---------------------------------- | ---------------------------------------- |
| azure.archive.ubuntu.com (default) | 44, 107, 38, no result (8 min limit hit) |
| archive.ubuntu.com                 | 43, 68, 52, 34                           |

Four jobs per mirror is a small sample, not a proof; it is consistent with every stall seen being on the Azure mirror and none on Canonical's. Why the Azure mirror slows to a crawl is Unknown. The default `/etc/apt/apt-mirrors.txt` lists Azure at priority 1 and `archive.ubuntu.com` at priority 2; apt falls back only when a mirror fails, not when it is slow.

## Experiments behind the design (hosted, throwaway runs 42276010001, 42277020062, 42280163493)

Run on throwaway branches, deleted after use; the workflow files are not kept.

| Question                                                       | Result                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cold `bun run bootstrap` without a Bun cache                   | 2 s (one job); restoring the Bun cache cost 3 to 6 s in every real job. The cache costs more than it saves.                                                                                                                                                                                                               |
| `node_modules` as a shared artifact (option c)                 | 766 MB; upload 8 s (`compression-level: 0`), download 14 s, plus untar; against a 2 s install. Slower than installing.                                                                                                                                                                                                    |
| Install of all three browsers, apt archive cache miss then hit | 41 to 46 s on a miss, 44 s on a hit (no Playwright browser cache in that job). The cache restore of 109 MB took under 1 s and apt downloaded nothing, but the median install did not shrink: unpacking and the browser download dominate. The cache removes the mirror from the path, it does not make a good day faster. |
| One Playwright project per runner                              | chromium 25 s install + 13 s smoke; firefox 19 + 24; webkit 34 + 22; mobile-chrome 148 (slow mirror) + 12; whole job 66 to 81 s per leg against 190 s serial.                                                                                                                                                             |
| Serial smoke, 2 default workers vs `--workers=4`               | 116 s vs 99 s; `playwright.config.ts` left unchanged (test settings are out of scope).                                                                                                                                                                                                                                    |
| Step `timeout-minutes: 1` around `sleep 300`                   | ended at 73 s (60 s limit plus runner shutdown), later steps skipped (run 42280724531).                                                                                                                                                                                                                                   |
| `timeout --kill-after=5s 20s sudo sleep 120`                   | each attempt ended at 20 s, no process left (run 42280724531).                                                                                                                                                                                                                                                            |
| Real install killed at 20 s, then retried                      | without stopping apt: second attempt fails on the dpkg lock (run 42283626854). With `pkill -x apt-get`, `dpkg --configure -a` and the Canonical mirror: second attempt succeeded at 50 s total and the WebKit smoke passed (run 42286982173).                                                                             |
| Matrix job name when the job is skipped                        | a `name: ${{ matrix.name }}` job skipped by `if` is listed with the unexpanded template, not "Build and smoke" (run 42280724531). So `Build and smoke` stays a literal-name job.                                                                                                                                          |

## Design chosen and rejected options

Chosen (each choice cites a measurement above):

1. **Parallel smoke (option e)**: `Build and smoke` keeps its name and runs the Chromium project; a new `smoke` matrix job runs Firefox, WebKit and the mobile viewport (`mobile-chrome`, Chromium) on their own runners. All four Playwright projects still run, with `--shuffle`. Basis: serial smoke is 126 s of the 190 s job; one project per runner took 66 to 81 s. `Quality gates` and the preview now need `smoke`; `scripts/ci-results.ts` requires it and allows its skip only on a docs-only change, exactly like `build`. Required checks in the repository ruleset are `Quality gates` and `Reviewer record` (Repo-verified with `gh api repos/.../rulesets/26426527`); no check name changed, and `smoke` is new.
2. **Bounded install**: step `timeout-minutes: 5`, two attempts of at most 140 s each. Evidence for a retry: the only two stalls that were rerun (PR #86 and #88) passed on the rerun, so the stall is transient, and a retry needs the orphaned root `apt-get` stopped and a different mirror: attempt 2 stops apt, runs `dpkg --configure -a` and switches to `http://archive.ubuntu.com/ubuntu/`. Packages stay verified by apt's signed indexes whichever mirror serves them.
3. **System package cache**: `actions/cache` of the apt archives (`Dir::Cache::Archives` moved to `~/apt-archives`), keyed by runner image version, Playwright version and browser set. It removes the mirror download from cache-hit runs (the place every stall happened); it does not shorten a good run (measured above). apt re-checks cached packages against the signed index (Unverified here; this is apt's documented behaviour, not tested). The Playwright browser cache key changed from `...-chromium-firefox-webkit` to one key per browser set because each runner installs its own browsers; the pinned Playwright version is unchanged.
4. **Dropped the Bun install cache** from `Checks`, `Build and smoke` and `Security`: a cold bootstrap took 2 s against 3 to 6 s to restore the cache. One cold sample; later runs without the cache show `Install dependencies` under 1 s to 2 s.

Rejected:

- **(a) Composite action `.github/actions/setup`**: no time gain (setup is parallel and off the gate path except in the smoke jobs). `scripts/workflow-policy.ts` treats any job that uses a local `uses: ./...` as credentialed (Repo-verified in `isCredentialed`), which would require the bot-exclusion `if` terms on `Checks`, `Build and smoke` and `Security` and skip them for Renovate. The repeated steps are instead kept identical by a test (`setupDriftViolations`).
- **(b) Cache `node_modules` by lock hash**: the install is 2 s cold against 3 to 6 s to restore a cache; a 766 MB `node_modules` cache could not be faster. Not built.
- **(c) A prepare job with a shared artifact**: 8 s up plus 14 s down plus untar against a 2 s install (measured); also shared artifacts must never reach the preview job.
- **(d) Skip mise in `Quality gates`**: mise is 3 s of its 9 to 10 s and would need the unpinned runner Node; a 3 s gain inside noise. Not built.
- **Skip `--with-deps` when the browser cache hits** (part of option e): the system packages live in the runner image, not in `~/.cache/ms-playwright`, so a restored browser cache does not provide them. Not run (Unverified on a hosted run); the Playwright docs describe `--with-deps` as the Linux system dependencies install (Context7-verified).
- **`--workers=4`**: 17 s gain on a serial job that is now split; test configuration, out of scope.

The credentialed `preview` job is unchanged: no `actions/cache`, no artifact download, `jdx/mise-action` with `cache: false`. `credentialedCacheViolations` now also flags `actions/download-artifact` in a credentialed job, and `scripts/quality-workflow.test.ts` proves with fixtures that injecting a cache, `actions/cache/restore`, an artifact download, a mise cache or a caching local composite into the real `preview` job fails the check.

## After (hosted, final workflow commit 3c7a016)

Run 42287088060, six attempts (the original run and five reruns of the same commit, so the caches were warm and the commit identical; this measures runner and mirror variation, not code variation). Attempt jobs: `gh api .../runs/42287088060/attempts/<n>/jobs`.

| Job                        | Median | Worst | Before median / worst           |
| -------------------------- | ------ | ----- | ------------------------------- |
| Changes                    | 11 s   | 13 s  | 10 / 15 s                       |
| Checks                     | 70 s   | 76 s  | 64 / 86 s                       |
| Build and smoke (Chromium) | 50 s   | 55 s  | 190 / 273 s (all four projects) |
| Smoke firefox              | 59 s   | 66 s  | n/a                             |
| Smoke mobile-chrome        | 51 s   | 57 s  | n/a                             |
| Smoke webkit               | 74 s   | 86 s  | n/a                             |
| Security                   | 15 s   | 18 s  | 17 / 23 s                       |
| Cloudflare preview         | 33 s   | 37 s  | 34 / 48 s                       |
| Quality gates              | 10 s   | 12 s  | 10 / 12 s                       |
| Gate path                  | 101 s  | 112 s | 218 / 299 s                     |
| Wall                       | 128 s  | 136 s | 239 / 326 s                     |

Per attempt, gate path / wall in seconds: 91 / 114, 100 / 123, 95 / 116, 109 / 136, 112 / 134, 101 / 130. Longest job on the gate path now: `Smoke webkit` (74 s median) beside `Checks` (70 s), against `Build and smoke` (190 s) before. Install Playwright browsers per leg (median): chromium 13 s, mobile-chrome 14 s, firefox 17 s, webkit 23 s (worst 41 s), against 37 s median and 99 s worst for all three browsers before; Run browser smoke tests per leg: 11, 11, 21, 24 s. No leg was cancelled or retried in these six attempts.

Other runs of the pull request, in order (not part of the median): 42282857929 (first commit 9594b28, apt cache cold): failed; the WebKit attempt 1 hit the 140 s limit and attempt 2 died on the dpkg lock (fixed in 4d1627b); gate path 181 s. 42283742465 (4d1627b, cold again for the new key): success, gate path 103 s, wall 125 s. Counting honestly: the reduction in gate path is from a 218 s median to a 101 s median (about 54 percent), and the worst case from 299 s to 112 s; the wall from 239 s to 128 s. Both are far outside the run-to-run spread seen in either sample, so these gains are not noise. Not measured: a docs-only run of the new workflow (see above); the cold-cache first run per runner image (run 42283742465 gate path 103 s is the one sample); how often the Canonical retry fires (it did not fire in these runs, and it was demonstrated only by a forced early kill, run 42286982173). `Checks` rose from a 64 s to a 70 s median with unchanged work; that is within the spread of both samples (55 to 86 s) and has no cause here.

## Throwaway demonstrations

Run on throwaway branches `throwaway/metro-90-exp`, `throwaway/metro-90-retry` and `throwaway/metro-90-mirror`, all deleted from the remote and locally. Runs: 42276010001, 42277020062, 42280163493 (cache and split experiments), 42280724531 (step timeout and process kill), 42283626854 (retry with and without apt cleanup), 42285234972 (mirror comparison), 42286982173 (the final retry loop, forced first-attempt kill, Canonical mirror, WebKit smoke passed).
