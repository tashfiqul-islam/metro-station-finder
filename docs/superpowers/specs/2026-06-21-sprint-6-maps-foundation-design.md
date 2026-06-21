# Sprint 6 — Maps Foundation Design Spec

**Date:** 2026-06-21  
**Status:** Draft for review  
**Scope:** Sprint 6 only — SSR-safe map foundation for `/station-finder` with 17 MRT-6 station markers, static line rendering, offline-safe preview behavior, and verification gates

---

## 1. Context & Goal

Sprint 6 is the first map-bearing vertical slice in Metro Station Finder v1. The repo already has:

- a static, prerendered TanStack Start shell
- validated MRT-6 station data in `src/data/stations.ts`
- static MRT-6 line geometry in `src/data/mrt6-line.geojson` / `src/data/mrt6-line.ts`
- a preview route at `/station-finder`

It does **not** yet have a browser-safe map integration. The primary Sprint 6 risk is SSR/prerender failure because `maplibre-gl` touches `window` at import time.

This sprint's job is to establish a production-safe map foundation without leaking browser-only imports into prerender, while keeping the implementation small enough that Sprint 7 can layer real station-finder behavior on top without rewriting the map stack.

**Outcome:** Visiting `/station-finder` should show a real interactive map with the MRT-6 corridor and all 17 station markers. The page must prerender successfully, must not crash offline, and must keep the map stack code-split away from the main entry.

---

## 2. Research Basis

This spec is based on current repo state plus current official docs and current public docs for the map stack.

### Repo-verified inputs

- TanStack Start app with prerender enabled in `vite.config.ts`
- React 19 app runtime
- Vite 8 / Rolldown build pipeline
- `@mapcn` registry already configured in `components.json`
- `station-finder` route currently exists as a preview route
- `stations.ts` and `mrt6-line.ts` are already present and tested

### Current-doc inputs

- **TanStack Start:** browser-only dependencies must stay out of SSR import paths; prerendered routes still need static-safe component trees
- **React 19:** `lazy` and `Suspense` are the correct primitives for browser-only chunk boundaries; React resource preloading APIs exist, but in this stack a shared speculative `import()` warm path is the safer concrete mechanism than hard-coding a source-module URL string
- **mapcn:** copy-paste owned component model, `Map`, `MapMarker`, `MarkerPopup`, `MapRoute`, `MapControls`, and `useMap` are first-class; raw MapLibre access is intentionally supported
- **MapLibre GL JS:** GeoJSON sources and line layers are the correct primitive for the corridor layer; cleanup of sources/layers must be explicit
- **Vite 8:** dynamic imports already create separate chunks; explicit chunk grouping is available but should only be added if natural splitting is insufficient

---

## 3. Scope

### In scope

1. Install and own the `@mapcn/map` component source under `src/components/ui/map.tsx`
2. Add an SSR-safe `MapCanvas` wrapper that never imports browser-only map code during prerender
3. Render the MRT-6 line on the map from the committed static GeoJSON
4. Render all 17 stations as interactive markers with visible popup metadata
5. Replace the current `/station-finder` placeholder with a real map preview page
6. Add route-entry map chunk warming for smoother navigation into `/station-finder`
7. Add integration and E2E coverage for prerender safety, markers, popup interaction, and offline behavior
8. Verify map stack code is lazy-split from the main route entry

### Allowed enabling fixes

Small enabling fixes are allowed only if they directly unblock Sprint 6 completion. Examples:

- route wiring updates required for the new preview page
- build or prerender config adjustments required to keep map code out of SSR
- test harness fixes required to support map smoke tests
- DX or chunk-analysis adjustments required to prove map code separation

These fixes are allowed only if they are:

- tightly scoped
- directly caused by Sprint 6 requirements
- not a general cleanup or unrelated refactor

### Out of scope

Sprint 6 does **not** include:

- geolocation
- nearest-station logic in the UI
- user location marker
- walking routes
- ORS server functions
- fare/trip calculations in the route UI
- clustering or high-density marker rendering
- custom tile hosting fallback
- per-station pages
- PWA caching of map tiles

Those belong to later sprints.

---

## 4. Product Requirements

### Route behavior

The `/station-finder` page becomes a polished preview page with a live MRT-6 map as the centerpiece.

The route must:

- prerender successfully without crashing build
- render a visible, non-broken fallback in prerendered HTML
- hydrate into a real interactive map in the browser
- display the full MRT-6 corridor as a colored line
- display all 17 stations as clickable markers
- open a popup with station name and slug when a marker is clicked
- show an offline-safe overlay when the browser is offline
- avoid throwing if map tiles fail to load

### Default viewport

The default view must optimize for immediate corridor readability, not a generic city center.

