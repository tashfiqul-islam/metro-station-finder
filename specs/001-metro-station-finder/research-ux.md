# Research: 2025 UX, Architecture, and Maps/Places Implementation Guidance

## Scope

This document distills current (2024–2025) guidance for a fast, accessible, mobile‑first Station Finder with Next.js 15 (App Router), React 19, Google Maps JS API, and Places Autocomplete. It maps research directly to this project’s requirements, copy deck, and ADRs.

## React 19 + Next.js 15 Patterns

- Server Components by default; Client Components only for interactivity (map, inputs). Use Suspense boundaries to stream UI and hydrate only where needed.
- Actions API and `useActionState` for async flows (forms, search triggers) with built‑in pending/error state.
- `useOptimistic` for instant UI feedback (e.g., suggestion selection) while work completes.
- Prefer simple components; let the React compiler perform memoization. Avoid overusing `useMemo`/`useCallback`.
- App Router best practices: colocated `loading.tsx` for skeletons, `error.tsx` for recoverable boundaries, route‑level metadata, nested layouts.

## Maps JS API (2025)

- Lazy‑load the Maps JS API only when the map viewport is visible or the user switches to Map view. Provide a list‑view fallback.
- Theme sync: pass style arrays from `lib/map/styles.ts`; swap styles on theme change with ≤200 ms budget.
- Kill‑switch + availability hook: honor env feature flag, missing key, quota errors → force list view, show “Retry Map” CTA.
- Performance: avoid unnecessary marker re‑creates; reuse a single map instance; imperatively update center/zoom when possible.
- Accessibility: map container reachable by keyboard; provide a “Skip to results” link; ensure map attributions are focusable and open with `rel="noopener noreferrer"`.

## Places Autocomplete & Quotas

- Input gating: minimum 3 characters, 300 ms debounce, dedupe identical queries, and client rate limit (≤10/min/user).
- Daily quota guard: expose quota state; disable autocomplete when exceeded; fall back to manual lat/lng and local station search.
- Session token per search session to improve billing accuracy; cache predictions (TTL ~5 min) to reduce calls.
- Dhaka-only suggestions: bias and restrict autocomplete to the Dhaka service area (use centroid + radius/bounds with `strictbounds`); do not surface suggestions outside Dhaka. If user types an outside‑area address, show OUT_OF_AREA copy and keep manual station selection available.
- Error taxonomy → UI problem codes: `QUOTA_EXCEEDED`, `RATE_LIMITED`, `API_ERROR`, `INVALID_QUERY` mapped to copy deck IDs.

## Geolocation UX (Privacy‑first)

- Request location only on explicit intent; show rationale string from copy deck before prompting.
- Handle `denied`/`timeout`/`unavailable` with graceful manual entry; never persist coordinates.
- Validate service area (25 km from Dhaka centroid). Outside → “Out of service area” with manual station selection.

## Nearest Station & Distance

- Use Haversine; compute nearest within 5 km. If none, show empty state + 3 closest suggestions sorted by distance asc, then alphabetical.
- Distance formatting: <1000 m → meters; ≥1000 m → km (1 decimal). Walking time (est.) = `ceil(distance_m / 75)`.

## Fare UX

- Station dropdowns: local data only; accessible listbox; prevent identical origin/destination; format currency as ৳1,234 (ceil after discounts).
- Travel time (est.) = stations_between × 2 minutes.

## A11y (WCAG 2.2 AA)

- Roles/labels: search input with label; listbox + option semantics for suggestions; live regions announce result counts and state changes.
- Keyboard: tab order → skip link → search → results → map → footer; map controls reachable; Esc closes overlays.
- Reduced motion: respect `prefers-reduced-motion`; suppress pan/zoom animations.

## Performance Targets

- Core Web Vitals: LCP < 2.0 s, INP < 200 ms, CLS < 0.10 (mobile).
- Bundle budget first load: JS ≤ 100 KiB gz, CSS ≤ 40 KiB gz; code‑split map and Places code paths.
- Map theme switch ≤ 200 ms; search response < 100 ms for local lookups.

## Architecture Decisions Applied

- ADR‑0001: Async map client, lazy init, theme‑aware styles, list fallback, kill‑switch.
- ADR‑0002: Static stations/fares only; no server; offline core logic.
- ADR‑0003: Copy IDs are the single source of truth for strings and CTAs.
- ADR‑0004: Diagnostics off if DNT; local, ephemeral history only.

## Concrete Implementation Plan (tailored)

1) Autocomplete & Station Finder UX

- Build an accessible `SearchInput` with debounced Places predictions when available; otherwise local alias/station search.
- Announce results via polite live region; maintain pills for active filters (query, distance sort).
- Provide “Use Current Location” with rationale; on grant, compute nearest station and sort by distance.
- Directions CTA: open walking directions with numeric lat/lng to 5+ decimals, `target="_blank" rel="noopener"`.

2) Map Loading & Resilience

