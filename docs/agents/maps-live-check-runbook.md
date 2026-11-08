# Maps live check runbook

Status: plan until the owner has run it once. Run by the owner, by hand, never by CI or an agent.

Why: every automated test stubs Google, so the Google hosts in the enforced CSP, the real widget's labelling and the cost behaviour are untested until this is run. The specification's Unverified list ([nearest-station-slice](../specifications/nearest-station-slice.md)) is settled by it.

## Before the first run (Google Cloud console, owner)

1. Use the development key `metro-station-key-dev` from [ADR-0009](../adr/0009-maps-provider-design.md), never the production key. Its HTTP referrer list must include `http://127.0.0.1:4173/*`: `smoke:live` builds the app and serves it with `vite preview` on 127.0.0.1 port 4173 (the dev server on 5173 is not used). Add `http://localhost:4173/*` too if you open the page by that name. The production origin goes on the production key only.
2. Restrict it by API to exactly: Maps JavaScript API, Places API (New), Routes API.
3. Set a daily quota cap per API so the free tier cannot be exceeded. A budget alert only notifies; quota caps stop spending. Quotas apply to the Cloud project, not to a key (Unverified here: confirm in the console), so if the development and production keys sit in one project they share the caps; use separate projects if you can. Each cap times 31 days stays under the SKU's monthly free cap (the numbers assume a 31-day month; re-read the undated [pricing page](https://developers.google.com/maps/billing-and-pricing/pricing) first):

   | API                                    | Daily cap | x 31 days | Monthly free cap |
   | -------------------------------------- | --------- | --------- | ---------------- |
   | Autocomplete requests (Places API New) | 300       | 9,300     | 10,000           |
   | Place Details (Essentials)             | 300       | 9,300     | 10,000           |
   | Maps JavaScript (map loads)            | 300       | 9,300     | 10,000           |
   | Routes (sized against Pro)             | 150       | 4,650     | 5,000            |

   These replace the 330 and 160 in ADR-0009 (330 x 31 = 10,230 exceeds the free cap).

4. Put the key in the repository root `.env` as `VITE_GOOGLE_MAPS_API_KEY=<key>` (the file is git-ignored; agents may not read it). The name is the one the code reads; rename the entry if yours differs.

## Run

1. `mise exec -- bun run smoke:live` (PowerShell). It builds the web app with your key, serves the build with the real `_headers`, opens a headed Chromium, types one query, selects the first suggestion, waits for the nearest station and the walking route, then prints and exits.
2. A run costs about nine Autocomplete requests (one per typed character of "Motijheel", the element decides), one Place Details (Essentials) call, one Routes call and one Maps load (Unverified whether a load with no map is billed). That is under 5 percent of every daily cap above.
3. It prints only: the Maps version, the CSP console messages (query strings and keys scrubbed), the count of requests to `places.googleapis.com` and `routes.googleapis.com`, and PASS or FAIL.

## Read the result

- `PASS`: no CSP message, version starts with `3.66`, station and route shown. Record the date, the commit and the output in the PR for METRO-88.
- A `CSP:` line names a blocked directive and host. Add only that source to `apps/web/public/_headers` and `headers.test.ts`, with the message as evidence in the PR and an ADR-0011 note. Do not add `'unsafe-eval'`, `blob:` or inline styles without such a line.
- Places requests per search: the widget sends its own requests per keystroke. If the count is high, the specification names the fallback (a custom combobox with debounce and a minimum length); that is a new decision.
- `Failed step: wait for the place search element`: the key did not reach the build or Maps did not load. Check `.env` first. The script drives the `gmp-place-autocomplete` host element by click and keyboard because the widget's shadow root is probably closed; a later `Failed step` names the suggestion choice, or the station or route that never showed.
- `Failed step: typing did not reach the widget (no Places request seen)`: after the click and typing no request to `places.googleapis.com` appeared within 10 seconds. Typing is not retried (each attempt bills). Unverified: whether clicking the host focuses the inner input of Google's closed shadow root; the next run may fail with this label.
- Check in the opened browser, with a screen reader if you can, that the search control has a name and Tab order is sane: the e2e fake cannot show Google's real accessibility tree.
- After the run, check the Cloud console usage page: one search should be a handful of Autocomplete requests, one Place Details (Essentials) and one Routes call.

## What the first run settled (2026-11-08, METRO-96)

- Confirmed: `style-src 'self'` blocked the Google fonts stylesheet and two inline styles. METRO-96 allows the stylesheet and two hashes (ADR-0011 amendment); that is not a resolution until the owner run prints PASS. Places requests 7 and Routes requests 1 came from the owner typing by hand, not from the script.
- Inferred, Unverified: the widget uses a closed shadow root, so the old locator `gmp-place-autocomplete input` found nothing. The script now clicks the host and types; whether that focuses the inner input is unproven.
- Still open: whether the hashes are `<style>` elements or style attributes (hashes do not authorize attributes); whether `font-src` is needed; Autocomplete requests per search by script; the accessibility tree; the SKU of the Routes call.
