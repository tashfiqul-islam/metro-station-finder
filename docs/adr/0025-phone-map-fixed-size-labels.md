# ADR-0025: Map frame spans the screen above the sheet; labels and pins keep a fixed size on screen

- Status: Proposed (the owner accepts by merging)
- Date: 2026-11-10
- Ticket and specification: METRO-115 (Plane); the ticket is the contract, no separate specification.

## Context

- Repo-verified (ticket, measured at head 061d771): at 390 px the map drew in a 314x234 box inset from the screen edges, the whole line took 75x209 px and station labels were 4 px tall, because labels and pins were sized in map units and the fit view shrinks every unit with the box.
- The sheet has three heights (peek 196 px, half 58 percent, full). The shell's map frame already ends above the sheet through `--sheet-h`, so the visible area is a CSS fact; the map only has to use it.

## Decision

- We will make the phone map frame span the screen width (top 64 px, left and right 0) and end 8 px above the sheet. Below 768 px the `svg` has `overflow: visible` with `clip-path: inset(0 0 -100vh)`, so its background and line paint behind the sheet (the bottom is open) but never into the header or past the screen edges; the fit view uses only the frame. The fit view is the unchanged `viewBox` with `meet`: when the sheet moves the frame resizes and the fit re-fits with no map code. By design a view the user has zoomed or panned keeps its centre and zoom when the sheet moves; only the fit view re-fits (the fit button or key 0 returns to it).
- We will keep labels, pins and the position marker at a fixed on-screen size by drawing each in its own `g` with `translate(x y) scale(unit)`, where `unit` is map units per pixel from `unitsPerPixel` (`view.ts`) and the size comes from a `ResizeObserver` in `use-map-view.ts`. Their sizes are written as pixels. Line strokes use `vector-effect: non-scaling-stroke`, so they are pixels too.
- We will name only the termini and the marked stations (nearest, selected) at the fit view and every station from `LABELS_ZOOM` (one zoom step, 1.5). Labels are fixed size, so on a short frame neighbouring stops are a few pixels apart; `layoutLabels` (`labels.ts`) places them in priority order, marked stations (in the order given) before the termini before the other stations, each on the first side from its own, then right, left, below, above, that overlaps no label already placed (2 px apart), and does not draw one that fits on no side (its pin and its place in the station list remain). A marked station is therefore never moved or dropped for a terminus; a terminus next to a marked station may move or go.
- We will remove the four grey planes and their two tokens, and set system colours under `forced-colors: active` (line `CanvasText` on a `Canvas` casing, selected pin `Highlight`), placed last in `map.css`.
- A full sheet leaves the frame no height: the frame is `visibility: hidden` then (phones only), so the tab stop and the three buttons are neither focusable nor read, and they return when the sheet leaves full. The hide waits `--dur-sheet` (no flash while the sheet rises); under reduced motion `base.css` zeroes the delay too, so the map is not focusable behind a full sheet. If focus is inside the map when the sheet reaches full, `AppShell` moves it to the sheet grip; "Show on map" focuses the map only after the snap has committed (`Nearby.tsx`), because a hidden map cannot take focus. The clip would cut the map's focus ring, so on phones the ring is drawn inside the frame (`outline-offset` of minus the ring width). The station list in the sheet is the content.
- Resize reports are compared in whole pixels outside React state, so the same size renders nothing; a sheet drag renders the map only when the rounded size changes.
- Line strokes are 7 px (shadow 18, casing 12) on screen at every zoom; at the fit view they were about 2 px before, so the line is thicker than the base on a phone by design.

## Consequences

- Easier: label size no longer depends on the sheet or the window; the rule needs no per-snap code.
- Harder: every new fixed-size drawing goes in a scaled group and, if it is a label, in `layoutLabels`. Labels are placed against each other only, not against pins or the user marker.
- Unverified: real phone behaviour (touch, safe areas, dynamic toolbars; the owner checks in METRO-121); the user-position pulse (`transform-box: fill-box` on a circle inside a scaled group) is not covered by a test.
- `map.css` and `LineMap.tsx` are in the lazy Nearby screen; the entry grows by +176 raw / +32 gzip CSS bytes (`shell.css` frame insets and full-sheet hide, `base.css` reduced-motion delay) and +165 raw / +49 gzip JS bytes (the focus effect in `AppShell.tsx`), against base `15ece17` ([evidence](../evidence/metro-115.md)).

## Alternatives considered

- A full-screen `svg` with the fit computed from sheet insets in `view.ts`: rejected, it rewrites `scaleOf`, `toMap` and `viewBoxOf` and needs the sheet height in JS, for the same picture.
- Scaling text with `font-size` custom properties: rejected, pill boxes, offsets and pin radii would still be in map units.
- A separate phone layout that rotates the line: rejected, out of scope.

## Confirmation

- `e2e/phone-map.e2e.ts` (screen font size 12.5 and 11.5 px at 320, 390 and 1280 px; the frame ends 8 px above the sheet at peek and half; no sideways scroll; forced colours at 390 and 1280 px, which fails on the base code; axe light and dark at 320, 390 and 1280 px; no two pills overlap next to an end station; the map is hidden at full sheet; nothing paints above the frame), `labels.test.ts` (the placement rule), `LineMap.test.tsx` and `view.test.ts` (scale follows the reported size; the same size renders nothing).
