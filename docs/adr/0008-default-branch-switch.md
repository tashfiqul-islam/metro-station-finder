# ADR-0008: Default-branch switch from master to main for v1.0.0

- Status: Accepted (plan only; the switch itself is not authorized by this ADR)
- Date: 2026-11-04
- Ticket and specification: METRO-34; owner decisions of 2026-11-04 recorded below. Operating steps: [cutover runbook](../agents/cutover-runbook.md). Naming rule: [version and tag policy](../agents/workflow.md#releases).

## Context

The default branch is still `master` (the legacy implementation, head `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`). The rebuild lives on `feature/metro-rebuild`. `main` exists, holds an older part of the rebuild (head `d5f8b3bd3` on 2026-11-04) and is an ancestor of `feature/metro-rebuild`, 101 commits behind it. Repo-verified by `gh` read-only calls on 2026-11-04: rulesets exist for `refs/heads/main` (id 26467450: deletion, non_fast_forward, required_signatures, pull_request, required status checks `Quality gates` and `Reviewer record`, strict) and `refs/heads/feature/metro-rebuild` (id 26426527); the `release` environment allows branches `main` and `feature/metro-rebuild` and tags `v*`; `github-pages` allows `master` and `v*`; GitHub Pages is enabled with a workflow build and answers HTTP 200; the only tags are `v0.0.1` and `v0.0.2`, both on the `master` line; no pull request is open.

Several GitHub features work only from the default branch (Web-verified, [events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), read 2026-11-04):

- `schedule` runs "only on the default branch", on its latest commit. The weekly Cloudflare token check is inert until the switch ([maintenance](../agents/maintenance.md)).
- `workflow_dispatch` and `workflow_run` "only trigger a workflow run if the workflow file exists on the default branch"; once a workflow has run at least once it can be dispatched against any branch or tag. `release-draft` and any scheduled reconcile depend on this ([release-draft](../specifications/release-draft.md)).
- Renovate "always uses the config from the repository's default branch" ([Renovate docs](https://docs.renovatebot.com/configuration-options/), Web-verified). Our `.github/renovate.json5` is on `feature/metro-rebuild`, so Renovate is not reading it today (whether the Renovate app is installed is Unverified). The file sets no base branch (METRO-61 removed `baseBranchPatterns`; without it Renovate processes only the default branch), so there is no Renovate edit at the switch.
- Dependabot alerts and the dependency graph are based on the default branch ([GitHub docs](https://docs.github.com/en/code-security/dependabot/dependabot-alerts/about-dependabot-alerts), Web-verified).
- A pull request run can restore caches from its own branch and the default branch; a cache made by a pull request run is scoped to the merge ref ([dependency caching](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching), Web-verified). Caches built on `main` therefore serve every branch.
- Pull requests use the `CODEOWNERS` file of their base branch ([about code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners), Web-verified).

A long-lived integration branch beside a legacy default delays all of these. Release sync already assumes the switch: a `release` event runs the workflow file from the tag, and a stable release becomes `released` only with a successful `production` deployment on the tagged commit ([ADR-0007](0007-release-sync.md)).

## Decision

Owner decisions, 2026-11-04: once the code is 100 percent ready, v1.0.0 goes live with `main` as the default branch and `master` deleted. The `v1.0.0` tag is created on GitHub and the matching release and tag on Plane, so both stay aligned.

We will do this:

1. **Method: no rename.** `main` already exists, so a rename of `master` is impossible and would not carry the rebuild anyway. We bring the rebuild into `main` with a pull request from `feature/metro-rebuild` to `main` (merge commit; `main` is an ancestor, so the content equals `feature/metro-rebuild` exactly), switch the default to `main`, retarget open pull requests, and later delete `master` and `feature/metro-rebuild`. The pull request is required: the `main` ruleset forbids direct pushes by requiring pull requests, and forbids force pushes.
2. **Timing: a gate, not a date.** The switch happens only when every item of the readiness checklist below is true and the owner says go. There is no calendar date. The release tag is created last, after the switch and a production deployment of the exact commit.
3. **Order, one line.** Prepare (cutover-prep pull request, backup, freeze) then merge `feature/metro-rebuild` into `main` then switch the default then retarget pull requests then deploy production from the `main` commit then draft and publish `v1.0.0` then soak then delete `master` then retire `feature/metro-rebuild`. Exact commands are in the [runbook](../agents/cutover-runbook.md).
4. **Deleting `master` is separated from the switch by a soak.** `master` is deleted after the first scheduled Cloudflare token check has succeeded on `main` (it runs Mondays 06:17 UTC), at least 24 hours after the switch, at most 14 days after it. Until then the switch is reversible by setting the default back and retargeting the pull requests (rollback Stage A). The preflight cannot see a future schedule run, so the owner confirms the first scheduled run succeeded (`gh run list ... --event schedule --branch main --status success`, runbook 6.1) before deleting; that confirmation is the backstop for checklist item 15. The deletion needs the owner's separate go.
5. **Old history.** Deleting a branch does not delete tags. `v0.0.1` and `v0.0.2`, the only released legacy versions, stay reachable through their tags. The commits on `master` after `v0.0.2` (up to `af903d7`) have no other reference. Concrete need: they would be lost, and the rollback below needs them. So before deletion we make an offline `git bundle` of `origin/master` outside the repository and record the head SHA here and in the runbook; no archive branch or tag is kept on GitHub (an archive branch would defeat the owner's decision, and a `v*`-style tag would break the tag rule). The bundle is the only copy of that history after GitHub garbage-collects; the owner keeps it, with a second copy on a different medium. A stale bundle must not be trusted: the runbook compares `git bundle list-heads`, `git ls-remote origin refs/heads/master` and the SHA recorded in the ticket, records the bundle's SHA-256, and makes the `DELETE` conditional on all three agreeing (`cutover:preflight --master-sha` reports the same comparison).
6. **Legacy site.** Pages is built from `master`'s workflow. Deleting `master` removes that workflow. What happens to the already-published site if left alone is Unverified. Owner decision (delegated, 2026-11-04): the legacy site is unpublished at cutover, after production is live (runbook 3.5).
7. **Rulesets.** The `main` ruleset (26467450) already exists and is kept unchanged. The `feature/metro-rebuild` ruleset (26426527) is deleted by the owner when that branch is retired, because its `deletion` rule blocks removing the branch. No ruleset is created or changed by this ADR; the preflight script reads the `main` ruleset and fails if it lacks the rules above.
8. **Cutover-prep pull request** (the last pull request to `feature/metro-rebuild`, by a separate ticket): `CONTRIBUTING.md`, `docs/agents/workflow.md` and `docs/agents/plane.md` keep naming `feature/metro-rebuild` while it is the real base (this pull request and the freeze-time merges still target it) and point at runbook step 6.4, where all three change to `main` together (the `branches:check` gate fails if only some do; amended by METRO-61, which found that naming `main` earlier would send ticket pull requests to the wrong branch); `.github/renovate.json5` drops `baseBranchPatterns` (default is the default branch), so there is no Renovate edit at the flip; `quality.yml` adds pushes to `main` and keeps a push trigger for `feature/metro-rebuild` until that branch is retired (runbook 6.3), so the head of the integration branch always has a `Quality gates` run for the preflight to read; the `Quality gates` run of the pull request to `main` also attaches to that head commit, and the preflight reads check runs by commit, not by event; `docs/development.md` and `docs/agents/maintenance.md` replace their transition text with a pointer to this ADR; `release-draft` already defaults `target` to `main`.
9. **Version and tag naming** is one rule in the [policy](../agents/workflow.md#releases): SemVer, tag `v<major>.<minor>.<patch>[-<prerelease>]`, the owner bumps, notes flow from the Plane release log to the GitHub draft and back.

### Why v1.0.0 and SemVer

SemVer says `0.y.z` is for initial development and `1.0.0` defines the public API ([semver.org](https://semver.org/), Web-verified). The owner decided this release is the first production release with an HTTP contract and a parity matrix that are declared, so `1.0.0` is correct, and `v0.0.1` and `v0.0.2` remain the pre-rebuild history. No `v1.0.0-rc.N` tag is planned (owner decision, 2026-11-04: not unless immutable releases are verified off). The draft-and-sync path is rehearsed after the switch with a deletable throwaway tag `v0.0.0-cutover-test`, and only while the preflight reports immutable releases off (Repo-verified off on 2026-11-04 by `GET /repos/{owner}/{repo}/immutable-releases`, which returned `enabled: false`). It cannot be rehearsed earlier: the workflow file must be on the default branch to be dispatched (the manual-run page says "your workflow must be in the default branch", [manually running a workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow), Web-verified), and `release-draft` is not on `master`. The events page says a workflow that has run at least once can be dispatched against any branch or tag; the plan does not rely on that.

### Readiness checklist ("100 percent ready")

All must be true. Items 1 to 8 are checked by `bun run cutover:preflight` where GitHub can answer; the rest are manual and shown as MANUAL, never as PASS.

1. `Quality gates` succeeded on the head of `feature/metro-rebuild` (preflight; reads the check runs of that commit, whichever event started them), and every commit in `main...feature/metro-rebuild` shows a verified signature (preflight; the commits from an earlier agent session with the wrong identity showed as unverified).
2. `main` is an ancestor of `feature/metro-rebuild`, so the merge brings in exactly the reviewed history (preflight).
3. An active ruleset targets `refs/heads/main` with deletion, non_fast_forward, required_signatures, pull_request and `Quality gates`; `Reviewer record` is a required check on both `main` and `feature/metro-rebuild`; the preflight also prints the approvals the pull request rule requires (preflight).
4. The `release` environment allows branch `main` and tag `v*` (preflight).
5. The tag `v1.0.0` does not exist and is valid under the tag rule (preflight).
6. `v0.0.1` and `v0.0.2` exist (preflight).
7. The repository default is still `master`, and the `master` head SHA is recorded (preflight).
8. Open pull requests and their bases are listed and none will be orphaned (preflight, informational).
9. METRO-57 (production deploy) is Done: a production deployment of a `main` commit works, with smoke evidence, and its workflow dispatches `release-sync` afterwards (manual).
10. METRO-31 (security headers) is Done with evidence (manual).
11. METRO-15 (web rebuild and parity) is Done, and `docs/product/feature-parity.md` has no gap that is not explicitly accepted by the owner (manual).
12. Every other module 02 ticket (METRO-31 to METRO-59) is Done or named under the `Deferred` heading of the release notes, which the owner accepts (manual).
13. The Plane release `v1.0.0` exists and is unreleased with no external source, and the `release` environment has a valid `PLANE_API_KEY` (expiry 2027-02-03) (manual).
14. `bun run check`, `build`, `smoke`, `bundle:check` and `scan` pass on the release commit, and an independent review of the cutover-prep pull request is recorded (manual).
15. The offline bundle of `master` is made, verified and fresh (its head equals the live `master` and the SHA in the ticket; second copy kept), the rollback owner is named and a time window is agreed (manual). Backstop before `master` is deleted: the owner confirms the first scheduled token check succeeded on `main`.
16. The owner says go (manual).

## Facts checked, and how the switch behaves

- Changing the default branch needs repository admin access ([docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/changing-the-default-branch), Web-verified). The REST call is `PATCH /repos/{owner}/{repo}` with `default_branch` ([docs](https://docs.github.com/en/rest/repos/repos#update-a-repository), Web-verified).
- Retargeting: GitHub documents automatic retargeting of open pull requests only for a branch rename ([renaming a branch](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-branches-in-your-repository/renaming-a-branch), Web-verified). It documents nothing about a change of default branch, so we do not rely on it: open pull requests are retargeted explicitly with `gh pr edit --base main` ([gh pr edit](https://cli.github.com/manual/gh_pr_edit), Web-verified).
- Deleting a branch with open pull requests closes them (GitHub docs on [managing branches](https://docs.github.com/en/pull-requests/how-tos/commit-changes/managing-branches-within-your-repository) and the 2022 changelog, read via search summary, so Secondary). The default branch cannot be deleted, so the default must move first. Therefore every pull request is retargeted or deliberately closed before `master` is deleted.
- Rulesets: GitHub's rulesets page describes targeting by branch name and `fnmatch` patterns and says nothing about renames ([creating rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository), Web-verified). Our rulesets name `refs/heads/main` and `refs/heads/feature/metro-rebuild` explicitly, so changing the default changes no ruleset. Whether `~DEFAULT_BRANCH` exists in the target syntax was not found in the fetched page and is Unverified; we do not use it.
- Release tags: `gh release create` creates a missing tag "from the latest state of the default branch" unless `--target` is given ([gh release create](https://cli.github.com/manual/gh_release_create), Web-verified). Our release goes through `release-draft`, which sets `target_commitish` to the explicit commit and never publishes. After a release is published, with immutable releases enabled its tag cannot be moved or deleted ([managing releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository), Web-verified); the repository setting was read live and is off (Repo-verified 2026-11-04, `GET /repos/{owner}/{repo}/immutable-releases` returned `enabled: false`; endpoint Web-verified in the REST docs, where a 404 means not enabled). It can change, so the preflight reads it each time and a published tag is still treated as permanent.
- Scheduled workflows in a public repository are disabled after 60 days without repository activity (Web-verified, events page above); the weekly token check is itself a signal to watch.
- The `release` environment's deployment-branch policies were read live (Repo-verified) and need no change at the switch; only the removal of `feature/metro-rebuild` at the end.

## Rollback

What can be undone depends on the stage; the commands are in the [runbook](../agents/cutover-runbook.md#rollback-by-stage). In every stage `main` keeps its content (fix forward by a reviewed pull request, since the `main` ruleset forbids force pushes), a faulty version number is never reused, and a faulty published release is deleted with its tag (`gh release delete --cleanup-tag`, flag Web-verified) after which `release-sync` resets the Plane release to `unreleased`. The Worker is rolled back with the METRO-57 procedure. The rollback owner is the repository owner.

- **Stage A, after the default switch and before `master` is deleted** (`master` and `feature/metro-rebuild` both exist): fully supported. Set the default back to `master` (`gh api -X PATCH repos/<repo> -f default_branch=master`) and retarget the pull requests back with `gh pr edit --base`.
- **Stage B, `master` deleted, `feature/metro-rebuild` still exists:** supported. Recreate `master` from the recorded SHA (`gh api repos/<repo>/git/refs -f ref=refs/heads/master -f sha=<SHA>`) if GitHub still has the commit (Unverified how long it keeps unreferenced commits), otherwise push it from the offline bundle, then do Stage A.
- **Stage C, `feature/metro-rebuild` and its ruleset deleted:** rolling back to the master arrangement is not supported. Fix forward on `main`. A best-effort, untested restore exists in the runbook (recreate `master`, recreate the branch from `<MAIN_SHA>` and the ruleset from the JSON saved before the window, then Stage A); the saved JSON must be trimmed to writable fields first.

## Consequences

- Scheduled and dispatch workflows work after the switch: the Cloudflare token check runs weekly, `release-draft` registers normally, and a scheduled reconcile from Plane becomes buildable.
- Renovate starts reading its configuration (if the app is installed), Dependabot alerts and the dependency graph follow `main`, and caches built on `main` serve all branches.
- The legacy Pages site and the `github-pages` environment need an owner decision.
- Ticket pull requests target `main` afterwards; `feature/metro-rebuild` is retired. The integration exception in [workflow](../agents/workflow.md#execution) then ends.
- `master` history after `v0.0.2` lives only in the owner's offline bundle.

## Alternatives considered

- **Rename `feature/metro-rebuild` to `main`.** Impossible while `main` exists; deleting `main` first would drop its ruleset and history for no gain.
- **Force-push `main` to the rebuild head.** The `main` ruleset forbids it, and force updates of history are against project policy ([development](../development.md)).
- **Keep `master` as an archive branch.** Contradicts the owner's decision, and the tags already keep the released history.
- **Switch the default now.** The legacy implementation would be replaced by an unfinished product before v1.0.0 is ready.
- **Tag first, switch later.** A stable release becomes `released` only with a successful `production` deployment on the tagged commit ([ADR-0007](0007-release-sync.md)), and a published tag must be treated as permanent. Tagging after the switch and the production deployment avoids a permanent tag on a commit that has no production proof.

## Confirmation

- `scripts/cutover-plan.test.ts` and `scripts/cutover-preflight.test.ts` (`bun run cutover:preflight`) check the plan and preconditions. The switch itself is an owner action: `None (policy)`.
