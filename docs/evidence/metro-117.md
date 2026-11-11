# METRO-117 evidence: ship only the CSS and icons each screen uses

Date: 2026-11-11. Base: `d594606` (`feature/metro-rebuild`, merge of PR 134). Head: the tip of `ticket/metro-117-css-icons-split` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0, Playwright 1.64.1. Scope: the ticket (Foundation fix 3); a bundle measurement is why an evidence file exists.

## What changed

- CSS: the handoff-shaped `common.css`, `nearby.css` and `route.css` are split by component. Each component file is imported by the module that draws it, so a screen downloads only the components it uses. The files were cut byte for byte from the originals; only a header line and the `@import` lines (`tokens-parts.css`, `fonts-mono.css`) were added, each only where the file uses them.
  - `common.css` became `typography`, `button`, `roundel`, `notice`, `empty`, `status`, `skeleton`, `toast`, `lazy`.
  - `nearby.css` became `intro`, `live-line`, `locate`, `tiles`, `result`, `neighbour`, `also`.
  - `route.css` became `route` (the card), `scrubber`, `quick`, `ticket`, `ticket-trip`, `along`, `fare-map`.
  - Kept for future screens and imported by nothing today: `intro`, `live-line`, `tiles`, `neighbour`, `route`, `scrubber`, `quick`, `ticket-trip`, `along`, `fare-map`, `skeleton` (and the untouched `line`, `settings`, `palette`, `header-extras`). The CSS gate (`scripts/css-rules.ts`) still scans every file under `styles/`.
- Icons: one module per icon in `apps/web/src/icons/shapes/` (31 files, each block copied verbatim from the old `icon-data.ts`). The `IconShapes` type lives in `icons/Icon.tsx`; a separate type-only file would need an exemption in `scripts/coverage-scope.ts`, and a gate is not changed here. A shape module imports the type with `import type`, which the build erases.
- Deleted, with the drift tests that guarded them in the same change: `icons/icon-data.ts`, `features/station-picker/picker-icons.ts` (and `.test.ts`), `features/nearest-station/location-icons.ts` (and `.test.ts`). Also deleted: `features/line-map/control-icons.ts` (and `.test.ts`). The ticket names the first two files; `control-icons.ts` was the same pattern (METRO-111: three zoom icons copied into the lazy chunk, a drift test keeping them in sync), so leaving it would keep the workaround the ticket removes.
- `Icon.test.tsx` now globs `shapes/*.ts`: 31 modules, one export each, file name equal to the export in kebab case, each renders a hidden `currentColor` SVG.

## Bundle (Repo-verified, `bun run build` then `bun run bundle:check`, raw / gzip bytes)

| Bucket or chunk               | Base `d594606`   | Head             | Limit (raw / gzip) |
| ----------------------------- | ---------------- | ---------------- | ------------------ |
| Entry `index-*.js`            | 235,447 / 74,077 | 235,447 / 74,076 |                    |
| First-visit JS (bucket)       | 236,040 / 74,424 | 236,040 / 74,423 | 250,000 / 80,000   |
| First-visit CSS (`index.css`) | 14,301 / 3,997   | 14,301 / 3,997   | 20,000 / 6,000     |
| Nearby CSS (lazy)             | 49,487 / 8,274   | 35,365 / 5,906   |                    |
| Nearby JS (lazy)              | 45,737 / 16,021  | 45,732 / 16,019  |                    |
| Lazy screen Nearby (bucket)   | 95,224 / 24,295  | 81,097 / 21,925  | 120,000 / 30,000   |
| Shared lazy (bucket)          | 20,389 / 9,157   | 20,389 / 9,157   | 27,000 / 12,000    |
| Worker `sw.js`                | 3,977 / 1,787    | 3,977 / 1,786    | 6,000 / 2,800      |

Entry bytes do not grow (the entry JS is byte-identical in size; the gzip figure differs by one byte). The Nearby CSS fell by 14,122 raw / 2,368 gzip (28.5 percent raw). No limit changed. The per-icon modules cost the entry nothing: the entry keeps only `monitor`, `moon` and `sun`, and a lazy chunk that imports a shape takes that module into itself.

Rule check on the minified Nearby CSS (a throwaway script, not committed): every head rule exists verbatim in the base chunk (0 new rules); 176 of the 406 base rules are gone, all for classes that no source file mentions (`intro`, `live-line`, `tiles`, `nb`, `skeleton`, `route`, `scrub`, `quick`, the ticket trip parts, `along`, `fare-map`). A search of the TSX for dynamically composed class names found only literal alternatives (`map__line--dim`, `map__pill--term`, `status` or `visually-hidden`, `empty` or `pick__feedback`), so no kept-looking class is built at run time.

## Cascade order

