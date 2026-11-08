# METRO-112 evidence: Nearby 2/4, the offline station picker and the station result

Date: 2026-11-09. Base: `95de2c1` (`feature/metro-rebuild`, merge of PR 113, the SVG line map). Head: the tip of `ticket/metro-112-station-picker` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0, Playwright 1.64.1. Scope: the ticket and its parent METRO-109. Labels: Repo-verified, Context7-verified, Unverified.

## What shipped

- `features/station-picker/`: `match.ts` (case, space and hyphen insensitive substring match over names and aliases, the matched part), `station-facts.ts` (fare range from `findFare`, Directions URL, stop label), `StationCombobox.tsx`, `StationResult.tsx`, `StationPicker.tsx` (sheet rules), `copy.ts`, `picker-icons.ts`, `station-picker.css`.
- `features/nearby/Nearby.tsx`: the screen. `AppRoutes.tsx` has one `lazyFeature` for it; the shell's map slot is filled through `setMap` (ADR-0022).
- `NearestStation.tsx`: one optional `after` slot; nothing else changed.
- Removed `.tag--sample` from `common.css` (and the words "sample data" from a comment in `route.css`); the new guard found both.
- Tests: Vitest `match`, `station-facts`, `picker-icons`, `StationPicker` (keys and states), `StationResult`, `Nearby`; Bun `scripts/no-mock-markers.test.ts`; Playwright `e2e/station-picker.e2e.ts` (15 tests).

## First-visit budget (Repo-verified, `bun run build` then `bun run bundle:check`)

| Stage                                                    | Entry JS raw / gzip | First visit raw / gzip | Headroom raw / gzip | All files raw / gzip |
| -------------------------------------------------------- | ------------------- | ---------------------- | ------------------- | -------------------- |
| Base `95de2c1`                                           | 235,119 / 73,907    | 249,662 / 78,135       | 338 / 1,865         | 307,774 / 98,884     |
| 1 one lazy boundary for page and map (no picker yet)     | 234,896 / 73,849    | 249,439 / 78,077       | 561 / 1,923         | 307,624 / 98,048     |
| 2 picker, result, copy, styles, icons (commit `61dd751`) | 235,006 / 73,896    | 249,549 / 78,124       | 451 / 1,876         | 348,017 / 106,181    |
| Final of the first pass (focus ring, scroll, arrow keys) | 235,006 / 73,898    | 249,549 / 78,126       | 451 / 1,874         | 348,486 / 106,348    |
| After the review fixes (shipped)                         | 235,018 / 73,908    | 249,561 / 78,136       | 439 / 1,864         | 350,598 / 106,750    |

Entry delta of the slice against the base: -101 raw / +1 gzip. Headroom left: 439 raw / 1,864 gzip (it was 338 / 1,865). No limit changed. Stage 1 saved 223 raw / 58 gzip of entry (the second loader and its dynamic import); stage 2 gave back 110 raw / 47 gzip. The review fixes added 12 raw / 10 gzip (the shell now gets `undefined` instead of an empty map, so no empty frame is drawn). Why stage 2 grew the entry when no entry file was edited (Repo-verified, A/B build of the same tree): the picker imports `useSheet` from `AppShell.tsx`, which is in the entry. While no lazy chunk imported it, the bundler dropped the unused export from the entry; once the picker imports it, the hook, its context lookup and its "useSheet needs AppShell" error string stay in the entry. The stage 2 tree built with only that import replaced by a local no-op gave an entry of 234,896 / 73,848, the stage 1 figure to the byte. Principle for slices 3 and 4: a lazy chunk that imports an export of an entry module can pull that export into the entry, so measure the entry after each such import. The 110 bytes are accepted: the sheet context is the shell's, and a second copy would not work.

Lazy chunks of the shipped build (raw / gzip): `Nearby` JS 34,873 / 12,884 (was NearestStation 11,464 / 4,504 and LineMap 9,864 / 3,807, both now inside it); `Nearby` CSS 48,981 / 8,047 (was NearestStation 15,455 / 3,421 and LineMap 4,107 / 1,242); adapter `maps` 5,137 / 2,598; core `src` 3,428 / 1,596; `web-vitals` 7,962 / 3,058; `reveal` 656 / 431. All files: 350,598 / 106,750 of 400,000 / 125,000 (88 percent raw, 85 percent gzip). The CSS chunk carries `route.css` (15.8 KB) for the `.ticket` rules and `nearby.css` (11.5 KB) for `.result` and `.link-ext`; splitting `route.css` is the first lever when the ceiling gets tight, and slices 3 and 4 will need `nearby.css` and the route rules anyway.

## Lab web vitals (Repo-verified, `e2e/web-vitals-lab.e2e.ts`, Chromium)

