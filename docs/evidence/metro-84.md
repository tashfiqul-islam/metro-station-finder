# METRO-84: where the domain core runs (evidence)

Evidence for [ADR-0018](../adr/0018-where-core-runs.md). Labels: **Repo-verified** (read or run here), **Context7-verified**, **Web-verified** (URL and retrieval date given), **Inferred** (reasoned from verified facts), **Unverified** (not checked). Base: `origin/feature/metro-rebuild` at `e16b8da`. Machine: Windows 11, Bun 1.4.4 and Node 26.13.0 through `mise exec`, Vite 8.3.5. Web pages were treated as data; no embedded instruction was found in any of them.

## 1. What the code is today (Repo-verified, `e16b8da`)

- `packages/core` (`@metro/core`) is pure and dependency-free: `findNearestStation` (Haversine, radius 6371 km, strict less-than so dataset order breaks ties), `resolveStation` (exact name or alias), `findFare` (explicit `unknown-fare`, never zero), `validateDataset`, `baselineDataset` (`baseline-v2`: 16 stations, 16x16 fares, fields `version` and `source`, no publisher or effective date) and `getScaffoldStatus`. Its source is about 13.5 KB of non-test TypeScript (domain, application and data modules), of which the dataset module is 3,849 bytes.
- `apps/api/src/app.ts` is one Hono route, `GET /api/scaffold/status`, which calls `getScaffoldStatus` from core and validates the body with `@metro/contracts`. No station, fare or nearest route exists.
- `apps/web` has no dependency on `@metro/core` (`apps/web/package.json` lists only contracts, react, react-dom) and `node_modules/@metro` links only `contracts`. `.dependency-cruiser.mts` rule `web-never-imports-core-runtime` forbids any non-type-only edge from `apps/web/` to `packages/core/`; `scripts/layering.test.ts` proves it red and proves the type-only carve-out.
- There is no service worker, web manifest or PWA plugin anywhere in the tracked files (`git ls-files` search).
- Tests: `apps/api` runs in workerd (`@cloudflare/vitest-plugin`, ADR-0016), `apps/web` in happy-dom (METRO-79), core and scripts under `bun test` (Bun runtime), and Playwright smoke and axe against `vite preview` (`e2e/`). Vitest coverage `include` lists only `apps/api` and `apps/web` sources; core is covered by Bun's per-file threshold.
- Existing decisions that bear on the question: [ADR-0009](../adr/0009-maps-provider-design.md) says Maps, Places and Routes are called from the browser with a referrer-restricted key, that "the nearest station is chosen in the browser from our own dataset", that the consent copy says the position is "not sent to our server", and that fares and station lists must work with no map script loaded. [ADR-0003](../adr/0003-contracts.md) says the page "must trust only after validation" a Worker response and that web gets runtime values through contracts. These two accepted ADRs conflict for the nearest-station slice: ADR-0009 needs core to run in the browser, and the layering rule written for ADR-0003 forbids it.
- Owner answers recorded in [nearest-station](../specifications/nearest-station.md) H1 to H3 and the [glossary](../product/glossary.md): display names Mirpur 11, Mirpur 10, Agargaon, Farmgate, Karwan Bazar (2026-11-05; METRO-67 later set Shahbag and Bijoy Sarani); display language English only for now; fares come from the Government, effective since launch (publisher name and date not recorded in the owner answer); the UI must never allow the same station for both ends and the domain still returns the explicit zero fare. Fare authority research: [dhaka-mrt-line-6](dhaka-mrt-line-6.md) (Primary): the Dhaka Transport Coordination Authority notice of 8 September 2022 fixed the fares, and all 256 baseline cells equal the official table.

## 2. Bundle cost of core in the web bundle (Repo-verified, measured)

Method. Build the real web app (Vite 8.3.5 plus `@cloudflare/vite-plugin`), measure every `.js` and `.css` file under `apps/web/dist/client`, then repeat with a temporary probe that imports core into the app, and revert. Nothing built or probed was committed (`dist/` is gitignored; the probe edit to `apps/web/src/App.tsx` was reverted with `git checkout`, and the working tree was clean before adding these documents).

