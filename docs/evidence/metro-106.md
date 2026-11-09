# METRO-106 evidence: offline app shell

Date: 2026-11-09. Base: `061d771` (`feature/metro-rebuild`, merge of METRO-114). Head: the tip of `ticket/metro-106-offline-shell` in the pull request. Windows 11, Bun 1.4.4, Node 26.13.0, Playwright 1.64.1 (Chromium, Firefox, WebKit, Pixel 7 Chromium). Decision record: [ADR-0023](../adr/0023-offline-app-shell.md). Labels: Repo-verified, Context7-verified, Web-verified, Unverified.

## First-visit budget (Repo-verified, `bun run build` then `bun run bundle:check`)

| Stage                                                        | First visit raw / gzip | Limit            | Headroom    | All files raw / gzip | Ceiling           |
| ------------------------------------------------------------ | ---------------------- | ---------------- | ----------- | -------------------- | ----------------- |
| Base (METRO-114)                                             | 249,561 / 78,134       | 250,000 / 80,000 | 439 / 1,866 | 358,674 / 109,064    | 400,000 / 125,000 |
| Worker, plugin, `sw.js` known to the gate (no page code yet) | 249,561 / 78,134       | 250,000 / 80,000 | 439 / 1,866 | 361,610 / 110,416    | 400,000 / 125,000 |
| Registration chunk, update prompt, beacon guard (shipped)    | 249,725 / 78,199       | 250,000 / 80,000 | 275 / 1,801 | 363,665 / 111,430    | 400,000 / 125,000 |

"All files" for the base is the sum of the base list less `sw.js` of the second row (derived, not a separate run). No limit was changed. The entry grew by 164 raw / 65 gzip bytes: `startServiceWorker` (a scheduler call and a dynamic import) and the `navigator.onLine` guard in `sendVital`. Everything else is lazy: `assets/register-*.js` 1,903 / 930 and `sw.js` 2,969 / 1,369. The gate lists `sw.js` as `lazy` (it is never on the first-visit path) and counts it in the all-files ceiling; it is the one JS file `scripts/bundle-budget.ts` accepts without a manifest entry (`WORKER_SCRIPTS`), a stray `sw2.js` is still an orphan (tested).

The ceiling for all files is now used to 91 percent raw / 89 percent gzip (it was 90 / 87). The gate prints its growth note. The next lazy feature of any size needs a ceiling decision from the owner; this ticket did not raise it.

Precache cost (Repo-verified, from the built `sw.js`): 21 files, 730,507 bytes raw, about 462,000 gzipped, fetched in the background after load and idle on a first visit and again for each new version. The two fonts (75 KB) and the six PNG icons (about 275 KB) do not shrink. Levers if it matters: leave the large icons out of the list (installing needs them online only); lazy-precache the mono font.

Lab web vitals (Repo-verified, `e2e/web-vitals-lab.e2e.ts`, Chromium, the worker allowed): LCP 400 ms (limit 2,500), CLS 0.0000 (limit 0.1). Controls still fail as intended: delayed main script LCP 3,480 ms, late block CLS 0.1951. Before this ticket (METRO-105): 412 to 416 ms. Real-user numbers are Unverified.

## What was built

- `apps/web/src/sw/worker.ts` (logic, injectable cache, fetch and clock), `sw.ts` (binding), `register.ts` (registration, prompt), `start.ts` (idle scheduling), `message.ts`; `scripts/sw-plugin.ts` (build step, version, kill switch); `vite.config.ts` bundles the worker.
- `apps/api/src/app.ts` and `wrangler.jsonc`: `/sw.js` answered worker-first, a missing file is a no-store 404 envelope.
- `vitals.ts`: the beacon is skipped when `navigator.onLine` is false.
- Copy: the handoff's offline sentence restored in the place-search notice, one sentence in the manifest description. See the table below.
- Guards changed (each with its reason): see "Existing tests edited".

## Copy for owner confirmation

