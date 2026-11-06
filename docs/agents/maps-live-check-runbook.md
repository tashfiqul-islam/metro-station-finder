# Maps live check runbook

Status: plan until the owner has run it once. Run by the owner, by hand, never by CI or an agent.

Why: every automated test stubs Google, so the Google hosts in the enforced CSP, the real widget's labelling and the cost behaviour are untested until this is run. The specification's Unverified list ([nearest-station-slice](../specifications/nearest-station-slice.md)) is settled by it.

## Before the first run (Google Cloud console, owner)

1. Use a development key, not the production key. Restrict it by HTTP referrer to `http://127.0.0.1:4173/*`, `http://localhost:4173/*` and `http://127.0.0.1:5173/*` (this run uses 4173), and later add the production origin for the production key only.
2. Restrict it by API to exactly: Maps JavaScript API, Places API (New), Routes API.
3. Set a daily quota cap per API so the free tier cannot be exceeded. A budget alert only notifies; a quota cap stops. Starting values from [ADR-0009](../adr/0009-maps-provider-design.md): Routes 160, Maps JavaScript 300, Place Details 300, Autocomplete requests 330 per day. Re-read the free caps on the [pricing page](https://developers.google.com/maps/billing-and-pricing/pricing) first: the page is undated.
4. Put the key in the repository root `.env` as `VITE_GOOGLE_MAPS_API_KEY=<key>` (the file is git-ignored; agents may not read it). The name is the one the code reads; rename the entry if yours differs.

## Run

1. `mise exec -- bun run smoke:live` (PowerShell). It builds the web app with your key, serves the build with the real `_headers`, opens a headed Chromium, types one query, selects the first suggestion, waits for the nearest station and the walking route, then prints and exits.
2. It prints only: the Maps version, the CSP console messages (query strings and keys scrubbed), the count of requests to `places.googleapis.com` and `routes.googleapis.com`, and PASS or FAIL.

## Read the result

- `PASS`: no CSP message, version starts with `3.66`, station and route shown. Record the date, the commit and the output in the PR for METRO-88.
- A `CSP:` line names a blocked directive and host. Add only that source to `apps/web/public/_headers` and `headers.test.ts`, with the message as evidence in the PR and an ADR-0011 note. Do not add `'unsafe-eval'`, `blob:` or inline styles without such a line.
- Places requests per search: the widget sends its own requests per keystroke. If the count is high, the specification names the fallback (a custom combobox with debounce and a minimum length); that is a new decision.
- `Failed step: find the place search`: the key did not reach the build or the widget is not in an open shadow root. Check `.env` first.
- Check in the opened browser, with a screen reader if you can, that the search control has a name and Tab order is sane: the e2e fake cannot show Google's real accessibility tree.
- After the run, check the Cloud console usage page: one search should be a handful of Autocomplete requests, one Place Details (Essentials) and one Routes call.
