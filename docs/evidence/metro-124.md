# METRO-124: "Use my location" does nothing while the station list is open

Labels: **Repo-verified** (measured in this worktree), **Inferred**, **Unverified**. Base: `origin/feature/metro-rebuild` at `8fb5b8f`. Machine: Windows 11, Playwright WebKit and Chromium, stubbed geolocation and stubbed Maps (no Google call, no real position).

## Cause (Repo-verified)

It is not WebKit-only: the same press fails in Playwright Chromium at the default desktop viewport. The ticket's guess (blur plus a shifting layout) was right, the mechanism is scroll clamping:

1. Typing opens the list; `StationCombobox` calls `scrollIntoView({ block: "nearest" })` on the picker, so `.panel__scroll` scrolls by 91 px (`scrollTop=91, scrollHeight=723, clientHeight=632`).
2. A pointer press on "Use my location" blurs the input at mousedown. `onBlur` closed the list at once.
3. The content got 91 px shorter, the scroll position clamped to 0 and the button moved from y=142 to y=233 between mousedown and mouseup.
4. Event log of the failing press (both browsers): `pointerdown/mousedown` on `locate__title`, `blur combo__input`, then `pointerup/mouseup` on `ns-lede` and `click` on `panel__body`. The click never reached the button.

Pressing Escape first closed the list without a pointer down, so the second press worked, as the ticket said.

## Fix

`apps/web/src/features/station-picker/StationCombobox.tsx`: a blur that arrives while a pointer press is in progress no longer closes the list; the close runs when the press ends (`mouseup`, `pointercancel`, or a `keydown`). A blur with no press (Tab, programmatic focus) closes at once, as before. Refocusing the input cancels the pending close. Document-level capture listeners, no timers. Keyboard behaviour and focus handling are unchanged. The press sequence of touch (pointerdown, then the synthesized mousedown that blurs, then mouseup) is covered by the same flag (Inferred; real iPhone/Safari is Unverified and belongs to METRO-121).

## Other buttons next to the list (Repo-verified)

The "Clear station search" button had the same defect (same blur, same scroll clamp): a press with the list open did not clear the text. It is fixed by the same change and has its own e2e. Browse all and Show on map are not next to an open list (the empty state and the result only exist when the list is closed).

## Tests

- Vitest (`StationPicker.test.tsx`): three METRO-124 tests (list kept until mouseup, pointercancel and keydown end the wait, press without blur or after refocus leaves the list).
- Playwright `location.e2e.ts` and `station-picker.e2e.ts`: one METRO-124 test each (locate press with the list open sees the locating state; clear press empties the field), run on chromium and webkit.
- Before the fix: `bun run smoke -g METRO-124 --project=webkit --project=chromium` with `CI=true`: 4 failed (locate and clear, each browser; `Finding your position` not found, `toHaveValue("")` failed). After: all pass.
- After: location, station-picker, nearest-station and accessibility specs on webkit and chromium: 171 passed.
- `bun run check` passed; Vitest 100 percent statements, branches, functions and lines.

## Bundle

First-visit JS 235,875 raw / 74,375 gzip (budget 250,000 / 80,000); CSS 14,125 / 3,965 (budget 20,000 / 6,000). No limit changed.

## Not run

Firefox and mobile-chrome e2e of the new tests; real iPhone Safari (Unverified, METRO-121).
