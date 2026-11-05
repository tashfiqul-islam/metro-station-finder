# Production deploy runbook

Status: plan. Nothing here has been run. Decisions and sources are in [ADR-0012](../adr/0012-production-deploy.md); the workflow is `.github/workflows/production-deploy.yml`, its logic `scripts/production.ts`. Every write below is an owner action; an agent runs only the read-only checks in steps 5 (settings check) and 6. Commands are PowerShell or Git Bash.

```powershell
$R = "tashfiqul-islam/metro-station-finder"
```

The workflow is inert until step 5. Do the steps in this order; the order is the safety.

## 1. Create the `production` environment with the reviewer and policies

```powershell
$OWNER_ID = gh api users/tashfiqul-islam --jq .id
@"
{"reviewers":[{"type":"User","id":$OWNER_ID}],"prevent_self_review":false,"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
"@ | gh api -X PUT repos/$R/environments/production --input -
gh api -X POST repos/$R/environments/production/deployment-branch-policies -f name='v*' -f type=tag
gh api -X POST repos/$R/environments/production/deployment-branch-policies -f name='main' -f type=branch
```

`prevent_self_review` stays false: the owner is the only reviewer and pushes the tag. The branch `feature/metro-rebuild` is deliberately not listed (ADR-0012 item 2).

## 2. Create a dedicated Cloudflare token and the environment secrets

In the Cloudflare dashboard create a new account API token for this account only (template "Edit Cloudflare Workers", or narrower once step 7 proves it works). Do not reuse the `preview` token. Then:

```powershell
gh secret set CLOUDFLARE_API_TOKEN --env production --repo $R      # paste the value at the prompt
gh variable set CLOUDFLARE_ACCOUNT_ID --env production --repo $R --body "<account id>"
```

Never put the token in a repository secret, a file, an issue or a chat. Rotate it before its expiry and record the date in [maintenance](maintenance.md).

## 3. Bootstrap the production Worker once (Cloudflare write, owner only)

`wrangler versions upload` fails for a Worker that does not exist, so the first version is a plain deploy of the commit you intend to ship. With the owner's own Wrangler login, from a clean checkout of that commit:

```powershell
mise exec -- bun run bootstrap
mise exec -- bun run build
mise exec -- bunx wrangler deploy --config apps/web/dist/metro_scaffold/wrangler.json --name metro-scaffold
```

The config sets top-level `workers_dev: false` and leaves `preview_urls` unset (only the `preview` environment sets it), so this exposes nothing yet. Check in the dashboard (Settings, Domains and Routes) that no workers.dev route or Version URL is enabled and that the Worker has no dashboard-only variables (the workflow uploads without `--keep-vars`, which would delete them).

## 4. Connect the custom domain (separate authorization)

The domain cutover is its own owner-authorized step ([cutover runbook](cutover-runbook.md) step 4). Connect it to the Worker `metro-scaffold`, then confirm `https://<domain>/api/scaffold/status` answers.

## 5. Check the settings, then switch the workflow on (last)

First run the read-only settings check. It makes six `gh api` GET calls and changes nothing; it must print only `PASS` lines and exit 0 before you set the variable. A repository-level Cloudflare secret or variable would let a run in an unprotected, auto-created `production` environment proceed, which is why the check fails on one.

```powershell
mise exec -- node scripts/production.ts check-settings $R
```

Expected output:

```text
PASS required reviewer: tashfiqul-islam
PASS custom deployment policies: environment must use custom branch and tag policies
PASS tag policy: v* must be allowed
PASS branch policy: main must be allowed
PASS no unexpected policies: none
PASS no repository secret: Cloudflare names at repository level: none
PASS no repository variable: Cloudflare names at repository level: none
PASS environment secret: CLOUDFLARE_API_TOKEN exists in production
PASS environment variable: CLOUDFLARE_ACCOUNT_ID exists in production
```

