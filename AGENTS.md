# AGENTS.md

Instructions for AI coding agents (Claude, Cursor, Copilot, Codex, Cline, etc.) working on this repo. This file is the single source of truth. Prefer it over inferred conventions or training-data defaults.

Read top to bottom on every new session. If a rule here conflicts with what you "know," this file wins.

---

## 1. What this project is

**Metro Station Finder v1** is a PWA for Dhaka's MRT-6 metro line, rebuilt in 2026 on a modern static-first stack and enhanced with AI-powered interfaces. Three user-facing features:

1. **Find the nearest station** to a user-supplied location, render a walking route on the map.
2. **Calculate the fare** between any two of the 17 stations via a static fare matrix.
3. **Plan a trip** — pick origin and destination stations, see the line segment, intermediate stops, fare, and estimated travel time.

Plus a marketing home page and an about page. The app is **static-data only** in v1 — no database, no accounts, no dynamic backend. One server function exists: an OpenRouteService walking-route proxy to keep the API key server-side.

**Target:** zero-cost hosting on Cloudflare Workers (Static Assets), offline-first PWA, Lighthouse ≥ 95, WCAG AA.

**Related repos / directories (reference only — do not edit from this session unless instructed):**

- `github.com/tashfiqul-islam/metro-station-finder` — the original Next.js 14 Pages Router app (v0.x). Historical reference.
- `D:/Projects/metro-station-finder` — a prior local rebuild in TanStack Start + Biome + Lucide + Google Maps. Home and About pages are fully designed there; finder/fares are stubs. **Its site chrome is the source we port from** (see §13).
- `D:/Projects/metro-station-finder-v1` — **this repo**. The production rebuild.

---

## 2. Core operating principles

Adapted from the Karpathy coding-behavior framework. These override default instincts.

### 2.1 Think before coding

State assumptions before implementing anything non-trivial:

```text
ASSUMPTIONS:
1. [what I'm assuming about the requirement]
2. [what I'm assuming about the architecture]
3. [what I'm assuming is in scope]
→ Correct me now or I'll proceed with these.
```

If multiple interpretations exist, list them. Don't pick silently. If something is unclear, stop and name the confusion before acting.

### 2.2 Simplicity first

Minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No "flexibility" or "configurability" that wasn't requested. No error handling for impossible scenarios. If you wrote 200 lines and it could be 50, rewrite it.

Test: _Would a staff engineer say this is overcomplicated?_ If yes, simplify.

### 2.3 Surgical changes

Touch only what you must. Match existing style even if you'd write it differently. Don't "improve" adjacent code, comments, or formatting. Don't refactor adjacent systems as a side effect. If your edits orphan imports or variables, clean those up — don't clean up pre-existing dead code unless asked.

Test: _Every changed line should trace directly to the user's request._

### 2.4 Goal-driven execution

Transform requests into verifiable goals. Prefer tests-first when possible:

- "Add validation" → "Write tests for invalid inputs, then make them pass."
- "Fix the bug" → "Write a test that reproduces it, then make it pass."
- "Refactor X" → "Ensure tests pass before and after."

For multi-step work, state a brief plan with verification gates:

```text
1. [step] → verify: [check]
2. [step] → verify: [check]
```

A task is not done until `bun run ci` passes.

### 2.5 Push back when warranted

You are not a yes-machine. When an approach has clear problems, name the issue, quantify if possible ("this adds ~200 ms per page load," not "this might be slower"), propose an alternative, and accept the user's final decision once they've heard the tradeoff. Honest disagreement beats false agreement.

---

## 3. Stack — the whole truth

