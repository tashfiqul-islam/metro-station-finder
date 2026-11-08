# METRO-107 evidence: brand and install assets

Recorded 2026-11-08 on branch `ticket/metro-107-brand-assets`, cut from `b3d748e` (tip of `feature/metro-rebuild`, after METRO-104). Labels: Repo-verified (run in this repository), Context7-verified, Web-verified, Unverified. Reference note: [brand](../product/brand.md).

## What shipped

- `apps/web/brand/`: 22 SVG masters: 19 copied from the approved handoff from the handoff (`packages/brand/src`) plus three the handoff generator drew in code and never saved as files: `apple-touch-icon.svg`, `mark-small.svg` and `favicon.svg` (reproduced by running the handoff `geometry.mjs` with its two font-loading lines removed; the micro mark and favicon came out byte-identical to the handoff files, Repo-verified). `assets.lock.json` holds the SHA-256 of masters, outputs and the two screenshots.
- `apps/web/public/`: `favicon.svg`, `favicon.ico` (16, 32, 48), `apple-touch-icon.png` (180), `icons/` 192, 512, maskable 192 and 512, monochrome 512, `manifest.webmanifest`, `robots.txt`, `screenshots/narrow.webp` and `wide.webp`. The old `favicon.svg` (dark tile, "M") is replaced.
- `scripts/build-brand-assets.ts` (plan, ICO packing, manifest, lock, `--write` and `--check`), `scripts/brand-chromium.ts` (the Chromium rasteriser), `scripts/image-size.ts` (PNG, ICO and WebP header reader), each with its Bun test, `scripts/brand-assets.test.ts` (committed files and `index.html`), `e2e/brand-assets.e2e.ts`.
- `apps/web/index.html` head: two icon links, apple-touch-icon, manifest, two `theme-color` tags with media queries. `playwright.config.ts`: the new spec joins the Chromium-only list.
- No dependency was added (`package.json` and `bun.lock` untouched). Not copied: `apps/mobile`, `packages/brand`, fonts, `og/og-default.png`, `icons/icon-monochrome.svg`.

## Decisions and deviations from the handoff