Three runs after the final build: LCP 412 to 436 ms (limit 2,500), CLS 0.0000 (limit 0.1). The delayed-script control measured 3,392 to 3,412 ms and the late-block control 0.1742, reported as failures as intended. Real-user LCP is Unverified.

## Decisions and deviations

- Handoff order (Use my location, then Search for a place, then Or pick a station): the existing page keeps its order (search, then the location button), as the ticket forbids changing existing roles and keyboard order; the picker follows the location controls. The location slice (METRO-113) rearranges.
- "Enter opens Station detail" (handoff) is "Enter picks the station and shows the result" here, per the ticket. "Browse all 16 stations" cannot go to a Line tab (no router, no Line screen): it clears the text, lists all 16 stations in the popup and returns focus to the input.
- Directions URL: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` with six decimals. The handoff markup adds `travelmode=walking`; it is left out so nothing in the result implies a walk. The test asserts the only parameters are `api` and `destination` and that the URL holds exactly two numbers.
- The result is the ticket stub: eyebrow "Station", heading (tabindex -1, takes focus on every pick, including the same station again), "Stop N of 16", the roundel, "Single fare from here" and the range with the `Price` helper (the sign is hidden, "20 taka to 80 taka" is spoken), and the stub's footnote from `datasetProvenance.fares` through the existing `faresAsOf` copy and `formatIsoDate`. No literal date in the web app. A station without any known fare shows no fare, no chip and no footnote (not reachable with the dataset; covered by a mocked test); there is no "no fare" string.
- "Show on map" is an addition the ticket's snap rules need ("show on map peek"): it drops the sheet to peek and moves focus to the map, the one place the highlighted station is shown.
- Contrast: no token was added, so the 53 pairs of `scripts/design-contrast.ts` are unchanged and green (`bun run check`).
- Roles: the popup is a `div role="listbox"` with `tabIndex=-1` and the options `div role="option"`, each with a visible lint disable and its reason (`jsx-a11y/prefer-tag-over-role`, and for the option `click-events-have-key-events` and `interactive-supports-focus`): a native `select` cannot hold the roundel and the two-line option, and focus stays on the input by design. The status is an `output` (implicit status), not a `div role="status"`.
- Status (review findings 2 and 3): the picker has exactly one polite status, the `output` that exists from the first render. After typing it holds the count ("4 stations", "1 station") or "No station matches that name."; a cleared, picked or blank text leaves it empty, so nothing stale is read. It is visually hidden except in the no-match card, where it is the card's title. "Browse all 16 stations" is a sibling outside the live region (a control never lives in a live region) and stays reachable after blur. The shell's panel-size status is the shell's. No other live region announces a pick; focus moves to the heading. Tests read the output after each input and assert it never contains the button.
- Focus ring: the handoff draws the ring on the container only; the keyboard gate (`expectTabReachesEveryControl`) requires the focused control itself to change, so the input draws the 2 px ring and the container keeps the soft halo (`station-picker.css`).
- Suggestions at full: `max-height: min(50dvh, 22rem)`, `overflow-y: auto`, `overscroll-behavior: contain`; when the list opens, the field with its list scrolls into view with `block: "nearest"` (a no-op when already in view; instant). The e2e test at 390 x 844 checks the list is below the header, inside the viewport, the topmost thing at its first option, scrolls inside itself, and that ArrowUp to the last option brings it into the list. Unverified: a phone's on-screen keyboard, which shrinks the visual viewport (no browser test models it).
- Offline (review finding 7): no user-visible string claims offline use, because the offline cache does not exist before METRO-106 (owner ruling); the hint reads "Search all 16 stations by name." and a built-output test fails on the word "offline" in any shipped script or page. The data and the map are local, so the picker needs no network once the screen has loaded, and `e2e/station-picker.e2e.ts` proves that and only that: the context goes offline after the app's own idle loads settle and one station has been picked online (the mono font file is fetched the first time the result's eyebrow is drawn); after that, picking, the no-match state, Browse all and the map add no request of any kind. It proves the warm in-page case, not a cold offline start, which needs METRO-106. A first-ever use while offline would show the system mono font; the test caught this font request, which is why it warms first.
- Escape on a picked station clears the text but keeps the result and the map highlight; the result belongs to the last pick (a choice, documented; the text box is a search field, not the result's title).
- IME (finding 1): keydown while an input method composes (`isComposing`, `key` "Process", or keyCode 229, which Safari reports on the confirming Enter) is ignored, so Enter confirming a candidate never picks and arrows never move the option; unit tests cover each form and a control that the same keys act outside composition.
- Map containment (finding 5): the map is drawn in the shell, outside the screen's tree, so a map render error would have reached the root boundary. `MapBoundary` (in the lazy chunk) contains it: a fixed message with a Reload button in the map frame, no error text, the page and picker keep working. When the screen's chunk cannot load, `AppRoutes` passes no map to the shell, so no empty map frame is drawn; the lazy failure region with Reload shows. Tests: `Nearby.mapfailure.test.tsx` (render error, reload, success) and `AppRoutes.failure.test.tsx` (chunk failure), with `AppRoutes.map.test.tsx` as the control that the frame exists after a load. The earlier AppRoutes tests never covered a failure path.
- Stacked results (finding 6): a pick leaves a located nearest-station result in place, and a location result leaves a pick, so two results can show. Tracked, not built: METRO-113 now has a single current result (a new pick replaces a location result and the reverse).

## Copy for owner confirmation

Every new user-facing string and where it comes from. The handoff screens are in `docs/design/handoff/screens/`.

| String                                                               | Source                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| "Or pick a station"                                                  | handoff, `nearby-searching.light.html`                                                |
| "Station name" (placeholder)                                         | handoff, `nearby-searching.light.html`                                                |
| "Clear station search"                                               | handoff, `nearby-searching.light.html`                                                |
| "Stations" (list name)                                               | handoff, `nearby-searching.light.html`                                                |
| "Stop N of 16"                                                       | handoff, `nearby-searching.light.html` and `nearby-result.light.html`                 |
| "No station matches that name."                                      | handoff, `nearby-no-station.light.html`                                               |
| "Browse all 16 stations"                                             | handoff, `nearby-no-station.light.html`                                               |
| "Check the spelling, or browse the stations."                        | new (the handoff says "or browse the line", which needs the Line screen)              |
| "Search all 16 stations by name." (hint)                             | new (the handoff hint "Works offline. All 16 stations." is an offline claim, dropped) |
| "4 stations", "1 station" (status)                                   | new                                                                                   |
| "Station" (result eyebrow)                                           | new (the handoff says "Nearest station", which a pick must not say)                   |
| "Single fare from here"                                              | handoff, `nearby-result.light.html`                                                   |
| "Fares as of: DTCA notice dated ...; last checked ..."               | existing copy of the nearest-station slice, dates from the dataset                    |
| "Directions in Google Maps" and " (opens in a new tab)"              | handoff, `nearby-result.light.html`                                                   |
| "Show on map"                                                        | handoff, `station.light.html`                                                         |
| "The line map could not be shown. The rest of the page still works." | new                                                                                   |
| "Reload the page"                                                    | handoff, `lazy-failed.light.html`                                                     |

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

## Review dispositions (independent-reviewer a6786a9d283bb010b, as relayed; no Critical, 7 Important)

| Finding                                                                               | Disposition                                                                                                                                           |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Important: Enter and arrows acted during IME composition                            | Fixed: keys are ignored while composing (`isComposing`, `Process`, keyCode 229); unit tests and a control                                             |
| 2 Important: the empty state was a live region that held a button                     | Fixed: the text is in the one `output`, the button is a sibling outside it; tests assert the text and that the button is never inside                 |
| 3 Important: no deliberate announcement of the result count; two possible regions     | Fixed: one polite status with the count ("2 stations", "1 station") or the no-match text, empty when cleared or picked; no second live region         |
| 4 Important: unexplained +110 raw entry bytes                                         | Fixed (explained): `useSheet` imported by the lazy picker stays in the entry; A/B build in the budget section; principle recorded for slices 3 and 4  |
| 5 Important: a map render error or a failed screen load escaped the contained regions | Fixed: `MapBoundary`; no map frame when the screen did not load; tests for both paths and for AppRoutes failure                                       |
| 6 Important: two results can show together                                            | Tracked in METRO-113 (a single current result); not built here                                                                                        |
| 7 Important: "Works offline" overclaims before METRO-106                              | Fixed: the hint is neutral, a built-output test fails on any "offline" string; the offline e2e is kept and stated to prove the warm in-page case only |
| Minor a: scrollIntoView `start` jank                                                  | Fixed: `block: "nearest"` on the field with its list                                                                                                  |
| Minor b: unused or unreachable copy keys                                              | Fixed: `listGroup` and `fareUnavailable` removed; no fare means no fare block                                                                         |
| Minor c: new strings not listed                                                       | Fixed: the table above and the PR body                                                                                                                |
| Minor d: Escape after a pick                                                          | Documented above: the result stays                                                                                                                    |

## Changed existing tests, review round

`AppRoutes.map.test.tsx` gained two assertions (the map frame and the Line map region exist after a load); no existing assertion changed. `StationPicker.test.tsx` and `e2e/station-picker.e2e.ts` (this slice's own) changed their expectations for the hint text and the status; none weakened.
