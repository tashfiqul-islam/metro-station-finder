# Design handoff (frozen snapshot)

DO NOT EDIT. This folder is a frozen snapshot of the owner's design handoff, a visual and behavioural reference for the Metro Station Finder interface. It is reference only: nothing here is shipped, imported or built into the app, and the files are kept exactly as delivered. A design change means a new snapshot: replace the folder wholesale and add a dated entry under Snapshots below. Never hand-edit a file here.

The folder is excluded from the repository gates (formatter, linter, knip, bundle) and is not an agent guide, so the 6,144-byte guide cap does not apply.

## Snapshots

- 2026-11-08: handoff package delivered by the owner (folder `metro-station-finder-handoff/handoff`), committed by METRO-110.

## Source

- The owner's Claude design canvas, artifact https://claude.ai/artifact/1i2mTJdicAzJU82y8YQMLR.
- The prototype export "Metro Station Finder Redesign – Metro Station Finder.html".
- The handoff package delivered 2026-11-08.
- The exact canvas version is not recorded in the files. Unverified: the owner can add it.

## Contents

- `index.html` is the gallery. Open it, or any file in `screens/`, in a browser to compare against the app, styled.
- `screens/` holds 56 static states, light and dark (`<state>.<light|dark>.html`). Their favicon link points into `monorepo/`, which is not copied; the icon simply does not load.
- `handoff.md` is the design handoff. `interactions.md` is the interaction notes.
- `tokens.css`, `base.css`, `components.css`, `fonts.css` and `gallery.css` are the styles the screens and gallery use. `fonts/` holds the two font files and their licence text. `icons/` holds the icon sources. `theme-boot.js` is the gallery's theme script.
- `theme-boot.js` and `index.html` here are reference copies. The real ones are `apps/web/public/theme-boot.js` and `apps/web/index.html`; no test or build reads these.

## What the repo has replaced

Read the code for current behaviour.

- Tokens, base and components: `apps/web/src/styles`.
- Fonts and icons: `apps/web/src`.
- Brand assets: `apps/web/public` and `apps/web/brand`.

Not copied: the handoff's `monorepo/` folder.

## Never ship

The `.mock-only` "Sample data" tag and the mock numbers (fares, distances, times, counts) exist only in the mockups. They must never ship.

## Where the handoff disagrees with later owner decisions

The decision wins over the handoff text:

- Bangla switch: removed. The app is English only.
- Router and four-tab navigation: deferred.
- Sheet handle row: 44 px.
- Shortcut hint: shows both keys.
- Places: hidden when unavailable.
- Offline claims: wait for METRO-106.