Requirements:

- initial viewport must show the whole MRT-6 corridor comfortably on first render
- the map should fit the line rather than relying on a hard-coded city-center zoom alone
- station markers and line must be visible without manual panning on a common laptop viewport
- mobile must still show a usable corridor view without clipping the entire line off-screen

### Offline behavior

If the browser is offline:

- the map page must still render
- the route must show an explicit overlay such as `Offline — map unavailable`
- station metadata outside the tile canvas remains available to the page runtime
- the route must not crash due to failed map/tile network requests
- the map shell may skip mounting the live `Map` instance entirely while offline if that is the most reliable way to prevent browser/runtime noise

This is graceful degradation, not true offline map support yet.

---

## 5. Architecture Decision

### Chosen approach

Use **mapcn as the owned map primitive**, but isolate it inside a **client-only lazy boundary** and keep the feature screen itself colocated under `src/features/station-finder/`.

This means:

- `src/components/ui/map.tsx` is generated via `bunx --bun shadcn@latest add @mapcn/map`
- app routes do **not** import `maplibre-gl` directly
- `src/routes/station-finder.tsx` remains the route-registration file and imports a feature-level screen component from `src/features/station-finder/route.tsx`
- the feature-level screen imports `MapCanvas`, not `Map` from mapcn directly
- `MapCanvas` lazily loads the actual map implementation from a browser-only module
- station markers use mapcn DOM markers because the dataset is only 17 points
- the MRT-6 corridor uses a GeoJSON source + raw MapLibre line layer driven through `useMap`
- map warming uses a shared speculative `import()` helper tied to the same lazy module loader used by `React.lazy`

### Why this approach

This gives the best balance of:

- SSR safety
- minimal code surface
- ownership of generated map source
- clean future extension into Sprint 7 and Sprint 9
- low cognitive overhead for a small point dataset

### Rejected alternatives

#### Fully custom MapLibre integration

Rejected because it reimplements the exact wrapper layer that mapcn already provides and increases Sprint 6 surface area unnecessarily.

#### Layer-based point rendering from day one

Rejected for Sprint 6 because the dataset is only 17 points, and mapcn's DOM markers are simpler, clearer, and sufficient. Layer-based point rendering remains a future option only if scale changes.

#### Explicit Vite code-splitting groups from day one

Rejected as a default. Vite 8 already splits on dynamic imports. Explicit grouping is only justified if bundle analysis shows the map stack merged into a main route chunk unexpectedly.

---

## 6. SSR / Prerender Strategy

This is the most important part of Sprint 6.

### Hard rule

No file imported by a prerendered route may directly import a module that touches `window` at module scope.

### Required structure

The map stack must be split into two layers:

#### Layer A — prerender-safe shell

`src/components/common/map-canvas.tsx`

Responsibilities:

- safe to import from any route during SSR/prerender
- exports the component routes will use
- renders a skeleton/fallback while the client-only map implementation is loading
- renders a safe non-crashing fallback during prerender and non-browser execution
- may decide whether to render the offline overlay shell
- owns `Suspense`

This file must **not** import `maplibre-gl` or any module that transitively imports it at top level.

#### Layer B — client-only map implementation

`src/components/common/map-canvas-client.tsx`

Responsibilities:

- imports `Map` and related mapcn pieces
- builds the actual rendered map tree
- may use `navigator.onLine`, refs, effects, and other browser-only APIs
- hosts child overlay/layer components

This file may be lazy-loaded and browser-only.

### Required rendering states

`MapCanvas` must support these states explicitly:

1. **Prerender / SSR**: render a visible skeleton container, not null, not crash
2. **Client loading**: render the same skeleton while the lazy chunk resolves
3. **Client online**: render the real map
4. **Client offline**: render the map shell container plus a visible offline overlay

### Error boundary requirement

If the lazy map subtree throws during client boot, the user must still see a stable fallback shell instead of a broken route.

This is a local map-boundary concern, not a global app error boundary.

---

## 7. File Structure & Responsibilities

### New files

#### `src/components/common/map-canvas.tsx`

Prerender-safe wrapper.

#### `src/components/common/map-canvas-client.tsx`

Actual client-rendered map implementation.

#### `src/features/station-finder/route.tsx`

Feature-level screen for the route. This file owns page composition for the preview map page, while file-based route registration stays in `src/routes/station-finder.tsx`.

#### `src/features/station-finder/components/station-markers.tsx`

Maps station dataset to 17 `MapMarker` nodes.

#### `src/features/station-finder/components/metro-line-layer.tsx`

Adds/removes the static MRT-6 line as a GeoJSON source and line layer through `useMap`.

