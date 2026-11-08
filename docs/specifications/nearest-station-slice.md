# METRO-88: nearest station from a searched place (reference slice)

- Identity: METRO-88, slice `nearest-station-slice`; revision 1, 2026-11-07.
- Source: Plane work item METRO-88 (read as data). Foundation blueprint v4, decisions D6, D7, D13 (owner-approved, not committed).
- Decision owner and approval: on 2026-11-07 the owner gave the orchestrator a standing delegation ("take the best decisions possible that makes sense for our project"). Under it the orchestrator decided the open points below (library order, fare shape, location-only fields, the CSP host list, caps, live check). The CSP switch to enforced is owner-approved in blueprint D13 (see ADR-0011), and free-tier discipline is the owner's constraint (spend nothing beyond the free tier). The implementer chose the focus-on-alert deviation and the orchestrator accepted it. Ticket default (a), a manual live run under the enforced CSP, was confirmed by the owner on 2026-11-07 ("go with your recommendation").
- Research (labels: Repo-verified, Context7-verified, Web-verified, Unverified; Context7 library `/websites/developers_google_maps_javascript` and `/visgl/react-google-maps`, web pages read 2026-11-07):
  - Context7-verified: `PlaceAutocompleteElement` fires `gmp-select`; `placePrediction.toPlace()` then `fetchFields({ fields })` ends the session and carries the session token automatically; `Route.computeRoutes` needs `fields`, takes `travelMode: 'WALKING'`; `@googlemaps/js-api-loader` v2 exposes `setOptions({ key, v })` once and `importLibrary(name)` (ADR-0009, Context7-verified 2026-11-05).
  - Web-verified ([pricing](https://developers.google.com/maps/billing-and-pricing/pricing), undated page): free caps per month are Autocomplete Requests 10,000, Autocomplete Session Usage unlimited, Place Details Essentials 10,000, Place Details Pro 5,000, Compute Routes Essentials 10,000, Pro 5,000, Enterprise 1,000, Dynamic Maps 10,000. [Routes billing](https://developers.google.com/maps/documentation/routes/usage-and-billing): Essentials is "basic features, up to 10 intermediate waypoints"; Pro needs traffic-aware modifiers. Unverified: the page does not name WALKING, so Essentials is inferred. The SKU of the JavaScript `Route.computeRoutes` call itself is Unverified.
  - Web-verified ([CSP guide](https://developers.google.com/maps/documentation/javascript/content-security-policy)): Google's samples list `script-src` (self, `*.googleapis.com`, `*.gstatic.com`, `'unsafe-eval'`, `blob:`), `img-src`, `connect-src`, `style-src`, `font-src`, `worker-src blob:` and `frame-src`. They are written for a map page. Whether a map-less Places and Routes page needs `'unsafe-eval'`, `blob:`, inline styles, fonts or frames is Unverified until the live check.
  - Repo-verified: `findNearestStation`, `findFare`, `baselineDataset`, `datasetProvenance` live in `packages/core/src`; the web app may import only core's public entry (ADR-0018).
- Domain: [glossary](../product/glossary.md) (Location, Nearest, Geographic distance, Walking distance, Origin / destination, Same station, Fare), [nearest-station](nearest-station.md), [ADR-0009](../adr/0009-maps-provider-design.md), [maps design](maps-provider-design.md), [ADR-0011](../adr/0011-security-headers.md), ADR-0018.
- Problem and intended outcome: one complete, tested feature that later features copy. A user searches a place (or presses "Use my location") and sees the nearest Line 6 station, its straight-line distance, a walking route distance and time, and the fare from that station to a destination they pick, with the fare notice and last-checked dates. The position goes to Google only. The CSP is enforced.
- Scope: core exports what is missing (`datasetProvenance`); `apps/web/src/adapters/maps` (the only code that imports the Maps library); `apps/web/src/features/nearest-station`; routing the slice (first at `/nearest`, at `/` since METRO-93); an e2e journey with axe; enforced CSP with the Google hosts; `golden-path.md`; a manual live check script; a dependency rule keeping the Maps library inside the adapter.
- Exclusions: a map, markers, `displayName` or `formattedAddress` (no map, so no Places address is shown, ADR-0009 attribution rule), card discounts, concessions, Kamalapur, a CSP report endpoint, a new package, any server feature, any change to `/api/*`. The earlier placeholder page at `/` and its status route were retired by METRO-93.
- Constraints and contracts: no Google key in the repository (public build-time name `VITE_GOOGLE_MAPS_API_KEY`, owner supplies it); fixed error copy only; no coordinate in any `/api/*` request; no automated run ever calls a real Google endpoint.
- Grouping: module 03 feature parity and accessible web UX; release v1.0.0.
- Open decisions: none that block; see "Unverified" and "Deviations".

## Slice nearest-station-slice

- Title and outcome: search a place, see nearest station, distances, walking route and a fare.
- Scope and exclusions: as above.
- Blocked by: METRO-87 (merged).
- Required tools and data: `baselineDataset`, Vitest/happy-dom, Playwright with a Google stub, a fake key string.

### Library decision

On 2026-11-07 the owner asked whether `@vis.gl/react-google-maps` was better and delegated the choice ("see what makes most sense"). The orchestrator chose to try it first and fall back to `@googlemaps/js-api-loader` if it broke the bundle budget; it did. Measured on this slice (`bun run build` then `bun run bundle:check`; budget 250,000 raw and 80,000 gzip bytes; Repo-verified):

| Build                                                                | Raw bytes | Gzip bytes |
| -------------------------------------------------------------------- | --------- | ---------- |
| Base (`2f0bd88`, scaffold only)                                      | 225,877   | 70,421     |
| Slice with `@vis.gl/react-google-maps` 1.10.2                        | 264,660   | 84,184     |
| Slice code and core data only (vis.gl aliased to a stub, experiment) | 240,226   | 75,942     |
| Slice with `@googlemaps/js-api-loader` 2.1.3 (shipped)               | 242,663   | 76,956     |

vis.gl alone cost about 24.4 KB raw and 8.2 KB gzip (its Map, marker and 3D code is not tree-shaken out) and broke both limits, so the shipped adapter uses `@googlemaps/js-api-loader` 2.1.3 (published 2026-09-22) directly, as ADR-0009 already said. It also avoids vis.gl always loading the `maps` library. `@types/google.maps` 3.66.9 is a dev-only types package; it needs `skipLibCheck: true` in `apps/web/tsconfig.json` and `tsconfig.dom-test.json` because its own declarations fail `exactOptionalPropertyTypes` (TS2420, lines 13527 and 16448 of its `index.d.ts`); the rest of the repository keeps `skipLibCheck: false`. Only `apps/web/src/adapters/maps` may import the loader (rule `maps-library-only-in-maps-adapter`, proven red per import form). The provider mounts only with the slice, so the script loads on `/nearest` only, once (a module-level promise is shared by StrictMode re-runs and remounts).

The key is read at build time. `bun run build` has none unless the owner's root `.env` supplies it (`envDir` is the repository root; only `VITE_` names reach the bundle). `bun run smoke` rebuilds the web app with `VITE_GOOGLE_MAPS_API_KEY=fake-key-for-tests` (a process variable beats a `.env` file) so the journey runs the Maps path, and Vitest blanks the key.

### Pinned Maps version

`v=3.66` (Web-verified 2026-11-07: weekly is 3.66; four numeric versions are supported at any time; mid-November quarterly becomes 3.66; a deleted number silently falls back to the default channel). `@types/google.maps` is 3.66.x. Quarterly bump. The live check prints `google.maps.version` and fails if it does not start with `3.66`, so a silent fallback is detected (Unverified until run that the property exists at runtime).

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
6. Nothing from Google is stored, logged or put in a URL (ADR-0009). Consent line (the exact text is `copy.consent`): "Your position and the place you choose are not sent to our server. What you type in the search goes to Google to suggest places. Your position goes to Google only to work out the walking route."

### Free-tier plan

The owner must pay nothing. Calls made and their SKU (pricing re-read 2026-11-07; the page is undated):

| Call                                                         | SKU                                                                                               | Free cap per month                       | Status                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------ |
| Autocomplete (element, per keystroke after its own debounce) | Autocomplete Requests, then Session Usage after 12 when the session ends with an Essentials field | 10,000 requests; Session Usage unlimited | Web-verified from pricing and session docs |
| `fetchFields(['location'])`                                  | Place Details Essentials                                                                          | 10,000                                   | Web-verified (`location` is Essentials)    |
| `Route.computeRoutes`, WALKING, distance and duration only   | Compute Routes Essentials (inferred), budget at Pro                                               | 10,000 Essentials, 5,000 Pro             | Inferred; JS-library SKU Unverified        |
| Maps JavaScript API load with no map                         | no map load is created (no Dynamic Maps SKU)                                                      | 10,000 Dynamic Maps                      | Unverified                                 |

Frugality built in: one `fetchFields` per selection; one route request per (origin, station) pair with an in-flight and result cache; no request per render or per keystroke of ours; no retries; the API is loaded once (StrictMode-safe: a module-level promise is shared) and only the `places` and `routes` libraries are imported, never `maps`; with no key nothing loads. Limit: the element does its own autocomplete requests per keystroke and exposes no documented minimum-character or debounce setting (Unverified; the live check counts Places requests per search). If that is wasteful, the fallback is a custom combobox on `AutocompleteSuggestion.fetchAutocompleteSuggestions` with our own debounce and minimum length (a new decision).

Owner action, a hard stop: set a daily quota cap per API (a budget alert does not stop spending; quota caps do). Caps are project quotas, not per key (Unverified here: confirm in the console), so keys in one project share them. Each cap times 31 days stays under the SKU's monthly free cap with a margin: Autocomplete requests 300 per day (9,300 of 10,000), Place Details 300 (9,300 of 10,000 Essentials), Maps JavaScript 300 (9,300 of 10,000), Routes 150 (4,650 of 5,000, sized against Pro until a bill shows Essentials). They supersede the 330 and 160 in ADR-0009, whose Autocomplete figure (330 x 31 = 10,230) exceeded the free cap. Also restrict the key to the Maps JavaScript, Places (New) and Routes APIs and to HTTP referrers (localhost, 127.0.0.1 and the production origin). Steps are in [golden path](../agents/golden-path.md).

### CSP plan

Switch `Content-Security-Policy-Report-Only` to enforced `Content-Security-Policy` (ADR-0011 amendment). Strict nonce CSP is impossible from static `_headers`, so an allowlist with exact hosts, not Google's wildcard samples. Added (each with reason):

- `script-src 'self' https://maps.googleapis.com https://maps.gstatic.com`: the loader injects `https://maps.googleapis.com/maps/api/js` and the API loads its chunks (Web-verified from the sample; the exact chunk host is Unverified).
- `connect-src 'self' https://maps.googleapis.com https://places.googleapis.com https://routes.googleapis.com`: the API's own calls, Places (New) and Routes (host names Web-verified from the REST references; that the JS library uses exactly these is Unverified).
- `img-src 'self' data: https://maps.gstatic.com https://maps.googleapis.com`: the "Powered by Google" attribution and icons in the suggestion list (Unverified).

Added after the first live run (2026-11-08, METRO-96; Confirmed blocked, fix Unverified until the owner re-runs): `style-src https://fonts.googleapis.com` and two `sha256` hashes for inline styles, plus `font-src https://fonts.gstatic.com` (whether fonts are needed is Unverified; the hashes may be `<style>` elements or attributes, Unverified). The widget's shadow root is inferred to be closed (Unverified); Autocomplete requests per search by script, the accessibility tree and the Routes SKU remain open. Not added because nothing justifies them yet (all Unverified; the live check settles them): `'unsafe-eval'`, `blob:`, `worker-src`, `style-src` `'unsafe-inline'`, `frame-src`. If the live run prints a violation for one, add only that, with the message as evidence. Ticket default (a), confirmed by the owner on 2026-11-07 ("go with your recommendation"), needs the owner-run live check before merge.

### Behaviour notes

- Latest action wins. A position fix that arrives after the user chose a place, or after another press of the button, is ignored. A place chosen later overrides an earlier fix. The place search ignores the earlier of two overlapping selections: its `fetchFields` still runs (one extra Place Details call in that rare case) but its result is dropped.
- Pressing "Use my location" again returns a slightly different fix. The route cache key rounds both points to 4 decimals (cells about 11 m north-south and 10 m east-west at Dhaka's latitude, up to about 15 m diagonally), so a repeat that lands in the same cell costs no new route request; two fixes a few metres apart can still straddle a cell edge and cost one.
- A new result moves focus to its heading ("Nearest station: <name>", `tabIndex=-1`) so a screen reader announces the station; the route and fare `<output>` elements are mounted with the result and updated in place. Announcement and live-region timing still need a manual screen-reader pass.
- Changing the origin station forgets the chosen destination; every path routes to the slice (METRO-93; it was `/nearest` and `/nearest/` before).
- The fare shows `Fare.currency` and `Fare.amount` as core defines them; `datasetProvenance` is frozen at every level.

### Failure and boundary checks

Missing key; script blocked; `gmp-error`; `fetchFields` rejects or returns no location; `computeRoutes` rejects or returns no route; geolocation denied, unavailable, timeout and absent; invalid coordinate; destination equal to origin; a second `gmp-select` during an in-flight fetch; StrictMode double mount.

### Testing seams and fixtures

- S1 `MapsAdapter` (port types in `adapters/maps/context.ts`): features receive it as a prop; tests inject a fake; the adapter tests fake the loader and a `PlaceAutocompleteElement` element and assert `fields` exactly `['location']`, `travelMode` `'WALKING'`, `fields` `['distanceMeters', 'durationMillis']`, one call each, cache hit, failures to fixed errors.
- S2 `e2e/nearest-station.e2e.ts`: a fake `google.maps` served by `page.route` at `https://maps.googleapis.com/maps/api/js*` (so the enforced `script-src` is exercised), synthetic coordinates, fake key `fake-key-for-tests`, geolocation denied or granted through a deterministic `navigator.geolocation` init script (the real browser permission flow is not exercised), and an `/api/*` request listener asserting no coordinate.
- S3 `e2e/headers.e2e.ts` and `apps/web/src/headers.test.ts`: enforced header present, Report-Only absent, blocked-resource control.
- Check plan: each criterion maps to a test named with `METRO-88` and its criterion id; on base the page, adapter and header do not exist, so the tests fail.

### Review needs

Independent review (code). Owner: the live check before merge.

## Risks

| Risk                                                                     | Handling                                                                                                                      |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| A billable call per keystroke from the element, outside our control      | Unverified count; the live check prints it; fallback is a custom combobox (new decision). Daily quota caps are the hard stop. |
| The enforced CSP blocks a Google host or feature the stub cannot show    | Exact hosts only; the owner-run live check must pass before merge; add only what a printed CSP line proves.                   |
| Real widget accessibility differs from the e2e fake                      | Manual screen-reader pass; the fake is labelled as a fake in `e2e/maps-stub.ts`.                                              |
| A silently deleted pinned Maps version falls back to the default channel | The live check fails unless `google.maps.version` starts with `3.66`; bump quarterly.                                         |
| Free-tier numbers change (the pricing page is undated)                   | Re-read the page on each implementation; caps are project quotas set by the owner.                                            |
| A future test reaches real Google with the fake key                      | The shared e2e fixture aborts and fails any unstubbed Google request.                                                         |
| Google types leak into features through the ambient global               | `scripts/google-containment.test.ts` fails on `google.maps` or `window.google` outside the adapter.                           |
| WebKit logs its own select stylesheet under the CSP                      | Tolerated once per test by exact match, WebKit only, kept honest by a test.                                                   |

## Unverified items

Routes SKU of the JS call; autocomplete requests per keystroke; whether a Maps-library load without a map is free; the CSP extras above; real shadow-DOM labelling of `PlaceAutocompleteElement` for screen readers (the e2e fake cannot show it); `google.maps.version` at runtime; production edge behaviour of `_headers`.

## Deviations from earlier docs

- ADR-0009 asks for `["location", "formattedAddress"]`: this slice requests `location` only because no map is shown.
- ADR-0009 moves focus to the search input after a geolocation error: the shadow DOM input is not reachable, so focus moves to the alert (`tabIndex=-1`, existing outline), and the alert is not an `aria-describedby` target of the input.
- The slice was first routed at `/nearest`; METRO-93 moved it to `/` (every path serves it).
- The element sets its own autocomplete request rate; the minimum-character and debounce control asked for in the orchestrator's brief (the Plane ticket does not mention it) is not available on `PlaceAutocompleteElement` (see Free-tier plan).
- The harness rebuilds the web app with the fake key inside `bun run smoke` (see Library decision), because the key is compiled in and CI builds without one.
- Origin of the fare is the nearest station and is not changeable in this slice; the destination is chosen.

## Accessible name of the place search (METRO-101, 2026-11-08)

Observed (owner probe 2026-11-08, relayed, not re-run by an agent): the real `PlaceAutocompleteElement` exposes `combobox "Search For a Place"`, then `button "Use my location"`. Our visible label was "Search for a place in Dhaka".

Research (2026-11-08):

- No property, attribute, slot or part sets the input's accessible name or ARIA label. The element's documented properties include `description`, `placeholder` and `name` (a form field name), and no `ariaLabel`, `label` or labelled-by option (Repo-verified in `@types/google.maps` 3.66.9; Context7-verified against the places-widget reference; Web-verified on the official reference and the place-autocomplete guide, which says only "Enhanced accessibility, including support for screen readers and keyboard interaction").
- `description` is documented as "detected by screen readers when the input element is focused" and links `aria-describedby`: a description, not a name (Repo-, Context7- and Web-verified).
- Whether an `aria-label` or `aria-labelledby` set on the host reaches the inner combobox: Unverified. The documentation is silent, the host sits outside the shadow root, and ARIA on a role-less custom element is not a documented route. Not used.
- Whether the name "Search For a Place" comes from Google's default `placeholder` text: Unverified (a hypothesis only).

Decision: WCAG 2.5.3 Label in Name needs the visible label text to be contained in the accessible name, compared case-insensitively. Google's name is fixed, so the visible label is now exactly "Search for a place", which "Search For a Place" contains. The "Dhaka" meaning moves to a separate visible hint, "Suggestions favor places in Dhaka.", passed to the element as `description` (the one supported accessibility hook). The group (`fieldset` with `aria-labelledby` the visible label) is kept. No custom combobox, no CSP change, no host ARIA.

Verified by stub only: the e2e fake copies the measured name and the `description` option; the unit tests assert the adapter passes `description`, and the e2e asserts label-in-name, the visible hint, the described-by wiring, axe, and the unchanged Tab order (search, then Use my location).

Unverified until the owner runs `bun run smoke:live` (METRO-100): the real widget's accessibility tree. Expect `combobox "Search For a Place"` (or a name that contains "search for a place", ignoring case), its description reading "Suggestions favor places in Dhaka." if Google wires `description` as documented, one Tab stop for the search, then `button "Use my location"`, and no axe violation. If the name differs, or the description is absent, record it on METRO-101.
