# METRO-104 evidence: first-visit budget, all-files ceiling, lazy web-vitals

Recorded 2026-11-08 on branch `ticket/metro-104-first-visit-budget`, cut from `c081baf` (tip of `feature/metro-rebuild`, includes METRO-44 parts A, B and C). Labels: Repo-verified (run in this repository), Context7-verified, Unverified. Decision record: [ADR-0020](../adr/0020-first-visit-budget-and-lazy-features.md).

## Numbers (`bun run build` then `bun run bundle:check`, Repo-verified)

| Commit    | State                                            | First-visit raw / gzip | All files raw / gzip | Notes                                                                                       |
| --------- | ------------------------------------------------ | ---------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `c081baf` | before (old gate: one total, one chunk)          | 248,941 / 79,213       | 248,941 / 79,213     | entry `index-BI89DYpL.js` 248,870 / 79,127, CSS 71 / 86                                     |
| `45e152c` | manifest gate, build unchanged                   | 248,941 / 79,213       | 248,941 / 79,213     | same files, now marked `first-visit`                                                        |
| `f6a921f` | web-vitals lazy (unchanged by the later commits) | 242,839 / 77,186       | 250,801 / 80,244     | entry `index-BHmbQghi.js` 242,768 / 77,100; `web-vitals-CMUBx256.js` 7,962 / 3,058 (`lazy`) |

Limits: first visit 250,000 / 80,000 (unchanged), ceiling 400,000 / 125,000. First-visit headroom after: 7,161 raw / 2,814 gzip (before: 1,059 / 787). The first visit fell by 6,102 raw / 2,027 gzip, less than the ticket's "about 10 KB / 3.7 KB": the library is 7,962 / 3,058 as its own chunk, and the split adds overhead (separate module wrapper, the preload helper that stays in the entry). All files now exceed the old 250,000 / 80,000 total (250,801 / 80,244); that passes because the ceiling applies to them, which is the point of the redesign.

Ceiling choice: 400,000 / 125,000 is about 1.6 times the measured all-files size, the owner's recommendation. It leaves room for a few lazy features and trips on a runaway; it is a growth tripwire to revisit when half is used.

## Lab LCP and CLS (Chromium, `bun run smoke`, local, Repo-verified)

`web-vitals-lab LCP=116ms (limit 2500ms) CLS=0.0016 (limit 0.1)`; controls: delayed script `LCP=3136ms`, inserted block `CLS=0.3132`. Part C's local runs were LCP 64 to 140 ms and CLS 0.0016 to 0.0037, so the late chunk does not move them: the chunk loads after `load` and idle, after the first paint. One local run only.

## Manifest published

The build writes `apps/web/dist/client/.vite/manifest.json` (Context7-verified: `build.manifest: true`). Repo-verified, `apps/api` `bun run build` (`wrangler deploy --dry-run`) with `WRANGLER_LOG=debug`: `dist/client` holds `_headers`, `.assetsignore`, `favicon.svg`, `index.html`, `assets/index-*.css`, `assets/index-*.js`, `assets/web-vitals-*.js` and `.vite/manifest.json`; the bare "files read" counts were 7 before and 9 after, a difference of exactly the two new outputs (`assets/web-vitals-*.js` and `.vite/manifest.json`). `.assetsignore` did not exclude `.vite`, so the manifest was uploaded and served at `/.vite/manifest.json`. It is now excluded through `apps/web/public/.assetsignore` (`.vite`), which the plugin merges into the built `.assetsignore` (`.vite`, `wrangler.json`, `.dev.vars`); the dry-run then logs `Ignoring asset: .vite\manifest.json`. The budget script reads the local `dist/client`, so it is unaffected.

## Changed assertions (every one)

- `scripts/bundle-budget.test.ts`: rewritten for the manifest gate. Removed with the code they tested: the entry-budget equals the totals test, the `entryScript` parsing test, the three entry-over-budget tests, the entry-line test and the entry-not-found test. Replaced by the first-visit, ceiling, manifest and set-computation tests. No threshold assertion weakened: the totals assertion is now `FIRST_VISIT_BUDGET` equals 250,000 / 80,000 and the new ceiling assertion.
- `scripts/gates.test.ts` (bundle fixtures; the absent-artifacts and all non-bundle tests are untouched): "rejects oversized" now expects `Bundle budget exceeded for the first visit` and a manifest fixture; "gzip only" the same; "accepts within budget" expects `First-visit JS/CSS:` and `All JS/CSS:` lines instead of `Entry chunk small.js:`; "entry over its own budget" was removed (the entry check is gone); "a lazy chunk pushes the total over and fails on the totals alone" flipped: a 250,000-byte lazy chunk now passes, and a new test fails a 400,000-byte lazy chunk on the ceiling alone; "no entry chunk" became "no manifest", expecting the fixed manifest message.
- `apps/web/src/vitals.test.ts`: the two `startVitals` tests changed for the injected loader and scheduler signature; new tests added. `e2e/vitals.e2e.ts`: the test now waits for the lazy chunk response and two animation frames before the input and the simulated hide (a page already hidden when the library starts drops earlier entries; the assertions on the beacons are unchanged).

## Unverified

Real-user effect of the late chunk (INP, LCP timing as reported); behaviour where `requestIdleCallback` is missing (timer path unit-tested only); whether a browser caches a failed dynamic import (the helper reloads the page instead of importing again; unit tests mock the loader and the reload).

## Review follow-ups (second round)

Reload button instead of a second import (the failure region takes focus, no `role="alert"`); vitals idle wait capped at 1 s; per-observer `try`; stale-manifest rule (every emitted JS and CSS file must be in the manifest, one fixed message); ceiling percentage and a non-failing note above 50 percent (already printed now, all files use about 63 percent); `.vite` excluded from upload. Assertions changed: `scripts/bundle-budget.test.ts` first listing test gained the `Ceiling used` line, the tie-order fixture lists its second file in the manifest (the stale rule), and the `bundleMain` output indexes moved by one line; `apps/web/src/vitals.test.ts` timeout and fallback expectations changed from 3000 and 2000 to 1000; `apps/web/src/lazy-feature.test.tsx` Retry tests replaced by reload tests. No limit lowered or raised.