#### `tests/integration/map-canvas.test.tsx`

Prerender-safe shell and client fallback behavior.

#### `tests/e2e/map-smoke.spec.ts`

Map route smoke coverage.

### Modified files

#### `src/routes/station-finder.tsx`

Keep route registration + `head()` metadata only. Replace generic preview usage with the imported feature-level screen.

#### `src/pages/home/sections/hero-section.tsx`

Add a shared warm-import hint for the station-finder map chunk if the hero still hosts the main CTA to `/station-finder`.

If hero is no longer the right place for that warm hint, the warm helper may instead live on whichever existing entry link most directly sends users into `/station-finder`.

#### `vite.config.ts`

Modify only if Sprint 6 verification proves natural lazy splitting is insufficient or prerender behavior needs a narrowly scoped build adjustment.

---

## 8. Component Contracts

### `MapCanvas`

Public API must stay small.

Required props:

- `children?: ReactNode`
- `className?: string`
- optional viewport/style props only if needed by the station-finder route immediately

Required exports:

- default `MapCanvas` component
- a named warm helper such as `warmMapCanvas()` that reuses the same dynamic import loader as the lazy component

Non-goals for Sprint 6:

- do not prematurely design a full reusable map framework API
- do not add speculative props for future route features without immediate use

### `StationMarkers`

Responsibilities:

- consume canonical station data
- render exactly 17 markers
- assign `data-testid="station-marker-${slug}"`
- provide popup metadata with station name and slug

Marker visuals should be simple, legible, and consistent with the existing design system.

### `MetroLineLayer`

Responsibilities:

- wait for map readiness
- add one source for MRT-6 line geometry
- add one line layer for corridor rendering
- clean up line layer and source on unmount
- avoid duplicate source/layer registration during remount/HMR

The layer must be static data driven. No route fetching.

---

## 9. Map Rendering Decisions

### Tile/style choice

Use OpenFreeMap-compatible style URLs through mapcn's `styles` prop or defaults.

Sprint 6 does not need to invent a custom tile abstraction. It only needs:

- a stable light and dark compatible map style
- no client secret
- acceptable visual readability for line + markers

### Marker strategy

Use mapcn `MapMarker` DOM markers because:

- dataset size is tiny
- popup composition is easier
- accessibility and test targeting are simpler

### Line strategy

Use raw GeoJSON source + line layer through `useMap`, not a manually clipped route and not a fetched route.

Reason:

- the MRT-6 corridor is static
- source already exists in repo
- this is the correct primitive for future trip-planner reuse

### Initial viewport behavior

The live map must not depend on a brittle hand-authored default center/zoom alone.

Requirements:

- once the map is loaded, it must fit to the MRT-6 corridor bounds on first render
- fit behavior should happen once per mount, not on every render
- padding should be responsive so the corridor is readable on both mobile and desktop
- a static initial center/zoom is acceptable only as a short-lived shell state before `fitBounds` runs

### Controls

Sprint 6 may show a light set of map controls only if they improve UX without clutter. Safe default:

- zoom controls: yes
- compass: optional
- locate/fullscreen: no for Sprint 6 preview unless it materially helps the preview route

---

## 10. Data Flow

### Station markers

`stations.ts` → `StationMarkers` → `MapMarker` / `MarkerPopup`

No transformations beyond marker shape and popup text.

### Corridor line

`mrt6-line.ts` → `MetroLineLayer` → GeoJSON source → line layer

No clipping, no fetching, no external API.

### Route page

`src/routes/station-finder.tsx` → `src/features/station-finder/route.tsx` → `MapCanvas` → lazy `MapCanvasClient` → child marker/layer components

### Warm-import hint

Landing-page interaction path → shared `warmMapCanvas()` speculative import → later navigation to `/station-finder`

This is a warm-path enhancement, not a correctness dependency.

---

## 11. UX / Layout Requirements for `/station-finder`

The page should feel like a real preview route, not a temporary stub.

Required layout behavior:

- map is the primary visual focus
- parent container gives the map explicit width and height
- desktop height should feel substantial enough for corridor reading
- mobile height should remain usable without consuming the full page forever
- map container should use existing design-system shell classes where appropriate
- the route should read as a real preview screen, not a generic placeholder card with a map dropped inside it

Recommended supporting content around the map:

- concise heading
- one-line explanation that this is the MRT-6 corridor preview
- optional small metadata row such as station count and route endpoints

Not required:

- complex side panels
- legends beyond what is needed for comprehension
- user-input controls

---

## 12. Testing Strategy

Sprint 6 is high-risk mainly because of SSR and browser-only behavior, so testing must target those risks directly.

### Integration tests

`tests/integration/map-canvas.test.tsx`

