# METRO-20 evidence: supply chain

Ticket METRO-20 (`supply-chain`), parent METRO-18. Specification `metro-foundation-completion` revision `2026-11-03-r1` ([mirror](../specifications/foundation-completion.md)). Date 2026-11-03.

- Base: `a294564` (`feature/metro-rebuild`, merge of METRO-19). The PR head is the final commit.
- Environment: Windows 11, PowerShell 7, mise-pinned Bun 1.4.4 and Node 26.13.0.
- Baseline (Confirmed): `mise install`, bootstrap, `hk install --mise` and `check` passed before any edit: 152 tests, `check` about 20 s.

## Criterion to evidence

| Criterion              | Evidence                                                                                                                                                                                                                                                                                                                                                                  | Result                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| FND-S1 pins            | Table below. Frozen bootstrap passes (`Checked 140 installs across 321 packages (no changes)`). Failure check is Bun's frozen-lockfile behavior (not re-demonstrated here).                                                                                                                                                                                               | Pass                      |
| FND-S2 Renovate        | `.github/renovate.json5` passes `renovate-config-validator --strict` (`renovate:check`, part of `check`). Tests: fixture with `bogusOption` fails naming it; a differing Renovate cooldown fails the guard; equivalent unit (`72 hours`) passes; missing file and missing option fail.                                                                                    | Pass                      |
| FND-S3 cooldown        | `install.minimumReleaseAge = 259200` in `bunfig.toml`; guard tests: missing value and a shorter value both fail naming `install.minimumReleaseAge`.                                                                                                                                                                                                                       | Pass                      |
| FND-S4 workflow lint   | `scripts/workflows.ts` runs actionlint 1.7.12 and zizmor 1.31.1 (offline, `--no-config`, pedantic persona). Tests on temporary fixtures: `actions/checkout@v4` fails (`unpinned-uses`); `${{ github.event.pull_request.title }}` in `run:` fails (`template-injection`); `permissions: write-all` fails (`excessive-permissions`); pinned fixture and real workflow pass. | Pass                      |
| FND-S5 commit messages | `scripts/commit-message.ts` with 15 accepted and 9 rejected subjects, range mode (nonzero on any invalid commit, nonzero on unresolvable range), and the real installed hk `commit-msg` hook in disposable repositories (`update stuff` rejected with the index and history preserved; `feat(core): add x` and a Git merge subject accepted). All use `cleanGitEnv()`.    | Pass                      |
| FND-S6 CI              | Caches keyed on `bun.lock` and the Playwright version, job-level `permissions`, `fetch-depth: 0`, commit-range step. `scripts/ci-results.test.ts` unchanged and passing; `Quality gates` name unchanged. The Gitleaks full-history step (`bun run scan:history`, redacted) runs in the `security` job after the owner-approved allowlist (see Findings).                  | Pass (hosted run pending) |
| FND-S7 rulesets (HITL) | Readback below. `feature/metro-rebuild` matches. `main` has no ruleset; payload below for the owner to apply.                                                                                                                                                                                                                                                             | Partial                   |

## Pin verification (2026-11-03; cooldown cutoff 2026-10-31)

Sources: npm registry (`time` per version) for packages, GitHub releases API for tools and actions. **Confirmed** for the dates shown.

