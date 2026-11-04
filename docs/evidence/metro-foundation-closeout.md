# METRO-18 evidence: foundation closeout

Parent ticket METRO-18. Specification `metro-foundation-completion` revision `2026-11-03-r1` ([mirror](../specifications/foundation-completion.md)). Date 2026-11-03.

- Base: `1af6dfc` (`feature/metro-rebuild` after METRO-19 to METRO-22). The PR head is the final commit.
- Method: a fresh-context, read-only review of the whole foundation against the specification at `1af6dfc`, then fixes for every Important finding.

## Whole-foundation review disposition

| #   | Severity  | Finding                                                                      | Disposition                                                                                                                                                                                                                                                                                                                                                |
| --- | --------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Important | The per-file coverage gate ignores files no test loads                       | Fixed: `scripts/coverage-scope.ts` (in `check`) fails when a tracked product source file is missing from `coverage/lcov.info`; two documented exemptions only (`main.tsx`, a type-only module). Unmeasured tool scripts are listed in [testing](../agents/testing.md).                                                                                     |
| 2   | Important | Pins newer than the cooldown were kept; later dependencies not re-verified   | Fixed: `wrangler` 4.156.0, `dependency-cruiser` 18.7.0, `knip` 6.44.0, `@cloudflare/workers-types` 5.20261030.1 and `hono` 4.13.14 (newest past the cooldown; build, smoke, bundle and scan re-run). The dev-runtime and test-pyramid dependencies were verified at addition with dated tables. `hk` 2.11.0 and mise 2026.10.25 stay (reason in ADR-0004). |
| 3   | Important | No ADRs for supply-chain and test decisions                                  | Fixed: [ADR-0004](../adr/0004-supply-chain-and-ci-policy.md) and [ADR-0005](../adr/0005-test-strategy.md).                                                                                                                                                                                                                                                 |
| 4   | Important | FND-S7 partial; S6 and T5 hosted runs pending                                | Hosted runs happened: PR #18 (history scan, caches, commit range), PR #19 and PR #20 (all browsers, artifacts) were green; timings are on METRO-22. The `main` ruleset and Renovate behavior remain owner items (below).                                                                                                                                   |
| 5   | Important | CODEOWNERS gaps on gate-defining files                                       | Fixed: `playwright.config.ts`, `e2e/`, `CONTRIBUTING.md`, the generated bindings file, app and package manifests and `.oxfmtrc.json` are owned.                                                                                                                                                                                                            |
| 6   | Minor     | `docs/development.md` `check` description garbled; exception rationale stale | Fixed. The `skipLibCheck` exception was re-tried by removing it: TS2307 in Wrangler's `cli.d.ts` (reached through `vite.config.ts` and the Cloudflare plugin), so it stays with the accurate reason.                                                                                                                                                       |
| 7   | Minor     | `knip` had no `packages/contracts` workspace                                 | Fixed.                                                                                                                                                                                                                                                                                                                                                     |
| 8   | Minor     | README linked only ADR-0001                                                  | Fixed: all five ADRs.                                                                                                                                                                                                                                                                                                                                      |
| 9   | Minor     | `.vscode` points `typescript.tsdk` at TypeScript 6                           | Accepted: TypeScript 7 ships no `tsserverlibrary.js`; gates use `tsc` 7 (documented in METRO-19 evidence).                                                                                                                                                                                                                                                 |
| 10  | Minor     | `scan` excludes `scan:history`; Firefox, WebKit and mobile only in CI        | Accepted and documented: the history scan runs in the CI `security` job; other engines run with `CI=true`.                                                                                                                                                                                                                                                 |

## Renovate

**Confirmed:** the Renovate GitHub App has operated on this repository (a "Configure Renovate" onboarding pull request by `app/renovate`, number 8, closed, January 2026, base `master`). **Unknown:** whether it has processed `.github/renovate.json5` on `feature/metro-rebuild`; that is observable only after its next run (look for a Dependency Dashboard issue and grouped pull requests).

## Linting and formatting (owner request)

Oxlint 1.90.0 was already type-aware through `oxlint-tsgolint` (the TypeScript 7 native compiler). The configuration was raised from two rules to a strict, curated set (see [development](../development.md#linting-and-formatting)): `correctness`, `suspicious` and `perf` as errors, nine native plugins, about forty named rules, unused-disable-directive reporting, and explicit overrides with written reasons. Every finding was fixed in code (regex `u` flags, type guards instead of assertions, awaited async flow in `App.tsx`, typed fetch stubs), none by lowering a rule. The only rule families switched off are `no-console` and `no-await-in-loop` for command-line tools and tests, and the `no-unsafe-*` family for files whose nearest `tsconfig.json` has no `bun` types. Oxfmt 0.75.0 got `.oxfmtrc.json` (sorted imports, sorted `package.json`, an ignore list for generated and output paths). `scripts/lint-config.test.ts` guards these settings.

## JavaScript footprint

The rebuild branch tracks zero `.js`, `.jsx`, `.mjs` or `.cjs` files (`.dependency-cruiser.mjs` became `.mts` in METRO-20). GitHub's language bar reads the default branch `master`, the legacy Next.js tree (API readback: TypeScript 39433 bytes, JavaScript 831, CSS 164, about 2.1 % JavaScript). It will change only when the default branch changes at release time (METRO-11, not authorized here).

## Commands (final tree)

| Command                                  | Result                                                               |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `mise exec -- bun run check`             | pass (final test count on the PR)                                    |
| `build`, `smoke`, `bundle:check`, `scan` | pass locally with the downgraded pins; `bundle:check` 224741 / 69904 |

## Open items for the owner

- Apply the `main` ruleset (payload in [supply-chain evidence](metro-foundation-supply-chain.md)).
- Confirm the license holder name `Tashfiqul Islam`.
- Done 2026-11-05: the legacy Google Maps key allowlisted in `.gitleaksignore` is deleted (confirmed by the owner).
- Observe Renovate's first run on `feature/metro-rebuild`.
- Answer the METRO-13 questions (Plane comment).