| Where                                                       | Text                                                                                                                                | Why                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Place-search notice when the browser is offline (`copy.ts`) | "You’re offline. Stations and fares still work. Place search returns when you reconnect."                                           | The handoff's own sentence, restored now the worker backs it (METRO-114 had used a variant without the claim). Replaces "No internet connection. Place search returns when you reconnect. Pick a station instead." The "Pick a station instead" advice is gone; the handoff has none. |
| Manifest `description`                                      | "Find the nearest Dhaka MRT Line 6 station, the walk to it and the fare. Stations and fares work offline."                          | The ticket asks for the claim where it was held back. Narrower than "Works offline": place search and the walking route need a network.                                                                                                                                               |
| Update toast                                                | "A new version is ready." with "Reload" and "Dismiss"; failure: "The update could not be applied. Close the app and open it again." | New. Fixed text, no error shown.                                                                                                                                                                                                                                                      |
| Share image "Works offline"                                 | Not shipped                                                                                                                         | See "Held back" below.                                                                                                                                                                                                                                                                |

## Held back, and why

- The share image (`og-default.png`). The handoff's file is not in the repository (METRO-107 did not copy it), so there is no master. Drawing one with this repository's script would put text in a PNG, and the drift check compares decoded pixels with a tolerance of 1: text rendering differs between Windows and the hosted Linux runner, so the check would fail there (Unverified, not run on Linux). It also needs the production origin: `og:image` must be an absolute URL and the custom domain is not set. Needed from the owner: an SVG master with outlined text, and the origin. A test still fails if any `og/` file appears in `public/`.
- The install screenshots. Not restored. They have to be generated from the real UI by Playwright, the same text-rendering drift applies to any check on them, and they would join the precache unless excluded. Left for a follow-up ticket; `manifestProblems` still rejects a `screenshots` member.

## Commands run

- Setup: `mise install --locked`, `bun run bootstrap`, `hk install --mise` (empty `MISE_GLOBAL_CONFIG_FILE`): passed.
- `bun run check` (format, lint, boundaries, imports, knip, links, branches, types, workflows, renovate, `bun test --parallel=4`, `test:vitest`, coverage scope, `tsc -b`): passed after fixing a knip finding, three type errors and an uncovered default loader found by earlier runs.
- `bun run build`, `bun run bundle:check`: passed (table above).
- `CI=true bun run smoke --shuffle` (all four projects): see "Smoke" below.
- `bun test --parallel=4`: per-file 100 percent lines and functions. `bun run test:vitest`: per-file thresholds met (`apps/web/src/sw/*`: worker 100 lines / 98.3 branches, register 100 / 96.9, start 100, sw 100).
- Mutation checks (change made, tests run, change reverted): `/api/*` made cache-first and everything stored: the "200 from /api" test failed (the real-server API probe test passed, so it is only a weak Worker-level check); registration called without the scheduler: first failed to catch it (the worker request still came after load), so the test now also asserts the registration chunk is not fetched before load, and then failed as it should; navigation fallback removed: the three offline tests failed. A unit test for the detached `fetch` ("Illegal invocation") was added after the e2e run found it.
- Not run: the hosted `Quality gates`; Linux; a real phone; the live Google check (`smoke:live`, owner-run, unchanged by this ticket); the independent review (requested after the PR opens).

## Smoke

SMOKE_RESULT

## Existing tests edited (and why)