Any `FAIL` line names what to fix (a missing reviewer or policy, a Cloudflare secret or variable at repository level, a missing environment secret). Do not set `PRODUCTION_DEPLOY_ENABLED` until it is clean. Only after that:

```powershell
gh variable set PRODUCTION_URL --repo $R --body "https://<domain>"          # origin only: https, no path, no query
gh variable set PRODUCTION_DEPLOY_ENABLED --repo $R --body "true"
```

Run it: push the stable tag `vX.Y.Z` on a commit of `main` that contains the workflow, or dispatch from `main` before the tag exists ([cutover runbook](cutover-runbook.md) step 4.1):

```powershell
gh workflow run production-deploy.yml --repo $R --ref main
```

Create the tag only on a commit that is already merged to `main`: the first steps of the job fail the run otherwise (`git merge-base --is-ancestor`), before any repository script runs. A tag on any other commit never deploys.

Approve the `production` prompt after checking the ref and commit. The job: records the serving version; uploads the new version; stages it at 0 percent; smokes it through a version override; moves it to 100 percent; smokes; soaks 120 seconds; smokes again. Any failure runs `wrangler rollback` to the recorded version and smokes that. On a tag run a green deploy then dispatches `release-sync` for the tag; approve its `release` prompt.

Queued runs: the workflow uses the concurrency group `production-deploy` with `cancel-in-progress: false`, so a running deploy is never cancelled by a newer one. GitHub still keeps only one _pending_ run per group and replaces an older pending run with a newer one, so a queued tag deploy can be dropped when a second run is queued behind it. After pushing a tag, open the Actions tab; if the run for your tag is missing or cancelled, re-run it (or dispatch again from `main`). Never queue two deploys at once.

Re-runs: each Worker version gets the tag `<first 12 characters of the commit>-<run id>-<attempt>`, so a re-run of the same run has a new attempt number. Whether Cloudflare would accept a duplicate tag is Unverified, which is why the attempt is part of the label.

If a run is cancelled or times out after staging, the rollback step runs; if it was cancelled earlier nothing changed. In either case look at the job summary for the recorded previous version.

To switch it off at any time: `gh variable set PRODUCTION_DEPLOY_ENABLED --repo $R --body "false"`.

## 6. Read-only checks (safe for an agent)

```powershell
gh api repos/$R/environments/production --jq '{reviewers: [.protection_rules[]? | select(.type=="required_reviewers") | .reviewers[].reviewer.login], policy: .deployment_branch_policy}'
gh api repos/$R/environments/production/deployment-branch-policies --jq '.branch_policies[] | {name, type}'
gh variable list --repo $R
gh api "repos/$R/deployments?environment=production&sha=<commit>" --jq '.[].id'     # what release-sync reads
gh api repos/$R/deployments/<id>/statuses --jq '.[].state'                         # needs a "success"
```

Expect exactly one reviewer (`tashfiqul-islam`), policies `v*` (tag) and `main` (branch), and no repository secret holding a Cloudflare token.

## 7. Manual rollback and first-run checks

Automatic rollback covers a failed smoke. For a problem found later:

```powershell
mise exec -- bunx wrangler deployments list --name metro-scaffold
mise exec -- bunx wrangler rollback <version-id> --name metro-scaffold --message "reason"
```

A rollback does not change bindings or stored data ([Cloudflare](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/), Web-verified 2026-11-05). It does not undo the GitHub deployment record; if the release must be retracted, follow the rollback section of the [cutover runbook](cutover-runbook.md).

The first real run proves these Unverified points; if a step fails the job stops or rolls back, and the fix is a reviewed change to the workflow or `scripts/production.ts`: the live JSON of `wrangler deployments status --json` (the parser `currentVersionId` follows the installed Wrangler source and fails closed on anything else), that `versions deploy` accepts `@0%`, that the version override also selects the static asset set for `/`, and that the token has every permission it needs. Live verification with a throwaway tag is not part of METRO-57.
