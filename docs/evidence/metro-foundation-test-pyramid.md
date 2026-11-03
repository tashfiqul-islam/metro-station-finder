# METRO-22 evidence: test pyramid

Ticket METRO-22 (`test-pyramid`), parent METRO-18. Specification `metro-foundation-completion` revision `2026-11-03-r1` ([mirror](../specifications/foundation-completion.md)). Date 2026-11-03.

- Base: `c9442da` (`feature/metro-rebuild`, merge of METRO-21). The PR head is the final commit.
- Environment: Windows 11, PowerShell 7, mise-pinned Bun 1.4.4 and Node 26.13.0; Playwright 1.64.1 with Chromium, Firefox and WebKit installed locally.

## Criterion to evidence

| Criterion               | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Result                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| FND-T1 coverage         | `bunfig.toml` `[test]` sets `coverageThreshold = { lines = 0.9, functions = 0.9 }`, reporters `text` and `lcov`, directory `coverage/`; `check` runs `bun test`, so coverage is always on; `coverage/lcov.info` is written. No `coveragePathIgnorePatterns`. `scripts/coverage.test.ts` runs the real `bunfig.toml` in a temporary project: a fully covered file exits 0; a loaded file with an uncovered function exits nonzero (table shows `subject.ts` at 16.67 % lines).                      | Pass                          |
| FND-T2 API and UI tests | API in process (`apps/api/src/index.test.ts`, 16 tests with the client tests): 200 body schema-valid, 404 envelope for `/api/unknown`, `/api` and `/api/scaffold`, 405 with `Allow`, HEAD and OPTIONS, 500 envelope without the cause, a drifting status rejected. Components (`apps/web/src/App.test.tsx`, 7 tests): loading, success, HTTP error, contract violation, network failure, non-Error rejection, unmount before response. Demonstrations below.                                       | Pass                          |
| FND-T3 smoke            | `bun run smoke` is `@playwright/test` (`playwright.config.ts`, `e2e/scaffold.e2e.ts`, `e2e/fixtures.ts`): built `vite preview` as `webServer`, `retries: 0`, trace on failure, screenshot on failure, HTML report. Auto fixtures fail on any console or page error and on any axe violation on the final page of every test. Chromium locally: 6 passed (2.2 s). `CI=true`, all four projects (chromium, firefox, webkit, mobile-chrome): 24 passed (6.9 s). Intercepted 500 shows `role="alert"`. | Pass                          |
| FND-T4 type fixtures    | `scripts/types.test.ts`: a DOM-test fixture using `document` and `Bun` compiles under `tsconfig.dom-test.json`; the same project rejects index and optional-property errors; Bun globals in web source stay rejected (existing `apps/web` cases). `tsconfig.dom-test.json` (DOM, DOM.Iterable, bun, react) is part of `typecheck`.                                                                                                                                                                 | Pass                          |
| FND-T5 hooks and CI     | Canonical names unchanged (`hk.pkl` untouched; `smoke`, `check`, `build`, `bundle:check`, `scan`). The CI `build` job installs `chromium firefox webkit` with `--with-deps` behind the version-keyed cache (key now from `@playwright/test`), `checks` uploads `coverage-lcov`, a failed build uploads `playwright-report`. Timings: see below.                                                                                                                                                    | Pass (hosted timings pending) |

## Demonstrations (failure checks)

- **Failing E2E assertion (T3):** `toHaveTitle("Wrong title")` made `bun run smoke` fail with "1 failed", and left `test-results/**/trace.zip`, a failure screenshot and `playwright-report/index.html`. Restored afterwards.
- **Component error branch removed (T2):** replacing the error handler in `App.tsx` failed four named tests: "FND-T2 shows an alert for an HTTP error", "... for a body that breaks the contract", "... for a network failure", "... a generic message for a non-Error rejection".
- **API returns an invalid body (T2):** swapping the validated response for `ready: false` failed "FND-R3 GET /api/scaffold/status returns a schema-valid body", "FND-R4 an unexpected failure returns a 500 envelope ..." and "FND-R4 a status that drifts from the contract is rejected at the API".
- **Coverage (T1):** RED was the repository itself: with the threshold enabled, `bun test` exited 1 because `app.ts` (functions 85.71 %), `boundaries.ts` (82.61 % lines), `ci-results.ts` (78.57 %), `commit-message.ts` (32.5 %) and `links.ts` (82.05 %) were under 90 %.

