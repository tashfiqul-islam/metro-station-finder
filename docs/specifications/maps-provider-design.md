# Specification: Maps, Places, Routes and geolocation design (METRO-39)

Identity: maps-provider-design. Revision: 2026-11-05-r2 (r2 answers the independent review). Decision owner: Tashfiqul Islam, who delegated the decisions to the agent on 2026-11-05; recorded in [ADR-0009](../adr/0009-maps-provider-design.md). Source: Plane METRO-39. Domain: [glossary](../product/glossary.md), [feature parity](../product/feature-parity.md) R1 to R5. Grouping: module, milestone and release are not set by this document (unassigned).

## Problem and outcome

The first map slice must not overspend, leak a key or ship an inaccessible map. This document fixes the calls, their SKUs and free tiers, and the tests the slice must add. It authorizes no map code.

## Scope and exclusions

- Scope: provider choice, loader, calls and cost, key restrictions, caching and attribution, accessibility, geolocation consent, and the test plan.
- Exclusions: any map code, creating keys or map IDs, console quota or budget changes, glossary edits, CSP edits.

## Research

Read 2026-11-05. Sources and labels (URLs, Context7 library ids) are in the ADR context. Google's pricing page has no date, so figures must be re-checked when the slice is built. Unverified: the SKU of a WALKING `Route.computeRoutes` call; whether the JavaScript Routes call accepts a referrer-restricted key; the full Maps service terms on caching; whether quota caps behave as described.

## External calls, SKUs and free tiers

