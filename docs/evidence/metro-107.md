# METRO-107 evidence: brand and install assets

Recorded 2026-11-08 on branch `ticket/metro-107-brand-assets`, cut from `b3d748e` (tip of `feature/metro-rebuild`, after METRO-104). Labels: Repo-verified (run in this repository), Context7-verified, Web-verified, Unverified. Reference note: [brand](../product/brand.md).

## What shipped

- `apps/web/brand/`: 22 SVG masters: 19 copied from the approved handoff (`packages/brand/src`) plus three the handoff generator drew in code and never saved as files: `apple-touch-icon.svg`, `mark-small.svg` and `favicon.svg` (reproduced by running the handoff `geometry.mjs` with its two font-loading lines removed; the micro mark and favicon came out byte-identical to the handoff files, Repo-verified). `assets.lock.json` holds the SHA-256 of the masters and of the text outputs (`favicon.svg`, `manifest.webmanifest`, `robots.txt`) only.
- `apps/web/public/`: `favicon.svg`, `favicon.ico` (16, 32, 48), `apple-touch-icon.png` (180), `icons/` 192, 512, maskable 192 and 512, monochrome 512, `manifest.webmanifest`, `robots.txt`. No screenshots (see the review round below). The old `favicon.svg` (dark tile, "M") is replaced.
- `scripts/build-brand-assets.ts` (plan, ICO packing, manifest, lock, `--write` and `--check`), `scripts/brand-chromium.ts` (the Chromium rasteriser), `scripts/image-size.ts` (PNG, ICO and WebP header reader), each with its Bun test, `scripts/brand-assets.test.ts` (committed files and `index.html`), `e2e/brand-assets.e2e.ts`.
- `apps/web/index.html` head: two icon links, apple-touch-icon, manifest, two `theme-color` tags with media queries. `playwright.config.ts`: the new spec joins the Chromium-only list.
- No dependency was added (`package.json` and `bun.lock` untouched). Not copied: `apps/mobile`, `packages/brand`, fonts, `og/og-default.png`, `icons/icon-monochrome.svg`.

## Decisions and deviations from the handoff