## How the thresholds were met

No threshold, assertion or ignore list was weakened.

- `apps/api/src/app.ts`: the redundant `app.all("/api")` route was dead code (Hono's `/api/*` already matches `/api`; the test for `/api` still passes), so it was removed.
- Entry-point guards were split from testable bodies: `runBoundaryCheck`, `runCiResults`, `runLinkCheck`, `commitMessageMain`, `validateRange` are exported and tested in process (`scripts/cli.test.ts`, which also covers nested folders, junction symlinks, `import = require` and import types in the boundary guard). The unchanged `scripts/ci-results.test.ts` still passes.
- `bun test` also matches `*.spec.ts`, so Playwright specs are named `*.e2e.ts` and selected through `testMatch` in `playwright.config.ts`.
- `scripts/smoke.ts` (hand-written Playwright script) was replaced by Playwright Test; the raw `playwright` dependency was removed (`@playwright/test` brings `playwright-core`; `@axe-core/playwright` needs only that).

## Pins added (2026-11-03, cooldown cutoff 2026-10-31)

| Package                         | Pin                   | Latest (published) | Note                          |
| ------------------------------- | --------------------- | ------------------ | ----------------------------- |
| `@playwright/test`              | 1.64.1                | 1.64.1 (10-14)     | latest; replaces `playwright` |
| `@testing-library/react`        | 16.3.3                | 16.3.3 (08-27)     | latest                        |
| `@testing-library/dom`          | 10.4.2                | 10.4.2 (09-13)     | latest (peer of the above)    |
| `@happy-dom/global-registrator` | 21.0.4                | 21.0.4 (10-20)     | latest                        |
| `actions/upload-artifact` (new) | v7.0.2, SHA `cf430e0` | v7.0.2 (10-07)     | latest                        |

## Timings (Windows, local)

- `bun run check`: about 36 to 39 s including 252 tests (about 31 s for the test step).
- `bun run smoke`: about 2.8 s (Chromium); about 7.3 s with all four projects (`CI=true`).
- Hosted timings come from the PR run and are recorded on the PR.

## Unrun checks and Unknowns

- Hosted `Quality gates`, the new browser install and cache, and artifact uploads run only on the PR.
- The mobile project is a Chromium device profile (Pixel 7), not a real device.
- The failure-artifact upload path in CI was not exercised (it only runs when `smoke` fails).
- Bun reports only files a test loads, so these tracked sources are not measured by the gate: `scripts/bundle.ts`, `scripts/dependency-parser.ts`, `scripts/format.ts`, `scripts/secrets.ts`, `scripts/tools.ts` (entry scripts run as subprocesses or by `check`), `apps/web/src/main.tsx` (browser entry, covered by `smoke`) and `packages/core/src/domain/scaffold-status.ts` (a type, no executable code). Review finding 1 asked for this disclosure; a gate that fails on unmeasured files would need either an ignore list or loading entry scripts, both rejected here.

## Review disposition

Independent fresh-context review of `c9442da..4a98a08` (read-only; it ran `bun test` but not Playwright). No Critical findings.

| #   | Severity  | Finding                                                                 | Disposition                                                                                   |
| --- | --------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Important | The per-file gate does not measure files no test loads                  | Disclosed in this file and in `testing.md` with the exact list and why; no ignore list added. |
| 2   | Important | The Playwright cache key would keep hitting the old chromium-only entry | Fixed: the key now ends in `-chromium-firefox-webkit`.                                        |
| 3   | Minor     | `CI=false` or `CI=0` still selected all projects                        | Fixed: only `true` or `1` selects all projects.                                               |
| 4   | Minor     | `IS_REACT_ACT_ENVIRONMENT` never reset                                  | Fixed in `afterAll`.                                                                          |
| 5   | Minor     | `realFetch` captured after registration                                 | Accepted: `unregister` restores the original.                                                 |
| 6   | Minor     | Unmount test could not catch a late `setState`                          | Strengthened: also asserts `console.error` is not called.                                     |
| 7   | Minor     | Coverage failure test asserted only `subject.ts` in the output          | Fixed: asserts the table row (50.00 % functions, 16.67 % lines).                              |
| 8   | Minor     | `coverage.test.ts` depended on the working directory                    | Fixed: resolves `bunfig.toml` from `import.meta.dir`.                                         |
