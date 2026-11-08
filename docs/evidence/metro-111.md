# METRO-111 evidence: Nearby 1/4, station data and the SVG line map

Date: 2026-11-09. Base: `5f5f87a` (`feature/metro-rebuild`, merge of PR 112). Head: the tip of `ticket/metro-111-svg-line-map` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0, Playwright 1.64.1: Chromium for the loop, and all four projects (Chromium, Firefox, WebKit, Pixel 7 Chrome) with `CI=true` after the review. Scope: the ticket and its parent METRO-109. Labels: Repo-verified, Unverified.

## What shipped

- `features/line-map/`: `projection.ts` (equirectangular projection, the stops from `baselineDataset`, label placement), `view.ts` (pure zoom, pan and wheel maths), `use-map-view.ts` (pointer, wheel, pinch, keys), `LineMap.tsx` (the SVG, the three buttons, the station list), `copy.ts`, `control-icons.ts`. `map.css` (already in the repo, unused) is now imported by the chunk.
- `packages/core`: optional `bn` on `Station` (no data filled, nothing renders it).
- `AppRoutes.tsx`: the map is a second `lazyFeature` in the shell's `map` slot, silent while loading. The Google JS map and everything else are untouched.
- `AppShell.tsx`: the map slot now comes after the panel in the DOM (review finding 1).
- Zoom and pan shipped in this slice (they fit the budget); no follow-up ticket was needed.

## First-visit budget (Repo-verified, `bun run build` then `bun run bundle:check`)

| Stage                                                                 | Entry JS raw / gzip | First visit raw / gzip | Headroom raw / gzip | All files raw / gzip |
| --------------------------------------------------------------------- | ------------------- | ---------------------- | ------------------- | -------------------- |
| Base `5f5f87a`                                                        | 234,795 / 73,793    | 249,338 / 78,021       | 662 / 1,979         | 293,404 / 93,618     |
| 1 projection, `bn`, 2 map component (not mounted)                     | unchanged           | unchanged              | 662 / 1,979         | not built            |
| 3 mounted lazily in the shell slot (commit `2bd7817`)                 | 235,076 / 73,904    | 249,619 / 78,132       | 381 / 1,868         | 303,145 / 97,059     |
| 4 zoom, pan, buttons, importing the icons from `icon-data.ts` (tried) | 235,352 / 73,995    | 249,895 / 78,223       | 105 / 1,777         | 307,631 / 98,814     |
| 4 shipped (commit `aecb795`): the three icons live in the lazy chunk  | 235,083 / 73,892    | 249,626 / 78,120       | 374 / 1,880         | 307,632 / 98,824     |
| After the review fixes (shipped)                                      | 235,119 / 73,907    | 249,662 / 78,135       | 338 / 1,865         | 307,774 / 98,884     |

Stages 1 and 2 add code nothing imports, so the build cannot change (Inferred; they were not built on their own, stage 3 was the first build). Entry delta of the slice against the base: +324 raw / +114 gzip (the lazy loader and its dynamic import in `AppRoutes.tsx`, plus the pending argument and the DOM move in the shell). Headroom left: 338 raw / 1,865 gzip. No limit changed.

