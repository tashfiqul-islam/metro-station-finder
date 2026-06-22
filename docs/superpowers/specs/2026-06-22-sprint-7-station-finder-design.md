# Sprint 7 — Station Finder Feature Design Spec

**Date:** 2026-06-22
**Status:** Draft for review
**Scope:** Sprint 7 only — real destination-first station-finder flow with ORS-backed destination resolution, nearest-station selection, and last-mile street routing from nearest MRT-6 station to the resolved destination

---

## 1. Context & Goal

Sprint 6 delivered the map foundation:

- SSR-safe map shell
- dense MRT-6 corridor line
- 17 station markers
- offline-safe preview behavior

What Sprint 6 intentionally did **not** deliver was the actual station-finder user flow.

The intended user-facing behavior for the feature is:

1. user enters a destination
2. app resolves that destination to one concrete place
3. app finds the nearest MRT-6 station to that resolved place
4. app draws the street route from that nearest station to the resolved destination

This is a **destination-first** flow, not a map-preview flow and not a geolocation-first flow.

The page should still support a **secondary** “use my location” shortcut, but typed destination search is the primary interaction model.

**Outcome:** `/station-finder` becomes a real feature route where a user can type a destination, pick a suggestion or submit free text, see the nearest station, see the route from that station to the destination, and switch between walking and driving route modes.

---

## 2. Research Basis

This spec uses current repo evidence plus current docs for the stack surfaces relevant to Sprint 7.

### Repo-verified inputs

- Sprint 6 map foundation exists: `src/components/common/map-canvas.tsx`, `src/components/common/map-canvas-client.tsx`, `src/features/station-finder/route.tsx`, `src/features/station-finder/components/station-markers.tsx`, `src/features/station-finder/components/metro-line-layer.tsx`
- deterministic nearest-station logic already exists in `src/features/station-finder/logic.ts`
- root shell already provides TanStack Query via `QueryClientProvider`
- route metadata helper already exists in `src/lib/head-meta.ts`
- `ORS_KEY` exists in `.env.local` per repo docs and user confirmation, but is not currently used in Sprint 6 runtime code

### Current-doc inputs

- **OpenRouteService geocoder:** public API provides forward geocoding and autocomplete; the geocoder endpoint is served by Pelias and is separate from self-hosted ORS instances
- **OpenRouteService directions:** directions service supports route calculation between two or more coordinates for different travel profiles
- **TanStack Start:** `createServerFn` is the correct typed server boundary for proxying third-party APIs and keeping secrets server-only
- **React 19:** form actions exist, but autocomplete/typeahead search is still best modeled as controlled input + user-triggered async fetch rather than forcing everything through submit-only actions
- **TanStack Query v5:** user-triggered fetching, stable query keys, placeholder/previous-data patterns, and explicit pending/error state handling fit this feature well
- **TanStack Router v1:** `validateSearch` remains the correct way to make destination/mode route state bookmarkable and typed

---

## 3. Product Decisions Locked

These decisions are fixed for Sprint 7 and should not be reopened in the implementation plan.

### 3.1 Primary interaction model

- **Primary:** destination-first search
- **Secondary:** “use my location” shortcut

The route should visually and behaviorally prioritize typed destination search. “Use my location” should be present, but not equal in weight to the search box.

### 3.2 Destination resolution provider

- **Provider:** OpenRouteService geocoder/autocomplete

Reason:

- ORS supports autocomplete directly
- Nominatim public usage policy explicitly forbids building client-side autocomplete on the public endpoint
- one provider for both place resolution and directions reduces mismatch risk between chosen result and routable result

### 3.3 Result model

- Sprint 7 resolves to **one concrete destination result**
- no “top 3 routes” presentation in this sprint
- no always-confirm-first result list flow in this sprint

Autocomplete suggestions may show multiple candidates, but once the user picks or submits, the feature resolves to a single destination state.

If the user explicitly selects an autocomplete suggestion, that exact suggestion becomes the destination.

If the user submits free text without choosing a suggestion, the server resolves the query to the single best geocoder match and uses that as the destination.

### 3.4 Travel mode

- default mode: **walking**
- alternate mode: **driving**

This mode applies only to the last-mile station-to-destination route, not to the metro corridor itself.

Nearest-station selection stays deterministic and mode-independent. Switching between walking and driving changes the route geometry and route summary, not which station is selected.

### 3.5 Search UX

- preferred path: autocomplete/typeahead suggestions
- fallback path: free-text submit if the user does not choose a suggestion

The app must still attempt to resolve the submitted free text through ORS if the user ignores the suggestion list.

