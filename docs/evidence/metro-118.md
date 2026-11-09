# METRO-118 evidence: no focus ring after a tap

Date: 2026-11-09. Base: `061d771` (`feature/metro-rebuild`). Head: the tip of `ticket/metro-118-tap-focus-ring` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0, Playwright 1.64.1. Scope: the ticket (METRO-118, owner review of `061d771`). Labels: Repo-verified, Context7-verified, Unverified, Inferred.

## Cause (Repo-verified)

`apps/web/src/styles/base.css` carried `[tabindex="-1"]:focus { outline: 3px solid ... }`, kept from METRO-58 so the error fallback shows a ring even when a browser does not match `:focus-visible` for script focus. The result heading (`h2.result__name`, `tabIndex={-1}`, focused by script in `LocationResult.tsx` and `StationResult.tsx`) matched it too, so any script focus drew the 3px ring, whatever the last input was. The design handoff (`docs/design/handoff/base.css`) has only `:focus { outline: none }` and `:focus-visible { ... }`; the forced rule is an app addition, not in the handoff.

## Change

`[tabindex="-1"]:focus` became `section:focus` (and the same in its `forced-colors` block). The only focusable sections are the two error fallbacks: `error-boundary.tsx` (`role="alert"`) and `lazy-feature.tsx` (the failed lazy feature). Every other script-focused element (result headings, notices, the panel scroller) now rings through `:focus-visible` alone. CSS only; no markup, script, CSP or token change.

## Browser behaviour (Context7-verified for the rule, Repo-verified for the engines)

MDN (`:focus-visible`, via Context7): the browser decides by heuristic when focus should be evident; a pointer-set focus on a button is generally not shown. The behaviour of script `focus()` (matches when the previously focused element matched, or after keyboard input) is the spec heuristic; the MDN text fetched did not state it in those words, so the engine behaviour below rests on the runs, not on MDN. Measured by `e2e/focus-ring.e2e.ts` (computed `outline-style`, `outline-width`, `box-shadow` of the focused heading, after animations end):

| Case                                          | chromium | firefox | webkit | mobile-chrome (Pixel 7, `tap()`) |
| --------------------------------------------- | -------- | ------- | ------ | -------------------------------- |
| Use my location by pointer: heading, no ring  | pass     | pass    | pass   | pass                             |
| Pick a station by pointer: heading, no ring   | pass     | pass    | pass   | pass                             |
| Use my location by keyboard: heading has ring | pass     | pass    | pass   | pass                             |
| Pick a station by keyboard: heading has ring  | pass     | pass    | pass   | pass                             |
| Error fallback after a pointer action: 3px    | pass     | pass    | pass   | pass                             |

Red first: before the CSS change, on Chromium the two pointer cases failed (a ring was drawn) and the three others passed. Pre-fix behaviour on Firefox and WebKit was not run (Unverified). Each case also asserts `toBeFocused()`, so focus still moves. Existing `activeElement` and `toBeFocused` assertions in other specs were not edited.

## First-visit budget (Repo-verified, `bun run build` then `bun run bundle:check`)

| Stage                                               | First-visit raw / gzip | CSS entry raw / gzip | All files raw / gzip |
| --------------------------------------------------- | ---------------------- | -------------------- | -------------------- |
| Base `061d771`                                      | 249,561 / 78,134       | 14,141 / 3,975       | 358,628 / 109,053    |
| First try `section[tabindex="-1"]:focus` (rejected) | 249,575 / 78,139       | 14,155 / 3,978       | 358,642 / 109,053    |
| Shipped `section:focus`                             | 249,545 / 78,126       | 14,125 / 3,965       | 358,612 / 109,042    |

Net change: -16 raw / -8 gzip. Headroom under the current gate: 455 raw / 1,874 gzip of 250,000 / 80,000. No limit changed.

## Accessibility

Keyboard users and script focus after keyboard input still get the 2px `:focus-visible` ring (WCAG 2.4.7). Tab order, focus order and the size of the ring are unchanged, and nothing was added that could cover a focused control (2.4.11). The full smoke run includes `e2e/accessibility.e2e.ts` and the per-spec axe fixture, light and dark, all passing. `tokens` contrast tests are unchanged. A pointer user gets no ring on a heading that took focus after their own tap; that is the requested behaviour, and the heading is still announced by its focus. Whether a screen reader on a touch device reads the heading after focus moves (VoiceOver, TalkBack) is Unverified here.

## Commands run

- `mise install --locked`, `bun run bootstrap`, `hk install --mise`: ok.
- `bun run build`, `bun run bundle:check` before and after: numbers above.
- `bun run smoke e2e/focus-ring.e2e.ts`: red on Chromium before the change (2 failed, 3 passed); `CI=true` after: 20 passed over four projects.
- `CI=true bun run smoke` (all projects, whole suite): 590 passed, 19 skipped, 0 unexpected failures. The `headers.e2e.ts` tests marked `test.fail()` print as expected failures and are counted as passed.
- `bun run check`: pass (format, lint, boundaries, imports, unused, links, branches, types, bun tests, Vitest, coverage, typecheck).

## Commands not run

- `bun run smoke:live` (needs a real Google key and calls Google; forbidden here).
- Real-device checks on iOS Safari and Android Chrome: only emulation (Pixel 7 profile, `tap()`) ran. Unverified on hardware.

## Unverified

- Real touch hardware, and real Safari (desktop WebKit on Windows here is Playwright's build).
- Pre-fix behaviour on Firefox and WebKit.
- Windows High Contrast (`forced-colors`) rendering of the fallback ring (rule edited, not rendered).

## Review dispositions
