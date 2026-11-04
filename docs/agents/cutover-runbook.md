# Default-branch cutover runbook (master to main, v1.0.0)

Status: plan. Nothing here has been run. The decision, preconditions and sources are in [ADR-0008](../adr/0008-default-branch-switch.md); naming and notes rules are in the [version and tag policy](release-policy.md). Every command below is text for the repository owner to run after saying go; an agent runs only the read-only preflight. Commands are PowerShell or Git Bash; `$R` is the repository.

```powershell
$R = "tashfiqul-islam/metro-station-finder"
$TAG = "v1.0.0"
```

Stop at the first unexpected output. Never force-push, never move a tag, never skip a step to save time.

## 0. Prepare (days before)

1. Read-only preflight. It writes nothing and prints PASS, FAIL, INFO or MANUAL; a pass is not authorization.

   ```powershell
   mise exec -- bun run cutover:preflight -- --repo $R --tag $TAG
   ```

2. Offline backup of the legacy history (the only copy of the commits after `v0.0.2`). Store the file outside the repository and outside the cloud copy of the project.

   ```powershell
   git fetch origin --tags
   git bundle create master-final.bundle origin/master
   git bundle verify master-final.bundle
   git rev-parse origin/master   # record this SHA in the release ticket (2026-11-04: af903d7a2c1bf08165cfcf4a00ca0c0d73eedead)
   ```

3. Owner decisions before the window: the fate of the legacy Pages site and the `github-pages` environment (ADR-0008 item 6); who is rollback owner; the time window.
4. Optional dress rehearsal of draft, publish and sync with a prerelease. The tag is permanent; use a number you accept (`v1.0.0-rc.1`), create the Plane release of that name first.

   ```powershell
   gh workflow run release-draft.yml --repo $R --ref feature/metro-rebuild -f tag=v1.0.0-rc.1 -f target=feature/metro-rebuild
   ```

   The workflow must already be registered on GitHub (see the live-test notes in [release-draft](../specifications/release-draft.md)); if it is not, skip the rehearsal and rely on step 4.3.

5. Cutover-prep pull request to `feature/metro-rebuild` (ADR-0008 item 8). It must pass `bun run check` (including `branches:check`) and have a recorded independent review.

## 1. Freeze

Announce a freeze: no other pull request merges until step 6. Confirm:

```powershell
gh pr list --repo $R --state open --json number,baseRefName,headRefName
gh run list --repo $R --branch feature/metro-rebuild --limit 5
```

## 2. Bring the rebuild into main

The pull request is required by the `main` ruleset (pull_request, signed commits, `Quality gates` and `Reviewer record`, branch up to date). Use a merge commit, not squash or rebase: `main` is an ancestor, so a merge commit keeps the 101 reviewed commits and their signatures.

```powershell
gh pr create --repo $R --base main --head feature/metro-rebuild --title "chore(release): bring the rebuild to main for v1.0.0" --body-file cutover-pr.md
gh pr checks <number> --repo $R --watch
gh pr merge <number> --repo $R --merge
git fetch origin
git diff --stat origin/main origin/feature/metro-rebuild   # must print nothing: identical trees
git rev-parse origin/main                                   # MAIN_SHA, record it
```

`cutover-pr.md` follows [the pull request template](../../.github/pull_request_template.md) with a real `Reviewer` section (the cutover-prep review); `none (docs only)` is not allowed because the diff contains code. GitHub signs its own merge commits; that this satisfies `required_signatures` on `main` is Unverified for `main` specifically (it works on `feature/metro-rebuild`, Repo-verified by earlier ticket merges).

## 3. Switch the default

```powershell
gh api -X PATCH repos/$R -f default_branch=main
gh repo view $R --json defaultBranchRef --jq .defaultBranchRef.name   # main
```

Then, in order:

1. Retarget every open pull request (GitHub documents automatic retargeting only for renames):

   ```powershell
   gh pr list --repo $R --state open --base master --json number
   gh pr edit <number> --repo $R --base main
   gh pr list --repo $R --state open --base master    # must be empty
   ```

2. Prove the default-branch-only triggers. The weekly schedule is now live; run the check by hand once:

   ```powershell
   gh workflow list --repo $R
   gh workflow run cloudflare-token-check.yml --repo $R --ref main
   gh run list --repo $R --workflow cloudflare-token-check.yml --limit 1
   ```

