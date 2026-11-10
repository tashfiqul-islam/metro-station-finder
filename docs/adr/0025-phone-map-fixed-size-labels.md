# ADR-0025: Map frame spans the screen above the sheet; labels and pins keep a fixed size on screen

- Status: Proposed (the owner accepts by merging)
- Date: 2026-11-10
- Ticket and specification: METRO-115 (Plane); the ticket is the contract, no separate specification.

## Context

- Repo-verified (ticket, head 061d771): at 390 px the map drew in a 314x234 box inset from the screen edges, the whole line took 75x209 px and station labels were 4 px tall, because labels and pins were sized in map units and the fit view shrinks every unit with the box.
- The sheet has three heights (peek 196 px, half 58 percent, full). The shell's map frame already ends above the sheet through `--sheet-h`, so the visible area is a CSS fact; the map only has to use it.

## Decision

- We will make the phone map frame span the screen width (top 64 px, left and right 0) and end 8 px above the sheet. The `svg` has `overflow: visible`, so its background and line paint behind the sheet and past the frame while the fit view uses only the frame. The fit view is the unchanged `viewBox` with `meet`: when the sheet moves the frame resizes and the fit re-fits with no map code. A zoomed or panned view keeps its centre and zoom.
- We will keep labels, pins and the position marker at a fixed on-screen size by drawing each in its own `g` with `translate(x y) scale(unit)`, where `unit` is map units per pixel from `unitsPerPixel` (`view.ts`) and the size comes from a `ResizeObserver` in `use-map-view.ts`. Their sizes are written as pixels. Line strokes use `vector-effect: non-scaling-stroke`, so they are pixels too.
- We will name only the termini and the marked stations (nearest, selected) at the fit view and every station from `LABELS_ZOOM` (one zoom step, 1.5).
- We will remove the four grey planes and their two tokens, and set system colours under `forced-colors: active` (line `CanvasText` on a `Canvas` casing, selected pin `Highlight`), placed last in `map.css`.
- A full sheet leaves the frame no height: the map is not visible then, and the station list in the sheet is the content.

## Consequences

- Easier: label size no longer depends on the sheet or the window; the rule needs no per-snap code.
- Harder: every new fixed-size drawing goes in a scaled group; a view that is zoomed out below the fit view sets labels at the same pixel size, so names can collide there (they appear only from `LABELS_ZOOM`).
- Unverified: real phone behaviour (touch, safe areas, dynamic toolbars); the owner checks in METRO-121.
- `map.css` and `LineMap.tsx` are in the lazy Nearby screen; only `shell.css` is in the entry (net CSS change under 10 bytes).

## Alternatives considered

- A full-screen `svg` with the fit computed from sheet insets in `view.ts`: rejected, it rewrites `scaleOf`, `toMap` and `viewBoxOf` and needs the sheet height in JS, for the same picture.
- Scaling text with `font-size` custom properties: rejected, pill boxes, offsets and pin radii would still be in map units.
- A separate phone layout that rotates the line: rejected, out of scope.

## Confirmation

- `e2e/phone-map.e2e.ts` (screen font size 12.5 and 11.5 px at 320, 390 and 1280 px; the frame ends 8 px above the sheet at peek and half; no sideways scroll; forced colours; axe light and dark), `LineMap.test.tsx` and `view.test.ts` (scale follows the reported size).
