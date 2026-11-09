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

Red first: before the CSS change, on Chromium the two pointer cases failed (a ring was drawn) and the three others passed. Pre-fix behaviour on Firefox and WebKit was not run for those five (Unverified). Each case also asserts `toBeFocused()`, so focus still moves. Existing `activeElement` and `toBeFocused` assertions in other specs were not edited.

### Keyboard then pointer (review finding 1)

A real click on an option leaves focus in the text field (`onMouseDown preventDefault` on the listbox), and `StationPicker` then focuses the heading from an effect. The field is `:focus-visible` after typing, so script focus can inherit its ring. Three cases type with `page.keyboard.type` (not `fill`): type then click or tap an option; type, Escape, then press Use my location with the pointer; type then Enter. Results with `:focus-visible` semantics only (before the fix below), Repo-verified:

| Case                               | chromium | firefox | webkit | mobile-chrome |
| ---------------------------------- | -------- | ------- | ------ | ------------- |
| Type, then click or tap an option  | red      | green   | red    | red           |
| Type, then press Use my location   | green    | green   | green  | green         |
| Type, then Enter: heading has ring | green    | green   | green  | green         |

So `:focus-visible` alone did not meet the ticket for the picker flow in three engines: the heading drew a 2px ring after a tap. Probe (Repo-verified, throwaway page): after typing, `blur()` then `focus()` still matches `:focus-visible` in Chromium and WebKit when the mousedown was prevented; `focus({ focusVisible: false })` does not match in Chromium, Firefox and WebKit. A first attempt, blur then focus, stayed red and was dropped.

Fix (smallest correct): `StationCombobox` reports how a pick was made (`onSelect(station, "keyboard" | "pointer")`), and `StationPicker` focuses the heading with `{ focusVisible: source === "keyboard" }`. Enter still rings (it also asks for it explicitly); a click or tap asks for no ring. An engine that ignores the option falls back to its own heuristic, which is the pre-fix behaviour. `focusVisible` is an experimental `focus()` option on MDN; its engine support beyond what the probe measured is Unverified. A Vitest case pins both calls. Use my location needed no change: the press moves focus to the button (or the panel in WebKit) before the effect runs.

Pre-existing and unrelated, measured: in WebKit, pressing Use my location with the pointer while the station list is open and the field has focus does not start a search (the press lands on the panel, probably because the layout moves between mousedown and mouseup). The test closes the list with Escape first. Not fixed here; worth a ticket.

### Forced ring vs `:focus-visible` on a section

On a `section` the forced rule (3px, specificity above `:focus-visible`) outranks the 2px `:focus-visible` ring, so a keyboard user also sees 3px on the two fallbacks. Intended: it is the METRO-58 behaviour and larger than 2px.

### Other places that take script focus

- `apps/web/index.html` has no focusable element; `main.tsx` renders `ErrorBoundary` (a `section`, covered) and its root error callbacks only log. There is no static fallback to ring (Repo-verified by reading both).
- `NearestStation.tsx` `searchNotice` (a `div.notice`, `tabIndex={-1}`, focused by script) used to get the forced 3px ring and now follows `:focus-visible`: ring after keyboard, none after a tap. Intended; not asserted in a browser test (it needs the Maps script to fail to load, covered elsewhere by `place-search.e2e.ts` for focus only). Unverified in a browser.
- A guard test, `apps/web/src/focus-fallbacks.test.ts`, fails if a `section` other than the two fallbacks gets `tabIndex`, or if `base.css` goes back to `[tabindex="-1"]:focus`.

### Test hygiene

The error-fallback case patches `Number.prototype.toFixed` through an init script, as `error-fallback.e2e.ts` does. That helper is a private constant of the other spec, and Playwright specs cannot import each other without running the importer's tests; the duplication is eight lines and is kept rather than editing the existing spec.

## First-visit budget (Repo-verified, `bun run build` then `bun run bundle:check`)

| Stage                                               | First-visit raw / gzip | CSS entry raw / gzip | All files raw / gzip |
| --------------------------------------------------- | ---------------------- | -------------------- | -------------------- |
| Base `061d771`                                      | 249,561 / 78,134       | 14,141 / 3,975       | 358,628 / 109,053    |
| First try `section[tabindex="-1"]:focus` (rejected) | 249,575 / 78,139       | 14,155 / 3,978       | 358,642 / 109,053    |
| Shipped `section:focus`                             | 249,545 / 78,126       | 14,125 / 3,965       | 358,612 / 109,042    |

After the review fix (picker `focusVisible`, `onSelect` source): first visit 249,545 / 78,123, entry JS unchanged at 235,018 raw (the picker code is in the lazy `Nearby` chunk); all files 358,717 / 109,085 of the 400,000 / 125,000 ceiling.

Net change of the first-visit entry against the base: -16 raw / -10 gzip. Headroom under the current gate: 455 raw / 1,874 gzip of 250,000 / 80,000. No limit changed.

## Accessibility