3. Renovate: confirm the Dependency Dashboard issue appears and a first pull request targets `main` (if the Renovate app is installed; Unverified today).
4. Check the repository's security settings page shows alerts for `main` (Dependabot alerts follow the default branch).

## 4. Production, then the release

1. Deploy `MAIN_SHA` to production with the METRO-57 workflow and run its smoke. This must succeed on exactly `MAIN_SHA` or the Plane release cannot become `released`. (The workflow and its command are defined by METRO-57, not here.)
2. Ensure the Plane release `v1.0.0` exists, is `unreleased` and has no external source; fill its release log with the tickets, pull requests and a `Deferred` heading ([policy](release-policy.md#release-notes)).
3. Create the draft on the exact commit and approve the `release` environment prompt after checking tag and commit:

   ```powershell
   gh workflow run release-draft.yml --repo $R --ref main -f tag=$TAG -f target=<MAIN_SHA>
   gh release view $TAG --repo $R --json tagName,isDraft,isPrerelease,targetCommitish
   ```

4. Review and edit the draft on GitHub, then publish (this creates the tag):

   ```powershell
   gh release edit $TAG --repo $R --draft=false --latest
   gh api repos/$R/git/ref/tags/$TAG --jq .object.sha   # must equal MAIN_SHA
   ```

5. Approve the `release-sync` run it starts. Verify: the Plane release `v1.0.0` is `released` with the tag and commit hash and the notes as its log; if the run failed, re-run it by hand: Actions, Release sync, Run workflow, tag `v1.0.0`.

## 5. Soak

Keep `master` for at least 24 hours and until the first scheduled `cloudflare-token-check` run (Mondays 06:17 UTC) has succeeded on `main`; at most 14 days. Watch: Quality gates on `main`, production health, Renovate, the dashboard.

## 6. Delete master and retire the integration branch (separate owner go)

1. Preconditions: nothing open targets `master`; the bundle verifies again; the Pages decision is executed (if unpublishing: `gh api -X DELETE repos/$R/pages`); the `master` head SHA is recorded.

   ```powershell
   gh pr list --repo $R --state open --base master    # must be empty
   git bundle verify master-final.bundle
   ```

2. Delete `master` (the default is `main`, so GitHub allows it; open pull requests on it would be closed):

   ```powershell
   gh api -X DELETE repos/$R/git/refs/heads/master
   ```

3. Retire `feature/metro-rebuild`: retarget any pull request, then in Settings, Rules, delete ruleset 26426527 (its `deletion` rule blocks removing the branch; a ruleset change is owner-only), remove the `feature/metro-rebuild` (and `master`) branch policies from the `release` and `github-pages` environments, then:

   ```powershell
   gh api -X DELETE repos/$R/git/refs/heads/feature/metro-rebuild
   ```

4. Update the docs in one reviewed pull request to `main`: remove the integration exception in [workflow](workflow.md), and the release-time transition text in [development](../development.md) and [maintenance](maintenance.md), keeping the `branches:check` gate green. Tell collaborators to run `git fetch origin --prune` and `git remote set-head origin -a`.

## Rollback

Before step 6.2 (master still exists):

```powershell
gh api -X PATCH repos/$R -f default_branch=master
gh pr edit <number> --repo $R --base feature/metro-rebuild      # for each pull request retargeted in step 3
gh release delete $TAG --repo $R --cleanup-tag --yes             # only if v1.0.0 was published and is faulty
```

Deleting the release makes `release-sync` reset the Plane release to `unreleased` (if the delete event does not fire, dispatch the sync by hand). Roll the Worker back with the METRO-57 procedure (`wrangler rollback` on the production Worker only). `main` keeps its content; fix forward by a reviewed pull request. A faulty version number is never reused. If immutable releases are enabled, the tag cannot be deleted; release the next number.

After step 6.2 (master deleted):

```powershell
gh api repos/$R/git/refs -f ref=refs/heads/master -f sha=<RECORDED_MASTER_SHA>
```

If GitHub no longer has the commit (retention of unreferenced commits is Unverified), restore from the bundle:

```powershell
git init restored
git -C restored fetch ../master-final.bundle refs/remotes/origin/master:refs/heads/master
git -C restored push https://github.com/$R.git refs/heads/master:refs/heads/master
```

Then run the first block of this section.
