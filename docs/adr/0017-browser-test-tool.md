# ADR-0017: Browser test tool stays Playwright Test

- Status: Accepted
- Date: 2026-11-06
- Ticket and specification: METRO-76 (Plane); no separate specification, the ticket acceptance is the contract

## Context

Browser tests run on Playwright Test 1.64.1 ([ADR-0005](0005-test-strategy.md), `playwright.config.ts`, `e2e/*.e2e.ts`): 6 files and 31 tests, Chromium locally and Chromium, Firefox, WebKit and a Pixel 7 profile in hosted CI (124 tests), axe-core 4.14.0 through `@axe-core/playwright`, ARIA snapshots (METRO-41), header and CSP checks, a shuffled order with a printed seed (METRO-35) and `retries: 0`. The question is whether WebdriverIO beats it for one web app that may later get native Android and iOS apps.

A spike ported three tests (ARIA snapshot, axe scan, header and CSP checks) to WebdriverIO 10.1.0 against the same built app. All numbers and sources are in the [spike evidence](../evidence/browser-tool-spike-2026-11.md). Findings that decide this:

- Speed is at parity at this size: 31 Playwright tests in 3.9 to 4.3 s locally; 8 WebdriverIO tests in 3.9 s (Chrome), 6 s (Firefox, warm), 3.7 s (Chrome with Pixel 7 emulation). Measured.
- WebdriverIO 10.1.0 has no ARIA snapshot matcher, so the METRO-41 check could only be approximated with weaker, hand-written role and name assertions. Measured.
- The official `@axe-core/webdriverio@4.14.0` fails on WebdriverIO 10.1.0 (`client.executeAsync is not a function`; peer range stops at 9). Our own 11-line adapter works. Measured.
- WebdriverIO reaches WebKit only through `safaridriver`, which has no headless mode and no BiDi; the WebKit coverage that Linux CI has today would be lost or moved to a macOS runner. Web-verified.
- The minimal WebdriverIO stack is 312 installed packages and one blocked install script against Playwright's 5 packages and none (Measured), and the WebdriverIO CLI does not run under Bun (Measured; the repo already runs Playwright through Node).
- WebdriverIO has no seeded shuffle for its mocha framework that I found, and a session per spec file instead of a context per test (Measured, partly Unverified).
- WebdriverIO's real strength is Appium: one API for web, Android and iOS (Web-verified). That matters only once a native app exists. None exists in the repository, and Appium was not tried in the spike.

## Decision

- We will keep Playwright Test as the only browser test tool. No-go on migrating to WebdriverIO and no-go on running both against the web app.
- We will not add WebdriverIO or Appium now. If a native Android or iOS app is approved, a device lane (WebdriverIO with Appium, or whatever fits that app's stack at that time) will be decided in its own ADR, as a separate lane for native tests beside Playwright, with its own spike on a real device. This ADR does not decide that lane.
- We will not weaken any browser check to fit a tool. Any future change must keep axe (WCAG 2.2 AA tags plus best-practice), ARIA snapshots, header and CSP checks, the Chromium, Firefox, WebKit and mobile viewport matrix, `retries: 0` and the printed shuffle seed.
- Revisit when any of these changes: WebdriverIO ships an ARIA snapshot matcher and a maintained axe adapter for its current major; a native app is approved; Playwright support for a needed browser lapses.

## Consequences

- Nothing changes in the repository, CI or dependencies. The toolchain stays at 5 browser-test packages and no install scripts.
- A future native lane cannot reuse web tests either way, so deferring costs nothing; it will need Appium, a device or emulator provider and, if it uses a cloud device farm, a credentialed job under the no-restored-cache rule in [maintenance](../agents/maintenance.md#credentialed-ci-jobs-metro-47).
- We stay on one vendor's test runner, whose WebKit build is a Playwright patch of WebKit and not Safari itself. Playwright's WebKit is a proxy for Safari, not Safari; real Safari and real-device checks remain a gap, as they are today.
- Playwright's own Android support is experimental and has no iOS (Web-verified), so it is not a native plan either.
- The spike measured one machine, 8 tests and no Appium or Safari; if the decision is reopened, those are the first things to measure.

## Alternatives considered

- Move the suite to WebdriverIO: rejected. It loses the ARIA snapshot check (no equivalent), the official axe adapter does not support the current major, WebKit coverage drops, and the dependency footprint grows about 60-fold in packages, with no speed gain.
- Run both against the web app: rejected. Two tools double the maintenance and CI time for the same assertions; no check is only possible in WebdriverIO.
- WebdriverIO only for a future native device lane: not adopted now, because no native app exists. Left open as the likely candidate for that lane and decided when it is needed.
- Add WebdriverIO now to prepare for native: rejected. Native tests are new tests regardless, so early adoption buys nothing and costs a larger supply-chain surface.

## Confirmation

None (policy). Playwright stays enforced by `bun run smoke` and the `Build and smoke` CI job as in ADR-0005; no check forbids adding another browser tool. `scripts/adr.test.ts` validates this document's header and sections.
