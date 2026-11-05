# Default-branch cutover runbook (master to main, v1.0.0)

Status: plan. Nothing here has been run. The decision, preconditions and sources are in [ADR-0008](../adr/0008-default-branch-switch.md); naming and notes rules are in the [version and tag policy](release-policy.md). Every command below is text for the repository owner to run after saying go; an agent runs only the read-only preflight. Commands are PowerShell or Git Bash; `$R` is the repository.

```powershell
$R = "tashfiqul-islam/metro-station-finder"
$TAG = "v1.0.0"
```

Stop at the first unexpected output. Never force-push, never move a tag, never skip a step to save time.

## 0. Prepare (days before)

1. Read-only preflight. It writes nothing and prints PASS, FAIL, INFO or MANUAL; a pass is not authorization. Re-run it after the pull request to `main` exists (step 2), because the `Quality gates` run of that pull request is attached to the head commit.

   ```powershell
   mise exec -- bun run cutover:preflight -- --repo $R --tag $TAG
   ```

2. Offline backup of the legacy history (the only copy of the commits after `v0.0.2`). Store the file outside the repository and outside the cloud copy of the project, and keep a second copy on a different medium.

   ```powershell
   git fetch origin --tags --prune
   $RECORDED = git rev-parse origin/master      # record this SHA in the release ticket (2026-11-04: af903d7a2c1bf08165cfcf4a00ca0c0d73eedead)
   git bundle create master-final.bundle origin/master
   git bundle verify master-final.bundle
   git bundle list-heads master-final.bundle    # the SHA on the origin/master line must equal $RECORDED
   Get-FileHash master-final.bundle -Algorithm SHA256   # record the hash in the release ticket
   ```

3. Save what the retirement step deletes, so it can be recreated:

   ```powershell
   gh api repos/$R/rulesets/26426527 > ruleset-26426527.json
   gh api repos/$R/environments/release/deployment-branch-policies > release-env-policies.json
   ```

4. Owner decisions before the window (delegated and recorded 2026-11-04): the legacy Pages site is unpublished at cutover after production is live; soak 24 hours to 14 days; the offline bundle is accepted as the only copy of the later `master` history. Still to name: the rollback owner and the time window.
5. No dress rehearsal before the switch. `release-draft` is `workflow_dispatch` only, and a dispatch needs the workflow file on the default branch (the manual-run page says "your workflow must be in the default branch", Web-verified); the live-test trick that registered it with a throwaway tag is not repeated. The rehearsal is step 3.6, after the switch, and never uses a `v1.0.0-rc.N` tag.
6. Cutover-prep pull request to `feature/metro-rebuild` (its own ticket; ADR-0008 item 8). It must pass `bun run check` (including `branches:check`) and have a recorded independent review. It keeps a push trigger for `feature/metro-rebuild` in `quality.yml` until step 6.3 (a comment in the file and `scripts/cutover-plan.test.ts` say so). Step 6.3 retires the branch; the step 6.4 pull request then removes the trigger and flips the docs. The window between 6.3 and 6.4 leaves a trigger for a deleted branch, which is harmless. The prep pull request also:
   - names `feature/metro-rebuild` as the current base branch in CONTRIBUTING.md, workflow.md and plane.md and points each at step 6.4, which flips all three at once (`branches:check` keeps them in agreement);
   - leaves `.github/renovate.json5` without `baseBranchPatterns` (formerly `baseBranches`; Web-verified in the Renovate docs, 2026-11-05). Renovate reads its config from the default branch only and, with no option set, processes only the default branch, so there is no Renovate edit at the flip: the file arrives on `main` with step 2 and Renovate targets `main` once step 3 makes it the default. A test fails if the option comes back. If a base branch is ever pinned again, `"$default"` denotes the default branch.

## 1. Freeze

Announce a freeze: no other pull request merges until step 6. Confirm:

```powershell
gh pr list --repo $R --state open --json number,baseRefName,headRefName
gh run list --repo $R --branch feature/metro-rebuild --limit 5
```

## 2. Bring the rebuild into main

The pull request is required by the `main` ruleset (pull_request, signed commits, `Quality gates` and `Reviewer record`, branch up to date). Use a merge commit, not squash or rebase: `main` is an ancestor, so a merge commit keeps the reviewed commits and their signatures.

```powershell
gh pr create --repo $R --base main --head feature/metro-rebuild --title "chore(release): bring the rebuild to main for v1.0.0" --body-file cutover-pr.md
mise exec -- bun run cutover:preflight -- --repo $R --tag $TAG   # now quality-gates-green and commits-verified must pass
gh pr checks <number> --repo $R --watch
gh pr merge <number> --repo $R --merge
git fetch origin
git diff --stat origin/main origin/feature/metro-rebuild   # must print nothing: identical trees
git rev-parse origin/main                                   # MAIN_SHA, record it
```

`cutover-pr.md` follows [the pull request template](../../.github/pull_request_template.md) with a real `Reviewer` section (the cutover-prep review); `none (docs only)` is not allowed because the diff contains code. GitHub signs its own merge commits; that this satisfies `required_signatures` on `main` specifically is Unverified (it works on `feature/metro-rebuild`, Repo-verified by earlier ticket merges). The preflight lists every commit in the range that GitHub does not mark verified.

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
5. Unpublish the legacy Pages site only after step 4.1 (production live) succeeded:

   ```powershell
   gh api -X DELETE repos/$R/pages
   ```

6. Optional rehearsal of draft, publish and sync, only when the preflight line `immutable-releases` says PASS (off), because the throwaway tag must be deletable. Create the Plane release `v0.0.0-cutover-test` first:

   ```powershell
   gh workflow run release-draft.yml --repo $R --ref main -f tag=v0.0.0-cutover-test -f target=<MAIN_SHA>
   gh release edit v0.0.0-cutover-test --repo $R --draft=false --prerelease
   ```

   Approve the runs, check the Plane release and its tag, then delete everything: `gh release delete v0.0.0-cutover-test --repo $R --cleanup-tag --yes`, and the Plane release and release tag by hand. Skip this step if anything about it is unclear; the production release does not depend on it.

## 4. Production, then the release

1. Deploy `MAIN_SHA` to production with the METRO-57 workflow and run its smoke. This must succeed on exactly `MAIN_SHA` or the Plane release cannot become `released`. The workflow and its owner setup are in the [deploy runbook](deploy-runbook.md) and [ADR-0012](../adr/0012-production-deploy.md): after its setup steps, `gh workflow run production-deploy.yml --repo $R --ref main`.
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

