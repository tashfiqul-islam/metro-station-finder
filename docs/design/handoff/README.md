# Design handoff (frozen snapshot)

DO NOT EDIT. This folder is a frozen snapshot of the owner's design handoff, a visual and behavioural reference for the Metro Station Finder interface. It is reference only: nothing here is shipped, imported or built into the app, and the files are kept exactly as delivered. A design change means a new snapshot: replace the folder wholesale and add a dated entry under Snapshots below. Never hand-edit a file here.

This is not an agent guide, so the 6,144-byte guide cap does not apply. It is not a station data source: `packages/core/src/stations/dataset.ts` is unchanged, and the coordinates in `handoff.md` are public station or mock values.

How the repository tools treat the folder (pinned by `scripts/design-handoff.test.ts`):

- Configured ignore: the formatter (`.oxfmtrc.json` `ignorePatterns`). `.gitattributes` also marks the folder `-text` and the font files `binary`, so git never rewrites line endings.
- Not scoped to docs, so they never read it: the linter, knip, dependency-cruiser, the css-rules guard and the bundle gate.
- They do read it: the links check and the docs-structure check (its Markdown files and the map row in `docs/README.md`), and the secret scan, which covers the git index.

## Snapshots

- 2026-11-08: handoff package delivered by the owner (folder `metro-station-finder-handoff/handoff`), committed by METRO-110.

## Source

- Per the owner (owner-stated; the files themselves do not record it): the owner's Claude design canvas, artifact https://claude.ai/artifact/1i2mTJdicAzJU82y8YQMLR, and the prototype export "Metro Station Finder Redesign – Metro Station Finder.html".
- The handoff package delivered 2026-11-08 (the folder this snapshot copies).
- Canvas version, per the owner on 2026-11-09 (owner-stated, not checkable from the files): Version 12, version id 1794155130-5195, the publish labelled "Handoff, brand assets, animated logo". The only later change on the owner's side was shrinking the PNGs in `monorepo/`, which is excluded here, so this snapshot matches that version.

## Contents

- `index.html` is the gallery. Open it, or any file in `screens/`, in a browser to compare against the app, styled.
- `screens/` holds 56 static states, light and dark (`<state>.<light|dark>.html`). Most of them link a favicon at `../monorepo/apps/web/public/favicon.svg`. Repo-verified: that folder is not copied, so the link resolves to nothing. Unverified: the exact browser behaviour, expected to be a missing icon only.
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

- Bangla switch: `handoff.md` already removes it (English and km/m only) but keeps a deferred "Later: Bangla" section and a taka-sign (৳) fallback question. Neither is a live requirement.
- Router and four-tab navigation: the screens show four section tabs; the app defers the router and the four-tab navigation.
- Sheet handle row: `handoff.md` describes the decorative grip as a 72 × 32 button in a 32 px row and flags a 44 px row as recommended. The repo decision is 44 px.
- Shortcut hint: `handoff.md` says the shortcut reads "Ctrl K" and shows "⌘K" only on Apple platforms. The repo decision is that the hint shows both keys.
- Places: hidden when unavailable (repo decision; the handoff has a place-unavailable state).
- Offline claims: wait for METRO-106.
