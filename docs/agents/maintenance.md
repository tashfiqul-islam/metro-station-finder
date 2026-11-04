# Maintenance

Status: Repo-verified tool configuration; hosted gates and remote branch rules require separate verification.

Use Bun and exact pins in `mise.toml`, package manifests and `bun.lock`. Run `mise install`, then `mise exec -- bun run bootstrap`. Frozen bootstrap validates runtime pins before installing the locked graph. Do not use generic global-tool installs as evidence of project compatibility.

Install hooks per checkout with `mise exec -- hk install --mise`. Repeat for linked worktrees. hk 2.11.0 and Pkl 0.32.2 use the matching pinned `hk.pkl` schema. Preserve staged-snapshot stashing and failure restoration when changing hook policy. Verify real hooks in disposable Git fixtures; never alter the caller index/worktree to manufacture test cases. Any test or script that runs `git` against a fixture must use `cleanGitEnv()` from `scripts/git-env.ts` so hook-exported `GIT_*` variables cannot redirect it.

Gate commands and required remote policy are documented in [quality gates](quality-gates.md). Keep workflow job context `Quality gates` stable; coordinate required-check policy before renaming. CI uses pinned actions/checkout v7.0.1, actions/cache v6.1.0 and jdx/mise-action v5.2.6 commits on the `ubuntu-24.04` runner image, with mise 2026.10.25, an empty workflow-level `permissions: {}` and explicit job-level `contents: read`. Verify official release commits before updates; preserve least-privilege permissions and disabled persisted credentials.

Dependency updates arrive as Renovate PRs (`.github/renovate.json5`: bun, mise and github-actions managers, exact pins, action digests with version comments, grouped ecosystems, weekly lock-file maintenance, dependency dashboard). Renovate's `minimumReleaseAge` must equal Bun's `install.minimumReleaseAge` in `bunfig.toml` (259200 seconds, 3 days); `scripts/configuration.ts` enforces it. Security advisories bypass the cooldown. A pin newer than the cooldown needs a stated reason in evidence. The Renovate validator is pinned in `mise.toml` with one scoped trust-policy exception (`@yarnpkg/libzip@3.2.2`, owner-approved 2026-11-03; see [METRO-20 evidence](../evidence/metro-foundation-supply-chain.md)); remove it when upstream publishes provenance again.

Updates require frozen install, canonical checks, real hook regression tests and independent review. Keep TypeScript 7 compiler settings and the documented TypeScript 6 dependency-parser seam intact. Never relax budgets, assertions or thresholds to obtain green gates. Secret and dependency scans run through `bun run scan`; inspect failures before changing exclusions.

There is no deployment or rollback automation in this ticket. Integration targets `feature/metro-rebuild`; no default-branch switch, preview, production deployment or release is authorized by a gate pass. Use a reviewed revert for bad changes, preserving independent rebuild history and signed commits.

## Cloudflare preview (METRO-13)

Same-repository pull requests get a Worker `metro-scaffold-pr-<number>` on workers.dev, deployed by the `preview` job of `.github/workflows/quality.yml` after `checks`, `build` and `security` pass; `preview-cleanup.yml` deletes it when the pull request closes. The job is outside the `Quality gates` aggregate. `CLOUDFLARE_API_TOKEN` (secret) and `CLOUDFLARE_ACCOUNT_ID` (variable) live only in the GitHub environment `preview`; a missing one fails the job with a message naming it. The token needs Workers Scripts edit for this account only; the owner rotates it (the first token expires 2026-12-03). Rollback: `wrangler rollback --name metro-scaffold-pr-<number>` returns the preview to its previous version (the job exercises it, then redeploys the checked commit). Never run these against `metro-scaffold` (production). Decisions: [specification](../specifications/cloudflare-preview.md), [ADR-0006](../adr/0006-cloudflare-preview.md).

## Release sync (METRO-14)

