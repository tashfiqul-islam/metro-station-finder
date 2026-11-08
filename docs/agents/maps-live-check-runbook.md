# Maps live check runbook

Status: the first run passed on 2026-11-08 at e5a2e04 (Maps 3.66.13d, 0 CSP messages, Places requests 10, Routes requests 1); the output is recorded as a comment on PR #95. METRO-100 added the accessibility lines, which no owner run has printed yet. Run by the owner, by hand, never by CI or an agent.

Why: every automated test stubs Google, so the Google hosts in the enforced CSP, the real widget's labelling and the cost behaviour are untested until this is run. The specification's Unverified list ([nearest-station-slice](../specifications/nearest-station-slice.md)) is settled by it.

## Before the first run (Google Cloud console, owner)

1. Use the development key `metro-station-key-dev` from [ADR-0009](../adr/0009-maps-provider-design.md), never the production key. Its HTTP referrer list must include `http://127.0.0.1:4173/*`: `smoke:live` builds the app and serves it with `vite preview` on 127.0.0.1 port 4173 (the dev server on 5173 is not used). Add `http://localhost:4173/*` too if you open the page by that name. The production origin goes on the production key only.
2. Restrict it by API to exactly: Maps JavaScript API, Places API (New), Routes API.
3. Set a daily quota cap per API so the free tier cannot be exceeded. A budget alert only notifies; quota caps stop spending. Quotas apply to the Cloud project, not to a key (Unverified here: confirm in the console), so if the development and production keys sit in one project they share the caps. These are the rows the owner set on 2026-11-08, against Google's real monthly free caps (Web-verified on the [pricing page](https://developers.google.com/maps/billing-and-pricing/pricing); undated, so re-read it first). Each daily cap times 31 days stays under the monthly free cap:

   | Console quota row (API)                            | Daily cap | x 31 days | Monthly free cap                   |
   | -------------------------------------------------- | --------- | --------- | ---------------------------------- |
   | Map loads per day (Maps JavaScript)                | 300       | 9,300     | 10,000 (Dynamic Maps)              |
   | AutocompletePlacesRequest per day (Places API New) | 100       | 3,100     | 10,000 (Autocomplete Requests)     |
   | GetPlaceRequest per day (Places API New)           | 100       | 3,100     | 10,000 (Place Details Essentials)  |
   | Compute Routes per-day row (Routes API)            | 100       | 3,100     | 10,000 (Essentials) or 5,000 (Pro) |

   These replace the 330 and 160 in ADR-0009 (see its 2026-11-08 amendment). The Routes cap is under both of its possible free caps, so which SKU the call bills matters for cost, not for the cap. One search sends about ten Autocomplete requests, so 100 per day is about ten searches a day; raising a cap is a new decision.

4. Put the key in the repository root `.env` as `VITE_GOOGLE_MAPS_API_KEY=<key>` (the file is git-ignored; agents may not read it). The name is the one the code reads; rename the entry if yours differs.

## Run

1. `mise exec -- bun run smoke:live` (PowerShell). It builds the web app with your key, serves the build with the real `_headers`, opens a headed Chromium, types one query, selects the first suggestion, waits for the nearest station and the walking route, then prints and exits.
2. A run costs about nine Autocomplete requests (one per typed character of "Motijheel", the element decides), one Place Details (Essentials) call, one Routes call and one Maps load (Unverified whether a load with no map is billed). That is under 5 percent of every daily cap above.
3. It prints only: the Maps version, the CSP console messages (query strings and keys scrubbed), the count of requests to `places.googleapis.com` and `routes.googleapis.com`, the accessibility lines below, and PASS or FAIL.
4. The accessibility reads add no request: they go over a DevTools session to the page's own accessibility tree, once after the widget host is attached and once after the suggestions show, plus up to 12 Tab presses from the top of the page before the click (Tab does not search). Expected counts are unchanged: about ten Places requests and one Routes request.

## Read the result