- The manifest, `robots.txt` and the PNG/ICO set are generated exactly as the handoff did (same masters, sizes, `theme_color` `#0B7A84`, `background_color` `#F2F6F6`). Pixels match: comparing every handoff PNG and each ICO image with the regenerated one in Chromium gave a largest per-channel difference of 0 (Repo-verified, scratch script). The file bytes differ (smaller PNGs), because the PNG encoder output is not the same across Chromium builds; the comparison is therefore by decoded pixels, below.
- Drift check, layered by file kind because PNG and ICO bytes are not reproducible across Chromium builds and operating systems (the regenerated icons are pixel-identical to the handoff's but byte-different). (1) `bun test` (the Checks job, no browser): `assets.lock.json` hashes the masters and the text outputs (svg, manifest, robots.txt) only, so an edited master or text output fails; for the binaries the same file checks existence, decoded size (including the real IHDR size of each PNG inside `favicon.ico`, not just the directory entry) and size caps. It cannot see a swapped icon of the right size. (2) `e2e/brand-assets.e2e.ts` (Chromium, in `smoke`): regenerates all ten generated files in memory and compares decoded pixels with the committed ones. This is the only layer that catches a swapped or hand-edited icon. `PIXEL_TOLERANCE` is 1 of 255 per channel (the observed difference is 0; a different icon gave 255 and a size change -1, Repo-verified); a unit test pins the value at 1 and shows a 3-per-channel master colour change is caught while 1 is not. It must not be raised to pass a hosted run: report the failure instead. Whether Linux CI Chromium reproduces within 1 is Unverified until the hosted run.
- `index.html` theme colours come from the handoff's page background tokens (`--color-bg` in `handoff/tokens.css`: `#F2F6F6` at line 84 for light, `#060A0A` at lines 159 and 232 for dark), Repo-verified, not inferred. The manifest `theme_color` `#0B7A84` (brand teal) and `background_color` `#F2F6F6` stay as in the handoff manifest: they style the installed app's chrome and splash, the page tags follow the page background in the browser.
- `og/og-default.png` is not shipped (it says "Works offline"); a test fails if any `og/` file appears in `public/`. The handoff's `icons/icon-monochrome.svg` copy is not shipped; its master is in `brand/`.

## Serving (Repo-verified, `vite preview` with the Worker in workerd, curl)

| Path                    | Status | content-type                | cache-control                        |
| ----------------------- | ------ | --------------------------- | ------------------------------------ |
| `/manifest.webmanifest` | 200    | `application/manifest+json` | `public, max-age=0, must-revalidate` |
| `/favicon.ico`          | 200    | `image/vnd.microsoft.icon`  | same                                 |
| `/favicon.svg`          | 200    | `image/svg+xml`             | same                                 |
| `/icons/icon-192.png`   | 200    | `image/png`                 | same                                 |
| `/assets/nothing.js`    | 404    | `application/json`          | `no-store`                           |
| `/icons/missing.png`    | 200    | `text/html; charset=utf-8`  | same                                 |

`apps/web/public/_headers` needed no change: the `immutable` rule is `/assets/*` only, so unhashed names revalidate. A missing file outside `/assets/*` gets `index.html` with a 200 (single-page-application fallback, ADR-0011), so the e2e test compares served bytes with the committed file rather than trusting the status. The security headers and the CSP apply to these files through `/*`, and the CSP is unchanged (`index.html` gains only same-origin links and `meta`, no inline style or script; checked by `scripts/brand-assets.test.ts`). `favicon.svg` has an inline `<style>` for dark mode; Chromium drew it with the page's CSP and no console error (e2e probe, more than 300 opaque pixels of 4,096). Safari and Firefox rendering of the SVG favicon is Unverified. The deployed Cloudflare edge was not exercised; production content types are Unverified (same assets engine).

## Budget

`bun run build` then `bun run bundle:check` after the change: first visit 242,839 raw / 77,186 gzip (limits 250,000 / 80,000), all files 250,801 / 80,244 (ceiling 400,000 / 125,000), identical to the [METRO-104](metro-104.md) record, so the budget is unchanged (Repo-verified). A `bundle:check` run right after `smoke` read 46 raw / 18 gzip bytes more, because `smoke` rebuilds the app with the fake Maps key compiled in; a plain `build` is the number to compare. This change adds no JS or CSS: no brand file is one, and `index.html` only gains links and `meta` tags. The e2e test reads `dist/client/.vite/manifest.json` and fails if any first-visit file is not JS or CSS; `scripts/brand-assets.test.ts` fails if app source reaches an asset. Static files in `public/` are not in the budget by design (ADR-0020 counts JS and CSS); they carry their own per-file caps in `scripts/brand-assets.test.ts` (the ten generated files total 297,009 bytes; the 512 px icon is the largest at 138,092).

## Research

- Web-verified (MDN, Web app manifest `icons`, fetched 2026-11-08): `purpose` takes `any`, `maskable`, `monochrome`; several keywords may be combined, but this repository keeps one purpose per icon; monochrome uses only the alpha channel.
- Web-verified (MDN, `meta name=theme-color`): the `media` attribute selects a colour per `prefers-color-scheme`.
- Per MDN's relay of the W3C manifest spec (not re-read at source): maskable safe zone is a centred circle of 80 percent of the icon; the handoff maskable masters draw the mark at half scale inside a full-bleed square, inside that zone. Chromium wants 192 and 512 PNGs for install: Unverified here (MDN page does not state it; not tested against the install prompt).
- Unverified (from experience, not fetched): `<link rel="icon" href="/favicon.ico" sizes="48x48">` before the SVG link keeps Chrome from choosing the ICO over the SVG, and a separate 180 px `apple-touch-icon` is what iOS uses.
- Context7 (Playwright 1.64.1 is a repo pin): `page.screenshot` `omitBackground` and `clip` are the options the handoff used and the script reuses; not re-queried.

## Review round (independent review, no Critical finding)

- Screenshots removed. Both handoff images were inspected: no "offline" text, but they show screens that do not exist yet (Ctrl K search, bottom navigation, route and fare, "SAMPLE DATA" fares). The `screenshots` member, `public/screenshots/` and every related master, lock, test and cap entry are gone; a manifest test now fails if the member returns before the matching screens exist. Restore them, regenerated from the real UI, after METRO-105 and the first slices merge.
- Theme colours, the layered drift check and `PIXEL_TOLERANCE` 1: described in the decisions above.
- `sized()` throws a fixed error when a master has no `width`/`height` pair, and `buildAssets` fails unless every rendered PNG (and each ICO image) really has the requested size; both have tests.

## CI evidence: the new e2e spec runs on every pull request

Repo-verified from `.github/workflows/quality.yml`: it triggers on `pull_request` to `feature/metro-rebuild` and `main` (lines 3 to 8) without path filters. Job `build` (display name `Build and smoke`, line 86) runs `bun run smoke -- --shuffle --project=chromium` (line 185) after installing Chromium; `playwright.config.ts` sets `testMatch: "**/*.e2e.ts"`, so `e2e/brand-assets.e2e.ts` runs in that job. Matrix job `smoke` (Firefox, WebKit, mobile Chrome; lines 197 to 214) skips it through `testIgnore`. The `build` job is skipped only when `changes` reports a docs-only diff, which this PR is not. Hosted behaviour itself is Unverified until the PR run finishes.

## Unverified

The install prompt and icon rendering on a real phone (the ticket's acceptance names the owner for this); Linux CI reproducing the pixels within a tolerance of 1; the inline `<style>` of `favicon.svg` under the CSP (Chromium rendered it with no console error in the e2e probe; Safari and Firefox not tested) and how Safari and Firefox choose and draw the tab icon; production content types at the Cloudflare edge; the outlined-wordmark licence question in the brand note.