1. Gate. All of these must hold; the first two are the backstop for checklist item 15, because the preflight cannot see Actions history of a future schedule:

   ```powershell
   gh run list --repo $R --workflow cloudflare-token-check.yml --event schedule --branch main --status success --limit 1   # must list a run; the owner confirms it
   gh pr list --repo $R --state open --base master                      # must be empty
   gh pr list --repo $R --state open --base feature/metro-rebuild        # must be empty (or deliberately closed)
   ```

   Then prove the backup is still the live `master`, not a stale copy (the recorded SHA is the one from step 0.2 and the ticket):

   ```powershell
   git fetch origin --prune
   $live = (git ls-remote origin refs/heads/master).Split("`t")[0]
   $bundled = ((git bundle list-heads master-final.bundle) | Where-Object { $_ -match 'refs/remotes/origin/master$' }).Split(' ')[0]
   git bundle verify master-final.bundle
   Get-FileHash master-final.bundle -Algorithm SHA256   # equals the hash recorded in step 0.2
   mise exec -- bun run cutover:preflight -- --repo $R --tag $TAG --master-sha $RECORDED
   ```

   Read only the `master-sha` line of that report: it fails if the live head moved. Other lines are pre-cutover checks and fail by design now (`default-branch`, `main-fast-forward` because `main` is ahead, `release-tag-free` because the tag exists).

2. Delete `master`, only if all three SHAs agree. The default is `main`, so GitHub allows it:

   ```powershell
   if ($live -ne $RECORDED -or $bundled -ne $RECORDED) { throw "master moved or the bundle is stale: live=$live bundled=$bundled recorded=$RECORDED" }
   gh api -X DELETE repos/$R/git/refs/heads/master
   ```

3. Retire `feature/metro-rebuild`: retarget any pull request, then in Settings, Rules, delete ruleset 26426527 (its `deletion` rule blocks removing the branch; a ruleset change is owner-only), remove the `feature/metro-rebuild` (and `master`) branch policies from the `release` and `github-pages` environments, then:

   ```powershell
   gh api -X DELETE repos/$R/git/refs/heads/feature/metro-rebuild
   ```

   After this step the rollback to the master arrangement is not supported (see Stage C).

4. Update the docs in one reviewed pull request to `main`. The exact edit that keeps `branches:check` meaningful: in [workflow](workflow.md) replace the whole "Integration exception" section with one paragraph that starts "Owner requires ticket PRs target `main`." (the gate reads the phrase `ticket PRs target` followed by a backticked branch, and `CONTRIBUTING.md` and `plane.md` keep theirs); change the base branch named in `CONTRIBUTING.md` and `plane.md` to `main`; reword the integration-branch sentences in [development](../development.md) and [maintenance](maintenance.md) (their transition text is already a pointer to this runbook); remove `feature/metro-rebuild` from the `quality.yml` push trigger and its comment; keep `branches:check` green. Tell collaborators to run `git fetch origin --prune` and `git remote set-head origin -a`.

## Rollback by stage

The rollback owner is the repository owner. The deployment rollback is `wrangler rollback` on the production Worker only (METRO-57 procedure). `main` is never rewritten; fix forward by a reviewed pull request. A faulty version number is never reused; if the faulty release was published, delete it and its tag (`gh release delete $TAG --repo $R --cleanup-tag --yes`; `release-sync` then resets the Plane release to `unreleased`, or dispatch it by hand) and release the next number. The preflight reported immutable releases off on 2026-11-04; if that changes, a published tag cannot be deleted.

**Stage A, after step 3 and before step 6.2 (`master` and `feature/metro-rebuild` both exist).** Full rollback:

```powershell
gh api -X PATCH repos/$R -f default_branch=master
gh pr edit <number> --repo $R --base feature/metro-rebuild      # for each pull request retargeted in step 3
```

Scheduled and dispatch workflows stop being available from the default branch again; the Pages site, if already unpublished, stays unpublished.

**Stage B, after step 6.2 and before step 6.3 (`master` deleted, `feature/metro-rebuild` still exists).** First recreate `master`, then run Stage A:

```powershell
gh api repos/$R/git/refs -f ref=refs/heads/master -f sha=$RECORDED
```

If GitHub no longer has the commit (retention of unreferenced commits is Unverified), restore from the bundle:

```powershell
git init restored
git -C restored fetch ../master-final.bundle refs/remotes/origin/master:refs/heads/master
git -C restored push https://github.com/$R.git refs/heads/master:refs/heads/master
```

**Stage C, after step 6.3 (`feature/metro-rebuild` and its ruleset deleted).** Rolling back to the master and integration-branch arrangement is not supported. Fix forward on `main`. If the owner nevertheless decides to restore the arrangement, it is best effort and untested: recreate `master` as in Stage B, recreate the branch and its ruleset, then run Stage A:

```powershell
gh api repos/$R/git/refs -f ref=refs/heads/feature/metro-rebuild -f sha=<MAIN_SHA>
gh api -X POST repos/$R/rulesets --input ruleset-26426527.json   # edit the saved file down to the writable fields first (name, target, enforcement, conditions, rules, bypass_actors)
```