| Layer          | Choice                                                        | Banned substitutes                |
| -------------- | ------------------------------------------------------------- | --------------------------------- |
| Runtime / PM   | **Bun 1.3+**                                                  | npm, pnpm, yarn                   |
| Framework      | **TanStack Start** (RC 1.167+) on **Vite 8**                  | Next.js, Remix                    |
| Language       | **TypeScript 6** strict                                       | loose TS, plain JS                |
| UI primitives  | **Base UI** via shadcn (style `base-mira`)                    | Radix, Headless UI                |
| Styling        | **Tailwind CSS v4** (Oxide engine)                            | Tailwind v3, Stitches, Emotion    |
| Icons          | **Phosphor Icons**                                            | Lucide, Heroicons                 |
| State          | TanStack Router (URL), TanStack Query (async)                 | Redux, Zustand (unless discussed) |
| Maps           | **mapcn** (MapLibre GL + OpenFreeMap tiles)                   | Google Maps, Mapbox               |
| Walking routes | **OpenRouteService** via server-function proxy                | OSRM demo server, client-side key |
| Validation     | **Valibot** (Standard Schema, edge-sized)                     | Zod, Yup, Joi                     |
| Lint + format  | **Ultracite** (Oxlint + Oxfmt)                                | ESLint, Prettier, Biome           |
| Tests          | **Vitest 4** (unit + integration) + **Playwright 1.59** (E2E) | Jest, Cypress                     |
| PWA            | **vite-plugin-pwa** (wiring deferred to PWA phase)            | Workbox direct                    |
| Git hooks      | **Lefthook 2.x**                                              | Husky                             |
| Releases       | **semantic-release 25** (Conventional Commits)                | manual versioning                 |
| Deploy         | **Cloudflare Workers** (Static Assets)                        | Pages, Vercel, Netlify            |

**If a proposed dependency overlaps any of the above, stop and ask before installing.**

Also not in use and not to be added without discussion: `"use server"` actions, enums, namespaces, parameter properties, decorators, barrel files, `verbatimModuleSyntax`, Next.js patterns.

---

## 4. Commands

Always `bun`. Never `npm`, `pnpm`, `yarn`.

```bash
bun install              # install + sync git hooks
bun run dev              # dev server (port 3000, strict)
bun run build            # production build (prerendered SSG)
bun run preview          # serve built output

bun run typecheck        # tsc --noEmit
bun run lint             # ultracite check
bun run lint:fix         # run BEFORE claiming done
bun run format           # alias of lint:fix

bun run test             # all vitest projects
bun run test:unit        # node env only
bun run test:integration # jsdom env only
bun run test:coverage    # enforces 80/80/80/75 thresholds
bun run test:e2e         # playwright (slow; only if UI flow touched)

bun run ci               # typecheck → lint → test → build
```

**Before marking any task complete, `bun run ci` must pass.** If any gate fails, the task is not done.

---

## 5. Architecture rules

### 5.1 Rendering model

Full prerender at build time (SSG). Every route is emitted as static HTML via TanStack Start's prerender plugin:

```ts
tanstackStart({
  prerender: {
    autoStaticPathsDiscovery: true,
    autoSubfolderIndex: true,
    concurrency: 14,
    crawlLinks: true,
    enabled: true,
    retryCount: 2,
    retryDelay: 1000,
  },
});
```

Client hydrates after load. **Do not write route loaders that depend on per-request context** — they must be compile-time resolvable.

Anything that touches `window`, `document`, `localStorage`, geolocation, `IntersectionObserver`, or `maplibre-gl` must be guarded behind `useEffect`, lazy import, or a `ClientOnly` boundary, or it will crash the prerender.

### 5.2 Feature-folder colocation

Features live in `src/features/<feature-name>/` with everything for that feature co-located:

```text
src/features/station-finder/
  route.tsx           # TanStack route component
  components/         # feature-specific UI
  logic.ts            # pure functions (haversine, nearest-station)
  logic.test.ts       # unit tests colocated
  schemas.ts          # Valibot schemas
  server/             # server functions (if any)
```

Shared code: `src/components/ui/` (shadcn + mapcn), `src/components/common/` (site-wide shells), `src/lib/`, `src/data/`. **Don't put feature code in `src/components/`.** No barrel files — import directly from source.

### 5.3 Path aliases

Single alias: `@/*` → `./src/*`. Defined in **two places that must stay in sync**:

1. `tsconfig.json` `compilerOptions.paths`
2. `vite.config.ts` `resolve.alias`

If you add an alias, update both.

### 5.4 Static data & validation

Station, fare, and line-geometry data live in `src/data/` as TypeScript `const`-asserted literals. They are parsed with Valibot at module load so invalid data is caught in dev immediately. **Every piece of external or untrusted data must have a Valibot schema before it is used.**

The fare matrix must be asserted symmetric at load: `fare[i][j] === fare[j][i]` and `fare[i][i] === 0`. Failing this assertion crashes the module in dev.

### 5.5 Server functions

