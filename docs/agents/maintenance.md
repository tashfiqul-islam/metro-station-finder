# Maintenance

Read when: changing tools, dependencies, pins, hooks, CI credentials, deploys, releases or Renovate.

## Rules

- Use Bun and the exact pins in `mise.toml`, package manifests and `bun.lock`. Run `mise install --locked`, then `mise exec -- bun run bootstrap`; frozen bootstrap validates runtime pins before the locked install. A personal global mise config that pins `latest` makes `--locked` fail; point `MISE_GLOBAL_CONFIG_FILE` at an empty file. `mise.toml` deliberately does not set `locked = true`. A generic global tool install is not evidence of project compatibility.
- Install hooks per checkout with `mise exec -- hk install --mise`, repeated for linked worktrees. `hk.pkl` pins hk 2.11.0 and Pkl 0.32.2. Preserve staged-snapshot stashing and failure restoration. Test real hooks in disposable fixtures, never in the caller's index or worktree, with `cleanGitEnv()` from `scripts/git-env.ts`.
- `mise.lock` (with `.mise/locks/`) records per-platform URL and sha256 for `windows-x64` and `linux-x64` only. Update a pin by editing `mise.toml`, running `mise lock` (never edit the lock by hand), reviewing `git diff mise.lock .mise` and committing both. A new tool also needs its reviewed backend entry in `scripts/mise-lock.ts`. Every workflow using `jdx/mise-action` sets workflow-level `MISE_LOCKED: "1"`.
- Renovate PRs must use a `minimumReleaseAge` equal to Bun's `install.minimumReleaseAge` in `bunfig.toml` (259200 s). Advisories bypass the cooldown. A pin newer than the cooldown needs a reason in evidence. If a bump fails `check` on the lock, run `mise lock` on the PR branch. `bun-types` equals the version `@types/bun` depends on.
- CI actions are pinned to full commits on `ubuntu-24.04` with mise 2026.10.25 and `permissions: {}` at workflow level. Verify official release commits before updating; keep least privilege.
- Updates need a frozen install, canonical checks, real hook regression tests and [independent review](workflow.md#independent-review). Keep the TypeScript 7 compiler settings and the TypeScript 6 dependency-parser seam. Never relax budgets, assertions or thresholds. Inspect `bun run scan` failures before changing exclusions.
- No deployment or rollback automation exists beyond the jobs below. Integration targets `feature/metro-rebuild`; a gate pass authorizes no branch switch, preview, production deploy or release. Roll back a bad change with a reviewed signed revert. The switch is in [ADR-0008](../adr/0008-default-branch-switch.md) and the [cutover runbook](cutover-runbook.md); `bun run cutover:preflight` reports its preconditions read-only.
- A credentialed job (mentions `CLOUDFLARE_` or `PLANE_` names, reads `secrets`, sets `environment:` or `secrets:`, uses a local reusable workflow or composite action, or is `workflow_call`) has no `actions/cache` or `actions/download-artifact` step and sets `cache: false` on every `jdx/mise-action` step. The `preview` job and `preview-cleanup.yml` also AND together, in their `if`, the same-repository check and every bot check (actor, PR author, `user.type`, `sender.type`), with no `||`. No bot gets the token. Do not add a setup action's own `cache` input to a credentialed job (not detected).
- Preview: same-repository PRs by a person get Worker `metro-scaffold-pr-<number>` from the `preview` job. `CLOUDFLARE_API_TOKEN` (secret) and `CLOUDFLARE_ACCOUNT_ID` (variable) live only in GitHub environment `preview`; the environment has no reviewers (they would stall the alarm and every deploy). Roll back with `wrangler rollback --name metro-scaffold-pr-<number>`; never run it against `metro-scaffold` (production). Use two account-scoped tokens, one for `preview` and one for `production`, narrowed to what each job needs, each with an expiry. Rotation and alarm: [runbook](maintenance-runbook.md).
- Concurrency: `Quality` and `Reviewer record` cancel superseded runs only for PRs, with a group per PR ref (commit SHA for pushes). Deploy, release, token-check and any credentialed job use `cancel-in-progress: false`.
- Release sync (`.github/workflows/release-sync.yml`, `scripts/release-sync.ts`) keeps Plane aligned with GitHub releases; GitHub is canonical, the run is idempotent and never changes work item states, and leaves released `v0.0.1` and `v0.0.2` alone. Run it by hand from Actions with tag `vX.Y.Z`. `PLANE_API_KEY` is a secret in GitHub environment `release` (owner approval per run; only tags `v*` and branches `main` and `feature/metro-rebuild`). The key expires 2027-02-03; rotate it before then. Retract by deleting or unpublishing the release; with immutable releases on, a bad release needs a new patch tag. Tag rules: [workflow](workflow.md#releases).
- Production deploy (`.github/workflows/production-deploy.yml`) ships a stable `v*` tag to Worker `metro-scaffold` through the approval-gated `production` environment, with automatic `wrangler rollback` on failure. It stays off until the owner sets `PRODUCTION_DEPLOY_ENABLED=true`. See the [deploy runbook](deploy-runbook.md).
- `CLOUDFLARE_API_TOKEN` and `PLANE_API_KEY` must not live in the repository folder; scripts read them from the process environment. Deny rules, owner steps: [runbook](maintenance-runbook.md#local-tokens-outside-the-repository-metro-85).
- GitHub security settings are owner-only; `bun run github:settings` reads them (GET only) and fails on drift ([runbook](github-settings.md)).

## Enforced by

- `scripts/configuration.ts` and `scripts/mise-lock.ts` (in `check` and bootstrap): fail when the lock and `mise.toml` disagree, `minimumReleaseAge` values differ or `trustedDependencies` drifts. Fix the pin, not the check.
- `scripts/ci-hardening.test.ts`: fails a credentialed-cache, bot-check or `cancel-in-progress` violation. `scripts/lint-config.test.ts`: fails when `bun-types` and `@types/bun` differ.
- `scripts/cloudflare-token-check.ts`: fails on an inactive or soon-expiring token.

## Read more

- [Moved maintenance detail](../evidence/metro-86-moved-maintenance.md): lock trust anchors, token scope, bots.
- [ADR-0006](../adr/0006-cloudflare-preview.md), [ADR-0012](../adr/0012-production-deploy.md).
