# METRO-116 evidence: bundle budget model, JS and CSS split, per-screen allowance

Date: 2026-11-09. Base: `061d771` (`feature/metro-rebuild`, merge of PR 116). Head: the tip of `ticket/metro-116-bundle-model` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0. Gate-policy change approved by the owner on 2026-11-09 ("both changes"); the exact numbers below are proposed by this change and are the owner's to confirm. Labels: Repo-verified, Unverified.

## Before and after (Repo-verified, same build, `bun run build` then `bun run bundle:check`)

The build is byte-identical before and after (no source under `apps/` changed); only the gate's accounting changed.

| Measure                       | Before (head `061d771`)                                                 | After                                              |
| ----------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- |
| First visit, JS and CSS mixed | 249,561 raw / 78,134 gzip (limit 250,000 / 80,000)                      | removed as a single figure                         |
| First-visit JS                | not separate (235,420 raw / 74,159 gzip)                                | 235,420 raw / 74,159 gzip, limit 250,000 / 80,000  |
| First-visit CSS               | not separate (14,141 raw / 3,975 gzip)                                  | 14,141 raw / 3,975 gzip, limit 20,000 / 6,000      |
| All files                     | 358,628 raw / 109,053 gzip (ceiling 400,000 / 125,000; 90 / 87 percent) | removed                                            |
| Lazy screen Nearby (JS + CSS) | inside all files                                                        | 90,842 raw / 22,798 gzip, limit 120,000 / 30,000   |
| Shared lazy                   | inside all files                                                        | 18,225 raw / 8,121 gzip, allowance 27,000 / 12,000 |

JS headroom on the first visit: 14,580 raw / 5,841 gzip (was 439 raw / 1,866 gzip). The 235,420 includes `theme-boot.js` (402 raw / 253 gzip), because it is JavaScript and the ticket's entry figure (about 235.4 KB) includes it.

Per file (raw / gzip): `index-*.js` 235,018 / 73,906 first-visit; `index-*.css` 14,141 / 3,975 first-visit; `theme-boot.js` 402 / 253 first-visit; `Nearby-*.js` 41,730 / 14,647 and `Nearby-*.css` 49,112 / 8,151 lazy (nearby); shared: `web-vitals-*.js` 7,962 / 3,058, `maps-*.js` 5,805 / 2,843, `src-*.js` (core chunk imported by Nearby and by the Maps adapter, so two roots) 3,802 / 1,789, `reveal-*.js` 656 / 431.

## New limits, for owner confirmation

