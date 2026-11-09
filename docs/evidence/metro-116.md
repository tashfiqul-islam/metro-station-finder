# METRO-116 evidence: bundle budget model, JS and CSS split, per-screen allowance

Date: 2026-11-09. Base: `061d771` (`feature/metro-rebuild`, merge of PR 116). Head: the tip of `ticket/metro-116-bundle-model` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0. Gate-policy change approved by the owner on 2026-11-09 ("both changes"); the exact numbers below are proposed by this change and are the owner's to confirm. Labels: Repo-verified, Unverified.

## Before and after (Repo-verified, same build, `bun run build` then `bun run bundle:check`)

The build is byte-identical before and after (no source under `apps/` changed); only the gate's accounting changed.

| Measure                       | Before (head `061d771`)                                                 | After                                             |
| ----------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| First visit, JS and CSS mixed | 249,561 raw / 78,134 gzip (250,000 / 80,000)                            | removed as a single figure                        |
| First-visit JS                | not separate (235,420 raw / 74,159 gzip)                                | 235,420 raw / 74,159 gzip, limit 250,000 / 80,000 |
| First-visit CSS               | not separate (14,141 raw / 3,975 gzip)                                  | 14,141 raw / 3,975 gzip, limit 20,000 / 6,000     |
| All files                     | 358,628 raw / 109,053 gzip (ceiling 400,000 / 125,000; 90 / 87 percent) | removed                                           |
| Lazy screen Nearby (JS + CSS) | inside all files                                                        | 22,798 gzip, limit 30,000 (76 percent)            |
| Shared lazy                   | inside all files                                                        | 8,121 gzip, allowance 12,000 (68 percent)         |

JS headroom on the first visit: 14,580 raw / 5,841 gzip (was 439 raw / 1,866 gzip). The 235,420 includes `theme-boot.js` (402 raw / 253 gzip), because it is JavaScript and the ticket's entry figure (about 235.4 KB) includes it.

Per file (raw / gzip): `index-*.js` 235,018 / 73,906 first-visit; `index-*.css` 14,141 / 3,975 first-visit; `theme-boot.js` 402 / 253 first-visit; `Nearby-*.js` 41,730 / 14,647 and `Nearby-*.css` 49,112 / 8,151 lazy (nearby); shared: `web-vitals-*.js` 7,962 / 3,058, `maps-*.js` 5,805 / 2,843, `src-*.js` (core common chunk) 3,802 / 1,789, `reveal-*.js` 656 / 431.

## New limits, for owner confirmation

| Limit                     | Value                     | Measured         | Margin over measured            |
| ------------------------- | ------------------------- | ---------------- | ------------------------------- |
| First-visit JS            | 250,000 raw / 80,000 gzip | 235,420 / 74,159 | unchanged limit (owner's)       |
| First-visit CSS           | 20,000 raw / 6,000 gzip   | 14,141 / 3,975   | 41 percent raw, 51 percent gzip |
| Each lazy screen (Nearby) | 30,000 gzip (JS + CSS)    | 22,798           | 32 percent                      |
| Shared lazy allowance     | 12,000 gzip               | 8,121            | 48 percent                      |
| Unclassified lazy chunk   | fails, at any size        |                  |                                 |

Removed with the approved change: the all-files ceiling (400,000 raw / 125,000 gzip) and its half-use growth note. Nothing the owner set for JS is looser: the JS limits are the same numbers, and now count fewer bytes only because CSS is no longer in them.

## Changes

- `scripts/bundle-budget.ts`: `FIRST_VISIT_JS_BUDGET`, `FIRST_VISIT_CSS_BUDGET`, `LAZY_SCREEN_LIMITS` (by manifest key), `SHARED_LAZY_ALLOWANCE`, the shared-key rules and `UNCLASSIFIED_PREFIX`. `ALL_FILES_CEILING` and `FIRST_VISIT_BUDGET` are gone.
- `scripts/bundle-budget.test.ts` (rewritten for the model) and `scripts/gates.test.ts` (fixture manifests use real keys).
- `docs/adr/0023-bundle-budget-model.md` (new, Proposed), an amendment note in ADR-0020, `docs/agents/quality-gates.md` (6,140 of 6,144 bytes after trimming two sentences of wording to make room: the untracked-files remark and "with the same fail-fast behavior"), `docs/agents/golden-path.md` (5,841), `docs/README.md` (next ADR number).
- Not changed: CLAUDE.md, `ui.md`, `maintenance.md` (no sentence in them named the ceiling), and anything the browser sees.

## Test edits and reasons

- `bundle-budget.test.ts`: the ceiling tests (`CEILING_OVER`, the tripwire note test, "lazy chunk over the old 250000 passes under the ceiling") are replaced by the screen and shared tests; the first-visit raw, gzip, exact-at-limit and head-script tests are kept and now assert the JS message; the report-line and `bundleMain` regex tests use the new line names. The fixtures' lazy key is a real classified key (`src/features/nearby/Nearby.tsx`), because an unkeyed lazy chunk now fails closed. Every first-visit assertion remained, with the same numeric limits.
- `gates.test.ts`: `writeManifest` takes manifest keys; "prints both totals" now looks for `First-visit JS:` and `First-visit CSS:`; the "beyond the all-files ceiling" test is replaced by a screen-over-gzip test (incompressible 31,000 bytes), a shared-over test and an unclassified test. No threshold was loosened.

## Mutation checks (Repo-verified; each mutant applied to `scripts/bundle-budget.ts`, `bun test scripts/bundle-budget.test.ts scripts/gates.test.ts`, restored afterwards)

All 11 mutants were killed (failing tests in brackets): JS raw `>` to `>=` [2]; JS gzip check removed [3]; CSS raw check removed [2]; CSS gzip check removed [2]; screen check removed [5]; screen `>` to `>=` [1]; shared check removed [5]; unclassified chunk treated as shared [6]; unclassified early return dropped [6]; CSS counted in JS [6]; screen CSS left out of the screen's bytes [10].

## Verification record

Commands run and not run are in the pull request. Smoke was not run: nothing the browser sees changed (the diff is `scripts/` and `docs/` only, the built output is identical).

## Review dispositions
