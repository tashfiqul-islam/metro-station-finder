# ADR-0009: Maps, Places, Routes and geolocation design

- Status: Accepted
- Date: 2026-11-05
- Ticket and specification: METRO-39; [maps-provider-design](../specifications/maps-provider-design.md), revision 2026-11-05-r1. Decisions below were delegated to the agent by the owner and are recorded as Accepted on that basis. No map code exists yet; this ADR binds the first map slice.

## Context

The legacy app loaded Google Maps with an unpinned script URL and a catch that only logged. The public site showed a Maps failure with the location input disabled, and nothing proved Places or walking routes worked ([feature parity](../product/feature-parity.md), R1 to R5). The legacy key was deleted on 2026-11-05 ([ADR-0004](0004-supply-chain-and-ci-policy.md)). A key used from a browser is public; only restrictions and quotas protect the budget ([security](../agents/security.md)).

Facts used, with labels (all read 2026-11-05):

- Web-verified: the Google pricing page lists Dynamic Maps (Essentials) 10,000 free per month; Autocomplete Requests 10,000 free; Autocomplete Session Usage unlimited free; Place Details Essentials 10,000 free; Place Details Pro 5,000 free; Compute Routes Essentials 10,000 free, Pro 5,000 free. The page has no date, so every figure must be re-checked when the first map slice is built.
- Context7-verified: `@googlemaps/js-api-loader` v2 uses `setOptions({ key, v, channel, ... })` once, then `importLibrary("maps")`; in v2 `libraries` only preloads.
- Context7-verified: `PlaceAutocompleteElement` fires `gmp-select`; `placePrediction.toPlace()` then `fetchFields({ fields })` ends the session and passes the session automatically.
- Context7-verified: the JavaScript `routes` library has `Route.computeRoutes` with `travelMode`, `fields` and `polylineQuality`.
- Web-verified: Place Details field tiers. `id` is Essentials IDs Only; `location` and `formattedAddress` are Essentials; `displayName` is Pro.
- Web-verified: a session ended by Essentials fields bills the first 12 autocomplete requests as Autocomplete Requests and later ones as Session Usage (free). A session ended by IDs Only fields bills every request as Autocomplete Requests. An abandoned session bills Autocomplete Requests.
- Web-verified: `AdvancedMarkerElement` with `gmpClickable: true` accepts keyboard input and fires `gmp-click`; `title` is read by screen readers.
- Web-verified: Place IDs may be stored indefinitely; other Places content and coordinates are governed by the Maps service terms, which could not be read in full (Unverified). Attribution is not needed on a Google map that already shows it.
- Web-verified (MDN): geolocation needs HTTPS and permission; errors are permission denied, position unavailable and timeout; `timeout` defaults to infinity.

## Decision

We will use Google Maps Platform, called from the browser, with one referrer-restricted key per environment.

### Loader and channel

We will use `@googlemaps/js-api-loader` v2 (`setOptions` once, then `importLibrary` for `maps`, `marker`, `places`, `routes`), loaded lazily on the map view only, never on the fare page. Set `v` to a pinned quarterly or weekly choice recorded in the first slice (not an unpinned default), and `channel` to a fixed value per environment (`metro-dev`, `metro-prod`) so usage reports split by environment. The key comes from build-time public configuration; it is never treated as secret. A load failure shows a visible error with retry and leaves fares and station lists working.

### Browser or Worker

Decision: browser calls for Maps, Places and Routes (the JavaScript `routes` library). We reject a Worker proxy for v1 because it would need a second, unrestricted-by-referrer secret key, move user coordinates through our server, and gain no caching (Google content may not be cached freely). A proxy adds a secret and an abuse surface; the only thing it would buy is a place to rate limit.

Revisit trigger: if the dev key proves Routes cannot be referrer-restricted (Unverified; the first slice must test it), or if usage spikes show abuse, move Routes only to a Worker with an IP-restricted secret key and a per-client rate limit, by a new ADR.

### Session handling

