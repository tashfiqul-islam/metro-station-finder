# METRO-12 local gate evidence

Date: 2026-11-03. Baseline: `d350c4141f13124acc563c26d47038ffa737ad6b`. Task 1 baseline evidence retained below. Task 2 local hooks and CI configuration are verified below; hosted CI and remote enforcement remain controller work.

## Confirmed / Repo-verified

- `package.json`, `bun.lock`: Oxlint 1.90.0, companion 7.0.2005, Knip 6.44.1, dependency-cruiser 18.7.2, axe Playwright 4.14.0. `mise.toml`: Gitleaks 8.30.1. Bun 1.4.4 and Node 26.13.0 verified by executable guard.
- `check:fast`: runtime pins, source/config formatting, type-aware lint. `check`: fast gates, core boundary, import graph, unused code/dependencies, tests and all five strict compiler projects. `build`, `smoke`, `bundle:check`, `scan` remain explicit broader commands.
- `scan:dependencies` runs `bun audit` without suppressions; nonzero findings/tool/network exits propagate through `scan`. `scan:secrets` copies only `git ls-files` working-tree content to a temporary directory, invokes pinned Gitleaks with redaction and propagates failure. Installed dependencies and generated ignored files are not traversed. Add new files to Git before scanning them.
- `bundle:check` recursively measures actual production JS/CSS bytes plus per-file gzip bytes; missing/empty output fails. Measured production baseline (Vite production mode, `NODE_ENV` unset): 219788 raw / 67984 gzip bytes in `apps/web/dist`. Budgets 250000 raw / 80000 gzip give about 14% / 18% headroom. This is a scaffold regression cap, not a user performance target. Correction: Task 1 first recorded 427089 raw / 128934 gzip and budgets of 470000 / 142000, but that measurement came from a build with `NODE_ENV=development` (reproduced during final verification: 427089 / 128934 exactly), which bundles React's development build. The cap is therefore now tightened to the production figures; a development-mode build fails it.
- Source/config formatting adoption includes mechanical formatting of existing tracked files. No compiler strictness flags changed.
- `scripts/dependency-parser.ts` routes dependency-cruiser's compiler API to the existing TS 6.0.2 alias. TS 7.0.2 still runs every compiler gate. Installed dependency-cruiser supports TS below 7; Node resolve hook confines the parser exception to that consumer.

## Execution

Pinned executable directories were prepended to PATH. Commands run in PowerShell with login disabled.

