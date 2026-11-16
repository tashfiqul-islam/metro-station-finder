# ADR-0009: Maps, Places, Routes and geolocation design

- Status: Accepted
- Date: 2026-11-05
- Ticket and specification: METRO-39; [maps-provider-design](../specifications/maps-provider-design.md), revision 2026-11-05-r2. Decisions below were delegated to the agent by the owner and are recorded as Accepted on that basis. No map code exists yet; this ADR binds the first map slice.

## Context

The legacy app loaded Google Maps with an unpinned script URL and a catch that only logged. The public site showed a Maps failure with the location input disabled, and nothing proved Places or walking routes worked ([feature parity](../product/feature-parity.md), R1 to R5). The legacy key was deleted on 2026-11-05 ([ADR-0004](0004-supply-chain-and-ci-policy.md)). A key used from a browser is public; only restrictions and quotas protect the budget ([security](../agents/security.md)).

Facts used, all read 2026-11-05. Google's pricing page has no date, so every figure must be re-checked when the first map slice is built.

- Web-verified, [pricing](https://developers.google.com/maps/billing-and-pricing/pricing): Dynamic Maps (Essentials) 10,000 free per month; Autocomplete Requests 10,000 free; Autocomplete Session Usage unlimited free; Place Details Essentials 10,000 free; Place Details Pro 5,000 free; Compute Routes Essentials 10,000 free, Pro 5,000 free.
- Context7-verified (`/googlemaps/js-api-loader`, MIGRATION.md and README): v2 uses `setOptions({ key, v, channel, ... })` once, then `importLibrary("maps")`; in v2 `libraries` only preloads.
- Context7-verified (`/websites/developers_google_maps_javascript`, [place-autocomplete-new](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new), [place-autocomplete-data](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data)): `PlaceAutocompleteElement` fires `gmp-select`; `placePrediction.toPlace()` then `fetchFields({ fields })` ends the session and passes the session automatically.
- Context7-verified (same library id, [route reference](https://developers.google.com/maps/documentation/javascript/reference/route)): the `routes` library has `Route.computeRoutes` with `travelMode`, `fields` and `polylineQuality`.
- Web-verified, [Place Details fields](https://developers.google.com/maps/documentation/places/web-service/place-details): `id` is Essentials IDs Only; `location` and `formattedAddress` are Essentials; `displayName` is Pro.
- Web-verified, [session pricing](https://developers.google.com/maps/documentation/places/web-service/session-pricing): a session ended by Essentials fields bills the first 12 autocomplete requests as Autocomplete Requests and later ones as Session Usage (free). IDs Only bills every request as Autocomplete Requests. An abandoned session bills Autocomplete Requests.
- Web-verified, [accessible markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/accessible-markers): `gmpClickable: true` accepts keyboard input and fires `gmp-click`; `title` is read by screen readers; arrow keys move between markers.
- Context7-verified (same library id, [add-marker](https://developers.google.com/maps/documentation/javascript/advanced-markers/add-marker)): a map ID is required for Advanced Markers; `DEMO_MAP_ID` can be used for testing.
- Web-verified, [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies): Place IDs may be stored indefinitely; extra attribution is not needed when Places content is on a Google Map that already shows its attribution; other caching is governed by the Maps service terms, which could not be read in full (Unverified).
- Web-verified, [MDN getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition): HTTPS and permission are required; `timeout` defaults to infinity; the error codes (permission denied, position unavailable, timeout) come from the Geolocation specification, not that page.
- Web-verified, [API security best practices](https://developers.google.com/maps/api-security-best-practices): use Websites (HTTP referrer) restrictions plus API restrictions for browser keys; the page does not describe usage caps or budgets (those facts are Unverified).
- Repo/gcloud-verified read-only by the coordinator, 2026-11-05: the dev key `metro-station-key-dev` is restricted to referrers localhost, 127.0.0.1 and `*.tashfiq61.workers.dev` and to the APIs Maps JavaScript, Places and Routes. It is not the legacy key, which is deleted.

> Amendment 2026-11-07 (METRO-88). This note supersedes three statements and records one change of means; no other Decision text changes. Under the owner's standing delegation of 2026-11-07 ("take the best decisions possible that makes sense for our project"): (1) "Session handling": "we call `fetchFields` with Essentials fields only: `["location", "formattedAddress"]`" becomes `["location"]` only. The orchestrator decided this because the first slice shows no map and the attribution rule forbids showing a Places address without one. (2) "Geolocation consent": "Focus moves to the search input, and the alert text is referenced by the input's `aria-describedby`" becomes: focus moves to the alert (`tabIndex=-1`). This was the implementer's choice, accepted by the orchestrator, because the input lives in Google's shadow root and cannot be targeted or described from outside. (3) "Quota and billing alert" (decided by the orchestrator): the daily caps are now Autocomplete 300, Place Details 300, Maps JavaScript 300 and Routes 150, because 330 x 31 days exceeded the 10,000 free cap; see [the runbook](../agents/maps-live-check-runbook.md). Not a supersession: the loader stays `@googlemaps/js-api-loader` 2.1.3 used directly, as "Loader and channel" says, after `@vis.gl/react-google-maps` 1.10.2 was tried and broke the bundle budget (264,660 raw and 84,184 gzip bytes against 250,000 and 80,000); see [the specification](../specifications/nearest-station-slice.md). The pinned `v` is `3.66`. The original Decision text below is left as written.

## Decision

We will use Google Maps Platform, called from the browser, with one referrer-restricted key per environment.

### Loader and channel

We will use `@googlemaps/js-api-loader` v2 (`setOptions` once, then `importLibrary` for `maps`, `marker`, `places`, `routes`), loaded lazily on the map view only, never on the fare page. Pin `v` to a version chosen and recorded in the first slice (not an unpinned default), and set `channel` per environment (`metro-dev`, `metro-prod`) so usage reports split by environment. The key comes from build-time public configuration; it is never treated as secret. A load failure shows a visible error with retry and leaves fares and station lists working.

### Browser or Worker

Decision: browser calls for Maps, Places and Routes (the JavaScript `routes` library). We reject a Worker proxy for v1: it would need a second, secret key, send user coordinates through our server, and gain no caching (Google content may not be cached freely). It adds a secret and an abuse surface; the only thing it buys is a place to rate limit.

Revisit trigger: the first slice must test whether the dev key accepts the JavaScript Routes call (Unverified). If it does not, or if usage shows abuse, move Routes only to a Worker by a new ADR. That Worker key could not be IP-restricted: Workers have no stable egress IP (Inferred, Unverified). The real mitigations would be the API restriction, daily quota caps, a budget alert, a per-client rate limit, and rotating the key on abuse.

### Session handling

We will use `PlaceAutocompleteElement`, which carries the session token itself. On `gmp-select` we call `fetchFields` with Essentials fields only: `["location", "formattedAddress"]`. We will not request `displayName` or any Pro field. After a selection or an abandoned search the element starts a fresh session; the code must not reuse a finished session.

### Stored and non-storable

We may store: station identifiers (our own data) and Google Place IDs. We will not store or cache anything else from Google: not coordinates, addresses, routes, polylines or distances, in any database, KV, cache, URL or log. A selected place or device position stays in memory for the current search only. Station coordinates are our own dataset (METRO-40), not Google content. Because the terms were not fully read, the rule is "store nothing but Place IDs" until the owner confirms more.

### Attribution

Places results (the selected address) are shown only with the Google map, which shows its own attribution; the logo is never covered or cropped (Web-verified, Places policies). If a Places address is ever shown outside the map, add "Google Maps" text (`translate="no"`, 4.5:1 contrast) beside it. We will not show Places data in a list that has no map.

### Quota and billing alert

One assumption drives the numbers: budget Routes at the Pro price (5,000 free per month) until the first bill shows the WALKING call is Essentials. The pricing page does not name WALKING (Unverified). Cost design: one route request per explicit user search, for the single nearest station, never per station and never while typing; WALKING, minimal `fields`, no traffic options.

The owner (METRO-57) sets, in the Cloud console, one daily quota cap per API, and a budget alert at 50, 90 and 100 percent of a low fixed amount. Caps are owner-adjustable starting points, each about one thirtieth of the free tier:

| API                         | Daily cap | Why                                                                                                                                                          |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Routes                      | 160       | 5,000 Pro free per month divided by 30                                                                                                                       |
| Maps JavaScript (map loads) | 300       | 10,000 free per month divided by 30                                                                                                                          |
| Place Details               | 300       | 10,000 Essentials free per month divided by 30                                                                                                               |
| Autocomplete requests       | 330       | 10,000 free per month divided by 30; a search can send many requests (the first 12 per session are billed), so this is about 27 full searches a day, not 330 |

A budget only alerts; it does not stop spending, so the quota caps are the real limit (Unverified: confirm cap names in the console). When a cap is hit Google returns an error, which the app shows as the provider-error state.

### Key restrictions

Two keys, both restricted by API (Maps JavaScript API, Places API (New), Routes API, nothing else) and by HTTP referrer. Development: the owner's existing dev key `metro-station-key-dev` (see Context; not the deleted legacy key). Production: created later by the owner under METRO-57, referrers `https://metro-station-finder.com/*` and `https://www.metro-station-finder.com/*` only. The production key is never used from preview or localhost. Referrer strings include the scheme and host. Agents never create or read keys; no key value enters the repository, logs or tests (tests use a fake key string).

### Map ID and content security

Advanced Markers need a map ID. Dev uses `DEMO_MAP_ID`; production uses a real map ID created by the owner (METRO-57), set in public configuration. When security headers land (METRO-31, PR 44) the content security policy must add the Google script, style, image and connect hosts the Maps JavaScript API needs; the first slice reads Google's current CSP guide then.

### Geolocation consent

Device location is optional. The page never calls `getCurrentPosition` on load. The user presses a button "Use my location"; a short line beside it says: "To find your nearest station, your position is sent to Google only to compute the route to it. It is not saved and not sent to our server." The nearest station is chosen in the browser from our own dataset; Google receives the position only in the walking-route request (C4). The call uses `timeout: 8000` (10000 until METRO-113, see the 2026-11-09 amendment), `maximumAge: 0`, `enableHighAccuracy: false`. Denied, unavailable and timed-out states each show a message in a `role="alert"` element ("Location is turned off. Search for a place instead." and similar). Focus moves to the search input, and the alert text is referenced by the input's `aria-describedby` so it is read with the input and not cut off. Manual search is always visible and works whether or not location was tried. The position is never logged, stored or put in a URL, and logs carry only the outcome (granted, denied, unavailable, timeout).

### Accessibility

Every station marker is an `AdvancedMarkerElement` with `gmpClickable: true` and a `title`, so it is reachable by keyboard. A visible text list of the same stations (name, geographic distance) exists beside the map and is the primary reading path; the map is an enhancement. Walking distance and geographic distance stay separate labels ([UI](../agents/ui.md)). When the provider itself is down, manual search falls back to a station dropdown and list built from our local dataset; no provider is needed for it.

### Alternative map stack

Default stays Google. We use an alternative (for example MapLibre with another provider) only if cost or policy blocks Google at implementation; that needs a new ADR.

## Consequences

- Easier: one provider, one loader, no server secret, fares work when maps fail.
- Harder: the browser key is visible, so safety depends on referrer and API restrictions plus daily caps set by the owner. Nothing from Google can be cached to save cost.
- Revisit: Google pricing and field tiers (undated page) on every implementation and upgrade; Routes referrer support; the Maps service terms on storage; the `v` pin each quarter.
- Owner work: dev key check, production key, map ID, caps and budget under METRO-57.
- The glossary term "Location" means a search-selected place, not a device position; METRO-40 should update it.

## Alternatives considered

- Worker proxy for all calls: rejected for v1, reasons above.
- Legacy `@react-google-maps/api` and script tag: rejected; unpinned, hides load errors.
- `getCurrentPosition` on page load: rejected; prompts without a gesture and fails the denied flow.
- Request `displayName`: rejected; Pro tier cost with no need.
- Non-Google stack now: rejected; no cost or policy block shown today.

## Confirmation

- `scripts/maps-design.test.ts` checks this ADR. No map code exists yet; the first map slice must add its own checks.

## Amendment 2026-11-08 (METRO-100): quota caps as set

This adds to the 330 and 160 cap table above; it does not change the decision to cap each API per day. The caps as reported by the owner from the Cloud console on 2026-11-08 (not re-read by an agent), by row name, with the monthly arithmetic (31-day month) against Google's free caps (Web-verified on the undated pricing page):

- Maps JavaScript, "Map loads per day": 300. 300 x 31 = 9,300, under 10,000 Dynamic Maps.
- Places API (New), "AutocompletePlacesRequest per day": 100. 100 x 31 = 3,100, under 10,000 Autocomplete Requests.
- Places API (New), "GetPlaceRequest per day": 100. 3,100, under 10,000 Place Details Essentials.
- Routes, the "Compute Routes" per-day row: 100. 3,100, under 10,000 Compute Routes Essentials and under 5,000 Pro.

These replace the 330 and 160 numbers (330 x 31 = 10,230 exceeded 10,000) and the 300, 300, 300 and 150 proposed in the specification [nearest-station-slice](../specifications/nearest-station-slice.md) and in the runbook's earlier plan. A search sends about nine Autocomplete requests (10 Places requests measured, one of them Place Details; Inferred), so 100 per day allows at most about eleven searches a day (a ceiling: a failed search still burns about nine). The Routes SKU actually billed stays Unverified until the Billing report shows it ([runbook](../agents/maps-live-check-runbook.md)). The `font-src` entry `https://fonts.gstatic.com` stays, decided in METRO-100.

## Amendment 2026-11-08 (METRO-103): device accuracy

This adds to the decision; the options and text above are unchanged. The geolocation result now also carries `coords.accuracy`, kept in the browser like the position (never logged, stored or sent to our Worker). `enableHighAccuracy` stays false: the owner measured 25,000 m on a desktop Chrome without GPS for both the normal and the high-accuracy request (relayed, not re-run by an agent), so it gains nothing there. `coords.accuracy` is a radius at a 68 percent confidence level (Web-verified: MDN and the W3C specification), so the check below is probabilistic. A fix with accuracy at most `GOOD_FIX_METERS` = 100 m is treated as reliable (a product judgment, Inferred; worst case the runner-up is within 200 m of equal). Above that, a fix whose accuracy circle could contain a nearer station than the one found (runner-up not farther than nearest by more than twice the radius, a sufficient bound), or whose accuracy is missing or invalid, is not presented as the nearest station and triggers no Routes call. See the [specification](../specifications/nearest-station-slice.md).

## Amendment 2026-11-09 (METRO-113): the device position stays on the device, 8 s

This adds to the decision; the options and text above are unchanged. The location flow of the Nearby screen now shows the nearest station, an estimated straight-line distance, the fare range and the two next-nearest stations from the device position without any request: a device fix asks Google for nothing, not even a walking route, until the route slice (METRO-114) decides it. `getCurrentPosition` now uses `timeout: 8000` (the handoff, was 10000), `maximumAge: 0` and `enableHighAccuracy: false`; a timeout reads as "unavailable". A 10 s watchdog in `locate()` (the 8 s limit plus margin) also resolves "unavailable" when the browser never calls back (the permission prompt is not part of the browser's timeout, so a prompt left open longer than that also reads as unavailable, and a later answer to it is ignored). `getCurrentPosition` and the `navigator.geolocation` getter are guarded, because some restricted contexts throw instead of calling the error callback (the cause is dropped, never shown or logged). Web-verified (MDN, Context7): `timeout` is the maximum time in milliseconds the device may take; whether the browser excludes the permission-prompt time from it is Unverified here.

## Amendment 2026-11-09 (METRO-114): Google loads on demand, one route per result

This adds to the decision; the options and text above are unchanged. Nothing from Google loads with the page. The Maps script (Places and Routes libraries, one request) loads when something asks: the first focus of the place search, or the first walking route. The search is a plain input until then; when the Places library arrives `PlaceAutocompleteElement` replaces it and keeps focus and the typed text. No Google map is drawn: the SVG line map is the map, so the Maps JavaScript "map loads" quota counts script loads with no map, as before (Unverified whether such a load is billed). Autocomplete sessions: the element creates and ends its own session token; `fetchFields` on the `Place` from `toPlace()` carries it and ends the session (Context7-verified, 2026-11-09, Google's `PlacePrediction.toPlace` and session-token pages). The app creates and passes no token, because the element has no documented way to take one. A walking route is requested once per result, only for a good device fix or a chosen place, never for a rough position or a picked station; the user's position goes to Google only for that route. The caps are unchanged (map loads 300, Places 100, Routes 100 per day).

## Amendments 2026-11-17 (METRO-162): the redesign

These six notes record amendments 1 to 6 of the redesign proposal ([metro-station-finder/planning#156](https://github.com/metro-station-finder/planning/issues/156), design handoff revision 10, "ADR amendments this design needs"), approved there on 2026-11-17 by the coordinator under the owner's standing delegation, ticket metro-station-finder/planning#162 (METRO-162). Each supersedes only the sentences it quotes; the decision to call Google from the browser, with one referrer-restricted key per environment and the console caps, is unchanged, and the accepted text above is left as written. No code changes in this record: each effect below is work for the ticket that follows it. Labels: "Web-verified 2026-11-17" marks a pricing or API fact taken from the proposal's text, not re-read by this pull request; "Repo-verified" marks a file read in the repository at base c547ee0; "Unverified" is stated with its reason. No price appears here, only billing line names.

### Amendment 1: cost design, a route matrix picks the station

- Supersedes: "Cost design: one route request per explicit user search, for the single nearest station, never per station and never while typing; WALKING, minimal `fields`, no traffic options." (Quota and billing alert), and "A walking route is requested once per result" (METRO-114 amendment).
- New rule: a plan costs one `RouteMatrix.computeRouteMatrix` of four elements (one origin and the four stations closest in a straight line; reversed for From metro) in the selected mode, then one `computeRoutes` for the winner, then one more `computeRoutes` for each switch of the Compared option. The rest of the METRO-114 rule stays: never while typing, never for a rough position (METRO-103) and never for a picked station. Walking sends no routing preference; Car sends `TRAFFIC_AWARE`. Slower walking pace is a client-side multiplier of 1.6 on the returned times, with no Google call and no "avoid indoor" option. Fields: matrix `condition`, `durationMillis`, `distanceMeters`; route `durationMillis`, `distanceMeters`, `path`, `legs`.
- Reason: "nearest by travel time" is the product's core claim, and it cannot be computed from one route. A straight-line shortlist of four keeps the matrix small.
- Cost, billing lines by name: Compute Route Matrix (billed per element, so four elements per plan) and Compute Routes at the Essentials, Pro or Enterprise tier. `TRAFFIC_AWARE` is a Pro feature by Google's own example (Web-verified 2026-11-17). The quota paragraph's assumption stands: budget Routes at the Pro price until the Billing report shows otherwise. Unverified: the tier of a WALKING request (Google's pricing page does not name it, as above); whether a field mask changes the tier; whether the JavaScript `routes` library bills like the REST API. The caps stay the console caps of the METRO-100 amendment (map loads 300, AutocompletePlacesRequest 100, GetPlaceRequest 100, Compute Routes 100 per day). The owner adds a cap row for matrix elements, sized to the free allowance, and one for Place Details (amendment 5); engineering never touches the console.
- Code and tests: `apps/web/src/adapters/maps/routes.ts` (today `travelMode: "WALKING"` with the fields `distanceMeters` and `durationMillis`) gains the matrix call; `apps/web/src/features/nearest-station/walking-route.ts` and `walking-route.test.tsx` change; the fakes in `e2e/maps-stub.ts` gain the matrix (Repo-verified, files exist).

### Amendment 2: travel modes, Walk and Car; Motorbike is not in v1

- Supersedes: "WALKING, minimal `fields`, no traffic options" as the only mode (same sentence as amendment 1).
- New rule: Car is added with traffic-aware routing, a higher billing tier than walking (Pro by Google's own example, Web-verified 2026-11-17). Motorbike is not in v1 (owner decision, 2026-11-17). The `TWO_WHEELER` travel mode is "Available only in the v=beta channel" in the pinned `@types/google.maps` 3.66.9 (Repo-verified: `node_modules/@types/google.maps/index.d.ts`, the `TravelMode` enum), "Loader and channel" pins `v` to a recorded version (3.66 since the METRO-88 amendment) and never uses an unpinned default, which a beta channel would be, and two-wheel routing is billed at the Enterprise tier (Web-verified 2026-11-17). The mode list is build configuration: Walk and Car. Motorbike returns only on the stable channel and with a separate yes from the owner.
- Offline: Car is disabled offline and the plan falls back to Walk with a notice; the saved mode is kept.
- Reason: the product needs a drive time in Dhaka traffic; the cost and channel of Motorbike are not accepted for v1.
- Cost: Car requests bill at a higher tier than Walk; the Routes cap and the budget alert are the limit, as before.
- Code and tests: the mode list, the offline fallback and the notice are in the pipeline and trip-options tickets this record unblocks.

### Amendment 3: when Google loads, on first interaction, with the schematic map until then

- Supersedes: "Nothing from Google loads with the page. The Maps script (Places and Routes libraries, one request) loads when something asks: the first focus of the place search, or the first walking route." only as to the `maps` library, and "No Google map is drawn: the SVG line map is the map" (both METRO-114 amendment).
- New rule: the Maps script, with the `maps` library, loads on the first interaction: the first focus of the search field, the first route request or the first map interaction. It does not load at app start; the handoff's "when the app starts" is the one point where this repository wins (the alternative the proposal offered, chosen on 2026-11-17). Until then, and when offline, after a load failure, on a refused key or when the map-load cap is hit, the schematic SVG line map is what is drawn. The `routes` and `places` libraries still load on first use. "Loaded lazily on the map view only, never on the fare page" stays.
- Reason: it stays closest to the METRO-114 rule (nothing from Google loads with the page), sends no visitor data to Google before an action, and keeps the Google script out of the first visit.
- Consequence: after the first interaction, loading the script sends the visitor's IP address and page URL to Google (Inferred: any third-party script load does). The privacy text and the "Geolocation consent" wording must say so when the base map ships; the consent line about the device position is unchanged.
- Cost: map loads that draw a map count against the Dynamic Maps cap (300 a day, METRO-100 amendment). Unverified, as in the METRO-114 amendment: whether a script load with no map is billed.
- Code and tests: the base-map ticket (last of the three below) changes `apps/web/src/adapters/maps/libraries.ts` (today `places` and `routes` only) and adds the interaction trigger.

### Amendment 4: markers and map ID, no `mapId`, no `marker` library, an SVG overlay

- Supersedes: the loader list "`maps`, `marker`, `places`, `routes`" ("Loader and channel"); "Every station marker is an `AdvancedMarkerElement` with `gmpClickable: true` and a `title`" ("Accessibility"); and the section "Map ID and content security" as to the map ID: "Advanced Markers need a map ID. Dev uses `DEMO_MAP_ID`; production uses a real map ID created by the owner (METRO-57)". Its sentence about adding Google hosts to the CSP is not superseded; the ADR-0011 amendment of 2026-11-17 amends how the CSP is written.
- New rule: no `mapId` and no `marker` library. The map is themed with styler arrays, which a `mapId` would disable. The line, stations, route, labels and the origin marker are our own SVG overlay positioned through an `OverlayView` projection. Keyboard and screen-reader access stay: station pins are focusable overlay groups with accessible names, and the visible station list stays the primary reading path.
- Reason: Advanced Markers require a map ID (Context7-verified 2026-11-05, Context above), and a map ID disables styler-array theming (Web-verified 2026-11-17, per the proposal). The schematic map already draws the line, pins and labels as SVG, which the overlay can reuse (Inferred).
- Cost: none added; one library fewer to load. The map-ID creation task under METRO-57 is withdrawn, and "Owner work: ... map ID ..." in Consequences no longer includes it.
- Code and tests: the map and overlay code stays inside `apps/web/src/adapters/maps/`, so `scripts/google-containment.test.ts` needs no change (Repo-verified, the test exists and checks that `google.maps` is used only in the adapter). The styler-array module does not exist yet (Repo-verified: nothing named `map-style` under `apps/web/src/adapters/maps/`); the base-map ticket adds it. `scripts/maps-design.test.ts` still finds `DEMO_MAP_ID` in the accepted text above, which is why that text stays.

### Amendment 5: sessions, `AutocompleteSuggestion` with our own token

- Supersedes: "We will use `PlaceAutocompleteElement`, which carries the session token itself. On `gmp-select` we call `fetchFields` with Essentials fields only: `["location", "formattedAddress"]`" ("Session handling"; the METRO-88 amendment had already cut it to `["location"]`), and "The app creates and passes no token, because the element has no documented way to take one" (METRO-114 amendment).
- New rule: `AutocompleteSuggestion.fetchAutocompleteSuggestions` with one `AutocompleteSessionToken` per search session, closed by one `fetchFields(["location"])` on the chosen suggestion's place. The label comes from the suggestion text, so `formattedAddress` is not requested. A finished token is never reused, and an abandoned session starts a new one. Volume rules (owner, 2026-11-17): no request under 3 characters, none while the station list already has an exact match, a debounce of 180 ms, and `includedRegionCodes: ["bd"]`. Still no `displayName` or any Pro field.
- Reason: the web component cannot take our token or apply the volume rules, so the cost per search could not be controlled; the input is now ours, which also ends the METRO-88 shadow-root limits on focus and labels.
- Cost, billing lines by name: Autocomplete Requests and Autocomplete Session Usage; the session ends with Place Details Essentials, where `location` is an Essentials field (Web-verified 2026-11-17, as in Context above). Per search, the first 12 requests bill as Autocomplete Requests and later ones as Session Usage when the session ends with an Essentials field (Context, Web-verified 2026-11-05). The request volume per search under the new rules is a measurement to take before launch (Unverified until then). The owner adds a Place Details cap row (amendment 1).
- Code and tests: `apps/web/src/adapters/maps/place-search.tsx` and `place-search.test.tsx`, and the place-search stubs in `e2e/maps-stub.ts` and `e2e/place-search.e2e.ts`, are rewritten (accepted cost; Repo-verified, the files exist). This is the first of the follow-up tickets.

### Amendment 6: suggestions without a map, with the "Google Maps" attribution row

- Supersedes: "We will not show Places data in a list that has no map" and "Places results (the selected address) are shown only with the Google map" ("Attribution").
- New rule: place suggestions may be listed while the sheet covers the map, provided the Places group always ends with Google's attribution as a plain row: the text "Google Maps" (class `.search__attr`, not focusable, not an option, `translate="no"`, 4.5:1 contrast). The same row ends the Recent list when any entry came from Places. Recent places live in memory only and are gone on reload, so "store nothing but Place IDs" stands. Before release, engineering checks Google's current attribution policy for the exact wording and typeface and reports any difference (Unverified until then; the Context line on Places policies was read 2026-11-05 and could not read the Maps service terms in full).
- Reason: a search that must be hidden behind a visible map cannot work on a phone, where the sheet covers it.
- Cost: none.
- Code and tests: `.search__attr` already exists in `apps/web/src/styles/components/search.css` (Repo-verified); the rows and the Recent list are built in the place-search and recents tickets, with tests for the row's role, `translate` and contrast.

### Follow-up tickets this record unblocks

In order: the place-search rewrite (amendments 5 and 6, then recents); the CSP change (ADR-0011 amendment 2026-11-17, after the rewrite); the Google base map and marks overlay (amendments 3 and 4, last). Amendments 1 and 2 unblock the planning pipeline, trip options and the result card.