| Limit                     | Value                                 | Measured         | Margin over measured            |
| ------------------------- | ------------------------------------- | ---------------- | ------------------------------- |
| First-visit JS            | 250,000 raw / 80,000 gzip (unchanged) | 235,420 / 74,159 | unchanged limit (owner's)       |
| First-visit CSS           | 20,000 raw / 6,000 gzip               | 14,141 / 3,975   | 41 percent raw, 51 percent gzip |
| Each lazy screen (Nearby) | 120,000 raw / 30,000 gzip (JS + CSS)  | 90,842 / 22,798  | 32 percent both                 |
| Shared lazy allowance     | 27,000 raw / 12,000 gzip              | 18,225 / 8,121   | 48 percent both                 |
| Unclassified lazy chunk   | fails at any size                     |                  |                                 |

Worst case that passes, gzip: 80,000 + 6,000 + 30,000 + 12,000 = 128,000, which is 3,000 more than the removed all-files ceiling (125,000). Raw: 250,000 + 20,000 + 120,000 + 27,000 = 417,000 against the removed 400,000. Measured use today is unchanged (109,053 gzip). Intended and for the owner to confirm: the old ceiling bounded a total that every future screen shared; the new model bounds each part, and each added screen raises the worst case by its own, owner-approved limit.

Removed with the approved change: the all-files ceiling (400,000 raw / 125,000 gzip) and its half-use growth note. Nothing the owner set for JS is looser: the JS limits are the same numbers, and now count fewer bytes only because CSS is no longer in them. Lazy code is bounded in raw and gzip bytes.

## Changes

- `scripts/bundle-budget.ts`: `FIRST_VISIT_JS_BUDGET`, `FIRST_VISIT_CSS_BUDGET`, `LAZY_SCREEN_LIMITS` (by manifest key, raw and gzip), `SHARED_LAZY_ALLOWANCE` (raw and gzip), the three shared roots, `LAZY_MODEL` (so tests can pass two screens) and `UNCLASSIFIED_PREFIX`. `ALL_FILES_CEILING` and `FIRST_VISIT_BUDGET` are gone. A screen owns its chunk, its CSS and the static `imports` closure below it; a file reached from two or more roots is shared; a chunk no root reaches is unclassified.
- `scripts/bundle-budget.test.ts` (rewritten for the model) and `scripts/gates.test.ts` (fixture manifests use real keys).
- `docs/adr/0023-bundle-budget-model.md` (new, Proposed), notes in ADR-0020 (status qualifier, banner, the second-`isEntry` sentence) and ADR-0022 (the ceiling sentence), `docs/agents/quality-gates.md` (6,115 of 6,144 bytes; one line differs from the base: the lab-vitals sentence now says `bundle:check` enforces the bundle limits, ADR-0023; the other sentences are back to their original wording), `docs/agents/golden-path.md` (5,850), `docs/README.md` (next ADR number).
- Not changed: CLAUDE.md, `ui.md`, `maintenance.md` (no sentence in them named the ceiling), and anything the browser sees.

## Test edits and reasons

- `bundle-budget.test.ts`: the ceiling tests (the ceiling message, the tripwire note test, "lazy chunk over the old 250000 passes under the ceiling") are replaced by screen, shared and ownership tests; the first-visit raw, gzip, exact-at-limit and head-script tests are kept and now assert the JS message; the report-line and `bundleMain` regex tests use the new line names. The fixtures' lazy key is a real classified key (`src/features/nearby/Nearby.tsx`), because an unkeyed lazy chunk now fails closed. The test that pinned a 900,000-raw lazy chunk as passing is replaced by one that fails it. Every first-visit assertion remained, with the same numeric limits.
- `gates.test.ts`: `writeManifest` takes manifest keys; "prints both totals" now looks for `First-visit JS:` and `First-visit CSS:`; "a lazy chunk over the old 250,000 total passes" is replaced by "a screen exactly at its 120,000 raw limit passes" and "one byte over fails", because the ceiling that test relied on is gone and lazy raw is now bounded; "beyond the all-files ceiling" is replaced by a screen-over-gzip test (incompressible 31,000 bytes), a shared-over test and an unclassified test. No threshold was loosened.

## Mutation checks (Repo-verified)

Each mutant applied to `scripts/bundle-budget.ts` and run against `scripts/bundle-budget.test.ts` and the `bundle gate` tests of `scripts/gates.test.ts`; a mutant counts as killed only when a test reports `(fail)` (a non-zero exit alone is not counted, which an earlier version of the script did wrongly through the coverage threshold on a partial run). 42 mutants: 41 killed, 1 survived.

Killed (failing tests in brackets): JS raw `>` to `>=` [2]; JS gzip `>` to `>=` [1]; JS gzip check removed [2]; CSS raw check removed [2]; CSS gzip check removed [2]; CSS raw `>` to `>=` [2]; screen raw check removed [4]; screen gzip check removed [5]; screen raw `>` to `>=` [2]; screen gzip `>` to `>=` [2]; screen check removed entirely [6]; shared raw check removed [4]; shared gzip check removed [7]; shared raw `>` to `>=` [2]; shared gzip `>` to `>=` [3]; unclassified early return dropped [8]; CSS counted in JS [6]; JS counted in CSS [12]; `first.has` dropped in the owned-file loop [6]; `isCode` dropped in the unclassified filter [1]; `first.has` dropped in the unclassified filter [50]; `reached` check dropped [45]; double claim goes to one owner [13]; double claim goes to nobody [21]; chunk CSS not owned [15]; static imports not followed [32]; reveal pattern without `^` [1]; reveal pattern without `$` [1]; maps pattern without `^` [1]; maps pattern without `$` [1]; maps pattern with an unescaped dot [1]; web-vitals pattern with the start loosened [1], end loosened [1], any prefix [1], `dist` dropped [1]; percent with no decimal [4]; screen lookup falls to shared [40]; single owner falls to shared [19]; screen raw limit changed [4]; shared gzip allowance changed [4]; import-cycle guard removed (the run hangs and is killed by the 60 second timeout, so it counts as killed by non-termination, not by an assertion).

Survived: `isCode` dropped in the owned-file loop. It is equivalent in effect: `collectAssets` hands the gate only `.js` and `.css` files, so a font that a mutant would wrongly own is never in the sums. The other check on the same line (`first.has`) is covered.

## Verification record

Commands run and not run are in the pull request.

## Review dispositions

Independent review of head `a90257e` by the `independent-reviewer` agent (agent `a221e5eae8606b3fe`), requested after the pull request opened. No Critical finding. Disposition of each finding:

| Finding                                                                                     | Disposition                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Important 1: lazy raw size unbounded, looser than the old ceiling                           | Fixed: raw limits for each screen (120,000) and the shared allowance (27,000); the 900,000-raw pinned-pass test replaced by one that fails it; ADR and PR state that the worst case, 128,000 gzip, exceeds the old 125,000 and why. Owner check: the new raw numbers and the 128,000 worst case.       |
| Important 2: `_` common chunks were all shared                                              | Fixed: a screen owns the static closure below it; shared is only what two or more roots reach; failure messages name the screen or shared. Tests: a heavy private chunk fails its screen; a chunk two screens import is shared.                                                                        |
| Important 3: shared rules could swallow growth; manifest key layout unrecorded              | Fixed: the `^_` rule is gone, shared roots are three exact patterns, lookalikes tested; ADR-0023 records the web-vitals key as built by Vite 8 and Bun's isolated install, and that a format change fails closed.                                                                                      |
| Important 4: a file listed by two screens went to the last one                              | Fixed: shared, tested in both manifest orders with two screens.                                                                                                                                                                                                                                        |
| Important 5: quality-gates.md sentences deleted                                             | Fixed: both restored to the original wording; the lab-vitals sentence shortened instead; 6,115 of 6,144 bytes, margin 29.                                                                                                                                                                              |
| Minor: "five limits" vs four rows                                                           | Fixed: ADR says four limits in the table.                                                                                                                                                                                                                                                              |
| Minor: "about 30 percent"                                                                   | Fixed: 32 percent in the comment and ADR (31.6 percent exactly for gzip).                                                                                                                                                                                                                              |
| Minor: percent showed 0 for small screens                                                   | Fixed: one decimal.                                                                                                                                                                                                                                                                                    |
| Minor: ADR-0020 (second `isEntry`) and ADR-0022 (ceiling 87 percent) contradicted the model | Fixed: ADR-0023 states it supersedes those parts; ADR-0020 status qualifier, banner and a bracketed note on the `isEntry` sentence; ADR-0022 sentence updated. docs/README allows a note only if it does not change the decision, so ADR-0023 carries the supersession and the notes only point to it. |
| Minor: service worker (METRO-106)                                                           | Declared: a "not covered, future" note in ADR-0023 with a proposed rule (its own small limit, fail closed if registered but absent); not implemented; `HEAD_SCRIPTS` untouched.                                                                                                                        |
| Minor: mutation coverage                                                                    | Fixed: new tests for each shared pattern, the first-visit filters, the JS and CSS split, and a "borrow" test that can fail; 42 mutants, 41 killed, 1 equivalent survivor (above).                                                                                                                      |
| Owner check                                                                                 | The raw limits (120,000 and 27,000), the 128,000 gzip worst case, the CSS limit, and whether 30,000 / 12,000 gzip are right.                                                                                                                                                                           |