Publishing, editing, unpublishing or deleting a GitHub release runs `.github/workflows/release-sync.yml`, which keeps Plane aligned through `scripts/release-sync.ts`: the Plane release (looked up by tag name, never duplicated), its release tag (`git_tag`, `commit_hash`) and its release log (the GitHub notes rendered to HTML). GitHub is canonical. A stable release becomes `released` only when a successful `production` deployment exists for the tagged commit (none exists before METRO-11); a prerelease, draft or retracted release never does. Historical released Plane releases (`v0.0.1`, `v0.0.2`) are never modified. Publishing a release never changes work item states.

- **Run it by hand:** Actions, Release sync, Run workflow, tag `vX.Y.Z`. Use this after a failed run; the run is idempotent.
- **Credential:** `PLANE_API_KEY` is a secret in the GitHub environment `release`, which requires the owner's approval for every run and only accepts tags `v*` and the branches `main` and `feature/metro-rebuild`. The key acts as its owner in Plane and expires 2027-02-03; rotate it before then.
- **Release notes** list the METRO tickets and pull requests included and have a "Deferred" heading for unfinished tickets; the sync reports a missing heading in the Plane description.
- **Retraction:** delete or unpublish the GitHub release; the next run resets the Plane release to `unreleased`. Specification: [release-sync](../specifications/release-sync.md).
- **Not covered:** creating a GitHub release from Plane (separate ticket, needs a trigger that works before the default-branch switch).

## Cloudflare token rotation and expiry alarm (METRO-33)

Cloudflare has no first-party OIDC for wrangler, so preview (and later production) deploys depend on a long-lived `CLOUDFLARE_API_TOKEN`; rotating it on time is the control. Without it an expired token fails every preview deploy. **Current expiry: 2026-12-03.** Rotate before 2026-11-19 (the alarm below fails from 14 days out).

**Alarm.** `.github/workflows/cloudflare-token-check.yml` (Actions, Cloudflare token check, Run workflow) runs `scripts/cloudflare-token-check.ts` in the `preview` environment. It calls Cloudflare's token-verify API and fails on HTTP 401/403, on a status other than `active`, and when the token expires within 14 days; it prints the days remaining, never the token. It also has a weekly schedule (Mondays 06:17 UTC) that is inert until the default-branch switch, because GitHub only runs schedules from the default branch; until then dispatch it by hand, at least weekly during the last 30 days before expiry. A token with no expiry date passes with a note; set an expiry when rotating. Endpoints (Cloudflare docs, read 2026-11-04): `GET /accounts/{account_id}/tokens/verify` for account-owned tokens, falling back to `GET /user/tokens/verify` for user-owned ones ([account](https://developers.cloudflare.com/api/resources/accounts/subresources/tokens/methods/verify/), [user](https://developers.cloudflare.com/api/resources/user/subresources/tokens/methods/verify/)).

**Where a failure is announced (open decision for the owner).** No channel is configured. A failed run only notifies through GitHub's normal workflow-failure notifications (the person who triggered it or last edited the schedule, per their notification settings). Decide whether that is enough or whether to add a channel; until decided, do not assume anyone is paged.

**Owner steps (the agent cannot rotate the token).**

1. In the Cloudflare dashboard create a new API token (account API token preferred; user token works): permission **Account, Workers Scripts, Edit**; resources **Include, the one Metro account** only (no zones, no other accounts, no other permissions); set an expiry about 90 days out; no IP filtering unless GitHub-hosted runners are accounted for.
2. In GitHub, repository Settings, Environments, `preview`, replace the secret `CLOUDFLARE_API_TOKEN` with the new value. Do not put it in a repository secret, a variable, a file, an issue or a chat. Leave the variable `CLOUDFLARE_ACCOUNT_ID` unchanged.
3. Verify: run the Cloudflare token check workflow by hand and confirm it passes and reports about the expected days remaining. Then push or re-run a same-repository pull request and confirm its `preview` job deploys.
4. Revoke the old token in the Cloudflare dashboard only after step 3 passes.
5. Record the new expiry: update the date in this section and in the METRO-13 paragraph above, and note the rotation in the ticket. Set a calendar reminder about 30 days before it.

Accepted checks for this procedure are in `scripts/cloudflare-token-check.test.ts` and `scripts/cloudflare-token-check-workflow.test.ts`. The live workflow has not been run: it needs owner approval of the `preview` environment and registration of the workflow on the default branch.