Free-text submit is a fallback path, not the preferred path.

---

## 4. Scope

### In scope

1. Replace the map preview at `/station-finder` with a real destination-first station-finder UI
2. Add destination search input with autocomplete suggestions
3. Add secondary “use my location” shortcut
4. Resolve destination search to one concrete place with coordinates
5. Find the nearest MRT-6 station to that resolved destination or geolocated user point, depending on flow
6. Draw a street route from nearest station to destination/user target
7. Add walking/driving mode switch for the last-mile route
8. Add station summary card with nearest-station result and route summary
9. Keep state bookmarkable in the URL
10. Keep `ORS_KEY` server-only via TanStack Start server functions
11. Add error/fallback behavior for geocoder and directions failures
12. Add tests for server boundary, route state, UI behavior, and E2E flow

### Allowed enabling fixes

Small enabling fixes are allowed if Sprint 7 exposes narrow gaps in Sprint 6 work. Examples:

- route metadata tweaks for the feature route
- test harness updates needed for autocomplete/directions smoke tests
- narrow map-layer cleanup if the Sprint 6 map primitives need small interface changes to support the route overlay cleanly

These fixes must stay tightly scoped and directly justified by Sprint 7 work.

### Out of scope

Sprint 7 does **not** include:

- AI natural-language station finding
- multi-result route comparison UI
- transit journey optimization across multiple metro stations
- per-user persisted recent destinations
- offline geocoding/directions
- billing/rate-limit dashboards
- self-hosted ORS/Pelias infrastructure

---

## 5. User Flow

### Primary path: typed destination

1. user visits `/station-finder`
2. user types a destination into the search input
3. suggestions appear
4. user selects a suggestion, or submits free text
5. app resolves one destination with coordinates
6. app computes nearest MRT-6 station to that resolved destination
7. app requests ORS route from nearest station to destination using selected mode
8. app updates map and summary card

### Secondary path: use my location

1. user taps “use my location”
2. app requests geolocation permission
3. if granted, geolocation becomes the target point
4. app computes nearest MRT-6 station to that point
5. app requests ORS route from nearest station to that point
6. app updates map and summary card

This is a shortcut path, not the primary landing affordance.

---

## 6. Architecture Decision

### Chosen approach

Use **two server seams** and **one route-local orchestration layer**:

1. **Destination resolution seam**
   - TanStack Start `createServerFn`
   - wraps ORS geocoder/autocomplete

2. **Last-mile routing seam**
   - TanStack Start `createServerFn`
   - wraps ORS directions

3. **Route orchestration seam**
   - `src/features/station-finder/route.tsx`
   - owns input state, selected destination state, travel mode, query hooks, and map composition

### Why this is best

- keeps `ORS_KEY` server-only
- preserves typed validation at each external boundary
- keeps search and routing concerns separate
- lets TanStack Query handle caching and pending/error states cleanly
- fits the repo’s feature-folder pattern and TanStack Start runtime model

### Rejected alternatives

#### Client-side direct ORS calls

Rejected because it leaks secret-bearing integration details and breaks repo security rules.

#### Nominatim for search + ORS for directions

Rejected because:

- public Nominatim policy forbids public client-side autocomplete
- two-provider mismatch is worse for UX and debugging

#### Pure form-action design for autocomplete

Rejected because autocomplete is not a submit-first interaction. Controlled input + async query is the better fit; form actions remain useful for explicit submit paths if needed.

---

## 7. File Structure & Responsibilities

### New files

#### `src/features/station-finder/components/destination-search.tsx`

Primary destination-first UI. Owns the input, suggestion list UI, and explicit submit behavior.

#### `src/features/station-finder/components/location-shortcut.tsx`

Secondary geolocation action. Owns permission/error/unsupported-browser messaging.

#### `src/features/station-finder/components/nearest-station-card.tsx`

Displays the resolved nearest station and route summary.

#### `src/features/station-finder/components/destination-marker.tsx`

Map marker for the resolved destination or geolocated target.

#### `src/features/station-finder/components/highlighted-station-marker.tsx`

Special visual treatment for the nearest station on the map.

#### `src/features/station-finder/components/last-mile-route-layer.tsx`

Renders the ORS-derived route polyline on the map.

#### `src/features/station-finder/hooks/use-destination-search.ts`

TanStack Query wrapper for autocomplete/geocode search.

#### `src/features/station-finder/hooks/use-last-mile-route.ts`

TanStack Query wrapper for ORS directions.

#### `src/features/station-finder/server/search-destination.ts`

Server function proxy for ORS autocomplete/geocoding.

#### `src/features/station-finder/server/get-last-mile-route.ts`

