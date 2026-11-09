# METRO-120 evidence: notices only suggest a next step that is available

Date: 2026-11-09. Base: `061d771` (`feature/metro-rebuild`, merge of PR 116). Head: the tip of `ticket/metro-120-notice-next-step` in the pull request. Windows 11, mise-pinned Bun 1.4.4 and Node 26.13.0, Playwright 1.64.1. Scope: the ticket (METRO-120), owner review of head `061d771`. Labels: Repo-verified, Unverified.

## What shipped

- Problem (Repo-verified at the base): with place search unavailable (no connection, no key, failed load) the denied, rough, rough-unknown and unavailable notices still ended with "Search for a place instead." right above the notice saying place search is unavailable.
- `copy.ts`: each of the four notices is a `{ search, pick }` pair (`NoticeVariants`), the two sharing everything before the last sentence. `roughKnown(size)` returns a pair.
- `NearestStation.tsx`: `noticeText(notice, searchAvailable)` picks the variant at render, from the same `searchAvailable` that already removed the action (METRO-114). Text and action therefore follow one flag, and the `online` event, a failed load or a Maps status change re-renders both. New: if place search goes away while a notice shows and focus was on the removed "Search for a place" action (focus fell to the page), the notice takes focus. A ref set by the action's focus and blur makes this fire only when that action really had focus; focus on the blank page is left alone.
- The rule is written in `docs/specifications/nearest-station-slice.md` (section "A notice names only a next step that is available"), because `docs/agents/ui.md` has no room (6,044 of 6,144 bytes). `ui.md` is byte-identical to the base (6,044 bytes; the one-line pointer added in the first pass was dropped after review, so parallel tickets keep their 100 bytes). `.gitattributes` sets `* text=auto eol=lf` and `git ls-files --eol` reports `i/lf w/lf` for the file: no CRLF or trailing-newline drift. A contract is the right home: it is the settled behavior that tests check, and it is not byte-capped. The states table note in the same file points at the section.
- Tests: `copy.test.ts` (new, table-driven guard over `copy.ts`: every notice with a step is a pair, no `pick` text mentions search, no plain string suggests a step other than picking a station, so a future notice cannot regress); `NearestStation.test.tsx` (per notice, available and unavailable: text, action presence, focus target; the `online` event with a notice showing; a failure with focus on the action); `e2e/notice-next-step.e2e.ts` (new: each notice both ways with axe, the `online` event, a failing Maps script with the action focused).

## First-visit budget (Repo-verified, `mise exec -- bun run build` then `bun run bundle:check`)

| Stage                  | Entry JS raw / gzip | First visit raw / gzip | Headroom raw / gzip | All files raw / gzip | `Nearby` JS raw / gzip |
| ---------------------- | ------------------- | ---------------------- | ------------------- | -------------------- | ---------------------- |
| Base `061d771` rebuilt | 235,018 / 73,906    | 249,561 / 78,134       | 439 / 1,866         | 358,628 / 109,053    | 41,730 / 14,647        |
| This change (final)    | 235,018 / 73,906    | 249,561 / 78,134       | 439 / 1,866         | 359,428 / 109,154    | 42,530 / 14,751        |