Commands (from the repository root):

```
mise exec -- bun run --cwd apps/web build
mise exec -- bun run bundle:check
mise exec -- node <scratch>/measure.mjs apps/web/dist/client
```

`measure.mjs` sums `.js` and `.css` sizes and compresses each file with `zlib.gzipSync(level 9)` and `zlib.brotliCompressSync(quality 11)`. `bundle:check` (`scripts/bundle.ts`) uses `gzipSync` at the default level, which is why its gzip figure is a little higher. The probe imported by relative path (core is not resolvable from `apps/web` today) and rendered the results so the code could not be tree-shaken away: scenario 1 used `findNearestStation`, `findFare` and `baselineDataset`; scenario 2 added `resolveStation`, `validateDataset` and `getScaffoldStatus` (that is the whole core public surface).

| Scenario                                     | Raw bytes | gzip (level 9) | brotli (q11) | `bundle:check` gzip | Delta raw | Delta gzip9 | Delta brotli |
| -------------------------------------------- | --------- | -------------- | ------------ | ------------------- | --------- | ----------- | ------------ |
| 0. Today (no core in web)                    | 225,877   | 70,285         | 60,454       | 70,421              | 0         | 0           | 0            |
| 1. Nearest + fare + 16-station/256-fare data | 229,869   | 72,009         | 61,883       | not run             | +3,992    | +1,724      | +1,429       |
| 2. Entire core public surface                | 230,751   | 72,334         | 62,182       | 72,471              | +4,874    | +2,049      | +1,728       |

Reading. The code and the whole dataset cost about 4 to 5 KB raw and about 1.4 to 1.7 KB brotli. The existing budget in `scripts/bundle.ts` is 250,000 raw and 80,000 gzip bytes, so scenario 2 uses 230,751 of 250,000 (92%) and 72,471 of 80,000 (91%): the budget still passes, with 19,249 raw and 7,529 gzip bytes of headroom left for everything else, including the Maps loader (loaded lazily, outside the budget per ADR-0009) and the whole UI. The React runtime is the bulk of today's 225 KB; core is about 2% of the bundle. Per-station data grows linearly: 16 stations are roughly 3.8 KB of source; a dataset 10 times larger would still be small, but the figure was not measured. The Worker bundle (`dist/metro_scaffold/index.js`, 78.65 kB, gzip 21.75 kB, Vite build output) already contains core's `getScaffoldStatus` and Hono and is a separate artifact (ADR-0002).

Limits: a single machine, one build per scenario, no real-device parse or execution timing (the cost to parse and run 5 KB of JavaScript was not measured and is Unverified; Inferred as negligible).

## 3. Workers request budget (Web-verified)

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), retrieved 2026-11-06: Workers Free allows 100,000 requests per day (counter resets at midnight UTC); CPU time 10 ms per invocation; 50 subrequests per request; Worker size 64 MiB uncompressed; static assets 20,000 files per version, 25 MiB per file, 100 `_headers` rules. Over the daily limit Cloudflare returns Error 1027 (route fail mode decides open or closed).
- [Static assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), retrieved 2026-11-06: "Requests to static assets are free and unlimited." Requests matching `run_worker_first` patterns always invoke the Worker and are billed as Worker requests. The same page says that on the free plan, over the request limit, matching `run_worker_first` requests receive a 429. This differs from the 1027 wording on the limits page; the difference was not reconciled (Unverified which an `/assets/*` request sees).
- [SPA routing](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/), retrieved 2026-11-06: with `run_worker_first` patterns, the automatic `Sec-Fetch-Mode: navigate` detection is disabled, matching the finding recorded in ADR-0011.

What a visit costs today (Repo-verified config, Inferred counts). `wrangler.jsonc` has `run_worker_first: ["/api/*", "/assets/*"]`. The HTML shell and the favicon are served as free static assets. The hashed JS and CSS (2 files) and any `/api/*` call each invoke the Worker. The shipped scaffold page therefore costs 3 Worker requests on a cold visit (2 assets plus 1 status call) and 1 on a repeat visit (assets are `immutable`, so the browser does not ask again). That cost is already the revisit trigger of ADR-0011 (50% of the plan).

