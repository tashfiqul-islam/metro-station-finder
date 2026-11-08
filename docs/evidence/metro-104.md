# METRO-104 evidence: first-visit budget, all-files ceiling, lazy web-vitals

Recorded 2026-11-08 on branch `ticket/metro-104-first-visit-budget`, cut from `c081baf` (tip of `feature/metro-rebuild`, includes METRO-44 parts A, B and C). Labels: Repo-verified (run in this repository), Context7-verified, Unverified. Decision record: [ADR-0020](../adr/0020-first-visit-budget-and-lazy-features.md).

## Numbers (`bun run build` then `bun run bundle:check`, Repo-verified)

| Commit    | State                                            | First-visit raw / gzip | All files raw / gzip | Notes                                                                                       |
| --------- | ------------------------------------------------ | ---------------------- | -------------------- | ------------------------------------------------------------------------------------------- |
| `c081baf` | before (old gate: one total, one chunk)          | 248,941 / 79,213       | 248,941 / 79,213     | entry `index-BI89DYpL.js` 248,870 / 79,127, CSS 71 / 86                                     |
| `45e152c` | manifest gate, build unchanged                   | 248,941 / 79,213       | 248,941 / 79,213     | same files, now marked `first-visit`                                                        |
| `f6a921f` | web-vitals lazy (unchanged by the later commits) | 242,819 / 77,181       | 250,781 / 80,239     | entry `index-RolPBpSL.js` 242,748 / 77,095; `web-vitals-CMUBx256.js` 7,962 / 3,058 (`lazy`) |

Limits: first visit 250,000 / 80,000 (unchanged), ceiling 400,000 / 125,000. First-visit headroom after: 7,181 raw / 2,819 gzip (before: 1,059 / 787). The first visit fell by 6,122 raw / 2,032 gzip, less than the ticket's "about 10 KB / 3.7 KB": the library is 7,962 / 3,058 as its own chunk, and the split adds overhead (separate module wrapper, the preload helper that stays in the entry). All files now exceed the old 250,000 / 80,000 total (250,781 / 80,239); that passes because the ceiling applies to them, which is the point of the redesign.

Ceiling choice: 400,000 / 125,000 is about 1.6 times the measured all-files size, the owner's recommendation. It leaves room for a few lazy features and trips on a runaway; it is a growth tripwire to revisit when half is used.

## Lab LCP and CLS (Chromium, `bun run smoke`, local, Repo-verified)

`web-vitals-lab LCP=116ms (limit 2500ms) CLS=0.0016 (limit 0.1)`; controls: delayed script `LCP=3136ms`, inserted block `CLS=0.3132`. Part C's local runs were LCP 64 to 140 ms and CLS 0.0016 to 0.0037, so the late chunk does not move them: the chunk loads after `load` and idle, after the first paint. One local run only.

## Manifest published

The build writes `apps/web/dist/client/.vite/manifest.json` (Context7-verified: `build.manifest: true`). `wrangler deploy --dry-run` read 9 asset files with it and 7 without, so it is served as a static asset. It holds hashed file names only, already visible in `index.html`; left as is.

## Changed assertions (every one)

- `scripts/bundle-budget.test.ts`: rewritten for the manifest gate. Removed with the code they tested: the entry-budget equals the totals test, the `entryScript` parsing test, the three entry-over-budget tests, the entry-line test and the entry-not-found test. Replaced by the first-visit, ceiling, manifest and set-computation tests. No threshold assertion weakened: the totals assertion is now `FIRST_VISIT_BUDGET` equals 250,000 / 80,000 and the new ceiling assertion.
- `scripts/gates.test.ts` (bundle fixtures; the absent-artifacts and all non-bundle tests are untouched): "rejects oversized" now expects `Bundle budget exceeded for the first visit` and a manifest fixture; "gzip only" the same; "accepts within budget" expects `First-visit JS/CSS:` and `All JS/CSS:` lines instead of `Entry chunk small.js:`; "entry over its own budget" was removed (the entry check is gone); "a lazy chunk pushes the total over and fails on the totals alone" flipped: a 250,000-byte lazy chunk now passes, and a new test fails a 400,000-byte lazy chunk on the ceiling alone; "no entry chunk" became "no manifest", expecting the fixed manifest message.
- `apps/web/src/vitals.test.ts`: the two `startVitals` tests changed for the injected loader and scheduler signature; new tests added. `e2e/vitals.e2e.ts`: the test now waits for the lazy chunk response and two animation frames before the input and the simulated hide (a page already hidden when the library starts drops earlier entries; the assertions on the beacons are unchanged).

## Unverified

Real-user effect of the late chunk (INP, LCP timing as reported); behaviour where `requestIdleCallback` is missing (timer path unit-tested only); the second new asset in the dry-run count.
