# METRO-97 evidence: mise downloads and GitHub release 504s

Frozen record (do not edit; add a new file for new measurements). Measured 2026-11-08 (UTC) on pull request #98, branch `ticket/metro-97-mise-cache`. Hosted means GitHub-hosted `ubuntu-24.04`. Durations are step or job `completed_at - started_at` from `gh run view <id> --json jobs`. Labels: Repo-verified, Context7-verified, Web-verified, Hosted-measured, Unverified.

## Finding

The 504s (run 42470028092, job `Changes`, Hosted-measured) hit the one job that set `cache: false` while it held no credential. Its log shows `cache: false`, then `Download mise@2026.10.25`, five `curl` retries over about 8 s that all returned 504. `Checks` in the same run restored `mise cache restored from key: mise-v1-linux-x64-ubuntu24-2026.10.25-...`, logged `Verified existing mise@2026.10.25`, and `mise install --locked` reported all 8 tools `already installed` with no download. So a warm mise-action cache already avoids github.com; the gap was the jobs that switched it off: `Changes` (in `quality.yml`) and the `Reviewer record` workflow. `Quality gates` already used the cache. `Cloudflare preview` (credentialed) must not.

## What mise-action does (Repo-verified, jdx/mise-action at the pinned SHA f5be966, `src/index.ts` and README)

- Downloads, with `version` pinned: `https://github.com/jdx/mise/releases/download/v<version>/mise-v<version>-linux-x64.tar.zst`, verified against a signed `packslip.sigstore.json` from the same release (releases from 2026.9.3), else `SHASUMS256.txt` plus `.minisig`. Tools then come from the URLs in `mise.lock`, checksum-verified (`MISE_LOCKED`, `--locked`).
- Two built-in caches (`cache: true`, the default): a binary cache keyed `mise-bin-v1-<target>-<image>-<version>` (the mise binary, its version record and the verified checksums) and the main cache of mise's data directory (`~/.local/share/mise`: binary and installed tools), keyed `<cache_key_prefix>-<platform>-<version>-<install_args hash>-p<period>-<hash of mise config and lock files>`. Restore runs first; on a miss the action installs, then saves right after the install step and before any later step runs; a hit is never re-saved. `cache_save_post` (default false) would save later. A restored binary is verified against checksums saved with it, so a hit contacts no release host.
- `install_dir` is deprecated (acts as `working_directory`); `mise_dir` moves the data directory. Context7-verified (`/jdx/mise-action`) for the inputs; README "Cache Validated Downloads" and "Don't restore a cache in a workflow that publishes artifacts" are Repo-verified.
- Unverified: whether GitHub's cache service stays reachable during a github.com release outage (it did in these runs).

## Design (decision)

Not a separate `actions/cache/restore` and `save` pair: the action already is one (restore first, save only after a miss, right after the install and before repository code runs), covers the binary and the tools, and keys on the lock and config hash and the pinned version. A second hand-written pair would duplicate keys and add a policy surface for no gain. Changed jobs:

- `Changes` (quality.yml) and `Reviewer record` (reviewer-record.yml): `cache: false` removed. Neither holds a credential or publishes anything.
- `Cloudflare preview` (credentialed, no cache by METRO-47): a chain of three `jdx/mise-action` steps (`continue-on-error` on the first two, each `timeout-minutes: 4`, `if: steps.<previous>.outcome == 'failure'`, a `sleep 30` and a `sleep 60` step before the second and third). No cache or artifact step.
- Unchanged: `Checks`, `Security`, `Build and smoke`, `Smoke *`, `Quality gates` (cache already on). The credentialed workflows `cloudflare-token-check`, `preview-cleanup`, `production-deploy`, `release-sync`, `release-draft` still install with `cache: false` and no retry (follow-up).

Cache scope (Unverified against GitHub docs; the action README says a pull request build writes only to its own merge-ref scope): a run restores entries from its own ref or the base branch. Inferred: the `Changes` and `Reviewer record` key (install_args `node`) is the one `Quality gates` writes on runs of the base branch, so PR run 42473636729 hit it with no first save on the PR ref.

Policy (`scripts/workflow-policy.ts`): `uncredentialedMiseCacheViolations` rejects `cache: false` on a mise-action step in an uncredentialed job; `credentialedMiseRetryViolations` requires the bounded chain above in a credentialed job. The credentialed cache rule is unchanged. Tests are in `scripts/quality-workflow.test.ts` with negative cases.

## Hosted runs

| Run         | Commit  | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 42473636729 | 574ce37 | Warm. All 8 mise-action steps with the cache restored (`mise cache restored`), no `releases/download` in their logs; mise step 4 to 7 s. `Changes` 10 s job. `Cloudflare preview` downloaded (cache off, expected): mise step 7 s. Reviewer record run 42473636716 also restored (`mise cache restored from key: ...545ea538...`), its mise step ran with no download (its check failed only on the missing Reviewer section).                                                 |
| 42473900725 | 082c725 | Cold, forced by a temporary `cache_key_prefix` on `Changes` (reverted in b8d03f4). Log: `mise cache not found for mise-m97-measure-...`, `curl .../releases/download/v2026.10.25/...` succeeded, `Saving mise cache`, `Cache saved from /home/runner/.local/share/mise with key: mise-m97-measure-...`. Mise step 8 s (job 15 s). The other 7 cached jobs restored.                                                                                                            |
| 42474178212 | fa60a3c | Warm read of the key saved above: `Changes` restored, mise step 2 s, job 9 s. Same run: the preview's first mise attempt hit a live GitHub slowdown (`packslip.sigstore.json` HTTP 504, then no progress) and was stopped at its 4 minute limit; after the 30 s pause the second attempt installed (mise binary 94 s, `bun-linux-x64.zip` 82 s with two 30 s timeouts) and the job succeeded (7 min 52 s, versus 34 s normally). Without the chain this job would have failed. |
| 42474987096 | b8d03f4 | Final code. 8 of 8 cache users restored with no `releases/download`; preview first attempt succeeded (mise step 7 s), attempts 2 and 3 skipped; all jobs green.                                                                                                                                                                                                                                                                                                                |

Warm versus cold on `Changes`: mise step 2 s (warm, run 42474178212) against 8 s (cold, run 42473900725); the saving is small when GitHub is healthy, the point is that a warm job makes no github.com release request.

## Not measured

- A 504 on the cache service, or a warm run during a real release-asset outage: the outage had ended; the first-attempt failure in run 42474178212 was a slowdown with one 504 on the packslip, not the earlier 504 on the tarball.
- The retry chain beyond two attempts (the third was never needed).
- Cache eviction (7 days unused, 10 GB repository limit) and the 30 day key rollover: not observed.
