# METRO-112 evidence: Nearby 2/4, the offline station picker and the station result

Date: 2026-11-09. Base: `95de2c1` (`feature/metro-rebuild`, merge of PR 113, the SVG line map). Head: the tip of `ticket/metro-112-station-picker` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0, Playwright 1.64.1. Scope: the ticket and its parent METRO-109. Labels: Repo-verified, Context7-verified, Unverified.

## What shipped

- `features/station-picker/`: `match.ts` (case, space and hyphen insensitive substring match over names and aliases, the matched part), `station-facts.ts` (fare range from `findFare`, Directions URL, stop label), `StationCombobox.tsx`, `StationResult.tsx`, `StationPicker.tsx` (sheet rules), `copy.ts`, `picker-icons.ts`, `station-picker.css`.
- `features/nearby/Nearby.tsx`: the screen. `AppRoutes.tsx` has one `lazyFeature` for it; the shell's map slot is filled through `setMap` (ADR-0022).
- `NearestStation.tsx`: one optional `after` slot; nothing else changed.
- Removed `.tag--sample` from `common.css` (and the words "sample data" from a comment in `route.css`); the new guard found both.
- Tests: Vitest `match`, `station-facts`, `picker-icons`, `StationPicker` (keys and states), `StationResult`, `Nearby`; Bun `scripts/no-mock-markers.test.ts`; Playwright `e2e/station-picker.e2e.ts` (15 tests).

## First-visit budget (Repo-verified, `bun run build` then `bun run bundle:check`)

| Stage                                                         | Entry JS raw / gzip | First visit raw / gzip | Headroom raw / gzip | All files raw / gzip |
| ------------------------------------------------------------- | ------------------- | ---------------------- | ------------------- | -------------------- |
| Base `95de2c1`                                                | 235,119 / 73,907    | 249,662 / 78,135       | 338 / 1,865         | 307,774 / 98,884     |
| 1 one lazy boundary for page and map (no picker yet)          | 234,896 / 73,849    | 249,439 / 78,077       | 561 / 1,923         | 307,624 / 98,048     |
| 2 picker, result, copy, styles, icons (commit `61dd751`)      | 235,006 / 73,896    | 249,549 / 78,124       | 451 / 1,876         | 348,017 / 106,181    |
| Final (adds the focus-ring CSS, scroll into view, arrow keys) | 235,006 / 73,900    | 249,549 / 78,128       | 451 / 1,872         | 348,453 / 106,346    |

Entry delta of the slice against the base: -113 raw / -9 gzip. Headroom left: 451 raw / 1,874 gzip (it was 338 / 1,865). No limit changed. Stage 1 saved 223 raw / 58 gzip of entry (the second loader and its dynamic import); stage 2 gave back 110 raw. Why the entry grew by 110 raw bytes at stage 2 when no entry file was edited is Unverified (Inferred: the bundler moved a shared module between chunks); the stage 2 build was not diffed.

Lazy chunks of the final build (raw / gzip): `Nearby` JS 34,092 / 12,523 (was NearestStation 11,464 / 4,504 and LineMap 9,864 / 3,807, both now inside it); `Nearby` CSS 47,662 / 8,016 (was NearestStation 15,455 / 3,421 and LineMap 4,107 / 1,242); adapter `maps` 5,137 / 2,601; core `src` 3,428 / 1,597; `web-vitals` 7,962 / 3,058; `reveal` 656 / 431. All files: 348,486 / 106,348 of 400,000 / 125,000 (87 percent raw, 85 percent gzip). The CSS chunk carries `route.css` (15.8 KB) for the `.ticket` rules and `nearby.css` (11.5 KB) for `.result` and `.link-ext`; splitting `route.css` is the first lever when the ceiling gets tight, and slices 3 and 4 will need `nearby.css` and the route rules anyway.

## Lab web vitals (Repo-verified, `e2e/web-vitals-lab.e2e.ts`, Chromium)

Three runs after the final build: LCP 412 to 436 ms (limit 2,500), CLS 0.0000 (limit 0.1). The delayed-script control measured 3,392 to 3,412 ms and the late-block control 0.1742, reported as failures as intended. Real-user LCP is Unverified.

## Decisions and deviations

