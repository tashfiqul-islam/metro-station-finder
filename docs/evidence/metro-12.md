# METRO-12 local gate evidence

Date: 2026-11-03. Baseline: `d350c4141f13124acc563c26d47038ffa737ad6b`. Task 1 only; hooks, CI and remote enforcement remain controller work.

## Confirmed / Repo-verified

- `package.json`, `bun.lock`: Oxlint 1.90.0, companion 7.0.2005, Knip 6.44.1, dependency-cruiser 18.7.2, axe Playwright 4.14.0. `mise.toml`: Gitleaks 8.30.1. Bun 1.4.4 and Node 26.13.0 verified by executable guard.
- `check:fast`: runtime pins, source/config formatting, type-aware lint. `check`: fast gates, core boundary, import graph, unused code/dependencies, tests and all five strict compiler projects. `build`, `smoke`, `bundle:check`, `scan` remain explicit broader commands.
- `scan:dependencies` runs `bun audit` without suppressions; nonzero findings/tool/network exits propagate through `scan`. `scan:secrets` copies only `git ls-files` working-tree content to a temporary directory, invokes pinned Gitleaks with redaction and propagates failure. Installed dependencies and generated ignored files are not traversed. Add new files to Git before scanning them.
- `bundle:check` recursively measures actual production JS/CSS bytes plus per-file gzip bytes; missing/empty output fails. Measured initial baseline: 427089 raw / 128934 gzip bytes. Initial budgets 470000 / 142000 provide approximately 10% headroom, rounded upward. The exploratory 250000 / 80000 candidate failed before any baseline budget was adopted. This is a scaffold regression cap, not a user performance target.
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
| `bun run bundle:check`                                                 | PASS: 427089 raw / 128934 gzip bytes                                                                                                            |
| `bun run scan:dependencies`                                            | PASS: no vulnerabilities, 311 packages checked                                                                                                  |

Actual rejection tests cover cycle, unresolved import, malformed existing domain type, missing bundle artifacts, oversized bundle and generated fake credential in tracked temporary Git source. Existing compiler tests also reject source errors and foreign runtime globals. Temporary fixture files are cleaned. No product parser or station/fare fixture was invented.

## Documentation verification

Context7 official Oxlint docs verified type-aware configuration and companion. Installed companion peer range accepts 7.0.2005. Context7 dependency-cruiser docs and installed version loader verified TS parser compatibility. Context7 axe-core-npm README verified explicit `browser.newContext()` plus `context.newPage()`; initial implicit-context smoke failed visibly and was corrected without legacy mode or rule exclusions. Installed engines accept Node 26.13.0. Exact lock and executable checks supply version evidence; generic documentation is not claimed as version-specific where no version was available.

## Limits

Knip emits six redundant configuration hints; no unused-code finding is suppressed. `mise` is excluded from Knip's package-binary accounting because it is an external runtime manager. Browser coverage is the existing synthetic scaffold only; automated axe covers detectable violations, not a complete accessibility audit. Secret scan covers tracked current source, not Git history. Dependency audit depends on registry availability and fails closed. Hooks, CI aggregate, remote policy, review and integration are not Task 1 completion claims.