Only one is planned for v1: the OpenRouteService walking-route proxy. **Do not add more server functions without discussion.** No `"use server"` actions (TanStack Start doesn't support them and they have a known CVE history).

### 5.6 Secrets

No API keys in client code. Ever.

- `ORS_KEY` — OpenRouteService API key, server-only. Read via `process.env["ORS_KEY"]` inside the server function only. Already present in `.env.local` (gitignored).
- Any future key goes into `.env.local` + the server-function boundary only.

If you see a `NEXT_PUBLIC_*` or `VITE_*` prefix on a secret name, that's wrong — fix it before shipping.

### 5.7 `verbatimModuleSyntax` stays off

`verbatimModuleSyntax` is intentionally omitted from `tsconfig.json`. TanStack Start's official guidance is that enabling it causes **server bundles to leak into client bundles**. Don't flip it to "fix" an `import type` lint error — fix the import instead.

---

## 6. Maps & routing

### 6.1 mapcn

Maps are built with [mapcn](https://mapcn.vercel.app/docs) — a shadcn-style copy-paste wrapper over MapLibre GL. Registry already wired in `components.json`:

```json
"registries": { "@mapcn": "https://mapcn.dev/r/{name}.json" }
```

Add components with:

```bash
bunx shadcn@latest add @mapcn/map
```

Components land in `src/components/ui/map.tsx` (you own the file).

**Primitives used in this project:**

- `Map` — canvas. Needs an ancestor with explicit height + width (e.g. `className="h-[70svh] w-full"`).
- `MapControls` — `position`, `showZoom`, `showCompass`, `showLocate`, `showFullscreen`.
- `MapMarker` — `longitude`, `latitude`, plus `MarkerContent` / `MarkerTooltip` / `MarkerPopup` / `MarkerLabel` children.
- `MapPopup` — standalone popup controlled by React state.
- `MapRoute` — polyline from `[lng, lat][]`. **Rendering only — BYO data.** Coordinate order is `[lng, lat]`, not `[lat, lng]`.
- `MapClusterLayer` — GeoJSON clustering. Probably unused in v1.

Raw MapLibre instance is available via `ref` or the `useMap` hook (`flyTo`, `easeTo`, `fitBounds`, `addSource`, `addLayer`, `queryRenderedFeatures`).

### 6.2 Tiles

Default: **OpenFreeMap** (OSM-based, free, no key, theme-aware). Fallback if it becomes unreliable: self-host Protomaps PMTiles from a Cloudflare R2 bucket (decision deferred).

### 6.3 Walking routes

Drawn by `MapRoute` with coordinates fetched from OpenRouteService `/v2/directions/foot-walking/geojson`. The fetch lives in **one server function** (`src/features/station-finder/server/get-walking-route.ts`) that reads `ORS_KEY`, validates input with Valibot, and returns `[lng, lat][]`. The client never sees the key.

Cache results in Cloudflare KV keyed on `(from_lat_4dp, from_lng_4dp, station_slug)`. 4 decimals ≈ 11 m precision — enough for walking start points. Repeat queries then cost zero.

### 6.4 Trip planning (station-to-station)

Not a routing problem. The MRT-6 line is a single ordered array of 17 stops; a "trip" is a slice between two indices. Draw the result with `MapRoute` using the precomputed MRT-6 line polyline from static GeoJSON at `src/data/mrt6-line.geojson` (sourced once from the OSM `relation` for MRT-6 via Overpass, committed to the repo).

The full user flow is **two** overlaid `MapRoute` layers:

1. Walking route (user → origin station), dashed/thin, from ORS.
2. Metro segment (origin → destination), thick, from the static line polyline clipped to the index slice.

### 6.5 Offline degradation

Tile fetch failing offline must not throw. Show an "offline — map unavailable" overlay; the station list and fare lookup keep working from the embedded static JSON.

---

## 7. AI layer

AI is the **interface**, not the logic. The deterministic fare/distance code is the source of truth; LLMs parse user input and format output. This is how the app stays correct, testable, and usable offline.

Planned AI entry points (implement them in order, not all at once):

1. **NL station finder** — server function takes `"cheapest way from Banani DOHS to Motijheel"` → LLM extracts `{origin, destination}` → reuses `findNearest` + `calculateFare`.
2. **Tool-use agent** — LLM calls `findNearestStation`, `calculateFare`, `getWalkingRoute` as tools. Backend: Cloudflare Workers AI free tier (Llama 3.x) or Anthropic Claude via a Worker binding.
3. **Semantic autocomplete** — precomputed static embeddings of station names + common Dhaka POIs, shipped as JSON, cosine similarity on the client. Zero runtime inference cost.
4. **AI-SEO** — per-station prerendered routes with `TransitStation` + `GeoCoordinates` JSON-LD, a `/llms.txt` at the root, semantic HTML. Makes the site citable by AI search engines.
5. **MCP server** — expose `findNearest`, `calculateFare`, `getRoute` as an MCP server so Claude Desktop / Cursor / any MCP client can query Dhaka metro directly.

Every LLM call must degrade gracefully: offline → direct UI; rate-limited → direct UI; empty response → direct UI. Never hide the deterministic path behind the model.

---

## 8. Data model

- **17 stations** — Uttara North to Kamalapur (include under-construction where relevant).
- **Canonical identifier is `slug`**, never display name. `Mirpur 10` → `mirpur-10`. The v0 data had `Mirpur 10` vs `Mirpur - 10` drift between files; kill that at the schema.
- Stations live in `src/data/stations.ts` as `const`-asserted literals, validated by a Valibot schema with `lat`, `lng`, `slug`, `nameEn`, `nameBn`, `orderIndex`, and `status: "operational" | "under-construction"`.
- Fare matrix is 17×17, symmetric, diagonal zero. Source of truth is the official DMTCL fare card. Assert symmetry + diagonal at load.
- MRT-6 line geometry in `src/data/mrt6-line.geojson` as a single LineString `Feature`.

---

## 9. Non-obvious traps

- **Plugin order in `vite.config.ts`**: `devtools() → tailwindcss() → nitro() → tanstackStart() → viteReact()`. React must come last. Reversing breaks HMR subtly.
- **`routeTree.gen.ts`** auto-generates on route changes. Never edit. Ignored by Oxlint + excluded from coverage.
- **`Register` interface** in `src/router.tsx` — the name is fixed by TanStack Router module augmentation. Don't rename.
- **`release.config.ts`** uses `"\u0024"` to escape `${nextRelease.version}`. Don't simplify — it avoids `no-template-curly-in-string`.
- **`noPropertyAccessFromIndexSignature`** on → `process.env["CI"]`, never `process.env.CI`.
- **`erasableSyntaxOnly`** on → no enums, namespaces, parameter properties, experimental decorators. Use unions + plain objects.
- **`noUncheckedIndexedAccess`** on → `stations[0]` is `Station | undefined`. Handle it or use a checked helper.
- **Coverage excludes** `src/router.tsx` + `src/routeTree.gen.ts`. Don't write tests against those.
- **`test:unit`** = `node` env. **`test:integration`** = `jsdom`. Component render tests go in `tests/integration/`.
- **MapLibre SSR**: `maplibre-gl` touches `window` at import time. Always lazy-import or client-gate inside `useEffect`. Direct import in a route file will blow up during prerender.
- **`MapRoute` coordinate order** is `[lng, lat][]`. ORS GeoJSON returns `[lng, lat]` too, so no conversion — just don't swap them.

---

## 10. Safety boundaries

**Free to do:**

- Read any file in the repo
- Run `bun run` scripts (typecheck, lint, test, build, dev)
- Edit source in `src/` and `tests/`
- Add test files
- Run `bunx ultracite fix`

**Ask first:**

- Install or remove dependencies (`bun add`, `bun remove`)
- Modify repo-root config files (`package.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `vitest.config.ts`, `oxlint.config.ts`, `lefthook.yml`, etc.)
- `git push`, `git rebase`, `git reset --hard`, `git commit --amend`
- `bun run release` or anything that publishes
- Touch `.env*`, `.wrangler/`, or any secret-adjacent file
- Delete files you didn't create in the current session
- Run long commands (full Playwright run across all 5 browsers, Lighthouse CI)
- Remove components or data you don't fully understand

**Never:**

- Skip git hooks (`--no-verify`) or bypass signing
- Commit secrets or `.env*` files
- Use `--dangerously-skip-permissions` or equivalent bypass flags
- Print, log, or expose `ORS_KEY` to the client bundle

---

## 11. Code style — defer to Ultracite

Ultracite (Oxlint + Oxfmt) enforces most style. Run `bun run lint:fix` before claiming done. Match from the first keystroke:

- Arrow functions for components and callbacks
- `const` by default, `let` only when reassigning, never `var`
- Double-quoted strings, semicolons, 2-space indent, 100-char line width
- Object keys alphabetized (`perfectionist/sort-objects`)
- Type-only imports on their own line: `import type { X } from "y"` (not inline `import { x, type Y } from "y"`)
- No `console.log` or `debugger` in committed code
- No barrel files — import directly from source
- Kebab-case filenames (`station-finder.tsx`, not `StationFinder.tsx`)
- No emojis in source or comments unless explicitly requested

Business logic correctness, type narrowing, naming, architecture, edge cases, accessibility — no linter can help. That's where you actually think.

---

## 12. Testing philosophy

- **Unit** — pure functions in `tests/unit/` or colocated as `*.test.ts`. `node` env, no DOM.
- **Integration** — React components in `tests/integration/` with `@testing-library/react`. `jsdom` env. Test behavior, not implementation.
- **E2E** — critical user flows in `tests/e2e/` with Playwright. One flow per spec file. Selectors use `data-testid` (already configured).
- **Coverage thresholds** — 80% lines/functions/statements, 75% branches. CI fails otherwise.
- **No `.only` or `.skip`** in committed tests (Oxlint enforces).
- **TDD for fare, distance, and nearest-station logic** — these are pure, easy to test, and safety-critical. Write failing tests first.

---

## 13. Legacy port — first milestone

The first build milestone is porting the site shell from `D:/Projects/metro-station-finder` (not the GitHub Next.js v0 repo — that's reference only).

**Port as a unit:**

1. `src/styles.css` additions — `@property --angle`, `shimmer-spin`, `--header-height: 4rem`, glassmorphism utility class, oklch primary color.
2. `src/routes/__root.tsx` — the FOUC-blocking theme script (verbatim), `QueryClientProvider` with the legacy defaults (1 h staleTime, 24 h gcTime, retry 2, no refetchOnWindowFocus), `UnifiedBackground`, `NavBar`, padded `<main>`.
3. `src/components/ui/navbar.tsx` + `src/components/navbar/{logo,theme,github}.tsx` + the `Highlight` primitive it depends on.
4. `src/components/common/{section-wrapper,unified-background}.tsx` + `src/components/ui/animation-constants.tsx` + `src/components/ui/animated-badge.tsx`.
5. Six home sections under `src/pages/home/sections/` plus `home-page.tsx`.
6. Route stubs for `/station-finder`, `/station-fares`; `/about` deferred.
7. Public assets under `/public/tech-stack/` and `/public/socials/`.

**Deltas required during port:**

- `lucide-react` → `@phosphor-icons/react` (one-for-one rename across every import).
- `react-icons/fa` `FaGithub` → Phosphor `GithubLogo`.
- Remove `Google Maps` and `Zod` from the tech-stack logo slider. Add `MapLibre` / `mapcn` and `Valibot`.
- Update `features-section` "Interactive Maps" copy from "Google Maps integration…" → "MapLibre + OpenFreeMap…".
- Strip `"use client"` directives (no-op in TanStack Start).
- Convert `biome-ignore` comments to Oxlint syntax, or delete if Oxlint doesn't flag them.
- Consolidate `globals.css` + `tokens.css` into the existing single `src/styles.css` under Tailwind v4 `@theme inline`.
- Delete the duplicate `UnifiedBackground` render inside `home-page.tsx` — leave only the root-level one.
- Extract the inline glassmorphism block (duplicated ~15 times in legacy) into one utility class in `styles.css`.

**Don't port:**

- `biome.jsonc` (replaced by Ultracite)
- Split tsconfigs (v1 uses a single one)
- `/about` page (defer until finder + fares work)
- `src/hooks/transitions/use-view-transitions.ts` (defer)

---

## 14. When you get stuck

1. Check the TanStack Start docs at <https://tanstack.com/start/latest> before guessing.
2. Check mapcn docs at <https://mapcn.vercel.app/docs> before guessing MapLibre APIs.
3. Check existing code in `src/features/` for established patterns.
4. If the issue is library-version-specific, verify against the installed version in `package.json` — don't assume latest-online matches what's installed.
5. If a linter rule seems wrong for this project, **do not disable it inline.** Open a discussion about updating `oxlint.config.ts`.
6. If a test is failing and the cause isn't obvious, run `bun run test:unit -- --reporter=verbose` and add temporary `console.log` (remove before commit).
7. If confused, stop and ask. Named confusion is cheaper than a wrong implementation.