- The manifest, `robots.txt` and the PNG/ICO set are generated exactly as the handoff did (same masters, sizes, `theme_color` `#0B7A84`, `background_color` `#F2F6F6`). Pixels match: comparing every handoff PNG and each ICO image with the regenerated one in Chromium gave a largest per-channel difference of 0 (Repo-verified, scratch script). The file bytes differ (smaller PNGs), because the PNG encoder output is not the same across Chromium builds; the comparison is therefore by decoded pixels, below.
- Drift check, two layers. (1) `bun test` (runs in the Checks job, which has no browser): `assets.lock.json` must agree with every master, generated file and screenshot, so editing a master or an output alone fails; proven by editing one byte of a master and of an icon, each failed (Repo-verified). (2) `e2e/brand-assets.e2e.ts` (Chromium, in `smoke`): regenerates all ten generated files in memory and compares decoded pixels with the committed ones, tolerance 2 of 255 per channel (`PIXEL_TOLERANCE`; the observed difference is 0, the margin allows renderer differences between machines and is far below any visible change: a different icon gave 255, a size change gave -1, Repo-verified). I chose decoded pixels over byte equality because PNG bytes are an encoder detail, and over a hash of SVG inputs alone because the inputs do not prove the raster output. Whether Linux CI Chromium reproduces within the tolerance is Unverified until the hosted run.
- `index.html` theme colours: light `#F2F6F6` (the manifest background) and dark `#0B1114` (the handoff's dark splash colour in `apps/mobile/assets/README.md`). The handoff gave no head markup, so these two values are Inferred; the owner may change them with the design tokens (METRO-105). The manifest `theme_color` stays `#0B7A84` from the handoff.
- Screenshots kept. Inspected both images: no "offline" text (Repo-verified, viewed). They show the redesigned shell (search with Ctrl K, bottom navigation, route and fare, "SAMPLE DATA" fares), which the current app does not have yet. Kept as the owner's rule allowed (no offline claim); flagged in the brand note and for the owner, who may prefer to drop the `screenshots` member until METRO-105 and later slices land.
- `og/og-default.png` is not shipped (it says "Works offline"); a test fails if any `og/` file appears in `public/`. The handoff's `icons/icon-monochrome.svg` copy is not shipped; its master is in `brand/`.

## Serving (Repo-verified, `vite preview` with the Worker in workerd, curl)

| Path                     | Status | content-type                | cache-control                        |
| ------------------------ | ------ | --------------------------- | ------------------------------------ |
| `/manifest.webmanifest`  | 200    | `application/manifest+json` | `public, max-age=0, must-revalidate` |
| `/favicon.ico`           | 200    | `image/vnd.microsoft.icon`  | same                                 |
| `/favicon.svg`           | 200    | `image/svg+xml`             | same                                 |
| `/icons/icon-192.png`    | 200    | `image/png`                 | same                                 |
| `/screenshots/wide.webp` | 200    | `image/webp`                | same                                 |
| `/assets/nothing.js`     | 404    | `application/json`          | `no-store`                           |
| `/icons/missing.png`     | 200    | `text/html; charset=utf-8`  | same                                 |

`apps/web/public/_headers` needed no change: the `immutable` rule is `/assets/*` only, so unhashed names revalidate. A missing file outside `/assets/*` gets `index.html` with a 200 (single-page-application fallback, ADR-0011), so the e2e test compares served bytes with the committed file rather than trusting the status. The security headers and the CSP apply to these files through `/*`, and the CSP is unchanged (`index.html` gains only same-origin links and `meta`, no inline style or script; checked by `scripts/brand-assets.test.ts`). `favicon.svg` has an inline `<style>` for dark mode; Chromium drew it with the page's CSP and no console error (e2e probe, more than 300 opaque pixels of 4,096). Safari and Firefox rendering of the SVG favicon is Unverified. The deployed Cloudflare edge was not exercised; production content types are Unverified (same assets engine).

## Budget

`bun run build` then `bun run bundle:check` after the change: first visit 242,839 raw / 77,186 gzip (limits 250,000 / 80,000), all files 250,801 / 80,244 (ceiling 400,000 / 125,000), identical to the [METRO-104](metro-104.md) record, so the budget is unchanged (Repo-verified). A `bundle:check` run right after `smoke` read 46 raw / 18 gzip bytes more, because `smoke` rebuilds the app with the fake Maps key compiled in; a plain `build` is the number to compare. This change adds no JS or CSS: no brand file is one, and `index.html` only gains links and `meta` tags. The e2e test reads `dist/client/.vite/manifest.json` and fails if any first-visit file is not JS or CSS; `scripts/brand-assets.test.ts` fails if app source reaches an asset. Static files in `public/` are not in the budget by design (ADR-0020 counts JS and CSS); they carry their own per-file caps in `scripts/brand-assets.test.ts` (the twelve generated and screenshot files total 387,066 bytes; the 512 px icon is the largest at 138,092).

## Research

- Web-verified (MDN, Web app manifest `icons`, fetched 2026-11-08): `purpose` takes `any`, `maskable`, `monochrome`; several keywords may be combined, but this repository keeps one purpose per icon; monochrome uses only the alpha channel.
- Web-verified (MDN, `meta name=theme-color`): the `media` attribute selects a colour per `prefers-color-scheme`.
- Per MDN's relay of the W3C manifest spec (not re-read at source): maskable safe zone is a centred circle of 80 percent of the icon; the handoff maskable masters draw the mark at half scale inside a full-bleed square, inside that zone. Chromium wants 192 and 512 PNGs for install: Unverified here (MDN page does not state it; not tested against the install prompt).
- Unverified (from experience, not fetched): `<link rel="icon" href="/favicon.ico" sizes="48x48">` before the SVG link keeps Chrome from choosing the ICO over the SVG, and a separate 180 px `apple-touch-icon` is what iOS uses.
- Context7 (Playwright 1.64.1 is a repo pin): `page.screenshot` `omitBackground` and `clip` are the options the handoff used and the script reuses; not re-queried.

## Checks

Recorded in the pull request: commands run and their results, and the ones not run.

## Unverified

The install prompt and icon rendering on a real phone (the ticket's acceptance names the owner for this); Linux CI reproducing the pixels within tolerance; Safari and Firefox with the SVG favicon; production content types; the outlined-wordmark licence question in the brand note.