Model (Inferred; the traffic figures are assumptions, not measurements, and real traffic is Unknown). A "session" is one cold load, one nearest-station search, one station-list view and 3 fare lookups.

| Option                                   | Worker requests per cold session                            | per repeat session (assets cached) | Cold sessions per day before 100,000 |
| ---------------------------------------- | ----------------------------------------------------------- | ---------------------------------- | ------------------------------------ |
| A: all compute in the API                | 2 assets + 1 list + 1 nearest + 3 fares = 7                 | 5 (list, nearest, fares)           | about 14,000                         |
| B: core in the browser                   | 2 assets = 2                                                | 0                                  | about 50,000                         |
| C: browser fast path plus API validation | 2 assets + 5 validations = 7 (if every result is validated) | 5                                  | about 14,000                         |

Repeat sessions in B cost nothing because the HTML shell is a free static asset and the assets come from the browser cache. With a service worker (section 5) the 2 asset requests are also saved after the first visit. The figures say the free tier is not the deciding factor at hobby scale (all options are well inside it) but A and C spend the budget on work a browser does in microseconds, and the failure mode at the limit differs: with the limit hit, A has no data at all, B still works from cache.

## 4. Google Maps key handling (Web-verified)

- [API security best practices](https://developers.google.com/maps/api-security-best-practices), retrieved 2026-11-06: use Website (HTTP referrer) restrictions for browser apps and give the whole referrer string with scheme; IP address restrictions for server-side apps, and the address "must match the source address the Google Maps Platform servers observe"; the page notes IP restrictions may be impractical for cloud environments with dynamic IPs; pair one application restriction with API restrictions; "Web service API keys are not expected to be publicly exposed"; for clients without an SDK use a proxy server that requires authentication for client access and does not relay arbitrary API calls. Browsers may strip or redact the referrer depending on referrer policy (the ADR-0011 `strict-origin-when-cross-origin` setting exists for this). The page does not discuss whether the `Referer` header can be forged by a non-browser client (Unverified on the page; Inferred true because any HTTP client sets headers freely), so a referrer restriction limits casual reuse only; quota caps and budget alerts (ADR-0009) are the real limit.
- [Routes API key page](https://developers.google.com/maps/documentation/routes/get-api-key), retrieved 2026-11-06: API key or OAuth token; the page names API and application restrictions but does not name which application restrictions apply or mention browsers. [Maps JavaScript Routes library page](https://developers.google.com/maps/documentation/javascript/routes), retrieved 2026-11-06: does not say whether `Route.computeRoutes` accepts a referrer-restricted key. This remains **Unverified**, exactly as ADR-0009 recorded; the first map slice must test it.
- Consequence for the options: the Worker has no stable egress address (ADR-0009 Inferred, still Unverified), so a proxy key could not be IP-restricted; it would be a secret protected by Worker secrets, an authenticated or rate-limited route and quota caps. A browser key is public by design.

## 5. Offline and service worker (Web-verified, Context7-verified)

- [MDN, PWA caching](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching), retrieved 2026-11-06: precache the app shell in `install` with `waitUntil(cache.addAll([...]))` so install fails if caching fails; cache-first for precached resources, stale-while-revalidate where responsiveness matters and freshness is "somewhat important but not essential", network-first where freshness matters; cache-first content "is never refreshed until a new version of the service worker is installed"; use versioned cache names and delete old caches in `activate`; caches can be evicted, so code must fall back to the network.
- [web.dev, service worker lifecycle](https://web.dev/articles/service-worker-lifecycle), retrieved 2026-11-06: a new worker waits while the old one controls clients; `skipWaiting()` means the new worker "is likely controlling pages that were loaded with an older version" (advice: don't use it if that could break the site); `clients.claim()` can leave a worker controlling pages that loaded without it; update checks run after in-scope navigations at most daily and browsers ignore HTTP cache headers for the worker script by default (Chrome 68 and later); keep the worker at a stable URL.
- [vite-plugin-pwa](https://github.com/vite-pwa/vite-plugin-pwa), Context7-verified (`/vite-pwa/vite-plugin-pwa`): `registerType` defaults to `prompt`; `autoUpdate` forces Workbox `skipWaiting` and `clientsClaim` to true and reloads open tabs; `workbox.globPatterns` sets the precache. Web-verified (npm registry, retrieved 2026-11-06): version 2.0.0 declares `vite` peer `^3.1.0 || ... || ^8.0.0`, plus `workbox-build` and `workbox-window` `^7.4.1` as peers. Whether it works with `@cloudflare/vite-plugin` 1.66.0 output (which writes assets to `dist/client` and the Worker elsewhere) was not tested: **Unverified**.
- Repo facts a service worker must respect (Repo-verified): `_headers` marks only `/assets/*` as `immutable`; everything else, including a root `sw.js`, keeps the revalidating default (ADR-0011). Precache fetches of `/assets/*` go through the Worker (`run_worker_first`) and count as Worker requests. The CSP is report-only with `default-src 'self'` and `script-src 'self'` and no `worker-src`, so a same-origin worker script is allowed by fallback (Inferred from CSP fallback rules, not tested). `trustedDependencies` is empty, so the plugin must not need an install script (Unverified).
- What offline needs, by option: A cannot work offline at all for station, fare or nearest data (every lookup is a network call) unless responses are cached by URL, which is a cache of answers, not a computation; B works offline for stations, fares and nearest given a device position or a chosen station, because code and data are in the precached bundle (the position comes from `navigator.geolocation`, which needs no network); the Maps map, autocomplete and walking route never work offline (Google services), which ADR-0009 already treats as a degraded state with a station dropdown and list from the local dataset.

## 6. Layering changes needed (Repo-verified rules; the edits are described, not made)

Today's rule, `.dependency-cruiser.mts`:

```
name: "web-never-imports-core-runtime",
from: { path: "^apps/web/" },
to: { path: "^packages/core/", dependencyTypesNot: ["type-only"] },
```

Option A and the status quo: no change. Option B (and C): remove that rule and add a narrower one so web may use core only through its public entry (core's `package.json` exports only `"."` to `./src/index.ts`):

```
name: "web-imports-core-public-entry-only",
comment: "The browser app may run core, but only through its public entry (src/index.ts).",
from: { path: "^apps/web/" },
to: { path: "^packages/core/", pathNot: "^packages/core/src/index\\.ts$" },
```

Other required edits for B (Repo-verified places): `apps/web/package.json` gains `"@metro/core": "workspace:*"` and `bun.lock` changes; `apps/web/tsconfig.json` needs a project reference or path to `packages/core` as `packages/contracts` has (confirm in the ticket); `scripts/layering.test.ts` replaces the `web-never-imports-core-runtime` red/green cases with cases for the new rule (a deep import such as `packages/core/src/data/baseline-dataset.ts` is rejected; the public entry, runtime and type-only, is allowed); the `apps-never-import-each-other`, `core-imports-only-core` and `contracts-*` rules are unchanged. Docs that state the old rule must change in the same pull request: `docs/agents/architecture.md` ("`apps/web` imports no runtime value from core"), the ADR-0003 consequence text (handled by the superseding sentence in ADR-0018, since an accepted ADR is not edited), and `docs/agents/api.md` if a contract changes. Core stays dependency-free, so `core-imports-only-core` and `scripts/boundaries.ts` are untouched.

## 7. What each test project would still prove (Repo-verified setup, Inferred consequences)

- Core unit tests (`bun test`, Bun runtime) prove the rules in every option; unchanged. They do not run in a browser engine. In B and C the shipped runtime is the browser, so a browser-level proof is new work: a Vitest web test (happy-dom) that imports real core, and a Playwright e2e that searches by a synthetic coordinate and reads the displayed station and fare in Chromium and WebKit (the same bundle users get). happy-dom has no real `navigator.geolocation` or layout; tests must inject the position (consistent with ADR-0009's deterministic fixtures).
- workerd project (`apps/api`): in A it proves the route, validation and envelope for the real compute path in the deployed runtime. In B it proves nothing about the domain (the Worker no longer calls it); it keeps proving the envelope, headers, assets route and observability. In C it proves the validating route; the same function then runs in two runtimes, so a divergence between Chromium/WebKit and workerd floating-point behaviour is the new risk. Haversine uses `Math.sin`, `Math.cos`, `Math.atan2`, which ECMAScript leaves implementation-approximated (Unverified for these engines; Inferred: results can differ in the last bits between engines), so "client and server agree" cannot be asserted with exact equality on `GeographicDistanceKm`; nearest selection could differ only on near-exact ties, which strict less-than and dataset order handle only if both engines compute the same order of two nearly equal values.
- Contract tests (`packages/contracts`): in A and C they gain request and response schemas for nearest and fare (new strict objects, ADR-0013 compatibility rule applies to every additive change). In B nothing is added except, optionally, a schema for a dataset version if the API ever exposes one.
- Duplication risk: C is the only option where the same decision is computed in two places and compared; it needs agreement tests, a rule for who wins, and a UI state for "server disagreed". A has a single compute path; B has a single compute path (browser).

## 8. Trust boundary, fare authority and data freshness (Repo-verified, Inferred)

- Both the SPA bundle and the Worker bundle are built from the same commit and deployed together atomically (ADR-0013 Context, Repo-verified). The dataset in both is therefore the same bytes; "client versus server disagree" can only arise from version skew: a stale open tab, or a service-worker-cached bundle older than the deployed API.
- The authority for fares is neither the client nor the server: it is the Government fare notice (Primary evidence above), of which the repository dataset is a versioned copy. Provenance fields today: `version` and `source` only; no publisher, notice reference or effective date ([feature parity](../product/feature-parity.md) R7 still open). A fare shown to a rider is a claim "as of dataset version X".
- Delivering an update to clients already loaded. A: the next API call returns the new data; the only stale thing is the page's own code. B without a service worker: a new deploy changes the hashed assets; HTML revalidates (ADR-0011), so the next navigation gets the new bundle and data; an open tab keeps old data until reload. B with a service worker: a precached shell serves old data until the new worker installs and activates; `prompt` mode shows an update message and `autoUpdate` reloads tabs (and uses `skipWaiting`, the mixed-version hazard in section 5). The dataset `version` shown in the UI, plus an update prompt, is the visible mechanism. C needs both mechanisms plus a mismatch rule.
- Cache invalidation specifics: hashed assets are immutable and cannot go stale; the HTML shell and any `sw.js` revalidate; Cache API entries use a versioned name and old names are deleted in `activate` (MDN).

## 9. Reversibility (Inferred from the repository)

Core is a pure package with a single public entry, shared by both apps, so the compute location is a wiring decision, not a rewrite. A to B costs: one layering rule edit, one dependency line, UI wiring, and deleting any API route that was added; clients lose nothing. B to A costs: contract schemas, a Hono route, an envelope-conformant error path and a loading/error state in the UI, and it removes offline. B to C costs a route plus contract plus an agreement test, nothing in the browser changes. C to B deletes code. A service worker adds the only real lock-in: once installed on users' devices a worker keeps serving until replaced, so a removal needs a "kill switch" worker (a worker that unregisters itself) shipped at the same URL (Inferred from the web.dev lifecycle text; Unverified in practice).

## 10. Unverified items

- Real traffic (daily visits, sessions) and therefore the request-budget headroom; the 1027 versus 429 behaviour at the free limit for `/assets/*`.
- Whether `Route.computeRoutes` accepts a referrer-restricted browser key (carried from ADR-0009).
- Parse and execution time of the extra JavaScript on low-end phones.
- Whether `vite-plugin-pwa` 2.0.0 builds correctly with `@cloudflare/vite-plugin` 1.66.0 and Vite 8.3.5, and whether it needs an install script.
- Cross-engine floating-point agreement of Haversine results.
- The deployed edge behaviour of a root `sw.js` (revalidation) and of `_headers` through `ASSETS.fetch` (carried from ADR-0011).
- Maps Platform terms on caching; the Worker egress address question.
