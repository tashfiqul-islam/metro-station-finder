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

Device location is optional. The page never calls `getCurrentPosition` on load. The user presses a button "Use my location"; a short line beside it says: "To find your nearest station, your position is sent to Google only to compute the route to it. It is not saved and not sent to our server." The nearest station is chosen in the browser from our own dataset; Google receives the position only in the walking-route request (C4). The call uses `timeout: 10000`, `maximumAge: 0`, `enableHighAccuracy: false`. Denied, unavailable and timed-out states each show a message in a `role="alert"` element ("Location is turned off. Search for a place instead." and similar). Focus moves to the search input, and the alert text is referenced by the input's `aria-describedby` so it is read with the input and not cut off. Manual search is always visible and works whether or not location was tried. The position is never logged, stored or put in a URL, and logs carry only the outcome (granted, denied, unavailable, timeout).

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

These replace the 330 and 160 numbers (330 x 31 = 10,230 exceeded 10,000) and the 300, 300, 300 and 150 proposed in the specification [nearest-station-slice](../specifications/nearest-station-slice.md) and in the runbook's earlier plan. A search sends about nine Autocomplete requests (10 Places requests measured, one of them Place Details; Inferred), so 100 per day allows about eleven searches a day. The Routes SKU actually billed stays Unverified until the Billing report shows it ([runbook](../agents/maps-live-check-runbook.md)). The `font-src` entry `https://fonts.gstatic.com` stays, decided in METRO-100.
