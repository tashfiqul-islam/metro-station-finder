# Testing and bugs

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

**Confirmed / Repo-verified:** [manifest](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/package.json) has no test script. The legacy baseline had no test runner.

**Confirmed / Repo-verified:** the independent rebuild runs a layered, coverage-enforced suite: Bun unit, component and in-process API tests through root `check`, standalone typechecks, and Playwright Test E2E through `smoke`; CI runs all of them (see [quality gates](quality-gates.md)). See [commands and limits](../development.md). These checks do not prove product parity or full accessibility conformance.

## Test layers and conventions

| Layer                           | Where                                  | Run with                              | Notes                                                                                                                                                               |
| ------------------------------- | -------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (core, contracts, scripts) | colocated `*.test.ts`                  | `bun test` (part of `check`)          | No network, clock or randomness without a seam.                                                                                                                     |
| API in process                  | `apps/api/src/*.test.ts`               | `bun test`                            | Hono `app.request()`; asserts status, body, schema validity, envelopes and methods.                                                                                 |
| Component                       | `apps/web/src/*.test.tsx`              | `bun test`                            | `@happy-dom/global-registrator` registered before React and Testing Library load; `fetch` is stubbed; typechecked by `tsconfig.dom-test.json` (DOM plus Bun types). |
| E2E and accessibility           | `e2e/*.e2e.ts`, `playwright.config.ts` | `bun run build`, then `bun run smoke` | Playwright Test against the built `vite preview` (workerd). Locally Chromium only; with `CI=true` Chromium, Firefox, WebKit and a mobile viewport.                  |

- Test files are colocated with the code they test (`*.test.ts`, `*.test.tsx`); E2E specs live in `e2e/`.
- Fixtures are synthetic. Never use real locations, addresses or credentials. Unit and component tests make no network calls.
- Determinism: no retries (`retries: 0` everywhere; a flaky test is a defect), no sleeps as synchronization (wait on observable state), fixture git processes use `cleanGitEnv()`, temporary directories are removed in `finally`.
- Coverage: `bun test` enforces `lines` and `functions` at 0.9 per file (`bunfig.toml`) and writes `coverage/lcov.info`. There are no `coveragePathIgnorePatterns`. Bun reports only files a test loads, so structure scripts as a testable module plus a one-line entry guard; do not load entry files that run on import. Files no test loads are not measured at all (`scripts/bundle.ts`, `dependency-parser.ts`, `format.ts`, `secrets.ts`, `tools.ts`, `apps/web/src/main.tsx` and the type-only `packages/core/src/domain/scaffold-status.ts`); they are exercised through subprocess tests, `check` and `smoke` instead, and any new logic should live in a loaded, tested module.
- E2E fixtures (`e2e/fixtures.ts`) apply to every test in every project: any console error or uncaught page error fails the test, and any page left open must have zero axe violations. A test that provokes an error on purpose declares it with the `allowedConsoleError` option.
- Failures keep evidence: trace and screenshot on failure and an HTML report in `playwright-report/` (CI uploads both as the `playwright-report` artifact; the lcov file is the `coverage-lcov` artifact).

For bugs reproduce observed failure before a fix; record base revision, expected behavior and smallest relevant source path. Read parity evidence for existing behavior and domain glossary for terms via [METRO-9](https://app.plane.so/metro-station-finder/browse/METRO-9/) while pending. Add API/UI/security/observability reads only when those boundaries are touched.

Retain settled test seams: deterministic domain/data fixtures, provider/contract boundaries, Workers integration and browser/accessibility journeys when their implementations exist. Cover invalid input, empty data, failed provider and recovery when relevant; use synthetic coordinates, never personal location. A failing regression should prove behavior, not mirror implementation. Do not weaken assertions or skip failures to pass. Record exact checks, fixtures, outcomes and omissions against [quality gates](quality-gates.md). Documentation tasks verify links, routing and scope without claiming app checks ran.
