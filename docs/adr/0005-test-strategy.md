# ADR-0005: Test strategy

- Status: Accepted
- Date: 2026-11-03
- Ticket and specification: METRO-22, `metro-foundation-completion` revision `2026-11-03-r1`

## Context

Tests covered scripts and core only: no coverage measurement, no API or component tests, and a hand-written Chromium script for E2E. Evidence: [METRO-22 evidence](../evidence/metro-foundation-test-pyramid.md) and [testing guide](../agents/testing.md).

## Decision

- We will run unit, in-process API, component and tooling tests with `bun test`. Coverage is always on: `[test] coverageThreshold = { lines = 0.9, functions = 0.9 }` is enforced per file, with reporters `text` and `lcov` and no `coveragePathIgnorePatterns`. Because Bun measures only files that a test loads, `scripts/coverage-scope.ts` fails `check` when a tracked product source file (under `apps/*/src` or `packages/*/src`) is missing from `coverage/lcov.info`, except two documented exemptions (the browser entry and a type-only module). Scripts are structured as a tested module plus a one-line entry guard.
- We will test React components under Bun with `@happy-dom/global-registrator` and `@testing-library/react`, typechecked by a dedicated `tsconfig.dom-test.json` (DOM and Bun types) so Bun globals remain rejected in web source.
- We will run E2E with Playwright Test (`playwright.config.ts`, `e2e/*.e2e.ts`) against the built `vite preview` running the Worker in workerd. Locally Chromium only; with `CI=true` Chromium, Firefox, WebKit and a mobile Chrome profile. `retries: 0` everywhere. Auto fixtures fail any test on console or page errors and on axe violations on the page it leaves open. Traces and screenshots are kept on failure, with an HTML report. The `.e2e.ts` suffix keeps `bun test` (which also matches `.spec.ts`) from loading Playwright specs.
- We will keep the canonical names `check`, `smoke`, `build`, `bundle:check` and `scan` for hooks and CI.

## Consequences

- A file that no test loads is still caught for product source; unmeasured scripts and the browser entry are listed and exercised through subprocess tests, `check` and `smoke`.
- Cross-browser coverage costs about 40 seconds of browser installation on a cold CI cache and about 15 seconds of tests.
- happy-dom is not a real browser; behavior that depends on layout or the real engine is covered by Playwright only.

## Alternatives considered

- Ignore lists for entry scripts: hides unmeasured code behind configuration.
- Vitest or Jest: a second runner next to Bun's built-in one.
- Chromium only in CI: loses engine coverage cheaply available.

## Confirmation

- `bunfig.toml` `coverageThreshold` (per file) and `scripts/coverage-scope.ts` (`bun run coverage:scope`), both in `bun run check`.
- Playwright settings are covered by `bun run smoke`; the `.e2e.ts` suffix rule has no dedicated test.
