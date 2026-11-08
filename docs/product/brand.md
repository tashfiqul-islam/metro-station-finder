# Brand and install assets

Reference for the logo set, the favicons, the app icons and the web app manifest (METRO-107). The code that produces and checks them is `scripts/build-brand-assets.ts`; evidence is in [METRO-107](../evidence/metro-107.md).

## Where things live

| What                                                                            | Path                           | Shipped to users                                  |
| ------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| Vector masters (mark, wordmark, lockups, app-icon tiles) and `assets.lock.json` | `apps/web/brand/`              | No (outside `public/`, never imported by the app) |
| Generated icons, favicon, manifest, robots.txt                                  | `apps/web/public/`             | Yes                                               |
| Screenshots named by the manifest                                               | `apps/web/public/screenshots/` | Yes (static, not regenerated)                     |

The lock file holds the SHA-256 of every master, every generated file and the two screenshots. `bun test` fails when a master or a committed asset changes without the lock changing with it. `bun run smoke` (Chromium) regenerates every file from the masters and compares decoded pixels with the committed ones, so a master edited without regenerating also fails there.

## Change an asset

1. Edit or add an SVG in `apps/web/brand/`. A new raster output needs a row in `PNG_JOBS`, `ICO_JOBS` or `COPY_JOBS` in the script, and a size cap in `scripts/brand-assets.test.ts`.
2. `mise exec -- bun run playwright install chromium` once, then `bun run scripts/build-brand-assets.ts --write`. It rewrites `apps/web/public/` files and `apps/web/brand/assets.lock.json`.
3. `bun run scripts/build-brand-assets.ts --check` to confirm; commit the masters, outputs and lock together.

No font file is read: the wordmark in the masters is already outlined paths. No dependency was added; rasterising uses the repository's Playwright and Chromium.

## What the head and manifest say

- `index.html` links `favicon.ico` (16, 32, 48), `favicon.svg` (follows the OS light or dark scheme), `apple-touch-icon.png` (180, opaque, full bleed so iOS applies its own mask), `manifest.webmanifest`, and two `theme-color` tags selected by `prefers-color-scheme`: `#F2F6F6` (light) and `#0B1114` (dark). All are same-origin, so the CSP is unchanged.
- The manifest names five icons: `any` 192 and 512, `maskable` 192 and 512 (the mark sits inside the central 80 percent safe zone), and `monochrome` 512. Each icon has exactly one purpose. `theme_color` is `#0B7A84` and `background_color` is `#F2F6F6`, taken from the approved handoff.
- The manifest has no service worker member and no offline claim, and no asset says "Works offline". The share image (`og-default.png` in the handoff) is not shipped: it carries that claim and waits for the offline service worker (METRO-106); it waits for METRO-106.
- The two screenshots show the redesigned shell with sample data (marked "SAMPLE DATA" in the image) for install prompts that display screenshots. They show features of later slices (search box, bottom navigation, route and fare). Replace them when those slices ship; until then they describe the design, not the current page.

## Provenance and licences

- Source: the owner's approved design handoff (`metro-station-finder-handoff`, November 2026), produced for the owner in a Claude design session. Geometry is original to this project; there are no third-party icons or images.
- The wordmark paths were outlined from Hanken Grotesk (SIL Open Font License 1.1) by the handoff generator. No font file is committed or served. Whether outlined glyph artwork needs the OFL notice is Unverified (not legal advice); the owner decides before release, and the licence text would live next to the masters.
- Rights in the logo follow the owner's choice for the repository (`LICENSE` is MIT for code). Unknown until the owner records one for the marks.
- Station names in the screenshots are public place names; the fares shown are sample data, not a fare source.