- Render list view by default; hydrate map lazily when Map view is selected or when viewport is visible.
- If map load >3 s or error, surface PROVIDER_FAIL, show Retry Map; retain feature parity actions in list view.
- Ensure theme swap without re‑create; reuse instance and apply style update.

3) Quota & Rate Limiting

- Client limiter: sliding 1‑minute window; lockout UI after 10 requests with neutral messaging and manual entry ready.
- Cache predictions keyed by normalized query + location bias; TTL ~5 min; dedupe concurrent requests.

4) Testing & Budgets

- RTL/Playwright scenarios for: map on/off, geolocation denied, out of area, quota exceeded, reduced motion, keyboard traversal, copy IDs.
- Lighthouse CI with `lighthouse-budgets.json`; axe checks must have 0 serious/critical.

## Files/Modules Impact

- `app/station-finder/page.tsx`: compose Search + Map/List with Suspense, live regions, view toggle, retry flow.
- `components/ui/search-input.tsx`: accessible listbox and debounced suggestions.
- `components/ui/map.tsx`: lazy map, theme swap, retry mechanics, keyboardable controls.
- `lib/hooks/*`: `use-google-places`, `use-map-availability`, `use-nearest-station`, `use-live-region`, `use-debounced-value`.
- `lib/api/places.ts`: quota state, rate limit, cache, session tokens; copy ID mapping for errors.

This plan keeps the app blazing fast, privacy‑preserving, and accessible while aligning with 2025 standards.

## UX Flow (Step‑by‑step)

1) Landing → Station Finder

- Page loads with list view default (no map yet), search input focused on keyboard.
- Skip link visible on focus moves to results.

2) Typing in destination

- After ≥3 chars, debounced autocomplete shows Dhaka‑only suggestions; aria‑active‑descendant highlights; Enter selects.
- If Places disabled/rate‑limited, local station/alias suggestions appear; a badge indicates “Autocomplete disabled”.

3) Selecting a suggestion

- UI announces selection via live region; results list updates with nearest station(s) and distances. Directions CTA appears on each result.
- View toggle lets user switch to Map; switching hydrates map lazily.

4) Using current location

- Clicking “Use Current Location” first displays rationale copy, then prompts. On grant, nearest station surfaces; on deny, show copy + keep manual entry.

5) Map view

- Map attempts to load; if loaded, shows user and station markers; if not ready within ~3 s, fallback to list with “Retry Map”.
- Theme toggle updates map style ≤200 ms. Keyboard can reach zoom/recenter controls.

6) Out of area / No stations

- Outside Dhaka centroid radius (25 km): show OUT_OF_AREA copy; provide manual station selection.
- No station within 5 km: show empty state + 3 closest suggestions by distance asc, then alphabetical.

7) Directions

- “Open Directions (walking)” opens in new tab with numeric coordinates (≥5 decimals), `rel="noopener noreferrer"` and hint text (“opens in new tab”).

8) Fare flow

- On Fare Calculator, origin/destination listboxes with typeahead; disallow identical selections; fare formats as ৳1,234; travel time shows “(est.)”.

## Implementation & Acceptance Criteria

Station Finder

- Search input: min 3 chars, 300 ms debounce, aria‑labelled, listbox semantics; live region announces result count.
- Dhaka‑only autocomplete: location bias + strict bounds; never suggest outside Dhaka; show OUT_OF_AREA copy for outside queries.
- Geolocation: rationale shown before prompt; on grant, nearest computed; on deny/timeout, fall back without blocking.
- Results sorting: with user location → by distance asc; without → by name; ties broken alphabetically.
- Empty states: messages use copy deck IDs; include problem codes.

Map

- Lazy loaded only when Map view visible/selected; list view parity for actions (directions, copy address).
- Failure handling: if load error or >3 s timeout → PROVIDER_FAIL, show “Retry Map”.
- Theme sync: map styles update ≤200 ms on theme change.
- A11y: controls focusable with labels; attributions keyboardable; skip link present.

Places & Quotas

- Client rate limit: max 10 requests/min/user; disable UI when exceeded and show neutral copy; resume after window resets.
- Cache: identical query returns cached predictions within TTL (~5 min).
- Session token: used per session to optimize billing/quality.

Geofence

- Service area: 25 km radius from centroid; exactly 25.0 km is inside; >25 → OUT_OF_AREA response and manual station selection.

Distance & Formatting

- Haversine distance; formatting <1000 m in meters, otherwise km (1 decimal). Walking minutes = `ceil(distance_m / 75)`.

Directions

- Google Maps walking directions URL with numeric lat/lng (≥5 decimals), `travelmode=walking`, opens in new tab with `rel="noopener noreferrer"`.

Fare

- Fare matrix parity and rounding rules enforced; currency formatting as ৳1,234; time `(est.)` shown.

A11y

- WCAG 2.2 AA: keyboard navigation for all interactives; visible focus; aria‑live for updates; reduced motion respected.

Performance

- First load budgets: JS ≤ 100 KiB gz, CSS ≤ 40 KiB gz; map and Places paths code‑split. INP < 200 ms; LCP < 2.0 s.
