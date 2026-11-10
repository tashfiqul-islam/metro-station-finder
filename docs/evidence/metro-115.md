# METRO-115 evidence: the line map on phones

Date: 2026-11-10. Base: `46b0058` (`feature/metro-rebuild`; the bundle figures below were measured at `c74d80c`, which differs from it only in `docs/agents/deploy-runbook.md`). The ticket's own measurement (314x234 box, 4 px labels) is at head `061d771`. Head: the tip of `ticket/metro-115-phone-map` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0, Playwright Chromium. Labels: Repo-verified, Unverified. Decision: [ADR-0025](../adr/0025-phone-map-fixed-size-labels.md).

## BUNDLE MEASUREMENT (Repo-verified, `bun run build` then `bun run bundle:check`, ADR-0023 model)

Final figures, one fresh `bun run build` and `bun run bundle:check` of each side on 2026-11-10: base `15ece17` (the tip of `feature/metro-rebuild` merged into this branch) and this branch's head.

| Bucket (limit raw / gzip)             | Base `15ece17`   | This change      | Change        |
| ------------------------------------- | ---------------- | ---------------- | ------------- |
| First-visit JS (250,000 / 80,000)     | 235,875 / 74,375 | 236,040 / 74,424 | +165 / +49    |
| First-visit CSS (20,000 / 6,000)      | 14,125 / 3,965   | 14,301 / 3,997   | +176 / +32    |
| Lazy screen Nearby (120,000 / 30,000) | 93,058 / 23,445  | 95,224 / 24,295  | +2,166 / +850 |
| Shared lazy (27,000 / 12,000)         | 20,389 / 9,158   | 20,389 / 9,157   | 0 / -1        |
| Worker (6,000 / 2,800)                | 3,977 / 1,788    | 3,977 / 1,787    | 0 / -1        |

No limit was changed. The map code and `map.css` live in the lazy Nearby screen. The entry grows by CSS (`shell.css` frame insets and the full-sheet hide, `base.css` zeroing the transition delay under reduced motion: +176 raw / +32 gzip) and by JS (the focus-moving effect in `AppShell.tsx`: +165 raw / +49 gzip). The ticket's own head and the first measurements in this file's history are superseded by this table.

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

## WebKit first render (Repo-verified, found by hosted CI)

CI `Smoke webkit` failed `at 1280 px the labels keep their size`: pill font 9.886 px, expected 12.5. Reproduced locally with `CI=true bun run smoke --project=webkit e2e/phone-map.e2e.ts -g "at 1280 px the labels keep" --repeat-each=12 --workers=4`: same 9.886 (12.5 x 0.7909, the viewBox scale of the 768x696 frame). A diagnostic in WebKit read the label group as `scale(1)` while the svg had its full size: WebKit delivers the ResizeObserver's first report a frame after mount, and until then the map drew labels unscaled (a visible one-frame flash in the product, not only a test artefact). The measurement (`getScreenCTM`) was right. Fix: `use-map-view.ts` reads the box in a layout effect when the map mounts, before the observer reports (`LineMap.test.tsx`: the first render has the box's scale with a stub that never reports). After the fix the same command passes 12 of 12, and the whole `phone-map` and `line-map` specs pass on webkit and firefox (90 tests, 4 workers).

## Notes

- A full sheet covers the map (the frame has no height); the list in the sheet is the content. A user who pans or zooms keeps that view when the sheet moves; the fit view (key 0 or the button) re-fits.
- Label collisions are resolved by `layoutLabels` (ADR-0025): priority marked, then termini, then others; side order own, right, left, below, above; a label that fits on no side is not drawn. The e2e checks no two pills overlap at 320x640 and 390x844 for Bangladesh Secretariat, Pallabi and Dhaka University selected at peek and half.
- At full sheet the frame is `visibility: hidden` (phones), so the map and its buttons leave the tab order and the accessibility tree; e2e checks Tab never lands in the map and focus works again at half.
- Below 768 px the svg is clipped on the top and sides (`clip-path: inset(0 0 -100vh)`) so a panned or zoomed map never paints under the header; e2e zooms four steps and checks nothing of the map is hit above the frame.
- Resize reports are compared in whole pixels outside React state. Measured with a spy on the layout call in `LineMap.test.tsx`: three reports of the same rounded size cause 0 renders and a changed size causes 1. The comparison is in a ref because a functional state update compared inside the updater still rendered once per report in the same test.
- The forced-colours e2e (390 and 1280 px) was run against the base code (the base sources of `apps/web/src` checked out over this branch in the same worktree, then restored) and fails there: the line stroke computes to `url("#map-line")`. It passes on this branch.
- Focus: "Show on map" focuses the map in an effect after the snap commits (e2e from a full sheet); focus in the map when the sheet reaches full moves to the grip; the phone focus ring is drawn inside the clip. The e2e for these three was run against the previous commit's sources and all six cases (two sizes) failed there; they pass now.
- By design a zoomed or panned view keeps its centre and zoom when the sheet moves; `e2e` checks the view box is unchanged after a snap change and that the fit button re-fits. The unzoomed re-fit is the peek/half test above.
- Line strokes are 7 px on screen at every zoom (about 2 px at the fit view before), so the line is thicker than on the base.
- `scripts/design-contrast.ts`: the glass was never judged over the line or the labels. The map now draws them behind the sheet when panned (the bottom of the clip is open), so a pan puts the line under the glass; that case is not checked by the gate and the `BACKDROPS` change (two planes removed) is for the owner to confirm. Only that line and the stale header comment changed in the file.
- Unverified: the user-position pulse (`transform-box: fill-box` inside a scaled group) has no test; real devices.
