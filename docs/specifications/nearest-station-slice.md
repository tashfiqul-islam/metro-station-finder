# METRO-88: nearest station from a searched place (reference slice)

- Identity: METRO-88, slice `nearest-station-slice`; revision 1, 2026-11-07.
- Source: Plane work item METRO-88 (read as data). Foundation blueprint v4, decisions D6, D7, D13 (owner-approved, not committed).
- Decision owner and approval: the owner delegated the open decisions below to the orchestrator on 2026-11-07 (library, fare shape, CSP switch, free-tier discipline, live check). Each is recorded as a decision here.
- Research (labels: Repo-verified, Context7-verified, Web-verified, Unverified; Context7 library `/websites/developers_google_maps_javascript` and `/visgl/react-google-maps`, web pages read 2026-11-07):
  - Context7-verified: `PlaceAutocompleteElement` fires `gmp-select`; `placePrediction.toPlace()` then `fetchFields({ fields })` ends the session and carries the session token automatically; `Route.computeRoutes` needs `fields`, takes `travelMode: 'WALKING'`; `APIProvider` takes `apiKey` and `version` (first render only) and `useMapsLibrary(name)` is `importLibrary` as a hook.
  - Web-verified ([pricing](https://developers.google.com/maps/billing-and-pricing/pricing), undated page): free caps per month are Autocomplete Requests 10,000, Autocomplete Session Usage unlimited, Place Details Essentials 10,000, Place Details Pro 5,000, Compute Routes Essentials 10,000, Pro 5,000, Enterprise 1,000, Dynamic Maps 10,000. [Routes billing](https://developers.google.com/maps/documentation/routes/usage-and-billing): Essentials is "basic features, up to 10 intermediate waypoints"; Pro needs traffic-aware modifiers. Unverified: the page does not name WALKING, so Essentials is inferred. The SKU of the JavaScript `Route.computeRoutes` call itself is Unverified.
  - Web-verified ([CSP guide](https://developers.google.com/maps/documentation/javascript/content-security-policy)): Google's samples list `script-src` (self, `*.googleapis.com`, `*.gstatic.com`, `'unsafe-eval'`, `blob:`), `img-src`, `connect-src`, `style-src`, `font-src`, `worker-src blob:` and `frame-src`. They are written for a map page. Whether a map-less Places and Routes page needs `'unsafe-eval'`, `blob:`, inline styles, fonts or frames is Unverified until the live check.
  - Repo-verified: `findNearestStation`, `findFare`, `baselineDataset`, `datasetProvenance` live in `packages/core/src`; the web app may import only core's public entry (ADR-0018).
- Domain: [glossary](../product/glossary.md) (Location, Nearest, Geographic distance, Walking distance, Origin / destination, Same station, Fare), [nearest-station](nearest-station.md), [ADR-0009](../adr/0009-maps-provider-design.md), [maps design](maps-provider-design.md), [ADR-0011](../adr/0011-security-headers.md), ADR-0018.
- Problem and intended outcome: one complete, tested feature that later features copy. A user searches a place (or presses "Use my location") and sees the nearest Line 6 station, its straight-line distance, a walking route distance and time, and the fare from that station to a destination they pick, with the fare notice and last-checked dates. The position goes to Google only. The CSP is enforced.
- Scope: core exports what is missing (`datasetProvenance`); `apps/web/src/adapters/maps` (the only code that imports the Maps library); `apps/web/src/features/nearest-station`; routing the slice at `/nearest`; an e2e journey with axe; enforced CSP with the Google hosts; `golden-path.md`; a manual live check script; a dependency rule keeping the Maps library inside the adapter.
- Exclusions: a map, markers, `displayName` or `formattedAddress` (no map, so no Places address is shown, ADR-0009 attribution rule), card discounts, concessions, Kamalapur, a CSP report endpoint, a new package, any server feature, any change to `/api/*`. The scaffold page at `/` and the status route stay and get a follow-up retirement ticket.
- Constraints and contracts: no Google key in the repository (public build-time name `VITE_GOOGLE_MAPS_API_KEY`, owner supplies it); fixed error copy only; no coordinate in any `/api/*` request; no automated run ever calls a real Google endpoint.
- Grouping: module 03 feature parity and accessible web UX; release v1.0.0.
- Open decisions: none that block; see "Unverified" and "Deviations".

## Slice nearest-station-slice

- Title and outcome: search a place, see nearest station, distances, walking route and a fare.
- Scope and exclusions: as above.
- Blocked by: METRO-87 (merged).
- Required tools and data: `baselineDataset`, Vitest/happy-dom, Playwright with a Google stub, a fake key string.

### Library decision

`@vis.gl/react-google-maps` 1.10.2 (published 2026-10-30, past the 3-day cooldown; depends on `@googlemaps/js-api-loader` ^2 and `@types/google.maps`). Owner-approved new dependency. Only `apps/web/src/adapters/maps` may import it (dependency-cruiser rule `maps-library-only-in-maps-adapter`, proven red by a fixture). `APIProvider` is mounted only by the nearest-station page, so the Maps script loads on that route only, never at module load and never on `/`. If the library breaks the bundle budget, fall back to `@googlemaps/js-api-loader` directly (numbers in the PR).

### Pinned Maps version

`version="3.66"` (Web-verified 2026-11-07: weekly is 3.66; four numeric versions are supported at any time; mid-November quarterly becomes 3.66; a deleted number silently falls back to the default channel). `@types/google.maps` is 3.66.x. Quarterly bump. The live check prints `google.maps.version` and fails if it does not start with `3.66`, so a silent fallback is detected (Unverified until run that the property exists at runtime).

### Acceptance

- A1: Given Maps and Places are stubbed and a place is selected, when the result renders, then the nearest station name, its straight-line distance in km, the walking distance and time, and the fare for the chosen destination show.
- A2: Given the fare notice, then "Fares as of" shows the DTCA notice date (8 September 2022) and the last-checked date (5 November 2026), both taken from `datasetProvenance`.
- A3: Given the nearest station is the origin, then the destination list excludes it (same-station rule) and no destination shows no fare, not zero.
- A4: Given an exact tie between two stations, then the first in dataset order wins (core, already tested; the slice shows that result).
- A5: Given the page loads under the enforced CSP, then there are no console errors and axe reports no violation.
- A6: Given only the keyboard, then every control is reachable in logical order with a visible focus indicator.
- A7: Given geolocation is denied, then fixed copy shows in a `role="alert"` and place search still works.
- A8: Given Places or Routes fails, then the nearest station and fare still show, with fixed copy for the failed part.
- A9: No request to `/api/*` carries a coordinate, in URL, headers or body.
- A10: A deliberately blocked resource makes Chromium log a CSP error and the console-error fixture fails (a meta test proves the fixture fails).
- A11: Without a key the page shows the fixed "maps unavailable" state, loads no Google script and the geolocation path still finds the nearest station.

### States

| State                   | Trigger                                                    | What shows                                                                   | Role              |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- |
| idle                    | no location yet                                            | search, "Use my location", consent line                                      | none              |
| loading                 | Maps library loading, locating, or route request in flight | "Loading place search", "Finding your position", "Finding the walking route" | `status`          |
| success                 | nearest station found                                      | station, straight-line distance, walking route, fare chooser                 | `status` for fare |
| empty                   | `findNearestStation` returns no result                     | "No station could be found for that location"                                | `status`          |
| geolocation denied      | permission denied                                          | "Location is turned off. Search for a place instead."                        | `alert`, focused  |
| geolocation unavailable | position unavailable, timeout, no API                      | "Your position could not be found. Search for a place instead."              | `alert`, focused  |
| Maps or Places failure  | no key, script, auth or `fetchFields` failure, `gmp-error` | "Place search is unavailable. You can still use your location."              | `alert`           |
| Routes failure          | `computeRoutes` rejects or returns no route                | "The walking route is unavailable. The station and fare are still correct."  | `alert`           |

All copy is fixed in `features/nearest-station/copy.ts`; `error.message` and stacks are never rendered or logged.

### Data flow

1. Search: `PlaceAutocompleteElement` (`includedRegionCodes: ['bd']`, circle `locationBias` centred on the mean of the dataset stations, radius 25 km) fires `gmp-select`. The adapter calls `toPlace()` and exactly one `fetchFields({ fields: ['location'] })` (Essentials; no `displayName`, no `formattedAddress`), converts the `LatLng` to a plain coordinate and hands it to the feature. The element owns the session token; one selection ends one session.
2. Device position: the button calls `getCurrentPosition` (`timeout: 10000`, `maximumAge: 0`, `enableHighAccuracy: false`), never on load.
3. Core, in the browser: `findNearestStation(baselineDataset.stations, coordinate)`. No network.
4. Route: once per (origin, station) pair, `Route.computeRoutes({ origin, destination, travelMode: 'WALKING', fields: ['distanceMeters', 'durationMillis'] })`, result cached in memory; a failure is not retried and is not cached.
5. Fare: `findFare(baselineDataset.fares, nearest.id, destination.id)`; an unknown fare shows fixed copy, never zero.
6. Nothing from Google is stored, logged or put in a URL (ADR-0009). Consent line: "Your position and the place you search for are not sent to our server. The text you type in search goes to Google to suggest places; your position goes to Google only to work out the walking route."

### Free-tier plan

The owner must pay nothing. Calls made and their SKU (pricing re-read 2026-11-07; the page is undated):

| Call                                                         | SKU                                                                                               | Free cap per month                       | Status                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| Autocomplete (element, per keystroke after its own debounce) | Autocomplete Requests, then Session Usage after 12 when the session ends with an Essentials field | 10,000 requests; Session Usage unlimited | Web-verified from pricing and session docs |
| `fetchFields(['location'])`                                  | Place Details Essentials                                                                          | 10,000                                   | Web-verified (`location` is Essentials)    |
| `Route.computeRoutes`, WALKING, distance and duration only   | Compute Routes Essentials (inferred), budget at Pro                                               | 10,000 Essentials, 5,000 Pro             | Inferred; JS-library SKU Unverified        |
| Maps JavaScript API load with no map                         | no map load is created (no Dynamic Maps SKU)                                                      | 10,000 Dynamic Maps                      | Unverified                                 |

Frugality built in: one `fetchFields` per selection; one route request per (origin, station) pair with an in-flight and result cache; no request per render or per keystroke of ours; no retries; the API is loaded once (StrictMode-safe, `APIProvider` dedupes); with no key nothing loads. Limit: the element does its own autocomplete requests per keystroke and exposes no documented minimum-character or debounce setting (Unverified; the live check counts Places requests per search). If that is wasteful, the fallback is a custom combobox on `AutocompleteSuggestion.fetchAutocompleteSuggestions` with our own debounce and minimum length (a new decision).

Owner action, a hard stop: set a daily quota cap per API on the key (a budget alert does not stop spending). Starting values from ADR-0009: Routes 160, Maps JavaScript 300, Place Details 300, Autocomplete requests 330 per day. Also restrict the key to the Maps JavaScript, Places (New) and Routes APIs and to HTTP referrers (localhost, 127.0.0.1 and the production origin). Steps are in [golden path](../agents/golden-path.md).

### CSP plan

Switch `Content-Security-Policy-Report-Only` to enforced `Content-Security-Policy` (ADR-0011 amendment). Strict nonce CSP is impossible from static `_headers`, so an allowlist with exact hosts, not Google's wildcard samples. Added (each with reason):

- `script-src 'self' https://maps.googleapis.com https://maps.gstatic.com`: the loader injects `https://maps.googleapis.com/maps/api/js` and the API loads its chunks (Web-verified from the sample; the exact chunk host is Unverified).
- `connect-src 'self' https://maps.googleapis.com https://places.googleapis.com https://routes.googleapis.com`: the API's own calls, Places (New) and Routes (host names Web-verified from the REST references; that the JS library uses exactly these is Unverified).
- `img-src 'self' data: https://maps.gstatic.com https://maps.googleapis.com`: the "Powered by Google" attribution and icons in the suggestion list (Unverified).

Not added because nothing justifies them yet (all Unverified; the live check settles them): `'unsafe-eval'`, `blob:`, `worker-src`, `style-src` `'unsafe-inline'` and `https://fonts.googleapis.com`, `font-src`, `frame-src`. If the live run prints a violation for one, add only that, with the message as evidence. The merge needs the owner's live run first.

### Failure and boundary checks

Missing key; script blocked; `gmp-error`; `fetchFields` rejects or returns no location; `computeRoutes` rejects or returns no route; geolocation denied, unavailable, timeout and absent; invalid coordinate; destination equal to origin; a second `gmp-select` during an in-flight fetch; StrictMode double mount.

### Testing seams and fixtures

- S1 `MapsAdapter` (port in `adapters/maps/port.ts`): features receive it as a prop; tests inject a fake; the adapter test fakes `@vis.gl/react-google-maps` and a `PlaceAutocompleteElement` class and asserts `fields` exactly `['location']`, `travelMode` `'WALKING'`, `fields` `['distanceMeters', 'durationMillis']`, one call each, cache hit, failures to fixed errors.
- S2 `e2e/nearest-station.e2e.ts`: a fake `google.maps` served by `page.route` at `https://maps.googleapis.com/maps/api/js*` (so the enforced `script-src` is exercised), synthetic coordinates, fake key `fake-key-for-tests`, geolocation permission denied or granted through the Playwright context, and an `/api/*` request listener asserting no coordinate.
- S3 `e2e/headers.e2e.ts` and `apps/web/src/headers.test.ts`: enforced header present, Report-Only absent, blocked-resource control.
- Check plan: each criterion maps to a test named with `METRO-88` and its criterion id; on base the page, adapter and header do not exist, so the tests fail.

### Review needs

Independent review (code). Owner: the live check before merge.

## Unverified items

Routes SKU of the JS call; autocomplete requests per keystroke; whether a Maps-library load without a map is free; the CSP extras above; real shadow-DOM labelling of `PlaceAutocompleteElement` for screen readers (the e2e fake cannot show it); `google.maps.version` at runtime; production edge behaviour of `_headers`.

## Deviations from earlier docs

- ADR-0009 asks for `["location", "formattedAddress"]`: this slice requests `location` only because no map is shown.
- ADR-0009 moves focus to the search input after a geolocation error: the shadow DOM input is not reachable, so focus moves to the alert (`tabIndex=-1`, existing outline), and the alert is not an `aria-describedby` target of the input.
- Origin of the fare is the nearest station and is not changeable in this slice; the destination is chosen.