Server function proxy for ORS directions between nearest station and target point.

#### `src/features/station-finder/schemas.ts`

Valibot schemas for destination search inputs, geocoder results, directions inputs, directions outputs, and route URL search state.

#### `tests/unit/features/station-finder/server/search-destination.test.ts`

Server boundary tests for geocoder behavior.

#### `tests/unit/features/station-finder/server/get-last-mile-route.test.ts`

Server boundary tests for directions behavior.

#### `tests/integration/station-finder-route.test.tsx`

Integration tests for the route-level orchestration and result states.

#### `tests/e2e/station-finder.spec.ts`

End-to-end typed destination flow and location-shortcut flow.

### Modified files

#### `src/features/station-finder/route.tsx`

Replace preview-only layout with the real route orchestration UI.

#### `src/routes/station-finder.tsx`

Keep route registration + metadata only; update descriptive metadata to the real feature state.

#### `src/components/common/map-canvas.tsx` / `map-canvas-client.tsx`

Modify only if a small enabling seam is needed for route overlays, fit behavior, or stable layering.

---

## 8. Data Contracts

### 8.1 Search input contract

Input fields:

- `query: string`
- `origin?: "typed" | "geolocation"`
- optional geolocation coordinates if the location shortcut path is used

Rules:

- empty or whitespace-only typed queries are invalid
- queries shorter than 3 trimmed characters should not trigger provider search
- queries need a sensible max length
- destination search should prefer Dhaka/Bangladesh bias where ORS supports it

### 8.2 Resolved destination contract

Resolved destination must include enough information for UI + routing:

- `label`
- `lat`
- `lng`
- optional structured place parts if available
- optional provider metadata if useful for debugging, but not required in UI

### 8.3 Last-mile route contract

Input:

- `from: { lat, lng }` nearest station coordinates
- `to: { lat, lng }` resolved destination or geolocated point
- `mode: "walking" | "driving"`

Output:

- `coords: [lng, lat][]`
- `distanceMeters`
- `durationSeconds`
- optional summary metadata if the ORS response exposes it usefully

### 8.4 URL search state contract

URL state should be typed and bookmarkable.

Expected search params:

- `q` for submitted typed destination text; geolocation-driven results may use an empty string
- `mode` for route mode
- `origin` for `typed` or `geolocation`
- `destinationLat` and `destinationLng` for the resolved target coordinates
- `destinationLabel` for the resolved target label

The spec does **not** require autocomplete transient keystrokes to be mirrored into the URL.

The route should persist enough resolved data to avoid depending on a second geocoder lookup just to restore a bookmarked result.

These target fields apply to both typed-destination and geolocation-driven results.

---

## 9. Route-State Strategy

The route should remain bookmarkable without making transient search UX noisy.

### URL state should store

- submitted destination query
- active travel mode
- enough data to reconstruct a stable result view on reload

The intended result is: a copied `/station-finder?...` URL should restore the resolved destination and route context without forcing the user through autocomplete again.

### URL state should not store

- every intermediate autocomplete keystroke
- ephemeral hover/selection UI state
- pending async request state

### Recommended behavior

- keep the controlled input local while typing
- once the user selects a suggestion or explicitly submits, persist meaningful route state into URL search params
- geolocation-driven results should also serialize enough target state into the URL to restore the resolved result view on refresh

---

## 10. Query / Caching Strategy

### Destination suggestions

- query should be user-triggered, not route-loader-driven
- debounce is acceptable and expected
- cache key should include normalized query text
- previous suggestion results may be reused while the next request is pending if that avoids flicker
- search requests should be biased toward Dhaka/Bangladesh where the provider supports it

### Route query

- query key should include:
  - station slug or station coordinates
  - resolved target coordinates
  - mode
- route query should only run once both endpoints are known
- route refetch on mode change should preserve the previous successful route until the new result arrives

Changing mode must not clear the resolved destination, nearest-station selection, or map viewport context.

### Cache goals

- prevent repeated calls for the same destination/mode pair in one session
- preserve visible result state while refetching a changed mode
- fail cleanly without losing the last known good route if a refetch fails

---

## 11. Map Rendering Requirements

The route should visually combine three distinct map concepts:

1. **Static MRT-6 corridor**
   - existing dense metro line from Sprint 6
2. **Nearest station highlight**
   - visually distinct from the full station marker set
3. **Last-mile route**
   - ORS-derived street geometry from nearest station to target

### Additional markers

- destination marker for resolved target or geolocated point
- nearest station highlight marker

### Layering rules

