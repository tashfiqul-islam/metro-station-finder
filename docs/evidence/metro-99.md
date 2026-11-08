# METRO-99 evidence: mise install retry in the credentialed workflows

Frozen record. Extends [METRO-97](metro-97.md) (pull request #98). Labels: Repo-verified, Unverified.

## Which jobs are credentialed (Repo-verified)

Decided by `isCredentialed` in `scripts/workflow-policy.ts` (Cloudflare or Plane name, a `secrets` read, `environment:`, `secrets:`, local `uses: ./`, or a `workflow_call` trigger), run over every file in `.github/workflows` by `scripts/ci-hardening.test.ts`. The credentialed jobs that install mise are: `quality.yml` `preview` (METRO-97), `production-deploy.yml` `deploy`, `preview-cleanup.yml` `cleanup`, `cloudflare-token-check.yml` `check`, `release-sync.yml` `sync`, `release-draft.yml` `draft`. Not credentialed and not changed: `production-deploy.yml` `sync` (it only dispatches), `dependency-review.yml`, `reviewer-record.yml` (cache on since METRO-97).

## Change

| Job                                                                          | Install                                       | Job `timeout-minutes`  |
| ---------------------------------------------------------------------------- | --------------------------------------------- | ---------------------- |
| `production-deploy` `deploy`                                                 | 3 attempts, pauses 30 s and 60 s (as preview) | 30 (unchanged)         |
| `preview-cleanup`, `cloudflare-token-check`, `release-sync`, `release-draft` | 2 attempts, one 30 s pause                    | 12 (was 10, 5, 10, 10) |

Each attempt is `jdx/mise-action` at the same SHA (f5be966, v5.2.6), `timeout-minutes: 4`, `cache: false`, `continue-on-error: true` except the last, gated on exactly the previous attempt failing, as in METRO-97. Deploy logic, concurrency, permissions, environments and secrets are untouched; only the install step and, where the budget needs it, the job limit changed. No cache or artifact step was added (METRO-47 rule still passes on all files).

Budget rule: attempts plus pauses plus 180 s must be under the job limit. Two attempts: 480 + 30 + 180 = 690 s, so 12 minutes (11.5 is the floor). Three attempts: 720 + 90 + 180 = 990 s, inside 30 minutes. The 10 minute limits could not hold two 4 minute attempts, and 3 minute attempts were not chosen to keep one attempt length everywhere. The token check limit rose from 5 to 12 minutes: a hung install now ends at the step limits rather than at 5 minutes; the script itself runs in seconds.

## Tool list per workflow (decision)

Token check, release sync and release draft already install only `node` (`install_args: node`). Preview cleanup and production deploy run `bun run bootstrap` and `bunx wrangler`, so they need the full tool set; trimming the list would change what runs with the token and was not attempted. Unchanged.

## Policy

`credentialedMiseRetryViolations` already covered every credentialed job in the workflows passed to it; METRO-99 makes the repository test pass all real files and fail if a credentialed mise job is missing from the expected list, and adds: the first attempt has no `if`, and later attempts repeat the first attempt's `uses` and `with`. `scripts/ci-hardening.test.ts` has a negative fixture per weakening (missing `continue-on-error`, last attempt continuing, missing step timeout, gate `always()`, `|| true`, `&& always()`, long sleep, `if` on the first attempt, different pin, no retry at all, job limit too small or absent) run against a copy of each of the six real jobs.

## Not verified

- Hosted behaviour of all five changed workflows (they run on schedule, dispatch, tag push, release events and pull request close, and cannot be exercised safely on a pull request): Unverified. Only parsing, policy tests and the repository gate were run.
- That `continue-on-error` plus `outcome == 'failure'` behaves in these jobs as it did in `quality.yml` preview (Hosted-measured in METRO-97 run 42474178212): inferred, not run here.
- Preview cleanup also runs on pull request close; it shares the `quality.yml` pattern but was not triggered.
