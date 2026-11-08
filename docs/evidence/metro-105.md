# METRO-105 evidence: design foundation

Date: 2026-11-08. Base: `b3d748e` (`feature/metro-rebuild`, merge of METRO-104). Head: the tip of `ticket/metro-105-design-foundation` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0, Playwright 1.64.1 Chromium. Scope and decisions: [ADR-0021](../adr/0021-design-foundation-styling.md). Labels: Repo-verified, Context7-verified, Web-verified, Unverified.

## First-visit budget (Repo-verified, `bun run build` then `bun run bundle:check`)

| Build                                                    | First visit raw / gzip | Limit            | Headroom            |
| -------------------------------------------------------- | ---------------------- | ---------------- | ------------------- |
| Base (METRO-104)                                         | 242,839 / 77,186       | 250,000 / 80,000 | 7,161 / 2,814       |
| Foundation, slice in the entry (tried, not shipped)      | 277,620 / 86,488       | 250,000 / 80,000 | over 27,620 / 6,488 |
| Foundation, slice lazy (shipped, after the review fixes) | 248,950 / 77,721       | 250,000 / 80,000 | 1,050 / 2,279       |

Files of the shipped build (raw / gzip): entry JS 232,786 / 73,199 (React, shell, theme code, 3 icons); entry CSS 15,668 / 4,219 (fonts, tokens, base, shell); `theme-boot.js` 496 / 303 (counted as first-visit by `scripts/bundle-budget.ts`); lazy: slice JS 11,428 / 4,490, slice CSS 11,306 / 2,514 (common, nearest-station), Maps adapter 5,137 / 2,601 (5,183 in the smoke build, which compiles in a fake key), core 3,428 / 1,592, web-vitals 7,962 / 3,058. All files 288,211 / 91,976 against the 400,000 / 125,000 ceiling. No limit was changed. The handoff `components.css` (67,780 bytes source) is split into 12 files; the entry loads one of them (`shell.css`).

The 277,620 / 86,488 row is a separate build with the slice imported statically; it is not the sum of the shipped files. It is lower than the shipped all-files sum (288,211) because a lazy split adds chunk and preload-helper overhead and a second copy of shared helpers. It is the figure that shows the slice does not fit in the entry. Before the review fixes the shipped first visit was 248,109 / 77,397 (headroom 1,891 / 2,603); the drag, focus and status changes to the shell added 841 raw bytes.

What the gate does not count: the Hanken Grotesk file (34,704 bytes, preloaded, fetched on every first visit) and the lazy chunks a visit loads right after the entry (slice JS, slice CSS, adapter and core, 31,299 bytes raw in this build). Levers if the 1,050 raw bytes run out: drop the duplicated OS-dark token block (about 2.5 KB raw, changes what System means; needs a decision), then unused tokens.

## Lab web vitals (Repo-verified, `e2e/web-vitals-lab.e2e.ts`, Chromium, three runs)

LCP 416 and 412 ms standalone (392 to 428 ms before the review fixes) and 560 ms inside the four-browser run on ten workers (limit 2,500); CLS 0.0004 in each run (limit 0.1). The LCP control (main script delayed 3 s) measured 3,380 to 3,412 ms and the CLS control 0.1324, both reported as failures as intended. Base (METRO-104) is recorded in [METRO-104 evidence](metro-104.md). Real-user LCP with the lazy slice is Unverified.

## Fonts (Repo-verified)

Hanken Grotesk `hanken-grotesk-latin-wght.woff2` 34,704 bytes, JetBrains Mono `jetbrains-mono-latin-wght.woff2` 40,404 bytes (OFL texts kept beside them and in `apps/web/public/licenses.txt`). Built names are `/assets/<name>-<hash>.woff2` with `Cache-Control: public, max-age=31536000, immutable`. Only Hanken Grotesk is preloaded (`<link rel="preload" as="font" crossorigin>`, rewritten by Vite to the hashed file). A first visit requests one woff2 file, Hanken Grotesk (`e2e/design-foundation.e2e.ts`); JetBrains Mono is not requested until text uses it. Font files are not JS or CSS, so the budget gate does not count them; the first visit transfers 34,704 more bytes for the font. The taka sign is outside the subset and uses a system font (Unverified per platform: Nirmala UI, Kohinoor Bangla, Noto Sans Bengali).

## Contrast (Repo-verified, `scripts/design-contrast.test.ts`)

The 53 pairs of the handoff table, in light and dark, are computed from `tokens.css`: 0 failing in both. The 38 opaque pairs per theme reproduce the published ratios within 0.011. The 15 light and 15 dark translucent pairs are judged at the worst backdrop (glass over each map layer and the page; raised, muted and accent-soft over the card, the page and the glass panel), which is stricter than the handoff's single figures. Tightest light pair: accent text on glass 4.60 against 4.5 (handoff 4.82). Tightest dark pair: muted text on muted-2 5.36 against 4.5. The dark `prefers-color-scheme` block equals the dark block (tested).

## Commands run

- `mise install --locked`, `mise exec -- bun run bootstrap`, `mise exec -- hk install --mise` (with an empty `MISE_GLOBAL_CONFIG_FILE`): passed.
- `bun run format`, `bun run lint`, `bun run typecheck`, `bun run unused`, `bun run imports:check`: passed.
- `bun test --parallel=4`: 1,359 tests passed, per-file 100 percent lines and functions.
- `bun run test:vitest`: 233 tests passed, per-file thresholds met.
- `bun run build`, `bun run bundle:check`, `bun run smoke` (Chromium): passed; the new journeys are `e2e/design-foundation.e2e.ts`.
- `CI=true bun run smoke` (Chromium, Firefox, WebKit, Pixel 7 Chromium): 278 passed, 19 skipped (browser-specific skips), after the review fixes. One earlier run had a transient Chromium `net::ERR_NO_BUFFER_SPACE` console error in one nearest-station test under 10 parallel workers on Windows; it did not repeat in two later full runs. A Firefox-only failure of the keyboard test led to `tabindex="-1"` on the panel scroller (Firefox made it a Tab stop once the result made it scrollable).
- Not run here: the hosted `Quality gates`; the owner's view of light and dark at 390 and 1280 px.

## Limits and what was not verified

- Reduced transparency: Playwright 1.64.1 cannot emulate it, so Chromium is driven through DevTools `Emulation.setEmulatedMedia` in four cases (OS dark, OS light, saved dark under OS light, saved light under OS dark); in Chromium a build that does not report the preference fails the test, and the other browsers skip. The first version of the override (a bare `:root`) lost to the dark selectors; with it restored in the test run the two dark cases failed, and the shipped override names all three theme selectors. `scripts/design-contrast.test.ts` also asserts the three selectors, that the rule is last in the file, and that every pair passes with the glass solid.
- Forced colours: Chromium emulation only; WebKit is skipped.
- 2.5.7 Dragging: the sheet has a keyboard and button alternative (arrow keys, "Make panel larger" and "Make panel smaller") and a tap cycle; no automated check proves each path meets 2.5.7. Screen-reader output of the new landmarks and the pending status is Unverified.
- Sheet drag at 390 px is exercised with the mouse in Chromium, not a touch device.

## Third-party licences

Hanken Grotesk and JetBrains Mono: SIL Open Font License 1.1. Icons: Lucide, ISC, with Feather's MIT licence for a few. Texts: `apps/web/public/licenses.txt`, served at `/licenses.txt`.