- Handoff order (Use my location, then Search for a place, then Or pick a station): the existing page keeps its order (search, then the location button), as the ticket forbids changing existing roles and keyboard order; the picker follows the location controls. The location slice (METRO-113) rearranges.
- "Enter opens Station detail" (handoff) is "Enter picks the station and shows the result" here, per the ticket. "Browse all 16 stations" cannot go to a Line tab (no router, no Line screen): it clears the text, lists all 16 stations in the popup and returns focus to the input.
- Directions URL: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` with six decimals. The handoff markup adds `travelmode=walking`; it is left out so nothing in the result implies a walk. The test asserts the only parameters are `api` and `destination` and that the URL holds exactly two numbers.
- The result is the ticket stub: eyebrow "Station", heading (tabindex -1, takes focus on every pick, including the same station again), "Stop N of 16", the roundel, "Single fare from here" and the range with the `Price` helper (the sign is hidden, "20 taka to 80 taka" is spoken), and the stub's footnote from `datasetProvenance.fares` through the existing `faresAsOf` copy and `formatIsoDate`. No literal date in the web app. A station without a known fare shows "No fare is available from this station." (not reachable with the dataset; covered by a mocked test).
- "Show on map" is an addition the ticket's snap rules need ("show on map peek"): it drops the sheet to peek and moves focus to the map, the one place the highlighted station is shown.
- Contrast: no token was added, so the 53 pairs of `scripts/design-contrast.ts` are unchanged and green (`bun run check`).
- Roles: the popup is a `div role="listbox"` with `tabIndex=-1` and the options `div role="option"`, each with one visible lint disable and its reason (`jsx-a11y/prefer-tag-over-role`, and for the option `click-events-have-key-events` and `interactive-supports-focus`): a native `select` cannot hold the roundel and the two-line option, and focus stays on the input by design. The region for the empty state is an `output` (implicit status), not a `div role="status"`.
- Status: the picker has one status region (the empty state); the shell's panel-size status is the shell's. No second live region announces a pick; focus moves to the heading.
- Focus ring: the handoff draws the ring on the container only; the keyboard gate (`expectTabReachesEveryControl`) requires the focused control itself to change, so the input draws the 2 px ring and the container keeps the soft halo (`station-picker.css`).
- Suggestions at full: `max-height: min(50dvh, 22rem)`, `overflow-y: auto`, `overscroll-behavior: contain`; opening the list scrolls the field to the top of the panel (instant), so the list is on screen below it. The e2e test at 390 x 844 checks the list is below the header, inside the viewport, the topmost thing at its first option, scrolls inside itself, and that ArrowUp to the last option brings it into the list. Unverified: a phone's on-screen keyboard, which shrinks the visual viewport (no browser test models it).
- Offline: the context goes offline after the app's own idle loads settle and one station has been picked online (the mono font file is fetched the first time the result's eyebrow is drawn). After that, picking, the no-match state, Browse all and the map add no request of any kind (fetch, beacon, image, stylesheet, font, socket). A first-ever use while offline would show the system mono font until METRO-106's cache holds it; the page itself still works. The test caught this font request, which is why it warms first.
- Escape on a picked station clears the text but keeps the result and the map highlight; the result belongs to the last pick.
- Two results can show together (a located nearest station above or below the pick); out of this slice.

## Changed existing tests (each justified; none weakened)

| File                         | Change                                                                      | Why                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/headers.e2e.ts`         | stylesheets and linked 3 to 2                                               | The map chunk's stylesheet is now part of the one Nearby chunk; the assertion still pins an exact count and "no foreign, no `<style>`, no `style` attribute". |
| `e2e/nearest-station.e2e.ts` | same count; control pins `shell + 2` and `shell + 3` become `+ 3` and `+ 4` | The combobox is one new tab stop; the helper demands the exact count (its own message says to set it).                                                        |
| `common.css`, `route.css`    | `.tag--sample` rule removed; a comment reworded                             | The new guard forbids the marker in shipped files; no component used the class.                                                                               |

`AppRoutes.test.tsx`, `AppRoutes.map.test.tsx`, `AppShell.test.tsx`, `lazy-feature.test.tsx`, `line-map.e2e.ts` and every other test pass unchanged.

## Tests

- Vitest (`station-picker`, 38 tests): roles, names and description; typing opens the sheet to full and wraps the match; ArrowDown and ArrowUp wrap both ways and open a closed list on the first or last option; no-match arrows are left alone; Home, End, Left and Right release the active option and are not prevented; Enter picks (heading focused, sheet half, pick reported) and does nothing without an active option; Escape closes the list, then clears, then is left alone; click on an option; clear button; blur; no match with Browse all after blur, reachable and working; blank text; the result's content, footnote, link attributes and URL; no distance, walk, nearest, pass or sample words; Show on map; the same station again; replacement; no fetch or beacon and no `style` attribute; `scrollIntoView` missing. New files are at or above 96 percent branches (per-file gate 90); `bun run check` green.
- Playwright (`e2e/station-picker.e2e.ts`): the above in the built app with the enforced CSP, tab order (Home link first in the header where the browser Tabs to links, then the panel with the picker after the location button, then the four map stops), axe in light and dark for the open list, the no-match state and the result, reduced motion with a motion-allowed control, no inline style, offline with the early listener, the built files free of the mock markers (with a control).
- Not covered by a browser test: a screen reader, the on-screen keyboard, high-contrast mode on the picker, the owner's visual review at 390 and 1280 px in light and dark.

## Commands run (Repo-verified, in the worktree)

`mise install --locked` (it reported an error and suggested `mise install` without `--locked`; the tools were already installed), `bun run bootstrap`, `hk install --mise`; `bun run check` (green); `bun run build` and `bun run bundle:check` (numbers above); `bun run smoke -- --project=chromium` (green after the fixes above); `CI=true bun run smoke -- --shuffle` on all four projects (see the pull request for the last result). One Firefox failure on the first all-project run, axe `color-contrast` on the open list in dark, was the popup's rise animation being measured halfway; the test now waits for animations to finish before axe, and the picker spec passes on Firefox.
