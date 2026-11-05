# Specification: Maps, Places, Routes and geolocation design (METRO-39)

Identity: maps-provider-design. Revision: 2026-11-05-r1. Decision owner: Tashfiqul Islam, who delegated the decisions to the agent on 2026-11-05; recorded in [ADR-0009](../adr/0009-maps-provider-design.md). Source: Plane METRO-39. Domain: [glossary](../product/glossary.md), [feature parity](../product/feature-parity.md) R1 to R5. Grouping: module, milestone and release are not set by this document (unassigned).

## Problem and outcome

The first map slice must not overspend, leak a key or ship an inaccessible map. This document fixes the calls, their SKUs and free tiers, and the tests the slice must add. It authorizes no map code.

## Research

Read 2026-11-05. Google's pricing page has no date, so Web-verified figures must be re-checked when the slice is built. Labels are in the ADR context. Unverified: the SKU of a WALKING `Route.computeRoutes` call; whether the JavaScript Routes call accepts a referrer-restricted key; the full Maps service terms on caching; whether daily quota caps behave as described.

## External calls, SKUs and free tiers

Prices are USD per 1,000 above the free tier (first tier), Web-verified 2026-11-05. SKU ids come from the pricing page.

| #   | Call                                                                                              | SKU (id)                                                                                                       | Free tier per month                                | Price above free | Rule                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| C1  | Load Maps JavaScript API and show a map (`importLibrary("maps")`)                                 | Dynamic Maps (FAF4-3B2D-51B2)                                                                                  | 10,000 free                                        | 7.00             | Load only on the map view. Markers (`marker` library) add no separate SKU here.                                   |
| C2  | Autocomplete typing (`PlaceAutocompleteElement`)                                                  | Autocomplete Session Usage (EEA3-417B-DBA1) or Autocomplete Requests (4EF4-B17C-B31A)                          | Session Usage unlimited free; Requests 10,000 free | Requests 2.83    | Session ended by Essentials fields: first 12 requests are Requests, then free Session Usage. Abandoned: Requests. |
| C3  | Place Details on selection (`fetchFields` with `location`, `formattedAddress`)                    | Place Details Essentials (6E05-E1C3-8D85)                                                                      | 10,000 free                                        | 5.00             | Never request `displayName` or other Pro fields (Pro 4ED6-464A-2AFC, 5,000 free, 17.00).                          |
| C4  | Walking route to the nearest station (`Route.computeRoutes`, WALKING, minimal fields, no traffic) | Compute Routes Essentials (9EFF-679A-9B16), Inferred; Pro (02F7-1B55-DC90, 5,000 free, 10.00) if it proves Pro | 10,000 free (Essentials)                           | 5.00             | One call per explicit search. Unverified SKU; budget at Pro until proven.                                         |
| C5  | Device geolocation (`navigator.geolocation`)                                                      | Browser API, no Google SKU: no charge, Unverified only as to Google billing                                    | free                                               | none             | Gesture-triggered only. Coordinates are not sent to Google by this call.                                          |

Place IDs may be stored. No other Google content is stored (ADR).

## Behavior

1. Fares and station lists work with no map script loaded. Provider load, auth or quota failure shows an error state with retry; fares stay usable (R3).
2. Search: a selected place needs geometry. Empty text, unselected text, no result and missing geometry each have a visible message (R2). A late response for an older search is ignored (R5).
3. Route failure keeps the nearest-station result and shows a separate route error (R4). The route error clears on success.
4. Geolocation follows ADR-0009 "Geolocation consent". Copy: "Your location is used once in your browser to find the nearest station. It is not saved or sent to our server."
5. Markers: `gmpClickable: true`, `title` set, keyboard reachable; a text list of the same stations exists.
6. Logs and errors carry outcomes only, never coordinates, addresses or key values.

## Key and budget checklist (owner, METRO-57)

- Dev key stays referrer-restricted and API-restricted; confirm in the console.
- Production key: referrers `https://metro-station-finder.com/*` and `https://www.metro-station-finder.com/*`; APIs Maps JavaScript, Places (New), Routes only.
- Daily quota caps near one thirtieth of each free tier; budget alerts at 50, 90 and 100 percent.
- The slice reads the key from public build configuration; a key value never enters the repository.

## Slice MAP-1: first map slice (future, not authorized here)

- Blocked by: METRO-40 (station model), METRO-57 (production key).
- Acceptance MAP-1-A: Given the Google script fails, when the map view opens, then an error state with retry shows and the fare page still computes a fare.
- Acceptance MAP-1-B: Given the page has loaded, when no button was pressed, then `getCurrentPosition` was never called.
- Acceptance MAP-1-C: Given location is denied or times out, when the user pressed the button, then a `role="alert"` message shows and manual search is usable.
- Failure/boundary checks: quota error, missing geometry, route failure, delayed older response.
- Review needs: HITL for key and quota settings; AFK for code.

## Test plan for the first map slice

These tests do not exist yet; the slice must add them and show each failing on base. No map code exists, so none run today.

| #   | Test                                                                                                                       | Level            |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| T1  | Provider failure (script load error) shows an error state while fares still compute                                        | DOM test         |
| T2  | No `getCurrentPosition` call before a user gesture (spy on the geolocation fake)                                           | DOM test         |
| T3  | Denied, unavailable and timed-out outcomes each render `role="alert"` and keep manual search working                       | DOM test         |
| T4  | Playwright with geolocation permission granted and denied through the browser context; axe scan on both                    | Playwright       |
| T5  | Log test: capture log output during granted and denied flows and assert no coordinate fields or values appear              | Unit             |
| T6  | Markers are created with `gmpClickable` and a `title`, are keyboard reachable, and a text list of the same stations exists | DOM + Playwright |
| T7  | Fake key only in tests; a scan proves no real key pattern is committed (existing secret scan)                              | Gate             |
| T8  | Place Details request uses only the Essentials field list `location`, `formattedAddress`                                   | Unit             |

Repo test today: `scripts/maps-design.test.ts` checks this document and the ADR (status Accepted, required sections, one SKU and free-tier row per call).

## Readiness record

Reviewer: pending independent review. Unresolved: the Unverified items above.