| File                                                             | Change                                                                                                                                                                                  | Reason                                                                                                                                                                                |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/station-picker.e2e.ts` (built files carry no offline claim) | From "no built script contains the word" to "exactly one file, the Nearby chunk, exactly once, as the handoff sentence, with `sw.js` in the build and the registration chunk naming it" | METRO-112's guard existed to stop claims before the worker. It still fails on a second file, a second mention, a different sentence, or the sentence without the worker. Not deleted. |
| `e2e/place-search.e2e.ts`, `NearestStation.test.tsx`             | The no-connection text constant and its "carries no claim" assertions follow the restored sentence                                                                                      | Copy change above.                                                                                                                                                                    |
| `scripts/build-brand-assets.ts` and its test                     | "any offline mention fails" became "one mention, exactly the pinned sentence in `description`"                                                                                          | Manifest claim above. Other wordings, a second mention and other members still fail (tested).                                                                                         |
| `scripts/brand-assets.test.ts`                                   | The "no asset claims offline" test pins the one manifest mention and requires the worker sources and plugin to exist; the og test title explains why the image is still absent          | Same. `og/` files still fail.                                                                                                                                                         |
| `scripts/bundle-budget.ts` and its test                          | `WORKER_SCRIPTS = ["sw.js"]`: listed, never first-visit, counted in the ceiling                                                                                                         | `collectAssets` walks the output root and `sw.js` is not in the Vite manifest, so it was an orphan. No limit changed.                                                                 |
| `playwright.config.ts`                                           | `serviceWorkers: "block"` for every project                                                                                                                                             | Context7-verified: routes do not see worker-handled requests; the journeys assert exact request lists. Two specs opt in.                                                              |
| `e2e/web-vitals-lab.e2e.ts`                                      | `serviceWorkers: "allow"` for the lab                                                                                                                                                   | So the registration code and the precache are in the measured page.                                                                                                                   |
| `apps/web/src/vitals.test.ts`, `apps/api/src/*.test.ts`          | Tests added only                                                                                                                                                                        | —                                                                                                                                                                                     |
| `apps/api/wrangler.jsonc`                                        | `run_worker_first` gains `"/sw.js"`                                                                                                                                                     | A missing worker must be a 404, not index.html (Web-verified: array patterns turn off the navigation detection).                                                                      |

## Findings worth the owner's attention

- Playwright routes and the worker (Repo-verified): with a worker controlling the page, WebKit let the real Maps script and its follow-up requests through to `maps.googleapis.com` instead of the route stub. Two of my runs did this before I removed the test step that asked for Google (a focus on the place search): the key sent was the fake `fake-key-for-tests`, nothing was read or kept. No other spec allows the worker, `serviceWorkers: "block"` is the project default, and `e2e/offline-shell.e2e.ts` now fails any test in which a request leaves `127.0.0.1`. This is stated plainly because the rule is that no automated run reaches Google.
- Firefox: `context.setOffline(true)` fails navigations with `NS_ERROR_OFFLINE` before the worker can answer, so two real-server tests skip Firefox with that reason on the test; the static-server group covers Firefox by closing the server's connections. Firefox also does not report the worker script request to Playwright, so the "worker request comes after load" half is Chromium and WebKit; the "registration chunk is not fetched before load" half runs in all four.
- `fetch("/favicon.ico")` from a page or worker fails under Playwright Chromium while `/favicon.ico?x=1` works (cause Unverified). It made the whole install fail, so `favicon.ico` is not precached.
- The captured `installing` worker reference did not deliver the skip-waiting message in WebKit; the registration's waiting worker did. The code tells the registration's waiting worker.
- Under the combined four-browser run on ten workers, Firefox crashed its compositor twice (`RenderCompositorSWGL`) and timed out in axe teardown; the same specs pass when Firefox runs alone and in repeats of the Chromium-family projects. A flaky test is a defect, so this is reported and not hidden: if it recurs on the hosted run, serialise the update-flow group.

## Unverified

- Real iOS Safari and Android Chrome behaviour: storage eviction of the cache, installed-app update timing, `updateViaCache: "none"`, the 24 hour script check on the 24th hour.
- Screen-reader announcement of the update toast and of the offline notice (a `role="status"` region mounted empty and filled after 100 ms); focus return to the panel after Dismiss was tested in the browsers, not with assistive technology.
- Keyboard: the toast follows the shell's tab order (last, after the map controls); tested with real Tab and Shift+Tab, a visible focus ring, axe with the toast open. 1.4.10 Reflow and 2.4.11 with the toast over content were not checked.
- The cost of the background precache on a slow or metered phone connection.
- Why `fetch("/favicon.ico")` fails in Playwright Chromium; why the stale `installing` reference fails in WebKit.
- Hosted Linux runs of the four-browser smoke.
- Behaviour when storage is full (the install rejects and the old worker stays; the page does not tell the person).

## Owner phone checks

1. Open the deployed preview once online, wait 10 seconds. Turn on airplane mode, close the browser tab fully, open the site again: the app opens; the picker, a station result with fares, the line map and "Browse all 16 stations" work; the place-search area shows "You’re offline. Stations and fares still work…".
2. Same for the installed (Add to Home Screen) app: launch with airplane mode on.
3. After the next deploy, with the app open, switch away and back (or reload once): the toast "A new version is ready." appears; Dismiss keeps working on the old version; Reload shows the new one. Report if it never appears within a day.
4. On iPhone Safari specifically: the first offline open after a day, because Safari may evict site data.

## Review dispositions