| Command                                                                | Result                                                                                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun test scripts/gates.test.ts` before implementation                 | RED: missing import, bundle and secret gates; malformed domain compiler rejection already worked                                                |
| `bun test scripts/configuration.test.ts` after adding missing-pin test | RED: Gitleaks absence incorrectly accepted; validator added                                                                                     |
| `bun run check`                                                        | PASS: formatting, type-aware lint, 34 graph modules / 46 dependencies / zero violations, Knip, 87 tests / 149 assertions, all compiler projects |
| `bun run build`                                                        | PASS: Vite production build; Wrangler production dry-run, no upload                                                                             |
| `bun run playwright install chromium`                                  | PASS: Playwright 1.64.1 Chromium 1248 installed                                                                                                 |
| `bun run smoke`                                                        | PASS: built web, Worker HTTP 200/status and 404, browser error assertions, zero axe violations                                                  |
| `bun run bundle:check`                                                 | PASS: 219788 raw / 67984 gzip bytes                                                                                                             |
| `bun run scan:dependencies`                                            | PASS: no vulnerabilities, 311 packages checked                                                                                                  |

Actual rejection tests cover cycle, unresolved import, malformed existing domain type, missing bundle artifacts, oversized raw bundle, gzip-only oversize (incompressible bytes), an in-budget bundle that passes, and generated fake credential in tracked temporary Git source. Existing compiler tests also reject source errors and foreign runtime globals. Temporary fixture files are cleaned. No product parser or station/fare fixture was invented.

## Documentation verification

Context7 official Oxlint docs verified type-aware configuration and companion. Installed companion peer range accepts 7.0.2005. Context7 dependency-cruiser docs and installed version loader verified TS parser compatibility. Context7 axe-core-npm README verified explicit `browser.newContext()` plus `context.newPage()`; initial implicit-context smoke failed visibly and was corrected without legacy mode or rule exclusions. Installed engines accept Node 26.13.0. Exact lock and executable checks supply version evidence; generic documentation is not claimed as version-specific where no version was available.

## Limits

Task 1 emitted six redundant Knip configuration hints; Task 2 removes those declarations and verifies zero hints. No unused-code finding is suppressed. `mise` is excluded from Knip's package-binary accounting because it is an external runtime manager. Browser coverage is the existing synthetic scaffold only; automated axe covers detectable violations, not a complete accessibility audit. Secret scan covers tracked current source, not Git history. Dependency audit depends on registry availability and fails closed. Hooks, CI aggregate, remote policy, review and integration are not Task 1 completion claims.

## Task 2: hooks and authoritative CI

Date: 2026-11-03. Task 2 base: `43a0b44229fd6c8da264c50523dc7af9f332a7c5`.

### Confirmed / Repo-verified

- `mise.toml` pins hk 2.11.0 and Pkl 0.32.2. Installed executable versions and `hk validate` passed. `hk.pkl` imports the exact 2.11.0 schema. Pre-commit uses Git-backed stashing and canonical `check:fast`; pre-push runs canonical `check`, build/smoke/bundle and `scan`. No hook-only gate implementation or automatic source fixes.
- `scripts/hooks.test.ts` installs actual hooks in disposable Git repositories. A staged good/unstaged bad file commits the staged bytes, restoring unstaged bytes. A staged bad/unstaged good file rejects commit while preserving index, worktree, untracked bytes and empty stash list. Linked worktree installation and commit pass. Caller index/worktree are never fixture inputs; every fixture process runs without inherited `GIT_*` variables. A second fixture installs the hooks, pushes to a local bare remote, and shows pre-push blocking a failing canonical `check` (no remote ref) and allowing a passing one. Git 2.54 config-based hooks were exercised. Tests set deterministic newline handling and disable signing only inside disposable repositories.
- `.github/workflows/quality.yml` covers pull requests targeting `feature/metro-rebuild` or `main` and integration pushes. Jobs call frozen bootstrap and canonical gates; browser dependencies are installed for smoke. Token is contents-read only; checkout credentials are not persisted. Required context is exactly `Quality gates`. Its `always()` aggregate needs checks/build/security; it fails unless those three are present and every entry in `needs` has result success. Aggregate needs only pinned Node, without project dependency installation.
- `scripts/ci-results.test.ts`: 27 in-process cases accept complete success (and an extra succeeding job), and reject 26 adverse inputs, including each required job failing, cancelled, skipped, unknown, empty or missing, an extra non-success job, and malformed inputs. Five CLI cases spawn `node scripts/ci-results.ts`: all-success exits zero; a failed job, invalid JSON, JSON `null` and an unset variable exit nonzero. The CLI cases were added after independent review found the earlier invalid-JSON claim had no test.
- `.github/CODEOWNERS` protects gate configuration, runtime/compiler settings, workflow, scripts and agent guidance using `@tashfiqul-islam`. Ownership declarations alone do not enforce review.
- Six redundant Knip declarations removed; full unused-code gate passes without hints. Controller skill-lock changes preserved; cannot-verify reference added. Lock contains 35 reviewed files, matching skills guidance. Existing final-review, verification and finishing pins retained.

### Fresh local execution

Pinned executable directories prepended to PATH; PowerShell login disabled. Native Git/hk fixture tests ran with elevated process permissions because restricted process execution failed to run hook child processes reliably. No gate/assertion was weakened.

| Command                                                     | Result                                                                                                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hk validate`                                               | PASS against installed hk/Pkl schema                                                                                                                             |
| `bun test scripts/ci-results.test.ts` before implementation | RED: aggregate module absent                                                                                                                                     |
| `bun run check`                                             | PASS: formatting, type-aware lint, 40 graph modules / 63 dependencies / zero violations, Knip zero hints, 127 tests / 246 assertions, all five compiler projects |
| `bun run bootstrap`                                         | PASS: frozen install; 140 installs / 321 packages, no changes                                                                                                    |
| `bun run build`                                             | PASS: Vite production build and Wrangler dry-run, no upload                                                                                                      |
| `bun run smoke`                                             | PASS: browser shared result, Worker status 200 and unknown-route 404, existing browser/axe assertions                                                            |
| `bun run bundle:check`                                      | PASS: 219788 raw / 67984 gzip bytes                                                                                                                              |
| `bun run scan`                                              | PASS: dependency audit 311 packages, no vulnerabilities; tracked-source Gitleaks, no leaks                                                                       |