- base metro line stays visible
- last-mile route must visually read as a separate overlay
- nearest station and destination markers must remain clearly distinguishable

### Viewport behavior

- after result resolution, map should fit the relevant result geometry in a readable way
- this may mean fitting the corridor + last-mile endpoints rather than the entire full MRT-6 corridor every time

---

## 12. Fallback and Error Behavior

Sprint 7 must degrade safely.

### Search failure

- if autocomplete fails, user can still attempt explicit free-text submit
- if resolution still fails, show a clear “destination not resolved” state
- do not silently pick a different place than the chosen suggestion

### Directions failure

- if directions fail, show nearest station result anyway
- if a route fallback is shown, it must be a clearly labeled straight-line approximation rather than something that implies real street routing
- do not silently pretend a real route exists

### Geolocation failure

- permission denied, timeout, unsupported browser, and unavailable position should all surface distinct understandable copy
- geolocation failure must not block the typed destination path

### Offline

- typed destination search and directions should clearly indicate they require network
- static metro map should still render via Sprint 6 fallback behavior where possible

---

## 13. Security Requirements

### Secrets

- `ORS_KEY` remains server-only
- no direct ORS call from client code
- no route response should expose the raw API key or raw authorization headers

### Validation

- all server function inputs validated with Valibot
- ORS responses must be parsed and normalized before use
- free-text destination input must be length-bounded and trimmed

### Logging

- avoid logging raw sensitive user data unnecessarily
- if observability is added, keep logs structured and minimal

---

## 14. Testing Strategy

### Unit

- destination server function:
  - success path
  - empty query rejection
  - malformed ORS response rejection
  - no-result behavior
- directions server function:
  - success path for walking and driving
  - malformed geometry rejection
  - 401/403/429/failure paths

### Integration

- route shows destination-first UI
- typing triggers suggestion state correctly
- selecting a suggestion drives route result state
- geolocation shortcut path works independently of typed path
- nearest station card renders correct summary for a fixture
- route mode switch refetches/updates route state without nuking the rest of the UI

### E2E

- typed destination autocomplete flow
- free-text submit fallback flow
- use-my-location shortcut flow with permission allowed and denied paths
- walking/driving switch updates result
- ORS key not leaked into browser-visible payloads

---

## 15. Risks & Mitigations

### Risk 1: ORS geocoder ambiguity in Dhaka place names

Mitigation:

- autocomplete suggestions first
- explicit one-result selection model
- bias results toward Dhaka/Bangladesh when provider supports it

### Risk 2: Search and directions provider mismatch

Mitigation:

- use ORS for both search and directions

### Risk 3: Key leakage

Mitigation:

- keep ORS behind `createServerFn`
- explicitly test that client-visible scripts and network payloads do not expose the key

### Risk 4: Query spam from autocomplete

Mitigation:

- debounce requests
- minimum query length
- cache by normalized query string

### Risk 5: Result flicker or stale map state when changing mode

Mitigation:

- preserve previous route data while refetching
- use stable query keys and route-local orchestration

---

## 16. Acceptance Criteria

Sprint 7 is satisfied only when all are true:

1. `/station-finder` is a real destination-first feature route
2. user can type a destination and receive suggestions
3. user can select a suggestion or submit free text
4. app resolves one concrete destination
5. app computes nearest MRT-6 station to that target
6. app draws ORS last-mile route from nearest station to target
7. walking and driving modes both work
8. “use my location” shortcut works as a secondary path
9. route state is bookmarkable in the URL
10. `ORS_KEY` remains server-only
11. failure and fallback states are clear and non-silent
12. `bun run ci` passes
13. feature-specific coverage and E2E gates pass

---

## 17. Guardrails for the Later Plan

The implementation plan must preserve these guardrails:

- destination-first flow stays primary
- use-my-location stays secondary
- ORS search + ORS directions remain the only external provider seams in this sprint
- no direct client ORS integration
- no AI layer in Sprint 7
- no broad route architecture refactor outside station-finder feature seams
- no over-designed multi-result route selection UI

---

## 18. Spec Summary

Sprint 7 turns `/station-finder` from a map preview into a real route feature.

The best architecture for this repo in 2026 is:

- **destination-first UI**
- **secondary geolocation shortcut**
- **ORS autocomplete/geocode** for place resolution
- **ORS directions** for last-mile street routing
- **TanStack Start server functions** as the secure provider seam
- **TanStack Query** for user-triggered fetch orchestration and caching
- **TanStack Router search params** for bookmarkable result state

This is the smallest architecture that still gives high-quality UX, keeps secrets server-only, fits the current repo’s map foundation, and sets up later AI/search work cleanly.
