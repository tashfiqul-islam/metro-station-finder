# METRO-124: "Use my location" does nothing while the station list is open

Labels: **Repo-verified** (run or read in this worktree this session, command given), **Inferred** (reasoned, not run), **Unverified** (not run). Base: `origin/feature/metro-rebuild` at `8fb5b8f` for the first commit `a1e7a01`; the follow-up commit merges `f6de564`. Machine: Windows 11; Playwright webkit and chromium; stubbed geolocation and stubbed Maps (no Google call, no real position).

## Cause

- Repo-verified: it is not WebKit-only. A temporary Playwright spec (typed "mir", pressed the button, logged events and `scrollTop`; run with `CI=true bun run smoke e2e/zz-repro.e2e.ts --project=webkit --project=chromium`, then deleted) failed the same way in both browsers.
- Repo-verified: typing opens the list and `scrollIntoView({block:"nearest"})` scrolls `.panel__scroll` by 91 px (`scrollTop=91, scrollHeight=723, clientHeight=632`).
- Repo-verified: the press blurs the input at mousedown; `onBlur` closed the list at once; the content shrank, the scroll clamped to 0 and the button moved from y=142 to y=233 between mousedown and mouseup.
- Repo-verified: event log of the failed press: `pointerdown`, `mousedown` on `locate__title`, `blur combo__input`, `pointerup`, `mouseup` on `ns-lede`, `click` on `panel__body`. Pressing Escape first closed the list with no pointer down, so a second press worked.

## Fix

`apps/web/src/features/station-picker/StationCombobox.tsx` (Repo-verified, read): a blur that arrives while a pointer press is in progress no longer closes the list; the close runs when the press ends (`mouseup`, `pointercancel`, or a `keydown`). Modifier keys (Shift, Control, Alt, Meta, AltGraph, CapsLock, Fn) do not end the press. A blur with no press in progress closes at once. Refocusing the input cancels the pending close. Document-level capture listeners; no timers.

- Repo-verified: keyboard behaviour is unchanged. The existing METRO-112 keyboard tests in `StationPicker.test.tsx` (ArrowDown/ArrowUp wrap, Enter, Escape twice, Home/End, "leaving the input closes the list") pass unedited under `bun run test:vitest`, and the keys e2e passes on webkit and chromium.
- Inferred: on real touch the order is pointerdown, synthesized mousedown (blur), mouseup, so the same flag covers it.
- Unverified: real iPhone Safari (owner, METRO-121).

## Known and bounded: a stuck press flag

Repo-verified (Vitest case "known and bounded"): if a `pointerdown` is never followed by a `mouseup`, `pointercancel` or `keydown` (inferred cause: a touch tap on a non-clickable area that the browser sends no mouse events for), a later blur from another cause leaves the list open (`aria-expanded=true`) until the next mouseup, key or cancel. The next press or key clears it, so it is bounded by the next user input. No timer is added.

## Other buttons next to the list

- Repo-verified: "Clear station search" had the same defect (the new e2e failed before the fix); the same change fixes it.
- Repo-verified (read): "Browse all" and the result's "Show on map" are not rendered with the list open.

## Tests and proof

- Repo-verified, before the fix (`CI=true bun run smoke -g METRO-124 --project=webkit --project=chromium`, with the fix reverted): 4 failed (locate and clear, each browser).
- Repo-verified, after: the same command passes.
- Repo-verified: `CI=true bun run smoke --workers=3 e2e/location.e2e.ts e2e/station-picker.e2e.ts e2e/nearest-station.e2e.ts e2e/accessibility.e2e.ts --project=webkit --project=chromium`: 171 passed.
- Repo-verified: `bun run check` passed (Vitest 100 percent statements, branches, functions and lines). Vitest cases for METRO-124 live in `StationPicker.test.tsx`; e2e in `location.e2e.ts` and `station-picker.e2e.ts`.

## Bundle

Repo-verified (`bun run build`, `bun run bundle:check`, re-run after the modifier change): first-visit JS 235,875 raw / 74,375 gzip (budget 250,000 / 80,000); CSS 14,125 / 3,965 (budget 20,000 / 6,000). The picker is in the lazy Nearby chunk, so the first-visit numbers did not move.

## Not run

Firefox and mobile-chrome runs of the new e2e; real iPhone Safari (Unverified).
