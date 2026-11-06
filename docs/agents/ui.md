# UI and accessibility

Read when: building or changing components in `apps/web/src`, interaction, focus, error copy or accessibility checks.

## Rules

- Inspect the affected components first. For existing journeys and domain terms read [parity](../product/feature-parity.md) and the [glossary](../product/glossary.md); do not invent behavior from planned architecture.
- Specify loading, empty, success, failure and recovery states, keyboard and focus behavior, labels, screen-reader feedback and responsive checks for each UI slice. Keep geographic station selection and provider walking-route distance as distinct concepts.
- The target is WCAG 2.2 level AA. Keep the axe tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` and `best-practice` (`AXE_TAGS` in `e2e/fixtures.ts`): a tag filter replaces axe's default rule set, and `wcag22aa` is what turns on `target-size`. A pass is not proof of 2.5.8.
- `bun run smoke` runs Playwright against the built app with an axe scan on every page and fails on page or console errors. It covers only the synthetic scaffold page and its loading, success and error states. Record manual evidence for what it does not exercise and list unrun automation: screen-reader output and live-region timing, 1.4.10 Reflow and 1.4.4 Resize Text (320 px, 200 %), 2.4.11 against overlays, 2.5.7 Dragging, 2.5.8 exceptions, 3.2.6 Consistent Help, 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication. 2.4.13 is AAA and out of scope.
- Keyboard: `expectTabReachesEveryControl` (`e2e/keyboard.ts`) requires Tab to reach every control with a visible `:focus-visible` indicator, nothing covering it, no trap and Shift+Tab leaving the last control. The scaffold page has no controls, so its test pins `expected: 0`; when controls appear that pin fails: set the new count and add ARIA snapshot and keyboard cases.
- Error handling: `main.tsx` renders `StrictMode > ErrorBoundary > App` with `rootErrorOptions`. `ErrorBoundary` is a small class (no dependency); it catches render, lifecycle and constructor errors only, so event handlers, async callbacks and effects set their own error state. The fallback is a `main` with a `role="alert"` section named by its `h1`, a plain-English hint and a native "Try again" button; the section takes focus on mount (`tabIndex={-1}`, 3px outline from `focus.css`). All fallback copy lives in `errorCopy`.
- Never render or log `error.message`, a stack or a component stack: they can carry coordinates or URLs. `report-error.ts` logs only `<label>: <name>` with one of the seven built-in error names, else `Error` or `NonError`; the three root callbacks use it. A failed request shows fixed `errorCopy` text keyed by error class, never the error ([security](security.md)). Setting the callbacks hides React's default console output; to debug, widen the reporter locally and never commit that.
- Read [testing](testing.md) for behavior, [security](security.md) for location and permissions, [API](api.md) for provider interaction.

## Enforced by

- `e2e/fixtures.ts`: fails any test on a console error, an uncaught page error or an axe violation (a deliberate error must use `allowedConsoleError`). `scripts/ui-docs.test.ts` fails if an axe scan bypasses `AXE_TAGS`. Fix the page, not the fixture.
- `e2e/error-fallback.e2e.ts`: fails if the fallback lacks the named alert, focus, a 2px outline, retry, or leaks the thrown message.
- `e2e/accessibility.e2e.ts`, `e2e/keyboard.ts`: fail on keyboard and ARIA snapshot regressions.

## Read more

- [Moved UI detail](../evidence/metro-86-moved-ui.md): axe tag measurements, browser differences, StrictMode and focus trade-offs, unverified items.
- [Quality gates](quality-gates.md), [ADR-0011](../adr/0011-security-headers.md).
