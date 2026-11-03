# METRO-13 evidence: Cloudflare preview with smoke and rollback

Ticket METRO-13. Specification `cloudflare-preview` revision `2026-11-03-r1` ([spec](../specifications/cloudflare-preview.md)), [ADR-0006](../adr/0006-cloudflare-preview.md). Pull request #22. Date 2026-11-03.

## Decisions

The owner delegated all seven open questions ("the best decision that makes most sense for our use case"). The decisions are in the specification. One changed from the readiness comment: the trigger is a gated job inside the Quality workflow, because a `workflow_run` workflow runs only from the default branch (`master`), which cannot fire for the rebuild.

Owner setup (Confirmed by name listing, not values): GitHub environment `preview` holds secret `CLOUDFLARE_API_TOKEN` and variable `CLOUDFLARE_ACCOUNT_ID`. The environment has no protection rules (by decision: required reviewers would defeat automation).

## Hosted evidence

| Observation                                         | Result                                                                                                                                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First deployment (run 41690597255, head `5321dd1`)  | Quality gates, Checks, Build and smoke, Security and Cloudflare preview green. Worker `metro-scaffold-pr-22` at `https://metro-scaffold-pr-22.tashfiq61.workers.dev`. Rollback skipped (one version).                         |
| Independent `curl` of the URL                       | 200; `x-request-id` present; `x-preview-sha` equals the job's `github.sha` (merge commit); `/` is `text/html`; status body `{"kind":"synthetic-scaffold","ready":true}`. A query string was sent and is not in any header.    |
| Second deployment (run 41691815013, head `b2db673`) | All jobs green. `wrangler deployments list` returned 2; `wrangler rollback` went to version `85678e45`; smoke passed; the checked commit was redeployed as `d649709e`; smoke passed with `x-preview-sha` of the merge commit. |
| Missing-credentials failure                         | Unit tested (`scripts/preview.test.ts`); the live job passed the secrets step. Not observed live (would need removing a secret).                                                                                              |
| Cleanup on close                                    | Observed after merge (see the merge report on METRO-13).                                                                                                                                                                      |

## Local checks (final tree of the PR)

`bun run check` pass (290 tests); `build`, `smoke` (6 Playwright tests) and `bundle:check` (224741 / 69904, budget unchanged) pass.

## Independent review disposition

| #   | Severity  | Finding                                                                | Disposition                                                                                                                                                                       |
| --- | --------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Important | Token present for the whole job, including install and build           | Fixed: credentials are set only on the steps that call Cloudflare; tests assert no job-level `CLOUDFLARE_` and that bootstrap and build steps hold none.                          |
| 2   | Important | Hard-coded `dist/metro_scaffold` path might differ for the preview env | Disproved: the live deploy used that path and succeeded (run 41690597255).                                                                                                        |
| 3   | Important | Cleanup could run before a queued deploy and orphan a Worker           | Mitigated: the job refuses to deploy when the pull request is not open (permission `pull-requests: read`). A close between that check and the deploy remains possible but narrow. |
| 4   | Important | Cleanup fails when no Worker exists                                    | Fixed in code: Cloudflare error `10007` or "does not exist" is a clean no-op, anything else fails. **Unverified:** the real message text for a missing Worker.                    |
| 5   | Important | "Head SHA" in the spec vs the merge commit the job proves              | Fixed: the specification now says the merge commit (`github.sha`), which is what is built and checked.                                                                            |
| 6   | Minor     | Redeploy skipped if the rollback fails                                 | Fixed: `if: always()` on the redeploy step.                                                                                                                                       |
| 7   | Minor     | Raw URL path logged                                                    | Fixed: only the route label (`/api/scaffold/status` or `/api/*`) is logged; test with a secret in the path.                                                                       |
| 8   | Minor     | `errorName` unbounded                                                  | Fixed: capped at 64 characters.                                                                                                                                                   |
| 9   | Minor     | Dependabot PRs fail on missing secrets                                 | Fixed: the preview and cleanup jobs skip `dependabot[bot]`.                                                                                                                       |
| 10  | Minor     | Weak workflow tests                                                    | Strengthened: negative checks for `pull_request_target` and `workflow_run`, job-level `if`, credential scoping, order of the open-state check.                                    |
| 11  | Minor     | Post-rollback smoke cannot show the version changed                    | Accepted: it proves the rolled-back Worker still serves; the run log shows the version ids. A SHA assertion would need the previous commit's SHA stored.                          |
| 12  | Minor     | New push cancels a running workflow (workflow-level concurrency)       | Accepted: the next run redeploys; preview is not a required check.                                                                                                                |
| 13  | Minor     | Client `x-request-id` is trusted for correlation                       | Accepted per the specification (format-validated, never used for authorization).                                                                                                  |

## Open items and unknowns

- **Unknown:** cleanup behavior for a pull request that never got a Worker (message text unverified, see finding 4).
- **Unknown:** whether GitHub environment deployment-branch policies match `refs/pull/<n>/merge`; no policy set.
- **Confirmed:** the `CLOUDFLARE_ACCOUNT_ID` variable is printed in job logs (variables are not masked); the token is masked.
- **Owner:** token scope (Workers Scripts edit only) and rotation before 2026-12-03 cannot be verified from the repository.
- **Not done by design:** production Worker, custom domain `metro-station-finder.com`, OTLP export.
