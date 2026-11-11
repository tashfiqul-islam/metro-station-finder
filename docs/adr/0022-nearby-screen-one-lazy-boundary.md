# ADR-0022: Load the whole Nearby screen as one lazy boundary, and build the station picker as a WAI-ARIA combobox

- Status: Proposed (the owner accepts by merging)
- Date: 2026-11-09
- Ticket and specification: METRO-112 (Plane), parent METRO-109; the ticket description and the owner decisions of 2026-11-09 are the contract.

> Amendment 2026-11-11 (METRO-117, decision unchanged): `picker-icons.ts`, `location-icons.ts` and `control-icons.ts` (and their drift tests) are gone; each icon is its own module in `icons/shapes/`, so a lazy chunk imports its icons without pulling an entry export, and "importing from `icon-data.ts`" is no longer a thing (that file is deleted). `common.css`, `nearby.css` and `route.css` are split by component; the `.tag--sample` rule stays removed.

## Context

- Repo-verified (METRO-111 evidence, `docs/evidence/metro-111.md`): the first visit had 338 raw and 1,865 gzip bytes of headroom against 250,000 / 80,000 after the line map, and the map's own lazy loader cost about 300 raw bytes of the entry. Slices 2 to 4 must add a picker, a location flow and more Google code without raising a limit (ADR-0020).
- Repo-verified: the shell (`AppShell`) is in the entry, so the map slot is filled from outside the shell. Before this change the map was a second `lazyFeature` in `AppRoutes.tsx`.
- Context7-verified (W3C APG, `/w3c/aria-practices`, combobox pattern and its list-autocomplete example): DOM focus stays on the input and the active option is named by `aria-activedescendant`; Down and Up Arrow move through the options and wrap; Enter accepts the active option; Escape closes the popup and, if it is already closed, may clear the text; Home and End move the caret and, with Left and Right, return visual focus to the textbox.
- Repo-verified (handoff `interactions.md`): "Station combobox" lists the same keys and a no-match state with "Browse all 16 stations" that stays reachable after blur.

## Decision

We will load the Nearby screen (the nearest-station page, the Maps adapter, the schematic line map and the station picker) through one `lazyFeature` boundary in `AppRoutes.tsx`.

- The shell stays in the entry. `AppRoutes` holds the map element in state and passes `setMap` to the lazy screen as its only prop; the screen calls it from an effect (the line map, with the picked station highlighted) and clears it on unmount. One load announces one status ("Loading this part of the page."); the map no longer needs a silent loader of its own.
- The picker lives in `features/station-picker/` and is a prop-free feature of the screen: `features/nearby/Nearby.tsx` composes it. `NearestStation` gains one optional `after` slot (content between the location controls and its result). The existing copy, roles and keyboard order of the nearest-station page are unchanged; the picker follows the location controls and the search, and the handoff's order (Use my location first) is the location slice's change (METRO-113).
- Combobox: the popup is always in the DOM (so `aria-controls` is always valid) and shows options only while expanded. Typing makes the first option active. Escape closes the list first, then clears the text. Home, End, Left and Right release the active option and leave the caret to the browser. The one polite status is an `output`: it holds the count after typing or the no-match text and is empty when the text is cleared or a station is picked. The "Browse all" button is a sibling outside the live region, so it stays reachable after blur. Keys pressed while an input method composes are ignored. Matching ignores case, spaces and hyphens and also matches aliases (the matched part of a name is wrapped).
- Sheet rules for this flow: typing, an ArrowDown or ArrowUp that opens the list, and "Browse all" open the sheet to full and scroll the field to the top of the panel, so the suggestions below it are in view and the list scrolls inside itself (`max-height`, `overflow-y: auto`); a pick settles the sheet at half; "Show on map" drops it to peek and moves focus to the map.
- A pick has no user position: the result is the station, its place on the line, the fare range from `packages/core`, the footnote built from `datasetProvenance.fares`, the Directions link and "Show on map". It has no distance, no walk, no Routes request, no Also-nearby, no pass price. The Directions URL carries only `api=1` and the station's public coordinates, and no travel mode (a mode would suggest a walk).
- The map is drawn in the shell, outside the screen's tree, so it sits in its own `MapBoundary` (a contained message and Reload); when the screen's chunk fails to load, no map frame is drawn.
- The picker makes no offline claim in its copy: the offline cache is METRO-106. The data and the map are local, so the picker needs no network once the screen has loaded.
- The icons the picker uses live in `picker-icons.ts` in the lazy chunk, as `control-icons.ts` does for the map, because importing them from `icon-data.ts` puts them in the entry. `picker-icons.test.ts` fails if a shape drifts.
- The mockups' "Sample data" tag never ships: the `.tag--sample` rule is removed from `common.css`, `scripts/no-mock-markers.test.ts` scans the shipped sources and `e2e/station-picker.e2e.ts` scans the built files.

## Consequences

- Easier: later slices add parts to one screen with one loader. The entry fell by 113 raw bytes against the METRO-111 head (see `docs/evidence/metro-112.md`).
- A lazy chunk that imports an export of an entry module can pull it into the entry: the picker's `useSheet` import cost the entry 110 raw bytes (A/B build in `docs/evidence/metro-112.md`). Measure the entry after such an import.
- Harder: the screen and the map now load or fail together (one Reload region instead of two). The shell's map frame is empty until the screen has loaded; the map arrives one commit after the page, in the same task.
- The page loads two stylesheets (entry and screen) instead of three; `headers.e2e.ts` and `nearest-station.e2e.ts` pin two.
- The Nearby CSS chunk was 47.7 KB raw because it carried whole handoff files (`common.css`, `nearby.css`, `route.css`) for the few components the screen uses; METRO-117 split them per component and each file imports only what it draws (`docs/evidence/metro-117.md`).
- The mono font is fetched the first time it is drawn (the result's eyebrow); a first-ever use of the picker while offline shows the system mono font until the offline cache of METRO-106 holds the file.
- Two results can show together (a located nearest station and a picked station); METRO-113 makes the current result single (a new pick replaces a location result and the reverse).
- Unverified: screen readers (NVDA, VoiceOver) reading the combobox, the status region and the focus move to the result heading.

## Alternatives considered

- A context slot in the entry that the screen fills: rejected, a context costs entry bytes that a plain state and prop do not.
- One lazy loader per part (page, map, picker): rejected, each loader costs entry bytes and each adds a status or a failure region.
- Importing icons from `icon-data.ts`: rejected, measured in METRO-111 to move them into the entry.
- Pointing "Browse all 16 stations" at a Line screen as the handoff does: not possible, there is no router or Line screen yet; it lists all stations in the popup.
- A native `select` or `datalist`: rejected, no match wrapping, no alias match, no roundel and no control over the empty state.

## Confirmation

- `apps/web/src/features/station-picker/*.test.ts(x)`, `apps/web/src/features/nearby/Nearby.test.tsx`: roles, names, keys, focus, sheet rules, the result's content, the Directions URL and the absence of distance and walk words.
- `e2e/station-picker.e2e.ts`: the same in the built app, tab order, axe in light and dark, reduced motion with a control, no inline style, offline with a listener attached before load, the list on top and scrolling inside itself at full, and the built files free of the mock markers.
- `scripts/no-mock-markers.test.ts`: no "Sample data", `mock-only` or `tag--sample` in the shipped sources, with a control.
- `bun run bundle:check`: the first-visit limits.