Keyboard users and script focus after keyboard input still get the 2px `:focus-visible` ring (WCAG 2.4.7). Tab order, focus order and the size of the ring are unchanged, and nothing was added that could cover a focused control (2.4.11). The full smoke run includes `e2e/accessibility.e2e.ts` and the per-spec axe fixture, light and dark, all passing. `tokens` contrast tests are unchanged. A pointer user gets no ring on a heading that took focus after their own tap; that is the requested behaviour, and the heading is still announced by its focus. A virtual click on a picker option (screen reader, switch access, voice control) reports `event.detail === 0`; the combobox treats it as a keyboard pick, so those users keep the ring (Vitest pins detail 0 as `focusVisible: true` and detail 1 as `false`). Playwright `click()` and `tap()` report detail 1 or more, so the e2e cases cannot exercise this path. Whether a screen reader on a touch device reads the heading after focus moves (VoiceOver, TalkBack) is Unverified here.

## Commands run

- `mise install --locked`, `bun run bootstrap`, `hk install --mise`: ok.
- `bun run build`, `bun run bundle:check` before and after: numbers above.
- `bun run smoke e2e/focus-ring.e2e.ts`: red on Chromium before the change (2 failed, 3 passed); `CI=true` after: 20 passed over four projects.
- `CI=true bun run smoke` (all projects, whole suite), after the review fixes: 596 passed, 19 skipped, 6 failed. The six were timeouts of 35 s to 1.3 min on a machine shared with other agents (`location.e2e.ts` axe x4 and two `nearest-station.e2e.ts` cases, Chromium); `CI=true bun run smoke e2e/location.e2e.ts e2e/nearest-station.e2e.ts --project=chromium` rerun alone: 32 passed. All 36 `focus-ring.e2e.ts` runs (9 cases x 4 projects) passed in the full run. An earlier full run at default workers, before the review fixes, passed 590 with the same kind of timeouts under load on other files; the cause of those timeouts is Inferred (load), not diagnosed. The `headers.e2e.ts` tests marked `test.fail()` print as `x` and count as passed.
- `bun run check` after the review fixes: pass (format, lint, boundaries, imports, unused, links, branches, types, bun tests, Vitest with coverage thresholds, typecheck).
- Vitest: `StationPicker.test.tsx` (new case pins `focusVisible` true after Enter, false after a click) and `focus-fallbacks.test.ts` (new guard).

## Commands not run

- `bun run smoke:live` (needs a real Google key and calls Google; forbidden here).
- Real-device checks on iOS Safari and Android Chrome: only emulation (Pixel 7 profile, `tap()`) ran. Unverified on hardware.

## Unverified

- Real touch hardware, and real Safari (desktop WebKit on Windows here is Playwright's build).
- Pre-fix behaviour on Firefox and WebKit.
- Windows High Contrast (`forced-colors`) rendering of the fallback ring (rule edited, not rendered).

## Review dispositions

Independent review of head `7f13a7e` by the `independent-reviewer` agent `a4443f1c07eb70995`, run after the pull request opened. No Critical findings.

IMPORTANT

1. Fixed. The pointer pick test did not model real use. Three keyboard-then-pointer cases were added (red first: type then click an option failed on Chromium, WebKit and mobile-chrome, passed on Firefox) and the picker now focuses the heading with `focusVisible` only after Enter (`onSelect` reports the source). See "Keyboard then pointer". A blur-first attempt stayed red and was dropped.
2. Fixed. The `lazy-feature.tsx` comment, the `shell.css` comment on `.panel__scroll:focus` (the rule stays: it is harmless, byte-neutral and still stops a ring on the scroller after a key press) and the ADR-0021 deviation line now describe `section:focus`. ADR-0021 is `Proposed`, so the line was amended in place with a "amended by METRO-118" note.

MINOR

3. Fixed. `focus-fallbacks.test.ts` guards the two focusable sections and the `base.css` selector. The forced 3px ring outranking the 2px `:focus-visible` ring on a section is stated above.
4. Fixed in the text. `index.html` and `main.tsx` have no static fallback; `searchNotice` is stated as intended and not asserted in a browser (Unverified).
5. Declared. The `toFixed` patch is duplicated from `error-fallback.e2e.ts` on purpose; reason above.

### Second pass

Second independent review of head `e96a37f` by the `independent-reviewer` agent `afcf49bbcf34bf856`. No Critical and no Important findings. Numbers follow that review's Minor list as relayed to the implementer; its findings 3 and the full text were not in the message, so they have no line here.

- Minor 1. Fixed. A virtual click (`event.detail === 0`) now counts as a keyboard pick and keeps the ring; Vitest pins both values. See Accessibility.
- Minor 2. Types inferred, not declared; `bun run typecheck` passes. No change.
- Minor 4. Declared. The guard test is a regex over the source, so it is weak (a `section` whose attributes contain a `>` before `tabIndex` would be missed); acceptable for a guard that is also backed by the `base.css` selector assertion.
- Minor 5. Declared. The WebKit pointer press that lands on the panel while the station list is open is now Plane ticket METRO-124; it is not fixed here.
- Minor 6. Relayed to the implementer as fixed or declared, without its text; no change beyond Minor 1 was made for it.

After merging the new bundle gate (METRO-116, ADR-0023) the report reads: first-visit JS 235,420 / 74,159 (budget 250,000 / 80,000), first-visit CSS 14,125 / 3,965 (budget 20,000 / 6,000), Lazy screen nearby 90,970 raw (limit 120,000), Shared lazy 18,225 raw (allowance 27,000). The CSS entry is the same 14,125 as before the merge.