Entry delta: 0 raw / 0 gzip against the rebuilt base. The copy and the logic live in the lazy `Nearby` chunk (+800 raw / +104 gzip). No limit changed. (The first pass measured 42,481 / 14,740 for `Nearby`; the review fixes added the ref cleanup and the stricter tests' support code.)

## Copy for owner confirmation

| String                                                                                                                                                                 | Status    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| "Location is turned off. Search for a place instead." (place search available)                                                                                         | unchanged |
| "Location is turned off. Pick a station instead." (place search unavailable)                                                                                           | new       |
| "Your position could not be found. Search for a place instead." (available)                                                                                            | unchanged |
| "Your position could not be found. Pick a station instead." (unavailable)                                                                                              | new       |
| "Your device found your position only roughly, with an error of {size}. The nearest station could be wrong, so none is shown. Search for a place instead." (available) | unchanged |
| "Your device found your position only roughly, with an error of {size}. The nearest station could be wrong, so none is shown. Pick a station instead." (unavailable)   | new       |
| "Your device could not say how precisely it found your position. The nearest station could be wrong, so none is shown. Search for a place instead." (available)        | unchanged |
| "Your device could not say how precisely it found your position. The nearest station could be wrong, so none is shown. Pick a station instead." (unavailable)          | new       |

"Pick a station instead." is the ticket's wording and the ending the handoff-derived place-search notices already use (METRO-114). No existing string was reworded; the four "Search" forms are kept as they were and now show only while place search is available.

## Existing test edits, with reasons

- `NearestStation.test.tsx`: every `copy.denied`, `copy.unavailable`, `copy.roughUnknown` and `copy.roughKnown(...)` reference became the `.search` form (these tests run with place search available, so the asserted text is byte-identical to before); the one test with Maps unavailable ("denied with Maps unavailable has no action") now asserts the `.pick` form, which is the point of the ticket. Nothing was loosened.
- `e2e/place-search.e2e.ts`: the group name in "the failure with the location notice open: the search action is left out" changed from "...Search for a place instead." to "...Pick a station instead.", because the old test asserted the exact contradiction this ticket removes. The assertions that the action is absent and Try again is focused are unchanged.
- `e2e/location.e2e.ts`, `e2e/nearest-station.e2e.ts`: not edited; their notices show with place search available, whose text is unchanged.

## Decisions and deviations

- The notice is a labelled group, not a live region, so a step that changes under the `online` event is not announced by it. The place-search status notice (a live region) changes in the same render. Whether a screen reader users hears enough is Unverified; no change was made to roles (out of scope).
- The focus-recovery effect keys on place search going away only, not on a notice appearing, so a late outcome never takes focus because of it.
- Screen reader: an announcement of the changed step was evaluated and not added. The status region about place search already announces when it fills, and a second announcement of the same change would double up; so the changed notice text stays Unverified (below).
- The handoff (`docs/design/handoff/interactions.md`) lists only the "Search for a place instead." forms. That file is frozen reference, and the README of the handoff already records where decisions differ from it, so neither was edited. The decision (a notice never points at an unavailable action) wins over the handoff; the handoff states the available case, which is unchanged.
- The copy guard covers `features/nearest-station/copy.ts` and `features/station-picker/copy.ts` only; the slice spec says so.
- The spec's "Maps or Places failure" row quoted "Place search is unavailable. You can still use your location." (pre-existing drift); it now matches the shipped `searchUnavailable`.
- No Plane change, no new dependency, no gate change.

## Verification record

Run under `mise exec --` (Bun 1.4.4, Node 26.13.0) with `MISE_GLOBAL_CONFIG_FILE` set to an empty file:

Final run after the review fixes (head of the pull request): `bun run check` pass (Vitest 52 files, 426 tests, `bun test` 1,380 tests); `bun run build` and `bun run bundle:check` pass (numbers above); `CI=true bun run smoke`, all four projects: 614 passed, 19 skipped, 0 failed. Two earlier full runs after the fixes had failures in files this change does not touch (`location.e2e.ts` axe-per-state in chromium; `line-map.e2e.ts` and `station-picker.e2e.ts` axe) while other agents loaded the machine; those files passed when rerun alone (112 and 4 tests). `NearestStation.test.tsx` also showed an order- and load-dependent failure of changing tests (about 1 run in 10 to 20); the unmodified base showed it too (1 of 10 in a paired run, 0 of 30 in another), so it is declared, not fixed here. The records below are the first pass.

- `bun run check`: pass (Vitest 52 files, 423 tests; `tsc -b` clean; branch coverage gate unchanged), run before the two e2e-only and docs-only commits that follow the code commit.
- `bun run build` and `bun run bundle:check`: pass, numbers above (base measured by restoring `copy.ts` and `NearestStation.tsx` from `061d771`, building, then restoring).
- `CI=true bun run smoke` (all four projects): 610 passed, 19 skipped, 0 failed, on the final commit. An earlier full run had three failures: two were my new specs running axe while a notice was still rising in (fixed by settling first, commit "settle the notice before axe"); one was `location.e2e.ts` "every state passes axe" in WebKit timing out at 30 s under four parallel workers (it passes alone in 12 to 15 s and passed in the later full run; an existing load-sensitive test, not edited).
- Port 4173 was held by other agents' servers at times; runs waited for it to be free and never touched another process.
- Not run: `smoke:live` (real Google, owner-run), manual screen-reader checks, `bun run scan` (no dependency or secret change), the CI workflow itself.

## Unverified

- Real screen-reader output of the changed notice text and of the focus move when the action leaves.
- Real-browser behavior of a connection dropping while a notice shows: the hook listens for `online` only (METRO-114), so going without a connection is seen at the next render.
- The wording of the four new strings is the agent's, from the ticket's "Pick a station instead."; the owner has not confirmed it.

## Review dispositions

Reviewer: the `independent-reviewer` agent, session aa942ed0296298a43, run after the pull request opened (head `2d32c40`). No Critical findings.

| Finding                                                                                                    | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Important 1: `docs/agents/ui.md` at exactly 6,144 bytes with a pointer line nobody needs                   | Fixed. The pointer line is dropped; `ui.md` is byte-identical to the base (6,044 bytes, LF, no drift under `.gitattributes`).                                                                                                                                                                                                                                                                                                                                                                                   |
| Important 2: the last e2e claims "the notice keeps focus" but focuses the plain input and asserts no focus | Fixed. The e2e now focuses the field once (which starts a Maps load that fails 2.5 s later), presses "Use my location" so the notice's "Search for a place" action takes real focus, waits for the failure and asserts the notice is focused. A counterpart blurs to the page first and asserts the notice does not take focus. Mutation check: with the recovery effect disabled, the unit test and the e2e (chromium) fail and the page-focus counterpart still passes; with it restored all 4 projects pass. |
| Minor 3: the recovery fired whenever availability went false with focus on the body                        | Fixed. A ref records, in the action's ref cleanup (run before the node leaves the page), that the action had focus. A first attempt with focus and blur handlers failed in every browser because the browser's own blur on removal reset the flag; the cleanup approach replaced it. Unit and e2e tests cover focus on the action (notice takes focus) and focus on the page (no steal).                                                                                                                        |
| Minor 4: the copy guard was narrow                                                                         | Fixed. The guard now fails any plain string that mentions search outside a named allowlist, any object that is not `{ search, pick }`, runs functions with string and number arguments, scans `station-picker/copy.ts` as well, and carries a self-check. Its scope (those two files) is stated in the spec.                                                                                                                                                                                                    |
| Minor 5: spec drift in the states table; handoff lists only the Search forms                               | Fixed in the spec: the "Maps or Places failure" row quotes the shipped `searchUnavailable`; the States note and a new sentence give the Pick forms. The handoff is frozen and not edited; the decision wins over it (see Decisions).                                                                                                                                                                                                                                                                            |
| Minor 6: screen reader behaviour of the changed text                                                       | Declared. An extra announcement was evaluated and not added, because the status region about place search already announces and a second announcement could double up. Unverified with a real screen reader.                                                                                                                                                                                                                                                                                                    |