Must verify:

1. prerender-safe shell renders without browser map execution
2. skeleton fallback is visible before client map implementation resolves
3. offline overlay state can render without crashing

The integration test should avoid trying to run real MapLibre rendering in jsdom. The goal is wrapper-state correctness, not canvas fidelity.

### E2E tests

`tests/e2e/map-smoke.spec.ts`

Must verify:

1. navigating to `/station-finder` succeeds
2. 17 station markers appear
3. clicking at least one marker opens the correct popup
4. offline reload does not crash and shows the offline overlay

Recommended sample station for popup assertion: `motijheel` or another stable end-of-line station.

### Build verification

Sprint 6 is not done unless `bun run build` proves prerender survives the map route.

Build verification must confirm:

- no SSR crash from map imports
- generated station-finder HTML exists in the output
- prerendered output contains a shell/skeleton rather than a broken empty region or stack trace

---

## 13. Performance & Bundling Requirements

### Required

- map stack must be lazily loaded behind a dynamic import boundary
- `maplibre-gl` must not inflate the main route entry chunk by being eagerly imported from shared route code
- Sprint 6 verification must inspect build output and confirm map code separation

### Preferred

- use a shared speculative `import()` warm helper to warm the lazy map chunk from an existing `/station-finder` entry path

### Not required by default

- explicit Vite `codeSplitting.groups`

Only add explicit grouping if the natural dynamic import boundary fails to isolate the map stack adequately.

---

## 14. Accessibility Requirements

Sprint 6 is map-heavy, but must still meet baseline route accessibility expectations.

Requirements:

- route has a clear heading and descriptive text
- loading fallback is visible and textually meaningful
- offline overlay text is readable and explicit
- marker popup content is understandable, not icon-only
- map shell does not trap keyboard focus or break page navigation

Sprint 6 does not need to fully solve advanced keyboard map navigation; it does need to avoid making the route inaccessible or confusing.

---

## 15. Risks & Mitigations

### Risk 1: SSR crash from transitive browser-only imports

Mitigation:

- isolate all map code behind a lazy client module boundary
- keep route-facing wrapper free of maplibre imports

### Risk 2: HMR/remount duplicates source/layer registration

Mitigation:

- guard `addSource` / `addLayer`
- explicit cleanup on unmount

### Risk 3: Map preview passes locally but pollutes main chunk

Mitigation:

- inspect build output after implementation
- add explicit chunk strategy only if required

### Risk 4: Offline mode still crashes due to tile/style assumptions

Mitigation:

- treat offline overlay as a first-class UI state
- verify via Playwright offline reload smoke

### Risk 5: Warm-import hint becomes coupled to unstable home layout

Mitigation:

- keep warm-import behavior attached to a stable entry path into `/station-finder`
- use a shared warm helper rather than inlining dynamic import logic at each call site

---

## 16. Acceptance Criteria

Sprint 6 spec is satisfied only when all are true:

1. `@mapcn/map` is added and owned in source
2. `/station-finder` shows a live map after hydration
3. all 17 stations render as markers with popups
4. MRT-6 line renders from committed static GeoJSON
5. route prerenders successfully without map import crashes
6. offline reload shows an explicit overlay and no crash
7. map stack is lazy-split from the main entry path
8. `bun run ci` passes
9. targeted E2E map smoke passes
10. build output inspection confirms the prerender-safe shell on the route

---

## 17. Implementation Guardrails for the Later Plan

The later implementation plan must preserve these guardrails:

- no speculative abstraction beyond Sprint 6 needs
- no server-function work in this sprint
- no route loader fetching for map preview
- no import of `maplibre-gl` from route files or shared SSR-loaded shell files
- no explicit Vite chunk config unless verification proves natural splitting is insufficient
- no replacement of DOM markers with GeoJSON point layers unless scope changes materially
- no direct `preloadModule('/src/...')` string-based warming path unless the stack later exposes a documented, bundler-stable asset URL mechanism for it

The implementation plan should therefore be able to proceed in a clean sequence:

1. install mapcn
2. build the SSR-safe wrapper
3. wire corridor layer
4. wire station markers
5. replace route preview
6. add warm-import hint
7. add tests
8. verify chunking and prerender

---

## 18. Spec Summary

Sprint 6 uses a **client-island map architecture**:

- mapcn as the owned React map primitive
- React lazy + Suspense as the browser-only boundary
- DOM markers for the 17 stations
- raw GeoJSON line layer for the MRT-6 corridor
- offline-safe overlay behavior
- route-level preload warming for a modern navigation path

This is the smallest architecture that is still correct, modern, SSR-safe, extensible, and directly aligned with Sprint 7 and Sprint 9.
