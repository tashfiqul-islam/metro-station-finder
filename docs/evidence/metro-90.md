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

## Closeout METRO-95 (2026-11-08)

Closes the two items the "Not measured" list above left open: a docs-only pull request on the new workflow, and the cache **save** steps on a restore miss. The old numbers above are unchanged. Hosted means GitHub-hosted `ubuntu-24.04`; labels as above (Repo-verified, Hosted-measured, Unverified). Times are `completed_at - started_at` per job from `gh run view <id> --json jobs` or `gh api .../runs/<id>/attempts/<n>/jobs`. Base: `feature/metro-rebuild` at `64ec46b`.

### Conditions that affect these numbers (Hosted-measured)

From about 2026-11-08 10:00 to 10:45 UTC, downloads of `github.com/jdx/mise/releases/...` assets returned HTTP 504 intermittently (the GitHub status page listed an open incident, "Increase in timeouts for some unauthenticated users"). The `Changes` job runs `jdx/mise-action` with `cache: false`, so it downloads mise on every run and was hit hardest: its mise step took 168, 99 and 64 s in docs-only attempts 2, 4 and 5 below (4 s once the outage ended, attempt 6), and it failed outright (five download retries, then an error) in attempt 1 of both runs below and in attempts 2 to 6 of the cache run. Jobs that restore the mise cache (`Checks`, `Security`, the smoke jobs) were not affected. Affected rows are marked and kept apart from the clean ones. Nothing in the workflow was changed or worked around.

### 1. Docs-only pull request (Hosted-measured)

Pull request #96 changes `docs/evidence/metro-90.md` only. Run 42471173273 (head `5ad3fda`) was re-run in place with `gh run rerun`. Attempt 1 failed on the outage (`Changes` failed after its download retries, so `Quality gates` failed; 91 s) and is excluded. Attempts 2 to 8 all passed.

| Attempt | Changes | Checks | Security | Quality gates | Gate path (= wall) | Note                 |
| ------- | ------- | ------ | -------- | ------------- | ------------------ | -------------------- |
| 2       | 173 s   | 72 s   | 15 s     | 10 s          | 186 s              | mise download outage |
| 3       | 20 s    | 72 s   | 18 s     | 8 s           | 83 s               | clean                |
| 4       | 106 s   | 62 s   | 15 s     | 7 s           | 115 s              | mise download outage |
| 5       | 69 s    | 72 s   | 14 s     | 11 s          | 86 s               | mise download outage |
| 6       | 8 s     | 46 s   | 19 s     | 9 s           | 58 s               | clean                |
| 7       | 11 s    | 50 s   | 13 s     | 11 s          | 64 s               | clean                |
| 8       | 11 s    | 76 s   | 14 s     | 7 s           | 85 s               | clean                |

Skipped in every attempt: `Build and smoke`, `Smoke ${{ matrix.project }}` (listed under its unexpanded template name when skipped, as METRO-90 found) and `Cloudflare preview`. `Changes` set `docs_only=true` and `Quality gates` passed. The separate `Reviewer record` workflow is outside `Quality` and is not timed here. The gate path is Changes, then Checks and Security in parallel, then Quality gates; it equals wall because the preview job is skipped. The critical path is `Checks`, the same job as on a code pull request: docs-only saves the browser jobs and the preview, not `Checks`.

| Job                | Clean runs (3, 6, 7, 8) median / worst | All runs (2 to 8) median / worst | METRO-90 code pull request, final head, median / worst |
| ------------------ | -------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| Changes            | 11 / 20 s                              | 20 / 173 s                       | 10 / 11 s                                              |
| Checks             | 61 / 76 s                              | 72 / 76 s                        | 70 / 77 s                                              |
| Security           | 16 / 19 s                              | 15 / 19 s                        | 15 / 18 s                                              |
| Quality gates      | 8.5 / 11 s                             | 9 / 11 s                         | 8 / 9 s                                                |
| Gate path (= wall) | 73.5 / 85 s                            | 85 / 186 s                       | gate path 95 / 104 s, wall 122 / 136 s                 |

Reading it: on clean runs a docs-only pull request finished in a median 73.5 s (worst 85 s), against a 95 s (worst 104 s) gate path and 122 s (worst 136 s) wall for a code pull request: about 21 s less gate path and 48 s less wall, because the browser jobs and the preview no longer run. The `Checks` spread (46 to 76 s) is as wide as the METRO-90 one (51 to 86 s) and is runner noise, not a docs-only effect. Four clean attempts of one commit measure runner variation only. The old docs-only sample in this file (older workflow, median `Checks` 152 s, wall 165 s) was about 2.2 times slower by wall than the clean median here; that compares different workflows (Unverified as like for like).

### 2. Cache save on a restore miss (Hosted-measured)

