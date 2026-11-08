# METRO-90 evidence: hosted Quality speed and the Playwright install stall

Frozen record (do not edit; add a new file for new measurements). Measured 2026-11-06 and 2026-11-07 (UTC dates in the logs). The branch was cut from `2f0bd88` (the tip of `feature/metro-rebuild` then); the before-numbers and the first runs of the change were taken on that base. The branch was later merged with `feature/metro-rebuild` (tip `73eb3b6`, merge commit `e182b23`, which brought in METRO-91 and METRO-92), and the final after-numbers were taken on that merged base. Change under test: branch `ticket/metro-90-ci-speed`, pull request #92.

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

Seven hosted installs stalled or crawled, all `playwright install --with-deps`: three were reported before this work (PR #86, PR #88, METRO-83) and four were hit while building it. The logs of six were read; the METRO-83 log was not collected (the ticket states it only):

| Where                                    | Run / job                  | Result                                                 |
| ---------------------------------------- | -------------------------- | ------------------------------------------------------ |
| PR #86                                   | 42264164855 / 128051677655 | cancelled after 13 min in the install step             |
| PR #88                                   | 42270413526 / 128073296288 | cancelled after 16 min in the install step             |
| METRO-83 (from the ticket, logs unread)  | not collected              | hit the 20 min job limit                               |
| throwaway experiment, firefox only       | 42277020062 / 128095839146 | 1195 s in the install step, ended by the 20 min limit  |
| throwaway mirror comparison, azure leg 4 | 42285234972                | ended by an 8 min step limit                           |
| PR #92 first run, webkit                 | 42282857929                | attempt 1 reached the 140 s limit at package 20 of 182 |
| throwaway retry demonstration, attempt 2 | 42283626854                | reached its 200 s limit at package 3 (fonts) of 182    |

Best-supported cause (Hosted-measured): the system packages download of `apt-get install` from `azure.archive.ubuntu.com`, not the browser download. The two stalled logs (jobs 128051677655 and 128073296288) show the browser cache restored, then `Installing dependencies...`, `Need to get 114 MB of archives`, a `Get:N` line for each package, and nothing after `Get:20 ... libcodec2-1.2 [8998 kB]` (first job, last line 17:53:29, then silence until the cancel at 17:56:20) and `Get:31 ... libsvtav1enc1d1` (second job, last line 18:40:28, silence until 18:41:22; gaps of 56 s and 27 s precede it). The same packages (the ffmpeg libraries pulled in for WebKit) sat at the stall point in the PR #92 webkit attempt. Normal runs fetch the same 114 MB in 11 to 63 s. The apt call is made by Playwright as root, and `timeout` stops bun and `sudo` but not that root `apt-get` (reproduced: the next attempt fails with `E: Could not get lock /var/lib/dpkg/lock-frontend. It is held by process ... (apt-get)` in PR #92 run 42282857929 and in throwaway run 42283626854).

Controlled comparison (throwaway branch, run 42285234972, `bun run playwright install-deps webkit`, one repetition per job, 4 jobs per mirror, same time, then the throwaway branch was deleted):

| Mirror                             | Seconds per job                          |
| ---------------------------------- | ---------------------------------------- |
| azure.archive.ubuntu.com (default) | 44, 107, 38, no result (8 min limit hit) |
| archive.ubuntu.com                 | 43, 68, 52, 34                           |

Four jobs per mirror is a small sample, not a proof; it is consistent with the stalls being on the Azure mirror. Every log read in detail (the two cancelled jobs, the throwaway firefox job, the PR #92 webkit attempt and the retry demonstration) stopped during the apt fetch from `azure.archive.ubuntu.com`; where the mirror comparison azure leg 4 stopped was not read. No stall was seen on `archive.ubuntu.com`, but only a handful of installs used it. Why the Azure mirror slows to a crawl is Unknown. The default `/etc/apt/apt-mirrors.txt` lists Azure at priority 1 and `archive.ubuntu.com` at priority 2; apt falls back only when a mirror fails, not when it is slow.

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
2. **Bounded install**: step `timeout-minutes: 6` (the ticket said about 5; two attempts of 140 s plus 5 s to stop each, plus the cleanup between them, come to about 300 s and do not fit in 300 s; the 6 minute limit is checked by `installBudgetViolations`), two attempts of at most 140 s each, justified by the observed installs (normal 37 to 99 s, slow ones 107 to 148 s, so 140 s cuts a slow attempt only at its extreme and the retry resumes from the partial downloads). Evidence for a retry: two stalls were rerun (PR #86 and #88) and both passed on the rerun (a very small sample), and a retry needs the orphaned root `apt-get` stopped and a different mirror: attempt 2 stops apt, runs `dpkg --configure -a` and switches to `http://archive.ubuntu.com/ubuntu/`. Packages stay verified by apt's signed indexes whichever mirror serves them.
3. **System package cache**: `actions/cache/restore` and `actions/cache/save` of the apt archives (`Dir::Cache::Archives` moved to `~/apt-archives`), keyed by runner image version, Playwright version and browser set. The save step runs right after the install and before the build and smoke steps (which run repository code with passwordless `sudo`), and only when the restore missed, so that code cannot write into a cache that later runs restore; `bun run bootstrap` and the install itself still run before the save. The Playwright browser cache is saved the same way. It removes the mirror download from cache-hit runs (where the stalls read in detail happened); it does not shorten a good run (measured above). apt re-checks cached packages against the signed index (Unverified here; this is apt's documented behaviour, not tested). The Playwright browser cache key changed from `...-chromium-firefox-webkit` to one key per browser set because each runner installs its own browsers; the pinned Playwright version is unchanged.
4. **Dropped the Bun install cache** from `Checks`, `Build and smoke` and `Security`: a cold bootstrap took 2 s against 3 to 6 s to restore the cache. One cold sample; later runs without the cache show `Install dependencies` under 1 s to 2 s.

Rejected:

- **(a) Composite action `.github/actions/setup`**: no time gain (setup is parallel and off the gate path except in the smoke jobs). `scripts/workflow-policy.ts` treats any job that uses a local `uses: ./...` as credentialed (Repo-verified in `isCredentialed`), which would require the bot-exclusion `if` terms on `Checks`, `Build and smoke` and `Security` and skip them for Renovate. The repeated steps are instead kept identical by a test (`setupDriftViolations`).
- **(b) Cache `node_modules` by lock hash**: the install is 2 s cold against 3 to 6 s to restore a cache; a 766 MB `node_modules` cache could not be faster. Not built.
- **(c) A prepare job with a shared artifact**: 8 s up plus 14 s down plus untar against a 2 s install (measured); also shared artifacts must never reach the preview job.
- **(d) Skip mise in `Quality gates`**: mise is 3 s of its 9 to 10 s and would need the unpinned runner Node; a 3 s gain inside noise. Not built.
- **Skip `--with-deps` when the browser cache hits** (part of option e): the system packages live in the runner image, not in `~/.cache/ms-playwright`, so a restored browser cache does not provide them. Not run (Unverified on a hosted run); the Playwright docs describe `--with-deps` as the Linux system dependencies install (Context7-verified).
- **`--workers=4`**: 17 s gain on a serial job that is now split; test configuration, out of scope.

The credentialed `preview` job is unchanged: no `actions/cache`, no artifact download, `jdx/mise-action` with `cache: false`. `credentialedCacheViolations` now also flags `actions/download-artifact` in a credentialed job, and `scripts/quality-workflow.test.ts` proves with fixtures that injecting a cache, `actions/cache/restore`, an artifact download, a mise cache or a caching local composite into the real `preview` job fails the check.

## After (hosted)

Two samples, both reruns of one commit each (the original run and five reruns), so the caches were warm and the commit identical: they measure runner and mirror variation, not code variation. Attempt jobs: `gh api .../runs/<id>/attempts/<n>/jobs`.

- **Final head `17be4f5`** (workflow with the 6 minute install step, mirror switch only between attempts, caches saved right after the install; merged base `73eb3b6`): run 42292154327, 6 attempts. This is the headline sample.
- **Earlier workflow `3c7a016`** (before the review fixes; merged base `2f0bd88`): run 42287088060, 6 attempts. Shown for comparison; the workflow file differs from the final head in the install step and the cache steps, so it is not the final workflow.

| Job                        | Final head median | Final head worst | `3c7a016` median / worst | Before median / worst           |
| -------------------------- | ----------------- | ---------------- | ------------------------ | ------------------------------- |
| Changes                    | 10 s              | 11 s             | 11 / 13 s                | 10 / 15 s                       |
| Checks                     | 70 s              | 77 s             | 70 / 76 s                | 64 / 86 s                       |
| Build and smoke (Chromium) | 49 s              | 59 s             | 50 / 55 s                | 190 / 273 s (all four projects) |
| Smoke firefox              | 64 s              | 76 s             | 59 / 66 s                | n/a                             |
| Smoke mobile-chrome        | 48 s              | 58 s             | 51 / 57 s                | n/a                             |
| Smoke webkit               | 67 s              | 80 s             | 74 / 86 s                | n/a                             |
| Security                   | 15 s              | 18 s             | 15 / 18 s                | 17 / 23 s                       |
| Cloudflare preview         | 33 s              | 37 s             | 33 / 37 s                | 34 / 48 s                       |
| Quality gates              | 8 s               | 9 s              | 10 / 12 s                | 10 / 12 s                       |
| Gate path                  | 95 s              | 104 s            | 100.5 / 112 s            | 218 / 299 s                     |
| Wall                       | 122 s             | 136 s            | 126.5 / 136 s            | 239 / 326 s                     |

(Medians of an even number of runs are the mean of the two middle values; job medians are rounded to whole seconds in the table.)

Per attempt on the final head, gate path / wall in seconds: 87 / 115, 102 / 126, 80 / 103, 104 / 136, 90 / 120, 100 / 124. Per attempt on `3c7a016`: 91 / 114, 100 / 123, 95 / 116, 109 / 136, 112 / 134, 101 / 130. Step medians on the final head: Install Playwright browsers chromium 12 s, mobile-chrome 12 s, firefox 15.5 s, webkit 22.5 s (worst 29 s), against 37 s median and 99 s worst for all three browsers before; Run browser smoke tests per leg 11.5, 12.5, 23 and 23 s; Restore the system package cache 1 to 2 s; the two cache save steps were skipped in all six attempts (restore hit). No leg was cancelled or retried in these twelve attempts. The headline: gate path median from 218 s to 95 s (about 56 percent less) and wall median from 239 s to 122 s (about 49 percent less); worst case gate path 299 s to 104 s. These gains are far outside the run-to-run spread seen in either sample.

Other hosted runs of the pull request (single runs, not part of any median): 42282857929 (first commit `9594b28`, apt cache cold): failed; the WebKit attempt 1 hit the 140 s limit and attempt 2 died on the dpkg lock (fixed in `4d1627b`), gate path 181 s. 42283742465 (`4d1627b`, cold again for the new key): success, gate path 103 s, wall 125 s. 42290133688 (merge commit `e182b23` on base `73eb3b6`): success, gate path 92 s, wall 117 s (Changes 11, Checks 82, Build and smoke 46, Smoke firefox 56, Smoke mobile-chrome 49, Smoke webkit 63, Security 15, Quality gates 7, Cloudflare preview 32 seconds).

Not measured:

- **Docs-only runs of the new workflow.** Acceptance criterion (a) asks for before and after numbers for docs-only and code pull requests. It is met for code pull requests only: this pull request changes the workflow, so it can never be docs-only, and the older docs-only sample used a different `Checks`. **Open item for the METRO-90 closeout:** measure the next docs-only pull request after merge (Changes, Checks, Security and Quality gates; run `gh api .../runs/<id>/jobs` as above) and append the result to a new evidence file. Expected, not measured: the docs-only gate path is `Checks` plus a few seconds, about 70 s, since none of those jobs changed in kind.
- How often the Canonical retry fires in real runs: it did not fire in the twelve after-attempts and was demonstrated only by forced kills (runs 42283626854 and 42286982173, made on the earlier retry loop; the final loop with the mirror-switch guards and the 6 minute limit was not exercised by a forced kill, only by the policy tests and a normal install).
- The cache **save** steps have never executed in a hosted run: every sample above hit the restore, so the save was skipped (the one cold runs, 42282857929 and 42283742465, used the earlier single-step cache action, not the split save). The `Build and smoke` job and the `Smoke mobile-chrome` leg share the same chromium cache keys, so on a cold key both try to save at once; the loser's reserve failure is expected to be non-fatal (Unverified). The first run after any key change (a new runner image version or Playwright version) will exercise it; check that run.
- The cold-cache first run per runner image beyond the single sample above.
- Workflow versus the measured one: the sample was measured on `17be4f5`. `git diff 17be4f5 HEAD -- .github` was empty for commit `3f0b4e3`; the last commit changes only a comment and the notice logic inside the retry branch (the original mirror token must be present before the sed and gone after it), which a normal install never runs, so the timings above stand for the final head. The retry branch itself was not re-run after that change (Unverified beyond the policy tests).

`Checks` rose from a 64 s to a 70 s median with unchanged work; that is within the spread of both samples (51 to 86 s) and has no cause here.

## Throwaway demonstrations

Run on throwaway branches `throwaway/metro-90-exp`, `throwaway/metro-90-retry` and `throwaway/metro-90-mirror`, all deleted from the remote and locally. Runs: 42276010001, 42277020062, 42280163493 (cache and split experiments), 42280724531 (step timeout and process kill), 42283626854 (retry with and without apt cleanup), 42285234972 (mirror comparison), 42286982173 (the final retry loop, forced first-attempt kill, Canonical mirror, WebKit smoke passed).