We will use `PlaceAutocompleteElement`, which carries the session token itself. On `gmp-select` we call `fetchFields` with Essentials fields only: `["location", "formattedAddress"]`. We will not request `displayName` or any Pro field: it moves Place Details to Pro (5,000 free, higher price) for no need. After a selection or an abandoned search the element starts a fresh session; the code must not reuse a finished session.

### Stored and non-storable

We may store: station identifiers (our own data) and Google Place IDs. We will not store or cache anything else from Google: not coordinates, addresses, routes, polylines or distances, in any database, KV, cache, URL or log. Coordinates stay in memory for the current search. Station coordinates are our own dataset ([ticket METRO-40](../product/glossary.md)), not Google content. Because the terms were not fully read, the rule is "store nothing but Place IDs" until the owner confirms more.

### Attribution

Places results (the selected address) are shown only with the Google map, which shows its own attribution, and the logo is never covered or cropped. If a Places address is ever shown outside the map, add "Google Maps" text (`translate="no"`, 4.5:1 contrast) beside it. We will not show Places data in a list that has no map.

### Quota and billing alert

Cost design: one route request per explicit user search, for the single nearest station, never per station and never while typing. Routes use WALKING with the minimal `fields` and no traffic options, so the request should be Essentials (Inferred; the pricing page does not name WALKING, so budget at the Pro price until the first bill proves it). The owner (METRO-57) sets, in the Cloud console, a daily quota cap per API at about one thirtieth of the monthly free tier (roughly 300 per day for Routes and Autocomplete, 300 map loads per day), plus a budget alert at 50, 90 and 100 percent of a low fixed amount. A budget only alerts; it does not stop spending, so the quota caps are the real limit (Unverified: confirm cap names in the console). When a cap is hit Google returns an error, which the app shows as the provider-error state.

### Key restrictions

Two keys, both restricted by API (Maps JavaScript API, Places API (New), Routes API, nothing else) and by HTTP referrer. Development: the owner's existing referrer-restricted key, localhost and preview origins. Production: created later by the owner under METRO-57, referrers `https://metro-station-finder.com/*` and `https://www.metro-station-finder.com/*` only. The production key is never used from preview or localhost. Referrer strings include the scheme and host. Agents never create or read keys; no key value enters the repository, logs or tests (tests use a fake key string).

### Geolocation consent

Device location is optional. The page never calls `getCurrentPosition` on load. The user presses a button "Use my location"; a short line beside it says: "Your location is used once in your browser to find the nearest station. It is not saved or sent to our server." The call uses `timeout: 10000`, `maximumAge: 0`, `enableHighAccuracy: false`. Denied, unavailable and timed-out states each show a message in a `role="alert"` element ("Location is turned off. Search for a place instead." and similar) and focus moves to the search input. Manual search is always visible and works whether or not location was tried. The coordinates are never logged, stored or put in a URL, and logs carry only the outcome (granted, denied, unavailable, timeout).

### Accessibility

Every station marker is an `AdvancedMarkerElement` with `gmpClickable: true` and a `title`, so it is reachable by keyboard. A visible text list of the same stations (name, geographic distance) exists beside the map and is the primary reading path; the map is an enhancement. Walking distance and geographic distance stay separate labels ([UI](../agents/ui.md)).

### Alternative map stack

Default stays Google. We use an alternative (for example MapLibre with another provider) only if cost or policy blocks Google at implementation; that needs a new ADR.

## Consequences

- Easier: one provider, one loader, no server secret, fares work when maps fail.
- Harder: the browser key is visible, so safety depends on referrer and API restrictions plus daily caps set by the owner. Nothing from Google can be cached to save cost.
- Revisit: Google pricing and field tiers (undated page) on every implementation and upgrade; Routes referrer support; the Maps service terms on storage; `v` pin each quarter.
- Owner work: dev key check, production key, caps and budget under METRO-57.

## Alternatives considered

- Worker proxy for all calls: rejected for v1, reasons above.
- Legacy `@react-google-maps/api` and script tag: rejected; unpinned, hides load errors.
- `getCurrentPosition` on page load: rejected; prompts without a gesture and fails the denied flow.
- Request `displayName`: rejected; Pro tier cost with no need.
- Non-Google stack now: rejected; no cost or policy block shown today.