Splitting changes the order in which components appear in the Nearby chunk (base: `btn`, `notice`, `status`, `toast`, `lazy`, `locate`, `result`, `also`; head: `notice`, `eyebrow`, `result`, `also`, `btn`, `status`, `locate`, then `lazy` and `toast`). No pair of rules with equal specificity that can match one element and set one property changed relative order: classes that share a `className` string and a property are all in one file, except where the order is kept (`station-picker.css` still follows `ticket.css`). The visual compare below is the proof by measurement.

## Visual compare (no visual change)

Method (Repo-verified, an uncommitted throwaway Playwright spec; no pixel baselines are committed). Both trees (base `d594606`, head) were built with `VITE_GOOGLE_MAPS_API_KEY=fake-key-for-tests` and served from two local static servers; the Maps script is the `e2e/maps-stub.ts` fake, every other Google host is aborted, geolocation is the fake seam with synthetic coordinates near the first station. For each browser (Chromium, Firefox, WebKit, Playwright 1.64.1, local), each width (390 and 1280 px), each theme (light, dark) and each state, a fresh context loaded each build three times. After finite animations ended and looping ones were cancelled (so both builds sample one frame), the page was screenshotted until two shots in a row matched, then:

- Pixels, tolerance 0: a pixel counts as a difference only if no base sample equals any head sample at that pixel (so the nondeterminism of one build, which is real in this environment, is not reported as a change).
- Computed style: every element's full `getComputedStyle` (and `::before`, `::after` where they generate content) plus its bounding rect, compared in document order between the first base and the first head load.

States: home (picker closed), list open (typed `mir`), full list, no match (empty state), station result with ticket and fare for Motijheel and for the terminal Uttara North, location fix (good, rough, denied, unavailable, pending), a fix then a pick, Maps script failing then denied, hover on Use my location, keyboard focus after three Tab presses, hover on a map control, and an injected toast. The line map is on screen in all of them. Extra variants: reduced motion (light: home, result, good fix, denied, pending; dark: good fix, pending) and forced colors (light: home, list open, result, good fix, denied, pending, toast). That is 96 comparisons per browser, 288 in all.

Result: computed-style differences 0 in Chromium and Firefox. Differing pixels: Firefox 0, WebKit 0, Chromium 49 in three comparisons, each explained:

- `1280 light list-all` (21 px) and `1280 light result-terminal` (7 px): 1 to 4 levels of 255 on the antialiased rounded corners of the left panel (for example (12,76), (30..32,76), (12,760)), in both directions across pixels. The panel's CSS is in the entry stylesheet, which is the same file in both builds (`index-nPOHJw0y.css`, byte-identical), and the computed styles and rects match. Chromium also reports 2 to 143 pixels per state that differ between two loads of the same build, so this is raster noise.
- `1280 light-forced list-open` (21 px, `x=100, y=569..589`, base white, head black): the 1 px text caret after the typed `mir` was drawn in the head samples and not in the base samples (caret blink phase; `caret: "hide"` does not stop Chromium's caret in forced colors). The screenshot shows the caret in the head build; styles and rects are identical.

WebKit reported style differences in 17 comparisons, all of two kinds that also appear between two loads of the same base build: the document has one element more or fewer at the end (168 vs 167; a late live region, timing) and the SVG gradient id of the searching mark (`search_r_2_g` vs `search_r_3_g`, a React `useId` counter). No property or rect of any shared element differed. An earlier pass with two samples per build and stable-pixel masks gave Chromium 281 and 99 pixels in other places over two runs and 0 in Firefox and WebKit, which is how the noise level was measured; it is not a result.

Not covered: the Maps widget is the stub, not Google's; touch hover states; real devices (METRO-121, the owner's); the toast and `lazy` fallback only as injected or reachable markup (see the note below).

## Toast coupling note

`toast.css` styles `.toast` and `.toast-region`, which `AppShell` and the offline-shell registration (`sw/register.ts`) render on every screen, but the entry set does not load it: it has reached the page only inside the Nearby chunk (through `common.css`). This change keeps that exact behaviour (`Nearby.tsx` imports `lazy.css` and `toast.css`) so there is no visual change; it does not fix it. A second screen would show an unstyled toast, so when one lands the toast styles must move to the shell or to the registration module. Likewise `lazy.css` styles the Suspense fallback of the Nearby chunk itself, which is shown before that chunk (and its CSS) has loaded. Both are Inferred from reading the import graph; neither is new.

## Commands

Run: `bun run check` (exit 0: format, oxlint, boundaries, dependency-cruiser, knip, links, branches, Bun tests 1,514 and Vitest 544 with 100 percent coverage, coverage scope, `tsc -b`), `bun run build`, `bun run bundle:check`, the visual compare above. Not run: real-phone checks (the owner's, METRO-121).
