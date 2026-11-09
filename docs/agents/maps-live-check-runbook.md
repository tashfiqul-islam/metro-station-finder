# Maps live check runbook

Status: the first run passed on 2026-11-08 at e5a2e04 (Maps 3.66.13d, 0 CSP messages, Places requests 10, Routes requests 1); the output is recorded as a [comment on PR #95](https://github.com/tashfiqul-islam/metro-station-finder/pull/95#issuecomment-6720883479). METRO-100 added the accessibility lines, which no owner run has printed yet. Run by the owner, by hand, never by CI or an agent.

Why: every automated test stubs Google, so the Google hosts in the enforced CSP, the real widget's labelling and the cost behaviour are untested until this is run. The specification's Unverified list ([nearest-station-slice](../specifications/nearest-station-slice.md)) is settled by it.

## Before the first run (Google Cloud console, owner)

1. Use the development key `metro-station-key-dev` from [ADR-0009](../adr/0009-maps-provider-design.md), never the production key. Its HTTP referrer list must include `http://127.0.0.1:4173/*`: `smoke:live` builds the app and serves it with `vite preview` on 127.0.0.1 port 4173 (the dev server on 5173 is not used). Add `http://localhost:4173/*` too if you open the page by that name. The production origin goes on the production key only.
2. Restrict it by API to exactly: Maps JavaScript API, Places API (New), Routes API.
3. Set a daily quota cap per API so the free tier cannot be exceeded. A budget alert only notifies; quota caps stop spending. Quotas apply to the Cloud project, not to a key (Unverified here: confirm in the console), so if the development and production keys sit in one project they share the caps. These are the rows as reported by the owner from the console on 2026-11-08 (not re-read by an agent), against Google's real monthly free caps (Web-verified on the [pricing page](https://developers.google.com/maps/billing-and-pricing/pricing); undated, so re-read it first). Each daily cap times 31 days stays under the monthly free cap:

   | Console quota row (API)                            | Daily cap | x 31 days | Monthly free cap                   |
   | -------------------------------------------------- | --------- | --------- | ---------------------------------- |
   | Map loads per day (Maps JavaScript)                | 300       | 9,300     | 10,000 (Dynamic Maps)              |
   | AutocompletePlacesRequest per day (Places API New) | 100       | 3,100     | 10,000 (Autocomplete Requests)     |
   | GetPlaceRequest per day (Places API New)           | 100       | 3,100     | 10,000 (Place Details Essentials)  |
   | Compute Routes per-day row (Routes API)            | 100       | 3,100     | 10,000 (Essentials) or 5,000 (Pro) |

   These replace the 330 and 160 in ADR-0009 (see its 2026-11-08 amendment). The Routes cap is under both of its possible free caps, so which SKU the call bills matters for cost, not for the cap. One search sends about nine Autocomplete requests, so 100 per day is at most about eleven searches a day (a ceiling: a failed search still burns about nine Autocomplete requests); raising a cap is a new decision.

4. Put the key in the repository root `.env` as `VITE_GOOGLE_MAPS_API_KEY=<key>` (the file is git-ignored; agents may not read it). The name is the one the code reads; rename the entry if yours differs.

## Run

1. `mise exec -- bun run smoke:live` (PowerShell). It builds the web app with your key, serves the build with the real `_headers`, opens a headed Chromium and loads the page. Since METRO-114 nothing from Google loads with the page: the script counts requests to Google hosts until the first focus (expected 0), then focuses the plain "Search for a place" input, which loads Maps and Places and swaps the widget in. It records whether focus is on the widget afterwards, types one query, selects the first suggestion, waits for the nearest station and the walking route ("about ... est."), then prints and exits.
2. A run costs about nine Autocomplete requests (one per typed character of "Motijheel", the element decides) and one Place Details (Essentials) call, which together are the 10 Places requests the first run measured, plus one Routes call and one Maps load (Unverified whether a load with no map is billed). Against the caps above that is about 9 of 100 Autocomplete (9 percent), 1 of 100 Place Details, 1 of 100 Routes and 1 of 300 map loads (about 0.3 percent). Nine Autocomplete is Inferred from 10 requests minus one Place Details; the console split is not read.
3. It prints only: the Maps version, the CSP console messages (query strings and keys scrubbed), `Google requests before the first focus: N (expected 0)` (more than 0 fails), `Focus in the widget after the swap: yes/no/not read` (information only: whether `focus()` on Google's host reaches its inner input is Unverified until you run this), the count of requests to `places.googleapis.com` and `routes.googleapis.com`, the accessibility lines below, and PASS or FAIL.
4. The accessibility reads add no request: they go over a DevTools session to the page's own accessibility tree, once after the widget host is attached and once after the suggestions show, plus up to 12 Tab presses from the top of the page before the click (Tab does not search). Expected counts are unchanged: about ten Places requests and one Routes request. The line `Places requests during the Tab walk: N (expected 0)` counts Places requests seen before any click or typing. If N is above 0, focus alone sent a request; the typing check then waits for a request beyond N, so those requests cannot pass for typing. That is all the baseline does: a Places request caused by the click itself would still satisfy it, and a Tab-walk request that arrives late (after N is counted) would too, so a high total with N at 0 is not proof the typing worked. The total is N higher than a plain search.

## Read the result

- `PASS`: no CSP message, version starts with `3.66`, station and route shown. Record the date, the commit and the output in the PR for METRO-88.
- A `CSP:` line names a blocked directive and host. Add only that source to `apps/web/public/_headers` and `headers.test.ts`, with the message as evidence in the PR and an ADR-0011 note. Do not add `'unsafe-eval'`, `blob:` or inline styles without such a line.
- Places requests per search: the widget sends its own requests per keystroke. If the count is high, the specification names the fallback (a custom combobox with debounce and a minimum length); that is a new decision.
- `Failed step: wait for the place search element`: the key did not reach the build or Maps did not load after the first focus (the plain input should then have been replaced by the notice "Place search is unavailable right now. Pick a station instead."). Check `.env` first. The script drives the `gmp-place-autocomplete` host element by click and keyboard because the widget's shadow root is probably closed; a later `Failed step` names the suggestion choice, or the station or route that never showed.
- `Failed step: typing did not reach the widget (no Places request seen)`: after the click and typing no request to `places.googleapis.com` appeared within 10 seconds. Typing is not retried (each attempt bills). Unverified: whether clicking the host focuses the inner input of Google's closed shadow root; the next run may fail with this label.
- Accessibility lines (roles and accessible names only; never values, typed text or URLs; names are scrubbed and cut at 80 characters):
  - `Search control: combobox "..."` (or `textbox`): the one text field or combobox inside the widget, at the first read, with its accessible name. "Inside the widget" means the accessibility node's DOM node id is in the subtree of the `gmp-place-autocomplete` element, shadow roots included (`DOM.getDocument` with `pierce`), the scoping the owner's probe used. The owner's probe measured `combobox "Search For a Place"` (Google's own name). If it was found only in the read after typing, the line says so. `Reached by Tab: yes/no` is information only. An empty name prints `Failed check: the search control has no accessible name` and FAILs: a screen reader would announce an unlabelled field.
  - `Search control: not found in the accessibility tree` with `Failed check: could not read inside the widget`: the widget element was not found in the DOM tree, the tree showed no text field or combobox inside it, or a DevTools read failed or timed out (10 s each). This FAILs on purpose, never a false PASS. The owner's probe found the shadow content in the tree, so a FAIL here is new information: check the widget by hand with a screen reader and record that instead.
  - `Combobox expanded: before typing no, after typing yes` and `Widget images: before typing A (B unnamed), after typing C (D unnamed)`: the expanded state is printed only when the same tree snapshot reports it (`not reported` otherwise, never guessed); images (Chrome's role is `image`) are counts only, since icon names are not needed. Option names are real place names and are never printed, only the count. Active descendant is not read.
  - `Unnamed images by parent: before typing ..., after typing option 5, button 2` and `Named images: before typing N, after typing N` (METRO-102): each unnamed image is counted under the role of its NEAREST meaningful ancestor. The walk goes up from the image and skips `ignored` nodes and the wrappers `generic`, `none`, `StaticText`, `InlineTextBox` and `LineBreak`, at most 12 steps; a cycle, a self-parent, a missing parent or the step cap gives `parent not reported`. Largest group first, at most 6 groups, then `more groups N`; `no unnamed images` when there are none. Roles and counts only; no names, no ids.
  - `Combobox description: before typing X, after typing Y` (METRO-102), a status only, never the text: `matches the hint` (equals our hint "Suggestions favor places in Dhaka." after trimming, collapsing spaces and ignoring case; extra text is different), `present but different (length N)` (`1000+` when longer than 1000), `absent` (a string description that is empty), or `not reported` (no `description` field, or one that is not a string; the DevTools type declares it optional and Chrome is understood to omit it when empty, so this may also mean none: Inferred). `not read` means the tree read failed.
  - `Suggestion list after typing: listbox with N options`: the popup exposed a listbox with options. `no listbox seen` is reported, not a FAIL: the popup may sit outside the tree or close before the read; check by hand.
  - `Accessibility: not attempted (the run stopped earlier)`: the run failed before the accessibility step (page not open, widget never attached, for example no key), so no read was made and no other accessibility line is printed. Fix the `Failed step` first.
  - `more than one candidate search field` (`Failed check`): the first read found two or more text fields, so none is chosen; FAIL. Read the listed count and check by hand.
  - `Tab order (... ended: reason)`: the focus stops from the top of the page as `role "name"`, at most 12, each marked `[in widget]` when its node is inside the widget subtree (the probe measured: combobox in the widget, button "Use my location", then focus left the page). The reason is `cap reached`, `wrapped to the first stop` (compared by DOM node id when both stops have one, otherwise by role and name), `focus left the page`, `focus on an ignored node` (the focused node is not exposed to a screen reader) or `read failed`. Read it for a sane order.
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
- Inferred, Unverified: the widget uses a closed shadow root (`shadowRoot` was never read), so the old locator `gmp-place-autocomplete input` found nothing. The script now clicks the host and types; whether that focuses the inner input is unproven.
- Settled by the passing run on 2026-11-08 (e5a2e04): no CSP message, Maps 3.66.13d, Places requests 10 and Routes requests 1 for one search.
- Measured (owner-run probe, 2026-11-08, base e5a2e04), relayed by the owner; not re-run by an agent: the CDP accessibility tree includes the widget's shadow content; the search control is `combobox "Search For a Place"`; Tab order is the combobox, then button "Use my location", then focus leaves the page; 9 Places requests for a 9-character query; 5 options and a listbox after typing. Details in [metro-100 evidence](../evidence/metro-100.md).
- Still open: that `smoke:live` itself prints the same (not run since METRO-100); what a screen reader says (announcements, arrow-key highlighting, `aria-activedescendant`, Escape, Shift+Tab); label consistency (settled by METRO-101: the visible label is now `Search for a place`); the METRO-102 hint-text experiment (settled and removed, see "What the METRO-102 run settled"); whether the root is closed; the SKU of the Routes call (steps above).

## What the METRO-102 run settled

Measured (owner's third live run, 2026-11-08 19:17, relayed in a comment on PR #102; not re-run by an agent), with the hint-text (`placeholder`) option set to "Search for a place":

1. Name: `Search control: combobox "Search For a Place"`, UNCHANGED (compared exactly, case-sensitive, with `Search for a place`; capital F and P means unchanged). Decision closed: the option has no effect on the name and was removed.
2. Description: `Combobox description: before typing matches the hint, after typing matches the hint`. Google wires our `description`; the visible hint paragraph is not the only carrier. Whether a screen reader announces it: Unverified.
3. Unnamed images: `Unnamed images by parent: before typing group 1, after typing option 5, button 1, group 1`, `Named images: before typing 0, after typing 1`, `Widget images: before typing 1 (1 unnamed), after typing 8 (7 unnamed)`. They are Google's own icons (5 inside the suggestion options, 1 inside a button, 1 inside a group) that we cannot name (no documented option); any workaround is a new ticket. Whether a screen reader announces them: Unverified.
4. Places requests 10, Routes 1, CSP messages 0, PASS.

For the next run, the three report lines above still print and read the same way (the exact line descriptions are in the steps above). See the [METRO-102 evidence](../evidence/metro-102.md) and the specification's METRO-102 subsection.

The one script-to-app import (`smoke-live.ts` reads the hint from the feature's `copy.ts`, which has no imports) is pinned by `scripts/script-imports.test.ts`: any other script import under `apps/` fails it. It was chosen over a duplicated constant so the hint cannot drift.