Lazy chunks of the shipped build (raw / gzip): `LineMap` JS 9,864 / 3,807, `LineMap` CSS 4,107 / 1,242, `distance` 647 / 397 (core's distance function split out of the shared core chunk, which fell from 3,428 / 1,594 to 2,784 / 1,269), `NearestStation` JS 11,464 / 4,504 (was 11,428 / 4,492), adapter 5,173 / 2,620. The ceiling for all files is used to 77 percent raw, 79 percent gzip.

Why the icons are local: `Icon` and `icon-data.ts` are shared with the entry (the theme button), and the bundler put the three icons the map uses into the entry chunk, costing 276 raw bytes of the 662 left. `control-icons.ts` keeps the same Lucide shapes in the lazy chunk (deviation from the "named export of icon-data" rule in `docs/agents/ui.md`); `control-icons.test.ts` fails if they differ from `plus`, `minus` and `maximize` in `icon-data.ts`. Move them when the budget has room.

## Levers for METRO-112, 113 and 114 (headroom is 338 raw / 1,865 gzip)

Everything a slice adds must be a lazy chunk, and the entry still pays for each loader. Measured here (Repo-verified, a throwaway build with the map slot and its loader removed from `AppRoutes.tsx`): entry 234,819 / 73,809 against 235,119 / 73,907 with it, so the whole map wiring costs 300 raw / 98 gzip in the entry. That is the upper bound of what folding the map into the screen's own boundary can save, and the likely saving is about half of it (the second `lazyFeature` call and loader; one dynamic import is still needed). Candidates, best first:

1. One lazy boundary for the whole Nearby screen (the map, the panel and later parts load as one chunk, with one pending status) instead of one `lazyFeature` per part. It needs the shell to receive the map from the screen (for example a context slot the screen fills once loaded) because the shell sits in the entry. Proposed, not implemented here; estimate up to 300 raw / 98 gzip, realistic 100 to 200 raw.
2. Move first-view-only theme tokens further out of the entry (METRO-105 evidence): dropping the duplicated OS-dark token block is about 2.5 KB raw but changes what System means and needs an owner decision.
3. Keep icons and per-feature helpers in their own chunk, as `control-icons.ts` does; adding to `icon-data.ts` can pull shapes into the entry.
4. A fourth slice that adds Google code must keep it behind the existing adapter chunk; METRO-114 removes the Google JS map from the first-visit path, which should free the most.

## Lab web vitals (Repo-verified, `e2e/web-vitals-lab.e2e.ts`)

Runs of the suite after the slice and after the review fixes, Chromium: LCP 420 to 916 ms (limit 2,500), CLS 0.0000 to 0.0027 (limit 0.1). The delayed-script control measured 1,712 to 4,244 ms and the late-block control 0.132 to 0.133, reported as failures as intended. Real-user LCP is Unverified.

## Decisions and deviations

- Bijoy Sarani: the handoff table says y 679.2, but the dataset carries the METRO-67 corrected coordinate (OpenStreetMap node 10294553601), which projects to y 686.3. The test expects the dataset value for that stop and the handoff values (within 0.06) for the other 15. The handoff mockup predates the correction.
- The handoff markup labels the svg with `aria-labelledby="map-title map-desc"`, which makes the name the title plus the whole description. Here `aria-labelledby` is the title and `aria-describedby` the description.
- Role (decided by the orchestrator after review): the svg is `role="application"`, deliberately, because it is a custom pan and zoom widget with its own key handling (arrows, plus, minus, zero), as map UIs are. Trade-off: a screen reader switches to focus mode on it and passes the keys through, so it does not read the map as an image; the description (`aria-describedby`) and the key list (`aria-keyshortcuts`) are read on focus. The station list sits outside the svg, so it stays readable in browse mode. The tab stop carries one visible lint disable (`jsx-a11y/no-noninteractive-tabindex`, reason on the line) with a plain `tabIndex={0}`; the earlier constant that hid it from the rule is gone.
- The station list is an `ol` named "Stations on MRT Line 6, north to south" kept visually hidden: assistive technology reaches it with its reading cursor, it adds no tab stop (the ticket asks for one tab stop). Sighted keyboard users get the map and its buttons; the full visible equivalent is the Line list of a later slice.
- The map and its landmark: a `section` named "Line map" holds it, otherwise axe `region` fails (the map slot is outside `main`).
- The handoff CSS defines no rule for `.map__line` (the gradient stroke) or a dimmed line; `map.css` gains `.map__line { stroke: url(#map-line) }`, `.map__line--dim` (opacity 0.35) and `.line-map`. The three controls are a `fieldset` (prefer-tag-over-role).
- Controls position: they sit in the shell's map frame, which is inset from the screen edge, so `map.css` offsets them to where the handoff draws them (top 66 or 84 px, right space-3 or space-4). Custom properties in `shell.css` would cost entry bytes, so the coupling is documented in the CSS comment and enforced by `e2e/line-map.e2e.ts`, which measures the controls at 390 and 1280 px and fails if `shell.css` moves the frame; the same test checks they start below the header.
- Tab order (review finding 1, fixed): the shell now renders the map slot after the panel, so Tab reaches the Home link first, then the panel, then the map and its three buttons, and the `Line map` region comes after the banner and `main`. The painted stack does not depend on DOM order (map `z-map` 0, panel `z-sheet` or `z-panel`, header `z-header`); screenshots at 390 x 844 and 1280 x 800 in light and dark, before and after, look identical (the files differ in bytes by animation timing; compared by eye, not by pixel). `e2e/line-map.e2e.ts` asserts the first stop is in the header (the Home link where the browser tabs to links) and that every panel stop comes before the four map stops; `AppShell.test.tsx` pins the DOM order. The shell comment that claimed header, nav, main as the whole order is corrected. The old e2e step that clicked the map to reset the focus start now cannot work (the map is last), so `e2e/keyboard.ts` puts the starting point at the top of the document itself, and it accepts an SVG tab stop.
- Pending status (finding 3, fixed): `lazyFeature` takes an optional third argument, what to show while loading. The map passes `null`, so one load announces one status ("Loading this part of the page."); the failure region and Reload button are unchanged. `AppRoutes.test.tsx` expects one status and `lazy-feature.test.tsx` covers the silent case and its failure.
- Wheel (finding 4, fixed): a wheel with Ctrl or Meta is the browser's page zoom (and a trackpad pinch), so it is neither stopped nor used (WCAG 1.4.4). Line and page delta modes are normalised to pixels (`wheelPixels`, tested for all three modes).
- Pointer (finding 5, fixed): `setPointerCapture` is in a `try` (a pointer that is already gone starts no drag and is not tracked); a non-primary button and a Ctrl click with a mouse do not start a drag.
- Network tests (finding 5, fixed): the Playwright listener is attached before the page loads; every request must be a same-origin app file, the vitals beacon, or the Nearby slice's stubbed Maps API, and using the map (keys, buttons, wheel) after going offline must add none. The test waits for the app's own idle web-vitals chunk to settle first, because WebKit logs a console error for a load that fails offline. The unit test is renamed to say what it checks (no fetch, XHR, `sendBeacon` or `Image` call, no style attribute).
- React applies a pointer drag at "continuous" priority, so the new view box can land a moment after the pointer is up (seen in WebKit); the drag e2e uses a retrying assertion.
- Stylesheets: the page now loads three linked files (entry, slice, line map); `headers.e2e.ts` and `nearest-station.e2e.ts` expect three. `AppRoutes.map.test.tsx` is a file of its own so a loaded chunk cannot hide the pending state that `AppRoutes.test.tsx` checks (a shuffle exposed it).
- Motion: no animation exists. The view box is set from state at once, so reduced motion is honoured in every mode (`base.css` clamps transitions; the e2e test reads the new box in the same turn and finds no transition or animation). The pulse and dash march on the user pin and walk path use the existing reduced-motion rules in `map.css`.
- Not built: the scale bar ("1 km"; it would be wrong when zoomed), any pin action, picking, location.
- Zoom step 1.5x, wheel rate 0.2 percent per pixel, centre clamped to the fit area so the line cannot be lost; 0.5x to 8x as specified.

## Review dispositions (independent-reviewer a0863cd0f268d1eb5, as relayed; no Critical)

| Finding                                                                                | Disposition                                                                                                                |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Important 1: map and buttons were tab stops 1 to 4, and the region preceded the banner | Fixed: the slot moved after the panel; e2e and `AppShell` tests assert the order                                           |
| Important 2: the constant that hid the tab stop from the lint rule                     | Fixed: plain `tabIndex={0}` with one visible disable and its reason; `role="application"` kept on purpose, trade-off above |
| Important 3: two pending statuses                                                      | Fixed: a silent pending for the map                                                                                        |
| Important 4: Ctrl and Meta wheel stopped the browser's page zoom; delta modes          | Fixed: both, with tests                                                                                                    |
| Minor: `setPointerCapture` unguarded; non-primary button and Ctrl click                | Fixed, with tests                                                                                                          |
| Minor: network assertions attached late and fetch-only                                 | Fixed: early listener, allow-list of hosts, no request when using the map; unit test widened and renamed                   |
| Minor: `control-icons.ts` could drift from `icon-data.ts`                              | Fixed: `control-icons.test.ts`                                                                                             |
| Minor: control offsets hard-coded against the shell                                    | Kept with reason: custom properties cost entry bytes; documented and enforced by a layout e2e test                         |
| Minor: controls against the header at 390 px                                           | Verified by screenshot and by the layout test                                                                              |
| Finding 9: first-visit headroom nearly gone                                            | Recorded: levers for the next slices above; no limit changed                                                               |

## Tests

- Vitest: `projection.test.ts` (16 stops against the handoff table), `view.test.ts` (pure maths and wheel units), `LineMap.test.tsx` (states, roles, no style attribute), `LineMap.interact.test.tsx` (buttons, keys, wheel in three modes and with Ctrl or Meta, drag, capture failure, pinch, limits, no fetch, XHR, beacon or Image), `control-icons.test.ts`, `AppRoutes.test.tsx`, `AppRoutes.map.test.tsx`, `AppShell.test.tsx`, `lazy-feature.test.tsx`. New files are at or above 97 percent branches.
- Bun: `station.test.ts` (optional `bn`).
- Playwright `e2e/line-map.e2e.ts`: role and name, description, 16 list items, one `tabindex` stop with a visible focus indicator, tab order, three 44 px named buttons, keys, wheel and drag, axe light and dark, offline context with an early request listener, reduced motion, control layout at 390 and 1280 px. The shared fixture also runs axe on every page and fails on a console error.
- Not covered by a browser test: a real two-finger pinch (covered with synthetic pointer events), a screen reader, high-contrast mode on the map.

## Commands run (Repo-verified, in the worktree)

`mise install --locked`, `bun run bootstrap`, `hk install --mise` (empty `MISE_GLOBAL_CONFIG_FILE`); `bun run check` (green on the final tree); `bun run build` and `bun run bundle:check` (numbers above); `bun run smoke` with `CI=true` and `--shuffle`, all four projects: 354 passed, 19 skipped (the Chromium-only specs on the other projects, and the WebKit select notice test on the others). Not run: `smoke:live`, a screen reader, the owner's visual review at 390 and 1280 px in light and dark.