- `PASS`: no CSP message, version starts with `3.66`, station and route shown. Record the date, the commit and the output in the PR for METRO-88.
- A `CSP:` line names a blocked directive and host. Add only that source to `apps/web/public/_headers` and `headers.test.ts`, with the message as evidence in the PR and an ADR-0011 note. Do not add `'unsafe-eval'`, `blob:` or inline styles without such a line.
- Places requests per search: the widget sends its own requests per keystroke. If the count is high, the specification names the fallback (a custom combobox with debounce and a minimum length); that is a new decision.
- `Failed step: wait for the place search element`: the key did not reach the build or Maps did not load. Check `.env` first. The script drives the `gmp-place-autocomplete` host element by click and keyboard because the widget's shadow root is probably closed; a later `Failed step` names the suggestion choice, or the station or route that never showed.
- `Failed step: typing did not reach the widget (no Places request seen)`: after the click and typing no request to `places.googleapis.com` appeared within 10 seconds. Typing is not retried (each attempt bills). Unverified: whether clicking the host focuses the inner input of Google's closed shadow root; the next run may fail with this label.
- Accessibility lines (roles and accessible names only; never values, typed text or URLs; names are scrubbed and cut at 80 characters):
  - `Search control: combobox "..."` (or `textbox`): the widget's input as the browser accessibility tree sees it, with its accessible name. An empty name prints `Failed check: the search control has no accessible name` and FAILs: a screen reader would announce an unlabelled field.
  - `Search control: not found in the accessibility tree` with `Failed check: could not read inside the widget`: the tree showed no text field or combobox, or the DevTools read failed. This FAILs on purpose, never a false PASS. It would mean the closed shadow root is not exposed to this read (Unverified), so check the widget by hand with a screen reader and record that instead.
  - `Suggestion list after typing: listbox with N options`: the popup exposed a listbox with options. `no listbox seen` is reported, not a FAIL: the popup may sit outside the tree or close before the read; check by hand.
  - `Tab order`: the focus stops from the top of the page as `role "name"`, at most 12, ended early when focus wraps to the first stop or leaves the page. Read it for a sane order.
- After the run, check the Cloud console usage page: one search should be about ten Autocomplete requests, one Place Details (Essentials) and one Routes call.

## Which Routes SKU was billed

The Routes call may bill as Compute Routes Essentials, Pro or Enterprise; the pricing page does not name WALKING (Inferred: Essentials). To see which (Web-verified 2026-11-08 from Google's Cloud Billing reports documentation; console menu names can change):

1. Cloud console > Billing, then Go to linked billing account > Reports.
2. Filter Services = Routes API.
3. Group by = SKU.
4. Read the line `Routes: Compute Routes Essentials`, `Pro` or `Enterprise` that shows usage.

Billing data can lag up to 48 hours, so look a day or two after a run. The Quotas page is real time but is not a source of truth for billing.

## font-src

Decided in METRO-100, closed: keep `https://fonts.gstatic.com` in `font-src`. Google's CSP guide lists it, it is harmless (fonts only), and removing it risks silently blocking glyph files with no visible error.

## What the first run settled (2026-11-08, METRO-96)

- Confirmed: `style-src 'self'` blocked the Google fonts stylesheet and two inline styles. METRO-96 allows the stylesheet and two hashes (ADR-0011 amendment); that is not a resolution until the owner run prints PASS. Places requests 7 and Routes requests 1 came from the owner typing by hand, not from the script.
- Inferred, Unverified: the widget uses a closed shadow root, so the old locator `gmp-place-autocomplete input` found nothing. The script now clicks the host and types; whether that focuses the inner input is unproven.
- Settled by the passing run on 2026-11-08 (e5a2e04): no CSP message, Maps 3.66.13d, Places requests 10 and Routes requests 1 for one search.
- Still open: the accessibility of the real widget (METRO-100 prints it on the next run; Unverified whether the DevTools tree includes closed shadow content); the SKU of the Routes call (steps above).