| Pin                                                                                                 | Current   | Latest (published)            | Past cooldown | Decision                                                                                                                                           |
| --------------------------------------------------------------------------------------------------- | --------- | ----------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@axe-core/playwright`, `@types/bun`, `@types/node`, `@types/react(-dom)`                           | as pinned | same                          | yes           | latest                                                                                                                                             |
| `@typescript/typescript6`, `typescript`, `oxfmt`, `oxlint`, `oxlint-tsgolint`, `playwright`, `vite` | as pinned | same                          | yes           | latest                                                                                                                                             |
| `react`, `react-dom` 19.3.1; `hono` 4.13.16                                                         | as pinned | `hono` 4.13.16 (2026-11-01)   | `hono` no     | Kept: pin predates this work; downgrade adds risk, Renovate handles.                                                                               |
| `wrangler` 4.156.2                                                                                  | 4.156.2   | 4.156.2 (2026-11-02)          | no            | Kept, reason as above (newest eligible is 4.156.0).                                                                                                |
| `dependency-cruiser` 18.7.2                                                                         | 18.7.2    | 18.7.2 (2026-11-02)           | no            | Kept, reason as above (newest eligible is 18.7.0).                                                                                                 |
| `knip` 6.44.1                                                                                       | 6.44.1    | 6.44.1 (2026-10-31)           | borderline    | Kept, reason as above (newest eligible is 6.44.0).                                                                                                 |
| `@cloudflare/workers-types` 5.20261103.1                                                            | same      | same (2026-11-03)             | no            | Kept, reason as above (newest eligible is 5.20261030.1).                                                                                           |
| Bun 1.4.4, Node 26.13.0                                                                             | as pinned | same (2026-10-22, 2026-10-28) | yes           | latest                                                                                                                                             |
| Gitleaks 8.30.1, Pkl 0.32.2                                                                         | as pinned | same                          | yes           | latest                                                                                                                                             |
| hk 2.11.0                                                                                           | 2.11.0    | 2.11.0 (2026-11-01)           | no            | Kept: hk.pkl schema is pinned to the same version.                                                                                                 |
| mise 2026.10.25 (CI)                                                                                | same      | same (2026-10-31)             | borderline    | Kept.                                                                                                                                              |
| `actions/checkout` v7.0.1                                                                           | same      | v7.0.1 (2026-07-20)           | yes           | latest                                                                                                                                             |
| `jdx/mise-action` v5.2.5 → v5.2.6 (SHA `f5be966`)                                                   | v5.2.5    | v5.2.6 (2026-11-02)           | no            | Bumped on explicit owner instruction ("ensure all latest action version"); an owner-directed exception to the 3-day cooldown for this action only. |
| `actions/cache` v6.1.0 (new, SHA `55cc834`)                                                         | new       | v6.1.0 (2026-06-26)           | yes           | latest                                                                                                                                             |
| actionlint 1.7.12, zizmor 1.31.1 (new)                                                              | new       | zizmor 1.32.0 (2026-11-02)    | no for 1.32.0 | zizmor at newest eligible, actionlint latest.                                                                                                      |
| Renovate 44.198.3 (new, mise `npm:renovate`)                                                        | new       | newer 44.206.x (2026-11-02)   | no for newer  | Newest eligible.                                                                                                                                   |

"Kept" rows follow the specification: not latest-past-cooldown, so a reason is stated. None changed; no manifest or lockfile edit was needed.

## Decisions and findings

- **Workflow best practices (owner request, 2026-11-03).** All three actions are at their latest release (checkout v7.0.1, cache v6.1.0, mise-action v5.2.6; GitHub releases API). Also applied: `permissions: {}` at workflow level with explicit job-level `contents: read`, runner pinned to `ubuntu-24.04` instead of `ubuntu-latest`, SHA pins with version comments, `persist-credentials: false`, untrusted PR SHAs passed through `env` rather than inline expressions, and zizmor pedantic plus actionlint passing.

- **Renovate validator route (owner chose option A, 2026-11-03).** `mise` `npm:renovate` failed with `trustPolicy=no-downgrade` on transitive `@yarnpkg/libzip@3.2.2` (3.2.0 had provenance, 3.2.2 has none). A Bun devDependency installs but `bun audit` then reports 3 findings (deepmerge low, glob and minimatch moderate); deepmerge 4.3.1 is the latest release and has no fix. Applied: `trust_policy_excludes = ["@yarnpkg/libzip@3.2.2"]` in `mise.toml`, scoped to that exact version.
- **Validator caveat (Confirmed).** The RE2 native module is missing under Node 26 (`Cannot find module './build/Release/re2.node'`), so the validator warns that regex validation may be inaccurate. Unknown options and wrong types still fail with a nonzero exit. Renovate declares `node ^24.11.0`; it runs under 26.13.0 with an engine warning. This validates configuration shape only; the Renovate GitHub App's own run is the authority.
- **zizmor persona.** The default persona accepted `permissions: write-all` in the fixture; `--persona pedantic` flags it, and the real workflow passes pedantic too. `--no-config` keeps results independent of any local zizmor config.
- **Existing hook fixtures** in `scripts/hooks.test.ts` now use conventional messages and carry the commit-message script, because the new `commit-msg` hook runs inside them. Their assertions are unchanged.
- **Gitleaks full-history scan (finding, resolved by owner approval).** `gitleaks git --redact` reported 2 `gcp-api-key` leaks in legacy commit `c36908bd` (2024-01-16): `out/_next/static/chunks/658.703ec5399e572adf.js` and `out/_next/static/chunks/pages/index-0de7add5c530ff48.js` (built Next output, the browser Maps key the legacy app shipped). The value is not recorded. The owner approved allowlisting exactly these two fingerprints on 2026-11-03; they are in `.gitleaksignore`. The key itself is **not** known to be restricted or rotated (Unknown); that is a follow-up for the owner with the provider. New leaks still fail the scan.

## Ruleset readback (FND-S7)

`gh api repos/tashfiqul-islam/metro-station-finder/rulesets/26426527` on 2026-11-03: "Rebuild quality gates", branch target, enforcement `active`, includes `refs/heads/feature/metro-rebuild`, `bypass_actors: []`, `current_user_can_bypass: never`. Rules: `deletion`, `non_fast_forward`, `required_signatures`, `pull_request` (`required_review_thread_resolution: true`, 0 approvals), `required_status_checks` with `Quality gates` (integration 15368, GitHub Actions) and `strict_required_status_checks_policy: true`. **Confirmed:** matches the required list. Only that ruleset exists; the default branch is `master`; branches are `feature/metro-rebuild`, `main`, `master`.

**Gap:** `main` has no ruleset. Payload for the owner (not applied):

```powershell
$payload = @'
{
  "name": "Rebuild quality gates (main)",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "bypass_actors": [],
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "required_signatures" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["merge", "squash", "rebase"] } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false,
        "required_status_checks": [ { "context": "Quality gates", "integration_id": 15368 } ] } }
  ]
}
'@
$payload | gh api --method POST repos/tashfiqul-islam/metro-station-finder/rulesets --input -
```

## Commands (final tree)

| Command                             | Result                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `mise exec -- bun run build`        | pass (Wrangler dry run, nothing uploaded)                                                             |
| `mise exec -- bun run smoke`        | pass (Chromium, Worker 200 and 404)                                                                   |
| `mise exec -- bun run bundle:check` | pass, 219788 raw / 67984 gzip, budget unchanged (250000 / 80000)                                      |
| `mise exec -- bun run scan`         | pass (no vulnerabilities in 311 packages; no leaks found)                                             |
| `mise exec -- bun run scan:history` | pass (96 commits scanned, no leaks) with `.gitleaksignore`; failed on the 2 legacy findings before it |

`check` results and timing are recorded on the PR. Hosted `Quality gates` has not run until the PR exists.

## Unrun checks and Unknowns

- Hosted `Quality gates` and the new CI steps (caches, commit range) run only on the PR.
- Renovate PR behavior (grouping, digest pinning, cooldown, security bypass) is **Unknown** until the app processes the file; `vulnerabilityAlerts.minimumReleaseAge: null` bypass semantics are Unverified beyond validator acceptance.
- Bun cooldown against a frozen lockfile: `bun install --frozen-lockfile` succeeds with locked versions younger than the cooldown (dependency-cruiser, wrangler, knip, workers-types). Confirmed.
- The Renovate GitHub App is installed per the owner; not independently verified here.

## Review disposition

Independent fresh-context review of `a294564..HEAD` (read-only; it read code and tests but did not run the suite). One Critical, four Important findings.

| #    | Severity  | Finding                                                                                          | Disposition                                                                                                                                                                                                                           |
| ---- | --------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Critical  | No CI job ran the history scan (FND-S6)                                                          | Fixed: `bun run scan:history` step in the `security` job, after the owner approved the allowlist.                                                                                                                                     |
| 2    | Important | `--history` mode silently scans a shallow clone                                                  | Fixed with RED/GREEN test (`scripts/secrets-history.test.ts`): fails with "full clone" unless `git rev-parse --is-shallow-repository` is `false`.                                                                                     |
| 3    | Important | `vulnerabilityAlerts` default may override `rangeStrategy: "pin"`                                | Fixed: `rangeStrategy: "pin"` set inside `vulnerabilityAlerts`; validator passes. Effective Renovate behavior is Unknown until the app runs (not verified against docs).                                                              |
| 4    | Important | Bare `minimumReleaseAge` may leave updates without release timestamps pending                    | Accepted and recorded: the default stays (`timestamp-required`), because the alternative lets untimestamped updates skip the cooldown. Stalled digest or mise updates would show on the dependency dashboard. Unknown until observed. |
| 5    | Important | Empty PR range threw "No commits in range"                                                       | Fixed with a test: an empty range validates nothing and exits 0; an unresolvable range still fails through Git.                                                                                                                       |
| 6    | Minor     | `fixup!`, `squash!`, `amend!` subjects rejected                                                  | Accepted: they must not land on the integration branch; squash before pushing.                                                                                                                                                        |
| 7-10 | Minor     | `#` subject skipped as comment, bare tool names, strict durations, build job without fetch-depth | Accepted: consistent with Git cleanup, visible failures, or intended.                                                                                                                                                                 |