Trigger. `quality.yml` has no `workflow_dispatch` (Repo-verified: its triggers are `pull_request` and `push` to `feature/metro-rebuild` and `main`), and a docs-only pull request skips every cache step. A `push` run is never docs-only (`scripts/changed-files.ts` answers true only for `pull_request`), and caches are scoped to a ref. So the miss was forced on the integration ref with no code or workflow change:

1. `gh cache list` showed six entries on `refs/heads/feature/metro-rebuild` whose keys equal the ones `quality.yml` builds (`apt-<image>-<playwright>-<browsers>` with image `20261101.360.1`, and `playwright-Linux-<playwright>-<browsers>`, Playwright 1.64.1; ids 10141132435, 10141134673, 10141136269, 10141138330, 10141143635, 10141146841). Only those six were deleted (`gh cache delete <id>`, exit 0 each). Not touched: the bun and mise caches; the entries on `refs/pull/92/merge` and `refs/pull/20/merge` (another ref's, not visible to a push to `feature/metro-rebuild`); the `-pw1.64.1-` entries from a deleted throwaway branch; the legacy `playwright-Linux-1.64.1-chromium-firefox-webkit` entry on `feature/metro-rebuild` (its key equals no key in `quality.yml`). No pull request was open and `master` holds no matching entry, so no other run could see the miss.
2. `gh run rerun 42326097367` (the push Quality run for `64ec46b`, the tip of `feature/metro-rebuild`; attempt 1, on 2026-11-07, had hit every cache), then `gh run rerun --failed` until the outage let `Changes` pass. Attempt 7 is the miss (only `Changes` and its dependents re-ran; `Checks` and `Security` were kept from an earlier attempt). Attempt 8, a full rerun, is the following hit.

Results from the step logs (attempt 7). The `cache-hit` output was not 'true' for any restore, so every save step ran, except where the log shows a reservation failure:

| Job                            | Apt restore | Browser restore                                                 | Apt save                  | Browser save              | Install Playwright, miss / hit |
| ------------------------------ | ----------- | --------------------------------------------------------------- | ------------------------- | ------------------------- | ------------------------------ |
| Build and smoke (chromium)     | not found   | from the legacy key `...-chromium-firefox-webkit` (482 MB, 7 s) | saved, 21 MB, 1 s         | saved, 505 MB, 6 s        | 12 s / 11 s                    |
| Smoke mobile-chrome (chromium) | not found   | from the same legacy key (8 s)                                  | "Unable to reserve cache" | "Unable to reserve cache" | 17 s / 12 s                    |
| Smoke firefox                  | not found   | not found                                                       | saved, 49 MB, 3 s         | saved, 114 MB, 4 s        | 24 s / 22 s                    |
| Smoke webkit                   | not found   | not found                                                       | saved, 114 MB, 3 s        | saved, 102 MB, 2 s        | 30 s / 21 s                    |

Saved sizes are the entries in `gh cache list` (apt chromium 21098621 B, firefox 48802863 B, webkit 113991655 B; Playwright chromium 505176354 B, firefox 113973775 B, webkit 102456869 B), created 2026-11-08 10:44:31 to 10:44:45 UTC. Every save step concluded `success`; all four jobs and `Quality gates` (11 s) passed. Job times, miss against the following hit: `Build and smoke` 64 vs 53 s, `Smoke firefox` 88 vs 78 s, `Smoke webkit` 92 vs 78 s, `Smoke mobile-chrome` 63 vs 56 s, so a miss costs about 7 to 14 s per job (one pair of runs).

Findings:

- **The save-on-miss path works as designed.** It ran on all four jobs and saved all six keys. The following run (attempt 8) restored all eight restore steps from their exact keys (`Cache restored from key: apt-...` and `playwright-Linux-1.64.1-...`), skipped all eight save steps, and passed.
- **The chromium same-key race happens and is harmless.** `Build and smoke` and `Smoke mobile-chrome` share two keys. On the cold key one saved and the other logged `Failed to save: Unable to reserve cache with key ..., another job may be creating this cache.` (step `success`). METRO-90 predicted this and could not observe it.
- **The first save was earlier than the list above says.** Push run 42296045906 (2026-11-06, the merge of PR #92) also ran the save steps in all four jobs (apt 1 to 4 s, browser 4 to 5 s, all `success`) and created the six entries deleted above. The METRO-90 statement that the save steps "have never executed in a hosted run" held for its pull request samples only.
- **A miss on the chromium browser key still restored 482 MB from a legacy entry**: `playwright-Linux-1.64.1-chromium-firefox-webkit` (saved 2026-11-03) starts with the chromium key. The log says "Cache restored from key" with the legacy key, yet `cache-hit` was not 'true', so the exact-key save ran. Prefix matching of the primary key by the cache service is inferred from the log alone (Unverified against the cache service documentation). The legacy entry is outside the current key scheme; deleting it is a separate decision.
- Not measured: a miss on a pull request ref (it falls back to the base branch's caches); a cold run on a new runner image version (the image version is part of the apt key); whether the `Changes` job should keep `cache: false` given the outage cost above (a design question, not decided here).