Prices are USD per 1,000 above the free tier (first tier), Web-verified 2026-11-05 from the [pricing page](https://developers.google.com/maps/billing-and-pricing/pricing). SKU ids come from that page. Where Google does not name the SKU the row says "SKU: not named by Google (Unverified)".

| #   | Call                                                                                                                     | SKU (id)                                                                                                                                   | Free tier per month                                | Price above free | Rule                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| C1  | Load Maps JavaScript API and show a map (`importLibrary("maps")`)                                                        | Dynamic Maps (FAF4-3B2D-51B2)                                                                                                              | 10,000 free                                        | 7.00             | Load only on the map view. Markers (`marker` library) add no separate SKU here.                                   |
| C2  | Autocomplete typing (`PlaceAutocompleteElement`)                                                                         | Autocomplete Session Usage (EEA3-417B-DBA1) or Autocomplete Requests (4EF4-B17C-B31A)                                                      | Session Usage unlimited free; Requests 10,000 free | Requests 2.83    | Session ended by Essentials fields: first 12 requests are Requests, then free Session Usage. Abandoned: Requests. |
| C3  | Place Details on selection (`fetchFields` with `location`, `formattedAddress`)                                           | Place Details Essentials (6E05-E1C3-8D85)                                                                                                  | 10,000 free                                        | 5.00             | Never request `displayName` or other Pro fields (Pro 4ED6-464A-2AFC, 5,000 free, 17.00).                          |
| C4  | Walking route from the user's origin to the nearest station (`Route.computeRoutes`, WALKING, minimal fields, no traffic) | SKU: not named by Google (Unverified). Budget basis: Compute Routes Pro (02F7-1B55-DC90); Essentials is 9EFF-679A-9B16 (10,000 free, 5.00) | 5,000 free (Pro basis)                             | 10.00 (Pro)      | One call per explicit search. Sends the origin position to Google. Re-check the SKU on the first bill.            |
| C5  | Device geolocation (`navigator.geolocation`)                                                                             | SKU: none (browser API)                                                                                                                    | free, no Google charge                             | none             | Gesture-triggered only. Position is read in the browser, not sent to our server; it leaves only inside C4.        |

Place IDs may be stored. No other Google content is stored (ADR).

## Behavior

1. Fares and station lists work with no map script loaded. Provider load, auth or quota failure shows an error state with retry; fares stay usable (R3). Manual search then falls back to a station dropdown and list built from the local dataset.
2. Search: a selected place needs geometry. Empty text, unselected text, no result and missing geometry each have a visible message (R2). A late response for an older search is ignored (R5).
3. Route failure keeps the nearest-station result and shows a separate route error (R4). The route error clears on success.
4. Geolocation follows ADR-0009 "Geolocation consent". Copy: "To find your nearest station, your position is sent to Google only to compute the route to it. It is not saved and not sent to our server."
5. After a denied, unavailable or timed-out result, the `role="alert"` message shows, focus moves to the search input, and the input's `aria-describedby` points at the alert.
6. Markers: `gmpClickable: true`, `title` set, keyboard reachable, on a map with a map ID (`DEMO_MAP_ID` in dev, a real ID in production); a text list of the same stations exists.
7. Logs and errors carry outcomes only, never coordinates, addresses or key values.

## Key and budget checklist (owner, METRO-57)

- Dev key `metro-station-key-dev` stays referrer-restricted and API-restricted (read-only check by the coordinator, 2026-11-05). It is not the deleted legacy key.
- Production key: referrers `https://metro-station-finder.com/*` and `https://www.metro-station-finder.com/*`; APIs Maps JavaScript, Places (New), Routes only. A real map ID for production.
- Daily quota caps, owner-adjustable, derived in the ADR: Routes 160, map loads 300, Place Details 300, Autocomplete requests 330. Budget alerts at 50, 90 and 100 percent.
- The slice reads the key from public build configuration; a key value never enters the repository.

## Slice MAP-1: first map slice (future, not authorized here)

- Blocked by: METRO-40 (station model), METRO-57 (production key, map ID, caps), METRO-31 (security headers; the content security policy must add the Google hosts then).
- Acceptance MAP-1-A: Given the Google script fails, when the map view opens, then an error state with retry shows and the fare page still computes a fare.
- Acceptance MAP-1-B: Given the page has loaded, when no button was pressed, then `getCurrentPosition` was never called.
- Acceptance MAP-1-C: Given location is denied or times out, when the user pressed the button, then a `role="alert"` message shows and manual search is usable.
- Failure/boundary checks: quota error, missing geometry, route failure, delayed older response, provider down with station dropdown fallback.
- Review needs: HITL for key and quota settings; AFK for code.

## Test plan for the first map slice

These tests do not exist yet; the slice must add them and show each failing on base. No map code exists, so none run today.

| #   | Test                                                                                                                                 | Level            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------- |
| T1  | Provider failure (script load error) shows an error state while fares still compute                                                  | DOM test         |
| T2  | No `getCurrentPosition` call before a user gesture (spy on the geolocation fake)                                                     | DOM test         |
| T3  | Denied, unavailable and timed-out outcomes each render `role="alert"`, move focus to the search input and keep manual search working | DOM test         |
| T4  | Playwright with geolocation permission granted and denied through the browser context; axe scan on both                              | Playwright       |
| T5  | Log test: capture log output during granted and denied flows and assert no coordinate fields or values appear                        | Unit             |
| T6  | Markers are created with `gmpClickable` and a `title`, are keyboard reachable, and a text list of the same stations exists           | DOM + Playwright |
| T7  | Fake key only in tests; a scan proves no real key pattern is committed (existing secret scan)                                        | Gate             |
| T8  | Place Details request uses only the Essentials field list `location`, `formattedAddress`                                             | Unit             |

Repo test today: `scripts/maps-design.test.ts` checks this document and the ADR (status Accepted, sections, key-restriction and quota content, a SKU row per call, one row per test id).

## Open items

- Open decisions: none that block the design. Unverified items under Research must be settled in the first slice.
- Glossary: the term "Location" means a search-selected place, not a device position. METRO-40 must update the glossary; this ticket does not edit it.

## Readiness record

Reviewer: pending independent review. Unresolved: the Unverified items above.
