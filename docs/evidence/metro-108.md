# METRO-108 evidence: light-dark() colour tokens (no-go)

Date: 2026-11-09. Base: `5497822` (`feature/metro-rebuild`, merge of PR #110). Windows 11, Bun 1.4.4. Labels: Repo-verified, Web-verified, Unverified. Decision: no-go. The measured saving is below the owner's 2 KB rule, so no feature PR. Slices stay lazy-only (METRO-109 keeps Nearby out of the entry).

## Method (Repo-verified)

On a throwaway branch, `apps/web/src/styles/tokens.css` was rewritten so each themed colour is one `light-dark(light, dark)` in `:root` with `color-scheme: light dark`, plus `:root[data-theme="light"]` and `:root[data-theme="dark"]` that only set `color-scheme`. The dark block, the `prefers-color-scheme` block and the three-selector reduced-transparency list collapse to `:root`. Shadows wrap each colour. Where light and dark shadows differ in offset or blur (`--shadow-1`, `-2`, `-3`, `--shadow-signal`), light-dark() cannot swap lengths, so each theme's layer is written and the other theme's is `transparent`. Then `bun run build` and `bun run bundle:check`.

## Numbers (Repo-verified)

| Build                                                                | Entry CSS raw / gzip | First visit raw / gzip | Headroom (250,000 / 80,000) |
| -------------------------------------------------------------------- | -------------------- | ---------------------- | --------------------------- |
| Base                                                                 | 14,141 / 3,975       | 249,338 / 78,021       | 662 / 1,979                 |
| light-dark(), default build targets (floor kept, Chrome 111)         | 14,830 / 3,994       | 250,027 / 78,043       | over by 27 / 1,957          |
| light-dark(), `build.cssTarget` Chrome 123, Safari 17.5, Firefox 120 | 13,034 / 3,887       | 248,231 / 77,936       | 1,769 / 2,064               |

- With the current floor, Vite's CSS minifier (Lightning CSS) compiles each `light-dark()` into `var(--lightningcss-light, A) var(--lightningcss-dark, B)` and adds toggle variables to every `color-scheme` rule. That is a working fallback, and it grows the entry by 689 raw bytes and breaks the raw limit.
- Raising the floor to native `light-dark()` frees only 1,107 raw and 85 gzip bytes, about half of the 2 KB rule, and the floor moves to the three browser versions above, which needs owner confirmation. The remaining weight is the new `transparent` layers and the per-colour wrappers.
- Only `tokens.css` is in the entry. `tokens-parts.css` and `tokens-map.css` load with lazy parts, so converting them frees no first-visit bytes.

## Browser support (Web-verified for Baseline, Unverified for versions)

MDN marks `light-dark()` Baseline 2024 (since May 2024) and allows custom properties and `var()` inside it. MDN's compatibility table was not readable in the fetch, so the Chrome 123, Safari 17.5 and Firefox 120 versions come from the ticket and are Unverified here. MDN does not document `light-dark()` inside shadows or gradient stops; the build above accepted it, and no browser rendering was checked, so shadow and gradient behaviour is Unverified.

## Not done

No contrast test change, guard change, browser tests, ADR amendment or code change was made, because the rule says stop at this number. `theme-boot.js` and the theme store were not touched. No limit changed and no assertion weakened.

## Re-open if

The entry gains room by other means, or the owner accepts the raised floor and a looser saving (about 1.1 KB raw), or shadows are simplified so one set of lengths serves both themes (not measured).
