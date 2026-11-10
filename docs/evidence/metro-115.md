# METRO-115 evidence: the line map on phones

Date: 2026-11-10. Base: `c74d80c` (`feature/metro-rebuild`). Head: the tip of `ticket/metro-115-phone-map` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0, Playwright Chromium. Labels: Repo-verified, Unverified. Decision: [ADR-0025](../adr/0025-phone-map-fixed-size-labels.md).

## BUNDLE MEASUREMENT (Repo-verified, `bun run build` then `bun run bundle:check`, ADR-0023 model)

| Bucket (limit raw / gzip)             | Base `c74d80c`   | This change      | Change      |
| ------------------------------------- | ---------------- | ---------------- | ----------- |
| First-visit JS (250,000 / 80,000)     | 235,483 / 74,210 | 235,483 / 74,210 | 0 / 0       |
| First-visit CSS (20,000 / 6,000)      | 14,125 / 3,965   | 14,118 / 3,957   | -7 / -8     |
| Lazy screen Nearby (120,000 / 30,000) | 92,206 / 23,189  | 92,767 / 23,448  | +561 / +259 |
| Shared lazy (27,000 / 12,000)         | 20,389 / 9,160   | 20,389 / 9,157   | 0 / -3      |
| Worker (6,000 / 2,800)                | 3,962 / 1,789    | 3,962 / 1,783    | 0 / -6      |

No limit was changed. The map code and `map.css` live in the lazy Nearby screen; only `shell.css` (frame insets) is in the entry.

## What changed

- `shell.css`: the phone map frame is `top: 64px; left: 0; right: 0`, ending 8 px above the sheet (it already followed `--sheet-h`). Desktop frame unchanged.
- `map.css`: `overflow: visible` on the svg, `vector-effect: non-scaling-stroke` on the line strokes, plane rules removed, a last-in-file `forced-colors: active` block, controls offset for the new frame.
- `LineMap.tsx`, `use-map-view.ts`, `view.ts`: pins, labels and the position marker sit in `g` elements scaled by `unitsPerPixel` (a `ResizeObserver` reports the box); halo labels only from `LABELS_ZOOM`; the four planes are removed.
- `tokens-map.css`: the two plane tokens removed. `scripts/design-contrast.ts` listed them as backdrops a translucent surface is judged over; with the planes gone, the real backdrops are `map-bg` and `bg`, so the list is those two. All 23 contrast tests pass unchanged (the handoff figures are the same), so no threshold or expected figure moved.

## Acceptance (Repo-verified unless marked)

| Requirement                                                                                           | Evidence                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Map fills the screen behind the sheet; fit uses the area above the sheet; re-fits at peek, half, full | `e2e/phone-map.e2e.ts` at 320 and 390 px: svg width equals the viewport; the frame ends 8 px above the sheet and the line lies inside it at peek and half; the line is taller at peek than at half; at full the frame has no height                          |
| Fixed label size; only termini plus nearest or selected at fit; the rest when zoomed in               | same file at 320, 390, 1280 px: screen font 12.5 px (pills) and 11.5 px (halo labels, after one zoom step and after two); 0 halo labels at fit; `LineMap.test.tsx`                                                                                           |
| Grey blocks removed                                                                                   | `LineMap.test.tsx` (only `map__bg` and the dot grid rects), e2e at 1280 px                                                                                                                                                                                   |
| Forced colours                                                                                        | e2e with `forcedColors: "active"` and a searched station: line, casing and selected pin compute to plain `rgb` colours (not the gradient), line differs from casing, ground and selected pin. A screenshot under a real Windows contrast theme is Unverified |
| No sideways scroll at 320, 390, 1280                                                                  | e2e checks `scrollWidth`                                                                                                                                                                                                                                     |
| axe light and dark, no inline style                                                                   | e2e (`.app__map [style]` is 0, axe with the repo tags); `e2e/line-map.e2e.ts` unchanged and passing                                                                                                                                                          |
| Real phone                                                                                            | Unverified (owner, METRO-121)                                                                                                                                                                                                                                |

Measured in the picture at 390 x 844 with a result open: the line is about 250 px tall at half and 510 px at peek (read from a screenshot; it was 209 px at half in the ticket), the end names are 12.5 px.

## Notes

- A full sheet covers the map (the frame has no height); the list in the sheet is the content. A user who pans or zooms keeps that view when the sheet moves; the fit view (key 0 or the button) re-fits.
- Label collision is possible only when zoomed out below the fit view at small frame heights; names show from zoom 1.5.
