# METRO-95 evidence: METRO-90 closeout, docs-only run and cache save-on-miss

Measured 2026-11-08 (UTC). This closes out the "Not measured" items of [metro-90.md](metro-90.md), the frozen record it extends; the numbers there are unchanged.

Closes the two items the "Not measured" list in metro-90.md left open: a docs-only pull request on the new workflow, and the cache **save** steps on a restore miss. Hosted means GitHub-hosted `ubuntu-24.04`; labels as above (Repo-verified, Hosted-measured, Unverified). Times are `completed_at - started_at` per job from `gh run view <id> --json jobs` or `gh api .../runs/<id>/attempts/<n>/jobs`. Base: `feature/metro-rebuild` at `64ec46b`.

## Conditions that affect these numbers (Hosted-measured)

From about 2026-11-08 10:00 UTC, with clean spells and a slow `Changes` again (133 s) in the run at 11:02 UTC on the final head, downloads of `github.com/jdx/mise/releases/...` assets returned HTTP 504 intermittently (the GitHub status page listed an open incident, "Increase in timeouts for some unauthenticated users"). The `Changes` job runs `jdx/mise-action` with `cache: false`, so it downloads mise on every run and was hit hardest: its mise step took 168, 99 and 64 s in docs-only attempts 2, 4 and 5 below (4 s once the outage ended, attempt 6), and it failed outright (five download retries, then an error) in attempt 1 of both runs below and in attempts 2 to 6 of the cache run. Jobs that restore the mise cache (`Checks`, `Security`, the smoke jobs) were not affected. Affected rows are marked and kept apart from the clean ones. Nothing in the workflow was changed or worked around.

## 1. Docs-only pull request (Hosted-measured)

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

Skipped in every attempt: `Build and smoke`, `Smoke ${{ matrix.project }}` (listed under its unexpanded template name when skipped, as METRO-90 found) and `Cloudflare preview`. `Changes` set `docs_only=true` and `Quality gates` passed. The separate `Reviewer record` workflow is outside `Quality` and is not timed here. How the gate path is computed (Repo-verified in `.github/workflows/quality.yml`): `Changes`, `Checks` and `Security` have no `needs:` and start together; `Build and smoke` and `Smoke` need only `Changes`; `Quality gates` needs all of them (`if: always()`). With the browser jobs skipped, the gate path (first job start to the end of `Quality gates`, as in metro-90.md) is therefore max(Changes, Checks, Security) + Quality gates + about 3 s of scheduling between the last job ending and `Quality gates` starting, not a sum of the three. Examples: attempt 3, 72 + 8 + 3 = 83 s; attempt 2, 173 + 10 + 3 = 186 s. It equals wall because the preview job is skipped. On clean runs the longest of the three is `Checks`, the same job as on a code pull request: docs-only saves the browser jobs and the preview, not `Checks`. On outage-affected runs it is `Changes`.

| Job                | Clean runs (3, 6, 7, 8) median / worst | All runs (2 to 8) median / worst | METRO-90 code pull request, final head, median / worst |
| ------------------ | -------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| Changes            | 11 / 20 s                              | 20 / 173 s                       | 10 / 11 s                                              |
| Checks             | 61 / 76 s                              | 72 / 76 s                        | 70 / 77 s                                              |
| Security           | 16 / 19 s                              | 15 / 19 s                        | 15 / 18 s                                              |
| Quality gates      | 8.5 / 11 s                             | 9 / 11 s                         | 8 / 9 s                                                |
| Gate path (= wall) | 73.5 / 85 s                            | 85 / 186 s                       | gate path 95 / 104 s, wall 122 / 136 s                 |

Reading it: on clean runs a docs-only pull request finished in a median 73.5 s (worst 85 s), against a 95 s (worst 104 s) gate path and 122 s (worst 136 s) wall for a code pull request: about 21 s less gate path and 48 s less wall, because the browser jobs and the preview no longer run. The `Checks` spread (46 to 76 s) is as wide as the METRO-90 one (51 to 86 s) and is runner noise, not a docs-only effect. Four clean attempts of one commit measure runner variation only. The old docs-only sample in this file (older workflow, median `Checks` 152 s, wall 165 s) was about 2.2 times slower by wall than the clean median here; that compares different workflows (Unverified as like for like).

## 2. Cache save on a restore miss (Hosted-measured)

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
- **The first save was earlier than metro-90.md says.** Push run 42296045906 (2026-11-06, the merge of PR #92) also ran the save steps in all four jobs (apt 1 to 4 s, browser 4 to 5 s, all `success`) and created the six entries deleted above. The METRO-90 statement that the save steps "have never executed in a hosted run" held for its pull request samples only.
- **A miss on the chromium browser key still restored 482 MB from a legacy entry**: `playwright-Linux-1.64.1-chromium-firefox-webkit` (saved 2026-11-03) starts with the chromium key. The log says "Cache restored from key" with the legacy key, yet `cache-hit` was not 'true', so the exact-key save ran. Prefix matching of the primary key by the cache service is inferred from the log alone (Unverified against the cache service documentation). The legacy entry is outside the current key scheme; deleting it is a separate decision.
- Not measured: a miss on a pull request ref (it falls back to the base branch's caches); a cold run on a new runner image version (the image version is part of the apt key); whether the `Changes` job should keep `cache: false` given the outage cost above (a design question, not decided here).
