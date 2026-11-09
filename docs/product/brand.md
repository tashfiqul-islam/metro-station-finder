# Brand and install assets

Reference for the logo set, the favicons, the app icons and the web app manifest (METRO-107). The code that produces and checks them is `scripts/build-brand-assets.ts`; evidence is in [METRO-107](../evidence/metro-107.md).

## Where things live

| What                                                                            | Path               | Shipped to users                                  |
| ------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------- |
| Vector masters (mark, wordmark, lockups, app-icon tiles) and `assets.lock.json` | `apps/web/brand/`  | No (outside `public/`, never imported by the app) |
| Generated icons, favicon, manifest, robots.txt                                  | `apps/web/public/` | Yes                                               |

## What each check catches

PNG and ICO bytes are not reproducible across Chromium builds and operating systems (the same pixels encode to different bytes), so the layers differ by file kind.

| Check                                                        | Runs in                     | Catches                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `assets.lock.json` (SHA-256), `scripts/brand-assets.test.ts` | `bun run check`, no browser | A master SVG edited without regenerating; a hand-edited `favicon.svg`, `manifest.webmanifest` or `robots.txt`. Binary files are not hashed.                                                                                                                              |
| Same test file, binaries                                     | `bun run check`, no browser | A missing or extra file in `public/`, a PNG or ICO of the wrong decoded size (each image inside `favicon.ico` is read, not just its directory entry), a file over its size cap, an `og/` file. It cannot see a swapped icon of the right size.                           |
| `e2e/brand-assets.e2e.ts`                                    | `bun run smoke`, Chromium   | Regenerates every file from the masters and compares decoded pixels with the committed ones (largest per-channel difference at most 1 of 255). This is the only layer that catches a swapped or hand-edited icon, and a master changed without regenerating the rasters. |

## Change an asset

1. Edit or add an SVG in `apps/web/brand/`. A new raster output needs a row in `PNG_JOBS`, `ICO_JOBS` or `COPY_JOBS` in the script, and a size cap in `scripts/brand-assets.test.ts`.
2. `mise exec -- bun run playwright install chromium` once, then `bun run scripts/build-brand-assets.ts --write`. It rewrites the `apps/web/public/` files and `apps/web/brand/assets.lock.json`.
3. `bun run scripts/build-brand-assets.ts --check` to confirm; commit the masters, outputs and lock together.

No font file is read: the wordmark in the masters is already outlined paths. No dependency was added; rasterising uses the repository's Playwright and Chromium.

## What the head and manifest say

- `index.html` links `favicon.ico` (16, 32, 48), `favicon.svg` (follows the OS light or dark scheme), `apple-touch-icon.png` (180, opaque, full bleed so iOS applies its own mask), `manifest.webmanifest`, and two `theme-color` tags selected by `prefers-color-scheme`. The tags are the page background tokens of the approved handoff (`--color-bg` in its `tokens.css`): `#F2F6F6` light and `#060A0A` dark. All links are same-origin, so the CSP is unchanged.
- The manifest names five icons: `any` 192 and 512, `maskable` 192 and 512 (the mark sits inside the central 80 percent safe zone), and `monochrome` 512. Each icon has exactly one purpose. `theme_color` `#0B7A84` (the brand teal, for the installed app's window chrome) and `background_color` `#F2F6F6` (the splash) come from the handoff manifest. They differ from the page `theme-color` tags on purpose: the manifest colours style the installed app shell, the tags follow the page background in the browser.
- The manifest has no service worker member. Its `description` carries the one offline sentence, "Stations and fares work offline.", backed by the offline shell worker (METRO-106, [ADR-0023](../adr/0023-offline-app-shell.md)); a test rejects any other wording or place. The share image (`og-default.png` in the handoff) is still not shipped: the repository holds no master for it, and text drawn into a PNG would differ between operating systems beyond the drift check's tolerance, so it needs a master with outlined text and the production origin for `og:image` ([METRO-106 evidence](../evidence/metro-106.md)).
- The manifest has no `screenshots` member and `public/` has no screenshots. The handoff screenshots show screens that do not exist yet (search box, bottom navigation, route and fare, sample fares), so an install prompt would misdescribe the app. Add them back, regenerated from the real UI, after METRO-105 and the first slices merge; a test fails if the member returns before then and must be updated with it.

## Provenance and licences

- Source: the owner's approved design handoff (`metro-station-finder-handoff`, November 2026), produced for the owner in a Claude design session. Geometry is original to this project; there are no third-party icons or images.
- The wordmark paths were outlined from Hanken Grotesk (SIL Open Font License 1.1) by the handoff generator. No font file is committed or served. Whether outlined glyph artwork needs the OFL notice is Unverified (not legal advice); the owner decides before release, and the licence text would live next to the masters.
- Rights in the logo follow the owner's choice for the repository (`LICENSE` is MIT for code). Unknown until the owner records one for the marks.