### Official documentation evidence

Context7 hk documentation verified stashing, installation and configuration; actual pinned schema and Git fixtures verified this usage. Official release references: [hk 2.11.0](https://github.com/jdx/hk/releases/tag/v2.11.0), [Pkl 0.32.2](https://github.com/apple/pkl/releases/tag/0.32.2), [mise 2026.10.25](https://github.com/jdx/mise/releases/tag/v2026.10.25). Release pages were inspected before pinning.

Action release/tag-to-commit evidence supplied and verified by controller: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) = `3d3c42e5aac5ba805825da76410c181273ba90b1`; [mise-action v5.2.5](https://github.com/jdx/mise-action/releases/tag/v5.2.5) = `6612f0ef07ed2a736cd1e00a94a065522dd41195`. Both workflow references use full SHAs with version comments. Exact-revision [mise-action action metadata](https://github.com/jdx/mise-action/blob/6612f0ef07ed2a736cd1e00a94a065522dd41195/action.yml) confirms explicit mise version and `install_args: node` support. Documentation is not a hosted-run claim.

### Task 2 review disposition

Independent review of `43a0b44..8cdd8e8` (2026-11-03) found one Important and four Minor items. Fixed: missing CLI test for the invalid-JSON claim (above); `CODEOWNERS` now also covers `bunfig.toml` and `.gitattributes`; pre-push steps are `exclusive` so `check`, `build` and `scan` run sequentially instead of concurrently (`build` writes `dist` while `check` lints and tests the tree); `hk validate` accepts the schema. Not changed, by decision: the workflow targets pull requests to `feature/metro-rebuild` and `main` only, not `master`, because `master` holds legacy code and stays the default until v1.0.0 per the owner; PRs to `master` get no `Quality gates` check. Documented limits: `scripts/hooks.test.ts` needs `hk`, `git` and `bun` on PATH and network access to fetch the pinned hk schema package on first evaluation, runs from the repository root, and exercises only Git 2.54 config-based hooks locally (Linux and older-Git shims first run in hosted CI). `cancel-in-progress` is keyed by ref, so a newer push to `feature/metro-rebuild` cancels an earlier push run for that ref.

### Final whole-ticket review disposition

Independent final review of `d350c41..9e4eb68` (2026-11-03; an Opus-class reviewer, because the handoff's named reviewer model is not available in this session) found one Critical, three Important and four Minor items. Fixed:

- **Critical, fixture escape:** Git exports `GIT_DIR` to hooks run from linked worktrees, and `bun run check` (run by pre-push) executed fixtures that inherited it, so fixture `git init`, `git config` and `git commit` could land in the caller's repository. The reviewer reproduced this with a scratch worktree. `scripts/git-env.ts` now strips all `GIT_*` variables for every fixture process and for `scripts/secrets.ts`. `scripts/git-isolation.test.ts` points `GIT_DIR` at a decoy repository, runs the hook suite, and asserts the decoy gains no commits or config; with the stripping disabled that test fails. A secret-gate test also shows the requested repository is scanned when `GIT_DIR` points elsewhere.
- **Pre-push exercised:** see the hook fixture above.
- **Aggregate job list:** `scripts/ci-results.ts` now requires every entry in `needs` to be `success` and keeps `checks`, `build` and `security` as a required floor.
- **Symlinks:** `scripts/secrets.ts` rejects tracked symlinks and submodules instead of following them, tested with a mode-120000 index entry.
- **CODEOWNERS** now includes `AGENTS.md` and `docs/specifications/`; counts above are current; the untracked-file behaviour of format and lint is documented in the quality-gates guide.

Not changed, by decision: tests install hooks with `HK_MISE=0` because fixtures run without a mise shim, so the documented `hk install --mise` form is not exercised locally. The workflow still targets `main` and `feature/metro-rebuild`, not `master`.

### Unknown / external enforcement

Controller must verify hosted CI and configure protected integration-branch rules: trusted GitHub Actions `Quality gates` required and up to date, PR required, signed commits, resolved conversations, no force pushes/deletion and no bypass. Sole repository owner cannot approve their own PR: CODEOWNER approval cannot currently be enforced without another eligible reviewer. PR with zero required approvals preserves that explicit gap; no self-approval or bypass claim. No deployment, default-branch switch, remote change or Plane transition was performed by this implementer.
