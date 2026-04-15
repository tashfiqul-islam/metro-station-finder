# Metro Station Finder v1 — Implementation Plan

**Repo:** `D:/Projects/metro-station-finder-v1`
**Source of truth for rules:** [AGENTS.md](../AGENTS.md)
**Behavior contract:** AGENTS.md §2 (Karpathy framework)
**Plan authored:** 2026-04-16
**Plan owner:** Tashfiqul Islam

---

## 0. How to read this plan

This plan is divided into 15 sprints (Sprint 0 baseline + 14 feature sprints). Each sprint ships one vertical slice behind a gate. Nothing advances until the gate is green.

### 0.1 Operating rhythm

- **Sprint = one shippable vertical slice**. One PR per sprint. Branch naming: `sprint-N/<slug>`. Merge target: `main`.
- **Test-driven**: write failing tests for the smallest verifiable unit first, then implement, then refactor. No untested logic ships.
- **Commit cadence**: Conventional Commits via `bun run commit`. No `--no-verify`, no unsigned commits.
- **Handoff**: a one-paragraph entry in `docs/SPRINT_LOG.md` recording the merge commit SHA, and the next sprint does not start until the current gate is green. Version tags are owned by semantic-release; never create manual sprint/milestone tags.
- **Scope discipline** (AGENTS.md §2.3): if a sprint wants to touch something outside its declared deliverables, it files a follow-up issue, not a drive-by edit.
- **Karpathy §2.1** every sprint: before any non-trivial change, state assumptions. If multiple interpretations exist, list them. Don't pick silently.

### 0.2 Definition of done (applies to every sprint)

A sprint is done if and only if **all** of these are true:

1. `bun run ci` passes locally (`typecheck → lint → test → build`).
2. `bun run test:coverage` meets ≥ 80% lines/functions/statements, 75% branches on files the sprint touched. Project-wide coverage never drops.
3. `bun run test:e2e` passes for any critical user flow in scope. Sprint-specific smoke at minimum.
4. Zero `console.log`, `.only`, `.skip`, unmarked `TODO`, unjustified `any`, unjustified `@ts-ignore`, unjustified lint disable.
5. Every new file is Ultracite-clean — `bun run lint:fix` produces zero diffs.
6. Every new external boundary (user input, network response, env var, filesystem read, LLM response) has a Valibot schema at the boundary.
7. Every new `window`/`document`/`localStorage`/`maplibre-gl` reference is SSR-safe (lazy import or `useEffect` guarded).
8. No secret reaches the client bundle. Verified with a grep of `dist/` for the env-var name.
9. `docs/SPRINT_LOG.md` updated with a one-paragraph entry.
10. A code review pass (self or subagent-driven) has been completed on the final diff.

Missing any one of these = sprint not done. "Almost there" is not a status.

### 0.3 Quality gates (continuous)

- **Pre-commit** (Lefthook, already wired): `ultracite fix` on staged files + typecheck. Auto-fixes and re-stages.
- **Pre-push** (Lefthook, already wired): lint + typecheck + test:unit.
- **Pull request** (GitHub Actions, wired in Sprint 0): the full `bun run ci` plus `test:integration`, `test:e2e`, `lighthouse:assert`, `bun pm audit`, and a bundle-size delta check.
- **Post-merge**: semantic-release publishes the version, pushes the tag, writes CHANGELOG.

### 0.4 2026 stack research baseline

Features to exploit where they simplify code. Do not paste fetched docs into source — reference them.

**React 19.2**

- `ref` is a prop on function components. Do not use `forwardRef` on new code.
- Document Metadata: `<title>`, `<meta>`, `<link>` rendered inside any component auto-hoist to `<head>`. Use for per-station pages and per-route meta.
- `use()` hook — read promises and context, enable suspension on any thenable.
- Form actions: `action={fn}` on `<form>`, `useFormStatus`, `useActionState`, `useOptimistic`. Used in Sprints 8, 11.
- Asset loading APIs: `preload`, `preinit`, `preloadModule`. Used in Sprint 6 to warm the map chunk.
- `useDeferredValue(value, initialValue)` — the second-arg SSR snapshot pattern.

**TypeScript 6.0**

- `erasableSyntaxOnly` (on) — no enums, namespaces, parameter properties, experimental decorators. Use unions + plain objects.
- `noUncheckedIndexedAccess` (on) — every index is `T | undefined`. Use checked helpers.
- `noPropertyAccessFromIndexSignature` (on) — `process.env["KEY"]`, never `process.env.KEY`.
- Isolated declarations (opt-in) — consider enabling in Sprint 13 if build time bites.
- Go-based `tsgo` preview — NOT adopted here. Too early.

**TanStack Start 1.167+ RC**

- File-based routing via `@tanstack/router-plugin`. `routeTree.gen.ts` auto-generates.
- Isomorphic server functions with Valibot validators.
- Full prerender: `prerender.enabled: true`, `crawlLinks`, `autoSubfolderIndex`, `autoStaticPathsDiscovery`, `staticPaths` loaders for dynamic routes.
- Route options: `beforeLoad`, `loader`, `notFoundComponent`, `pendingComponent`, `errorComponent`, `head`.
- `defaultPreload: "intent"` — hover to preload (already set).

**Tailwind CSS v4.2 (Oxide)**

- `@theme inline` block in CSS — no `tailwind.config.js`.
- `@property --angle` and other native CSS features first-class.
- `color-mix(in oklch, ...)` native.
- Cascade layers and container queries first-class.
- `@custom-variant` for variants (already used for dark mode).

**Vitest 4**

- `projects` replaces deprecated `workspace` (already used).
- `expect.soft`, `expect.poll` for async assertions.
- `test.concurrent` default for pure unit tests.
- Browser mode with Playwright backend — optional fallback if jsdom bites us in Sprint 13.

**Playwright 1.59**

- Project dependencies pattern replaces `globalSetup` (already wired).
- `test.step` for nested reporting.
- `testIdAttribute: "data-testid"` (already wired).
- Blob reporter for CI sharding.

**Base UI (shadcn `base-mira`)**

- Unstyled, accessible primitives: Button, Dialog, Popover, Tooltip, Tabs, Accordion, Select, Menu, Toast.
- Composition-first, no internal state leakage.

**Valibot 1.3**

- Pipe-based schemas, tree-shakeable, ~6–8× smaller than Zod.
- `v.parse`, `v.safeParse`, `v.transform`, `v.pipe`, `v.check`.
- Standard Schema compliant.

**@phosphor-icons/react 2.1**

- Tree-shakeable named imports.
- Weights: `thin | light | regular | bold | fill | duotone`. Default `regular`, `bold` for active nav items.
- SSR-safe (pure SVG).

**mapcn / MapLibre GL**

- `bunx shadcn@latest add @mapcn/map` → `src/components/ui/map.tsx`. Copy-paste, owned code.
- `maplibre-gl` imports `window` at module scope. Always lazy.
- `MapRoute` is a rendering-only polyline (`[lng, lat][]`). Routing is BYO.
- `useMap` hook for raw instance access.

**OpenRouteService**

- `/v2/directions/foot-walking/geojson` returns `features[0].geometry.coordinates` as `[lng, lat][]`.
- Free tier: 2000 req/day, 40/min.
- Auth: `Authorization: <key>` header.
- Key: `ORS_KEY` in `.env.local` (already set).

**Cloudflare Workers Static Assets**

- `wrangler.toml` with `[assets] directory = "dist"`.
- KV namespaces for cache + rate limit.
- Secrets via `wrangler secret put`.
- No Node APIs in the Worker — use Web Crypto, `fetch`, `URL`.

### 0.5 Risk register

| Risk                                                | Impact                       | Mitigation                                                           | Sprint |
| --------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------- | ------ |
| mapcn SSR crash on prerender                        | Sprint 6 blocked             | Lazy import + Suspense boundary pattern verified in smoke test first | 6      |
| OpenFreeMap tile flake                              | Runtime UX                   | Protomaps+R2 fallback design documented, built only if it bites      | —      |
| ORS rate limit (2000/day)                           | Runtime 429                  | KV cache keyed on rounded coords; graceful straight-line fallback    | 7      |
| TanStack Start RC API churn                         | Build breaks between minors  | Pin minor; upgrade deliberately; read release notes                  | all    |
| `class-variance-authority` uses runtime decorators? | `erasableSyntaxOnly` rejects | Verify Sprint 2; fallback is a tagged-template helper                | 2      |
| MRT-6 OSM relation incomplete                       | Bad trip-planner geometry    | Fallback: hand-trace once, commit as GeoJSON                         | 1, 9   |
| Fare matrix data accuracy                           | Wrong fares shown            | Source DMTCL official card; snapshot test against published values   | 1      |
| LLM NL-finder hallucinating stations                | Wrong routes suggested       | Strict Valibot on extracted JSON; fallback to direct UI on mismatch  | 11     |
| Cloudflare Static Assets pricing change             | Hosting cost                 | Re-check before Sprint 14; fallback is Cloudflare Pages              | 14     |
| MCP protocol version drift                          | Sprint 12 spec outdated      | Pin `@modelcontextprotocol/sdk` minor; re-read spec before build     | 12     |

---

## Sprint 0 — Foundation & Guardrails

**Goal:** Baseline CI green, dev ergonomics correct, stale scaffold leftovers purged, plan + log committed.
**Model:** Haiku 4.5 primary — Sonnet 4.6 for the CI YAML.
**Depends on:** nothing.
**AGENTS.md sections engaged:** §4, §10, §11.

### Deliverables

- Fix `.cta.json` (stale: `pnpm`, lists `eslint` addon — either delete the file or rewrite to match reality).
- Fix `.vscode/settings.json` — remove top-level `editor.defaultFormatter: esbenp.prettier-vscode`; top-level should also be `oxc.oxc-vscode` to match per-language formatters.
- Rewrite `public/manifest.json` for MSF PWA (name, short_name, theme_color, background_color). Real icon references deferred to Sprint 10.
- Add `LICENSE` (MIT, author = Tashfiqul Islam).
- Add empty `CHANGELOG.md` (semantic-release populates it).
- Add `docs/SPRINT_LOG.md` with a header and a Sprint 0 entry.
- Commit `docs/IMPLEMENTATION_PLAN.md` (this file).
- Write `.github/workflows/ci.yml` running `bun run ci` on pull_request and push to main.
- Write `.github/workflows/release.yml` running `semantic-release` on push to main (gated on CI green).
- Add `.github/dependabot.yml` for weekly `bun` + Actions updates.
- Add repository CODEOWNERS pointing everything at the owner.
- Verify `bun install && bun run ci` passes on the scaffold.

### Tests first

- Existing `tests/unit/sanity.test.ts` remains passing — baseline never breaks.
- Add `tests/unit/scaffold.test.ts` — imports `package.json` as JSON, asserts `name === "metro-station-finder"` and required scripts exist. Catches accidental config regressions.

### Verification gate

- `bun run ci` green.
- GitHub Actions `ci` workflow green on first push.
- `bunx ultracite fix` produces zero diffs.
- `bun pm audit` clean (no high/critical).

### Skills / subagents / MCP

- `update-config` skill for `.vscode/settings.json`, `.github/workflows/*.yml`.
- `gh-cli` skill for Actions wiring.
- `agent-skills:ci-cd-and-automation` skill for CI rhythm.
- Context7 for GitHub Actions latest syntax if uncertain.

### Exit criteria

- Commit merged to `main`; no release cut (chore-only change).
- PR merged to `main`, Actions green.
- `docs/SPRINT_LOG.md` has its first entry.

---

## Sprint 1 — Data & Pure Logic

**Goal:** All deterministic logic (stations, fares, haversine, nearest, trip slice, travel time) fully implemented and 100% unit-tested. No UI yet.
**Model:** Sonnet 4.6 primary — Opus 4.6 for Valibot schema design + DMTCL fare-matrix accuracy audit; Haiku 4.5 for test fixture generation.
**Depends on:** Sprint 0.
**AGENTS.md sections engaged:** §5.4, §8, §12.

### Deliverables

- `src/data/stations.ts` — 17 stations as `const`-asserted literals with `slug`, `nameEn`, `nameBn`, `lat`, `lng`, `orderIndex`, `status: "operational" | "under-construction"`. Validated by Valibot at module load.
- `src/data/fares.ts` — 17×17 fare matrix sourced from the DMTCL fare card, as a `const`-asserted nested tuple. Valibot schema asserts symmetry, diagonal zero, and non-negative integers at module load.
- `src/data/mrt6-line.geojson` — single `Feature<LineString>` representing the MRT-6 alignment. One-time fetch from OSM Overpass (`relation["route"="subway"]["ref"="6"]` around Dhaka), cleaned and committed. If Overpass data is incomplete, hand-trace from station coordinates as an interim.
- `src/lib/validation.ts` — shared Valibot helpers: `parseOrThrow`, `isSlug`, `clampLatitude`, `clampLongitude`.
- `src/features/station-finder/logic.ts` — `haversineKm(a, b)`, `findNearest(from, stations)`, pure, typed.
- `src/features/fare-calculator/logic.ts` — `calculateFare(fromSlug, toSlug)`, throws `InvalidStationError` on unknown slug.
- `src/features/trip-planner/logic.ts` — `planTrip(fromSlug, toSlug)` returns `{ stops, fare, distanceKm, estimatedMinutes, segmentCoords }`. Uses `clipLineToSegment` helper against the static GeoJSON.
- Colocated `*.test.ts` for each logic file.

### Tests first (TDD)

- `haversineKm`: known fixtures ±1 m accuracy (Uttara North → Motijheel ≈ 16.5 km).
- `findNearest`: deterministic on fixture; correctly picks nearest when two are equidistant (stable by `orderIndex`).
- `calculateFare`: 10+ spot-check fares from the official DMTCL card.
- `calculateFare`: symmetry — `fare(a, b) === fare(b, a)` for all pairs.
- `calculateFare`: diagonal — `fare(a, a) === 0`.
- `planTrip`: forward and reverse directions produce the same fare and distance.
- `planTrip`: same origin and destination returns zero-length trip (not an error).
- `clipLineToSegment`: correct coordinate count for a known slice.
- Schema rejection: negative lat, longitude > 180, duplicate slug, asymmetric matrix, non-integer fare — all rejected at module load with descriptive errors.

### Verification gate

- `bun run test:unit` green.
- `bun run test:coverage` — new files at 100% lines/functions/branches.
- `bun run typecheck` clean on strict TS 6 settings.
- Module-load symmetry assertion fires on a deliberately broken fixture (dev-only runtime check).
- `git grep` shows no `any` or `@ts-ignore` in new files.

### Skills / subagents / MCP

- `superpowers:test-driven-development` skill (primary — this sprint is TDD end to end).
- `tdd-guide` subagent for red-green-refactor loop.
- `typescript-advanced-types` skill for the discriminated-union station type.
- Context7 MCP: `valibot` latest docs for `v.pipe` + `v.check` patterns.
- `Explore` subagent if the OSM Overpass query needs refinement.

### Exit criteria

- All 17 stations + full fare matrix present and validated.
- `mrt6-line.geojson` has a continuous `LineString` covering all 17 stops.
- Coverage report shows 100% on the new logic files.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 2 — Design System & Theme

**Goal:** Styles, tokens, FOUC-blocking theme script, shadcn primitives, and common shell components ported. No feature pages yet, but rendering in isolation works.
**Model:** Sonnet 4.6 primary — Opus 4.6 for `@theme inline` consolidation design and CVA decorator check; Haiku 4.5 for `shadcn add` runs + mechanical imports.
**Depends on:** Sprint 0.
**AGENTS.md sections engaged:** §11, §13 (first deliverables of the port).

### Deliverables

- Consolidated `src/styles.css`:
  - `@import "tailwindcss"`
  - `@theme inline` block with oklch primary, `--header-height: 4rem`, `--footer-height: 0`
  - `@property --angle` + `shimmer-spin` keyframes (for animated badge)
  - `.glass-card` utility layer (replaces the ~15 inline glassmorphism duplications from the legacy)
  - `@custom-variant dark` (already present, retained)
  - Font imports (Space Grotesk + Oxanium via `@fontsource-variable/*`)
- shadcn primitives added via `bunx shadcn@latest add` (asking user before install):
  - `badge`, `card`, `separator`, `sheet`, `tabs`, `accordion`, `hover-card`
- `src/components/common/glass-card.tsx` — thin wrapper over the utility class, accepts `className`, composes via `cn()`.
- `src/components/common/section-wrapper.tsx` — port from legacy, strip `"use client"`, use Motion for entrance animations, respect `useReducedMotion`.
- `src/components/common/unified-background.tsx` — port the legacy scroll-driven background; one export only (legacy had two files — consolidate to one).
- `src/components/ui/animation-constants.ts` — port all `ANIMATION_CONFIG`, scroll sequences, easing.
- `src/components/ui/animated-badge.tsx` — port, uses `@property --angle` + `shimmer-spin`.
- `src/components/ui/highlight.tsx` — port the Motion sliding-pill primitive used by navbar.
- Add `motion` dep (ask first) — used by background, section wrapper, highlight, animated badge.
- Verify `class-variance-authority` does not use runtime decorators (mitigates Sprint 0 risk register item). If it does, replace with a minimal local tagged-template helper.
- Reconcile `src/components/ui/button.tsx` — the scaffold's Button uses Base UI; port the legacy's `variant="primary"` + `asChild` API where it's needed (most likely keep Base UI + add variants).

### Tests first

- `tests/integration/glass-card.test.tsx` — renders children, applies className composition.
- `tests/integration/section-wrapper.test.tsx` — respects `prefers-reduced-motion: reduce` via `matchMedia` mock, sets `data-section-id`.
- `tests/integration/animated-badge.test.tsx` — renders anchor with correct `href`, applies shimmer class.
- `tests/integration/highlight.test.tsx` — clicking a `HighlightItem` moves the active pill (check `data-active`).

### Verification gate

- `bun run ci` green.
- `bun run test:integration` green.
- No `forwardRef` in any new code (React 19 ref-as-prop).
- `bunx ultracite fix` zero diffs.
- Visual sanity: a scratch page at `/` rendering `<GlassCard><AnimatedBadge text="Hello" href="/" /></GlassCard>` looks correct in both themes.

### Skills / subagents / MCP

- `shadcn` skill for component additions.
- `tailwind-design-system` skill for the `@theme inline` block structure.
- `frontend-design` skill for reviewing the glass-card abstraction.
- Context7 MCP: `tailwindcss` latest for `@theme inline` caveats.
- `code-reviewer` subagent after the port pass.

### Exit criteria

- Scratch render at `/` shows both theme variants correctly, no FOUC.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 3 — Navigation & Root Shell

**Goal:** Full root layout with FOUC-blocking theme script, QueryClientProvider, background, navbar, and padded main — visually identical to the legacy site chrome, ready to host home sections.
**Model:** Sonnet 4.6 primary — Opus 4.6 for FOUC-script + CSP review (mandatory `security-reviewer` pass); Haiku 4.5 for Lucide → Phosphor icon rename sweep.
**Depends on:** Sprints 1, 2.
**AGENTS.md sections engaged:** §5.1, §13 (second deliverable of the port).

### Deliverables

- `src/routes/__root.tsx` — full port from legacy:
  - FOUC-blocking inline `<script>` for theme resolution (verbatim from legacy; documented `dangerouslySetInnerHTML` exception).
  - `<html lang="en" suppressHydrationWarning>` with `data-theme` attribute wired.
  - `QueryClientProvider` with legacy defaults: `staleTime: 1h`, `gcTime: 24h`, `retry: 2`, `refetchOnWindowFocus: false`, `refetchOnReconnect: true`, `mutations.retry: 1`. Named constants as in legacy for readability.
  - `UnifiedBackground` rendered once at root (not duplicated in home-page).
  - `NavBar` rendered above `<main>`.
  - `<main>` with inline `paddingTop: var(--header-height)`.
  - Dev-only `TanStackDevtools` + `ReactQueryDevtools` gated on `import.meta.env.DEV`.
  - `head()` meta: title, description, viewport, charset, stylesheet link.
  - `notFoundComponent`: centered 404 with link home.
- `src/components/ui/navbar.tsx` — full port with deltas:
  - All lucide icons → Phosphor (`Train`, `House`, `MapPin`, `Calculator`, `Info`, `List`, `X`, `GithubLogo`, `Path` for trip-planner).
  - `react-icons/fa/FaGithub` → Phosphor `GithubLogo`.
  - Strip `"use client"`.
  - Strip `biome-ignore` comments; add `oxlint-disable-next-line` only where Oxlint actually flags.
  - 5 nav items: `/`, `/station-finder`, `/station-fares`, `/trip-planner`, `/about`.
  - Desktop: Highlight pill + NavLink composition.
  - Mobile: `createPortal` dropdown with click-outside + Escape handling.
- `src/components/navbar/logo.tsx` — Phosphor `Train`, responsive text.
- `src/components/navbar/github.tsx` — Phosphor `GithubLogo`.
- `src/components/navbar/theme.tsx` — 3-state (`light | dark | system`), localStorage-backed, Base UI `Menu` primitive.

### Tests first

- `tests/integration/navbar.test.tsx`:
  - Renders all 5 nav items.
  - Active item has `aria-current="page"` on current route.
  - Mobile: hamburger click opens menu, Escape closes, outside click closes.
  - Logo renders full name on md+, short "MSF" on mobile.
- `tests/integration/theme.test.tsx`:
  - Cycles light → dark → system → light.
  - Writes to `localStorage["theme"]`.
  - Applies `.dark` class to `<html>` in dark mode.
- `tests/e2e/navigation.spec.ts`:
  - Navigate via navbar between all 5 routes.
  - Page title updates.
  - No full page reload (verify via `page.on("load")` counter).
- `tests/e2e/theme-no-fouc.spec.ts`:
  - Load `/` in dark system preference.
  - Immediately after `domcontentloaded`, `html` has `dark` class (no light-to-dark flicker).

### Verification gate

- `bun run ci` green.
- `bun run test:e2e -- navigation theme-no-fouc` green.
- `@axe-core/playwright` zero critical/serious violations on the navbar.
- No console warnings on mount.
- Lighthouse on `/` ≥ 95 perf, a11y, best-practices.

### Skills / subagents / MCP

- `superpowers:test-driven-development` for the integration + E2E tests.
- `web-design-guidelines` skill for a11y review.
- `code-reviewer` subagent after the port.
- `security-reviewer` subagent specifically on the FOUC-blocking script (CSP implications).
- Context7: `@tanstack/react-router` for `createRootRoute` and `HeadContent` current API.

### Exit criteria

- Visit `/`, see navbar + empty body, theme toggle works, mobile menu works, no FOUC.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 4 — Home Page Port

**Goal:** All 6 home sections rendered with 2026 deltas applied — Phosphor icons, updated tech stack, MapLibre copy, journey with v1.0.0 rebuild entry.
**Model:** Sonnet 4.6 primary — Haiku 4.5 for icon rename + `techLogos` array edit + glass-card call-site rewrites; Opus 4.6 for post-refactor review (catch over-abstraction).
**Depends on:** Sprint 3.
**AGENTS.md sections engaged:** §11, §13.

### Deliverables

- `src/pages/home/home-page.tsx`:
  - Port from legacy.
  - Strip `"use client"`.
  - Strip the redundant second `<UnifiedBackground />` (root renders it already).
  - Keep `mounted` hydration guard.
- Six sections under `src/pages/home/sections/`:
  1. `hero-section.tsx` — Phosphor icons, `HERO_DATA` updated. Gradient highlight on "Precision" retained.
  2. `story-section.tsx` — 2×2 bento, Phosphor icons, `DescriptionWithHighlight` helper retained.
  3. `tech-stack-section.tsx` — **remove** Google Maps + Zod from `techLogos`; **add** MapLibre, Valibot, mapcn. Update the header copy line if needed.
  4. `features-section.tsx` — replace "Google Maps integration" copy with "MapLibre + OpenFreeMap tiles + OpenRouteService walking routes"; Phosphor icons.
  5. `journey-section.tsx` — update timeline: add `v1.0.0 — 2026 Rebuild` entry describing the TanStack Start / Tailwind 4 / mapcn / Valibot / AI-powered migration.
  6. `maintainer-section.tsx` — port, Phosphor icons, social links, two CTAs.
- `src/lib/constants/hero-data.ts` — Phosphor icon references.
- Public assets:
  - `/public/tech-stack/*.svg` — port existing, plus new `maplibre.svg`, `valibot.svg`, `mapcn.svg`; remove `google_maps.svg`, `zod.svg`.
  - `/public/socials/*.svg` — port existing.
  - `/public/tashfiq.png` — port.
- Extract duplicated glassmorphism block into the `.glass-card` utility class from Sprint 2 (reduces section files by 100+ lines).

### Tests first

- `tests/integration/hero-section.test.tsx` — renders, CTAs link correctly, headline text.
- `tests/integration/story-section.test.tsx` — renders 4 cards, correct titles.
- `tests/integration/tech-stack-section.test.tsx` — `techLogos` array does not contain Google Maps or Zod; includes MapLibre and Valibot.
- `tests/integration/features-section.test.tsx` — feature titles, no "Google Maps" copy.
- `tests/integration/journey-section.test.tsx` — includes a v1.0.0 2026 rebuild entry.
- `tests/integration/maintainer-section.test.tsx` — profile and social links.
- `tests/e2e/home.spec.ts` — full home page loads, all section IDs present (`#hero`, `#story`, etc.), scroll snap works, no console errors.

### Verification gate

- `bun run ci` green.
- `bun run lighthouse:collect && bun run lighthouse:assert` passes with these budgets:
  - Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- `@axe-core/playwright` zero critical/serious on the home route.
- Initial JS ≤ 180 KB gzipped.

### Skills / subagents / MCP

- `frontend-design` skill for section-by-section review.
- `vercel-react-best-practices` skill for Motion + React 19 patterns.
- `refactor` skill for the glass-card extraction.
- `ui-ux-pro-max` skill for critiquing the final result.
- Context7: `motion/react` latest.

### Exit criteria

- Home page is visually close to the legacy site with all copy and tech deltas applied.
- Lighthouse budgets green.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 5 — Routing Stubs & About Page

**Goal:** All routes exist in the route tree as typed stubs; `/about` ported in full; per-route meta set for SEO.
**Model:** Haiku 4.5 primary for the stubs and icon renames — Sonnet 4.6 for per-route meta authoring and About page content review.
**Depends on:** Sprint 3.
**AGENTS.md sections engaged:** §5.1, §13.

### Deliverables

- `src/routes/station-finder.tsx` — stub with heading, description, "coming soon" glass card.
- `src/routes/station-fares.tsx` — stub.
- `src/routes/trip-planner.tsx` — stub.
- `src/routes/about.tsx` — full port from legacy (664 LOC):
  - Strip `"use client"`.
  - Lucide → Phosphor.
  - Tabs + Accordion from Base UI (already added in Sprint 2).
- Per-route `head()` meta:
  - `title` (per-page + site suffix)
  - `description`
  - `canonical` via `<link rel="canonical">`
  - Open Graph tags (title, description, type, url, image)
  - Twitter Card tags
  - JSON-LD `WebPage` for every route; `TransitStation` reserved for Sprint 12.
- Update `notFoundComponent` in `__root.tsx` with Phosphor warning icon and a link home.

### Tests first

- `tests/integration/route-stubs.test.tsx` — each stub renders, title matches, heading present.
- `tests/integration/about.test.tsx` — tabs switch, accordion expands.
- `tests/e2e/meta.spec.ts` — every route has `<title>`, `<meta name="description">`, `<link rel="canonical">`, a valid JSON-LD block.

### Verification gate

- `bun run ci` green.
- Lighthouse SEO ≥ 95 on every route.
- JSON-LD validates against schema.org (manual check once, automated in Sprint 12).

### Skills / subagents / MCP

- `seo-audit` skill for the meta audit.
- `next-best-practices` skill (for meta patterns, ignoring Next-specific APIs).
- `documentation-writer` skill if the About content needs tightening.

### Exit criteria

- All 5 top-level routes reachable, correctly titled, SEO-complete.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 6 — Maps Foundation

**Goal:** mapcn installed, SSR-safe MapCanvas wrapper in place, a simple map with all 17 stations rendered as markers works at `/station-finder` (still a preview — feature logic lands Sprint 7).
**Model:** **Opus 4.6 primary** — top-risk sprint. Opus owns the SSR-safe lazy wrapper design, chunk-split verification, and prerender crash mitigation. Sonnet 4.6 for markers + metro-line layer implementation and E2E.
**Depends on:** Sprints 1, 3.
**AGENTS.md sections engaged:** §5.1, §6.

### Deliverables

- Install mapcn (asking user first — dep install per AGENTS.md §10): `bunx shadcn@latest add @mapcn/map`. This writes `src/components/ui/map.tsx` and installs `maplibre-gl` as a dep.
- `src/components/common/map-canvas.tsx`:
  - `React.lazy` + `Suspense` wrapper around the mapcn `Map` component.
  - Renders a skeleton loader during the lazy load.
  - Error boundary for `window`-less prerender (returns skeleton during prerender, real map after hydration).
  - Offline fallback: if navigator.onLine is false, render an "offline — map unavailable" overlay.
  - Respects `useMap` hook forwarding for children needing raw instance access.
- `src/features/station-finder/components/station-markers.tsx`:
  - Maps `stations` array to `MapMarker` components.
  - Each marker has `data-testid={`station-marker-${slug}`}`.
  - `MarkerPopup` child with station name and slug.
- `src/features/station-finder/components/metro-line-layer.tsx`:
  - Uses `useMap` hook inside children.
  - On mount, adds a GeoJSON source from `mrt6-line.geojson` and a line layer with brand color.
  - Cleans up source + layer on unmount.
- Wire a preview into `/station-finder` route — render a `MapCanvas` containing `<MetroLineLayer />` and `<StationMarkers />`.
- Use `preloadModule('/src/components/common/map-canvas.tsx')` hint on the landing page for warm navigation.

### Tests first

- `tests/integration/map-canvas.test.tsx` — renders skeleton when `window` missing; renders real map when mounted.
- `tests/e2e/map-smoke.spec.ts`:
  - Navigate to `/station-finder`.
  - Wait for 17 station markers (via data-testid).
  - Click a marker, see popup with name.
  - Offline: `page.context().setOffline(true)`, reload, see offline overlay, no crash.

### Verification gate

- `bun run ci` green.
- Bundle analysis confirms `maplibre-gl` is in a separate chunk (not in main entry).
- Playwright map smoke green.
- Prerender does NOT crash: `bun run build` completes, `dist/station-finder/index.html` exists and contains the skeleton fallback (not an error).

### Skills / subagents / MCP

- `playwright-best-practices` skill.
- `vite` skill for the bundle split check.
- `code-reviewer` subagent on `map-canvas.tsx` specifically.
- Context7: mapcn and `maplibre-gl` latest.

### Exit criteria

- Open `/station-finder`, see the full MRT-6 line with 17 markers. Click Motijheel marker, see popup.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 7 — Station Finder Feature

**Goal:** Full nearest-station flow — geolocation or manual input, nearest station highlighted, walking route drawn via the OpenRouteService server function proxy.
**Model:** **Opus 4.6 primary** — server function + `ORS_KEY` handling + cache-key design + straight-line fallback logic + mandatory `security-reviewer` gate. Sonnet 4.6 for LocationInput, NearestStationCard, and E2E tests.
**Depends on:** Sprints 1, 6.
**AGENTS.md sections engaged:** §5.5, §5.6, §6.3.

### Deliverables

- `src/features/station-finder/route.tsx` — real implementation replacing the preview.
- `src/features/station-finder/components/location-input.tsx`:
  - Base UI form with a "use my location" button + manual lat/lng fields.
  - Geolocation via `navigator.geolocation.getCurrentPosition` with permission handling.
  - Feature detection: disabled button with explanation on unsupported browsers.
  - Validation via Valibot before dispatching to the finder.
- `src/features/station-finder/components/nearest-station-card.tsx`:
  - Displays nearest station name, walking distance (km + minutes), fare to next 3 destinations.
  - Glass card styling.
- `src/features/station-finder/components/user-location-marker.tsx`:
  - Separate `MapMarker` for the user position, distinct color.
- `src/features/station-finder/components/walking-route-layer.tsx`:
  - Renders a `MapRoute` from the fetched coordinates.
  - Straight-line fallback (dashed, warning color) when ORS is unavailable.
- `src/features/station-finder/server/get-walking-route.ts`:
  - `createServerFn` with Valibot validator on input (`{ from: LatLng, to: LatLng }`).
  - Reads `process.env["ORS_KEY"]`.
  - `POST` to ORS `/v2/directions/foot-walking/geojson`.
  - Returns `[lng, lat][]` or throws a typed error.
  - Caches result in Cloudflare KV (when deployed) keyed on rounded-4dp coords + target slug.
  - Rate-limit awareness: respects `X-RateLimit-Remaining` header, returns cached or straight-line fallback on 429.
- `src/features/station-finder/hooks/use-walking-route.ts`:
  - TanStack Query wrapper.
  - Stale-while-revalidate with reasonable defaults.
  - Fallback to straight-line on error.
- Error boundary component showing a retry button on uncaught errors inside the feature route.

### Tests first

- Unit: `get-walking-route` with mocked `fetch` — valid input returns coords, 429 triggers fallback, 401 throws, bad GeoJSON throws.
- Unit: `nearest-station` logic (already tested Sprint 1) — add URL-param edge case.
- Integration: `LocationInput` — permission denied shows manual-entry fallback; manual lat/lng validates.
- Integration: `NearestStationCard` — renders correct data for a fixture.
- Integration: straight-line fallback renders a dashed route when the hook returns an error.
- E2E: `tests/e2e/station-finder.spec.ts`:
  - Visit `/station-finder`.
  - Deny geolocation (Playwright context permission).
  - Enter manual coordinates.
  - See user marker + nearest-station marker highlighted + walking route line + card.
  - Verify `ORS_KEY` not present in any script or network response body.

### Verification gate

- `bun run ci` green.
- **Security check**: `grep -r "ORS_KEY\|OPENROUTESERVICE" dist/` returns zero matches.
- Coverage ≥ 80% on the feature folder.
- Playwright E2E green.

### Skills / subagents / MCP

- `superpowers:test-driven-development` skill.
- `security-reviewer` subagent — MANDATORY before merge, specifically on the server function.
- `native-data-fetching` skill.
- `tdd-guide` subagent.
- Context7: OpenRouteService API docs for foot-walking endpoint schema.

### Exit criteria

- Real end-to-end nearest-station flow works against the real ORS API in dev.
- Offline fallback works.
- No secret leak.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 8 — Fare Calculator Feature

**Goal:** Dropdown-based fare lookup between any two stations, result display, bookmarkable URL state.
**Model:** Sonnet 4.6 primary — Haiku 4.5 for E2E fixtures and mechanical select-option generation.
**Depends on:** Sprints 1, 5.
**AGENTS.md sections engaged:** §5.4, §8.

### Deliverables

- `src/features/fare-calculator/route.tsx` — real implementation.
- `src/features/fare-calculator/components/station-select.tsx`:
  - Base UI `Select` with all 17 stations grouped or listed by `orderIndex`.
  - Filters out the already-selected station on the other side.
  - Accessible (keyboard nav, screen-reader labels).
- `src/features/fare-calculator/components/fare-display.tsx`:
  - Glass card showing: origin → destination, BDT amount, stops count, estimated distance, estimated travel time.
  - Animates in on change.
- URL state: `/station-fares?from=uttara-north&to=motijheel`.
- Route-level search param validation via Valibot in `validateSearch` option.
- Bookmarkability: reloading the URL re-hydrates both selects.

### Tests first

- Unit: additional edge cases for `calculateFare` driven by URL params (unknown slug, missing param).
- Integration: `StationSelect` — selecting origin disables that station in the destination select.
- Integration: `FareDisplay` — renders correctly for a fixture.
- Integration: URL params hydrate the selects on mount.
- E2E: `tests/e2e/fare-calculator.spec.ts`:
  - Visit `/station-fares`.
  - Select two stations, see fare.
  - Copy URL, open in fresh tab, same state restored.

### Verification gate

- `bun run ci` green.
- URL-state hydration verified in E2E.
- `@axe-core/playwright` zero critical/serious on the route.

### Skills / subagents / MCP

- `form-cro` skill for UX.
- `typescript-advanced-types` skill for the `validateSearch` types.
- Context7: TanStack Router `validateSearch` latest API.

### Exit criteria

- Fare lookup works; URLs are bookmarkable; a11y clean.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 9 — Trip Planner Feature

**Goal:** Full station-to-station trip plan — origin, destination, intermediate stops list, metro line segment drawn on the map, total distance and travel time.
**Model:** Sonnet 4.6 primary — Opus 4.6 for the `clipLineToSegment` algorithm and edge-case analysis (one focused session); Haiku 4.5 for fixture generation.
**Depends on:** Sprints 1, 6, 8.
**AGENTS.md sections engaged:** §6.4, §8.

### Deliverables

- `src/features/trip-planner/route.tsx` — real implementation.
- `src/features/trip-planner/components/trip-form.tsx` — reuses `StationSelect` from Sprint 8.
- `src/features/trip-planner/components/trip-result.tsx`:
  - Ordered list of stops between origin and destination.
  - Fare, distance, estimated travel time.
  - Embedded `MapCanvas` with two overlay layers.
- `src/features/trip-planner/components/trip-segment-layer.tsx`:
  - Uses `useMap` hook.
  - Adds a GeoJSON source derived from `clipLineToSegment(origin, destination)`.
  - Layer paint thick brand color.
  - Cleans up on unmount.
- `src/features/trip-planner/logic.ts` — already exists from Sprint 1; extend with `clipLineToSegment` if not already present.
- URL state: `/trip-planner?from=uttara-north&to=motijheel`.
- Optional: if user location is known (from Sprint 7), render the walking route to the origin station as a second dashed layer.

### Tests first

- Unit: `clipLineToSegment` — forward, reverse, same station (zero-length), first stop, last stop.
- Unit: travel time estimate — documented formula (stops × average interval + buffer).
- Integration: `TripForm` → `TripResult` roundtrip.
- E2E: `tests/e2e/trip-planner.spec.ts`:
  - Select Uttara North → Motijheel, see all 15 intermediate stops, see line drawn.
  - Reverse selection, same output.
  - Map zooms to fit segment bounds.

### Verification gate

- `bun run ci` green.
- Visual sanity: line clipping matches the real MRT-6 track.
- Coverage ≥ 80% on the feature.

### Skills / subagents / MCP

- `superpowers:brainstorming` if UX ambiguities surface (e.g. "what happens if origin == destination?").
- `tdd-guide` subagent.
- `code-reviewer` subagent.

### Exit criteria

- Trip planning works end-to-end, segment visualization clean, time estimates reasonable.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 10 — PWA & Offline

**Goal:** Installable PWA with offline support for station list + fare lookup + trip planner; graceful degradation for maps/routing when network is unavailable.
**Model:** **Opus 4.6 primary** — service-worker strategy design, cache-key schemes, update-flow semantics are all judgment-heavy. Sonnet 4.6 for implementation + E2E; Haiku 4.5 for manifest + icon generation.
**Depends on:** Sprints 4–9.
**AGENTS.md sections engaged:** §1 (offline-first target), §6.5.

### Deliverables

- Wire `vite-plugin-pwa` in `vite.config.ts` AFTER `tanstackStart()` and BEFORE `viteReact()`:
  - Strategy: `injectManifest` (finer control than `generateSW`).
  - `src/sw.ts` — Workbox-based service worker:
    - Precache: HTML, CSS, JS, fonts, all `src/data/*` bundled JSON.
    - Runtime cache (stale-while-revalidate): OpenFreeMap tile requests.
    - Runtime cache (network-first, 24 h): ORS walking-route responses.
    - Offline fallback page: `/offline.html` for route navigations when both network and cache miss.
- `public/manifest.json` fully replaced by the plugin's generated manifest:
  - name, short_name, theme_color, background_color.
  - Icons 192, 512, maskable 192, maskable 512 — generate via `vite-plugin-pwa`'s assets generator from a single SVG source.
  - Display `standalone`, scope `/`, start_url `/`.
- `src/components/common/install-prompt.tsx` — listens for `beforeinstallprompt`, shows a dismissible toast.
- `src/components/common/update-prompt.tsx` — listens for `onNeedRefresh` from `vite-plugin-pwa`, shows a toast with a reload button.
- `src/components/common/offline-indicator.tsx` — top banner visible when `navigator.onLine === false`.

### Tests first

- Unit: service-worker registration logic.
- E2E: `tests/e2e/offline.spec.ts`:
  - Visit `/`, wait for SW registration.
  - Set offline mode.
  - Navigate to `/station-fares`, select two stations, see fare (data bundled, works offline).
  - Navigate to `/station-finder`, see offline map overlay, station list still visible.
  - Navigate to an unvisited route, see offline fallback page.
- E2E: install prompt fires when the `beforeinstallprompt` event dispatches (Chromium only).
- E2E: update prompt appears when a new SW is detected (simulated by bumping a version constant).

### Verification gate

- `bun run ci` green.
- Lighthouse PWA audit ≥ 95 on every route.
- DevTools Application tab: SW registered, manifest valid, cache populated.
- `bun run build && bun run preview` serves an installable app.

### Skills / subagents / MCP

- `e2e-testing` skill.
- `browser-use` or `agent-browser` skill for the install-prompt UX check.
- Context7: `vite-plugin-pwa` latest docs.

### Exit criteria

- App is installable on Chrome and iOS Safari.
- Works offline on previously visited routes.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 11 — AI Layer Phase 1 (NL Station Finder)

**Goal:** A natural-language query input at `/ask` that reuses the deterministic code via an LLM extraction step. AI is the interface, not the logic.
**Model:** **Opus 4.6 primary** — highest-novelty sprint. Opus owns provider choice research spike, prompt engineering, strict Valibot output schema, rate-limit design, and mandatory `security-reviewer` gate. Sonnet 4.6 for the React 19 form-action components.
**Depends on:** Sprints 1, 7.
**AGENTS.md sections engaged:** §5.5, §5.6, §7.

### Deliverables

- Research spike (half day, before building): choose between Cloudflare Workers AI (Llama 3.x, free tier) and Anthropic Claude via a Worker binding. Criteria: cost, latency, quality, rate limit. Document decision in `docs/SPRINT_LOG.md`.
- `src/routes/ask.tsx` — new route.
- `src/features/ai-finder/components/nl-query-form.tsx`:
  - React 19 `<form action={fn}>` form action with `useActionState` + `useFormStatus`.
  - `useOptimistic` for showing the query as submitted immediately.
  - Textarea with character limit (200).
  - Disabled during action.
- `src/features/ai-finder/components/nl-result.tsx`:
  - Displays the extracted `{origin, destination, intent}`.
  - Shows the resulting fare + nearest walking distance if applicable.
  - "This result came from AI — verify" disclaimer.
- `src/features/ai-finder/server/parse-query.ts`:
  - `createServerFn` with Valibot input (`{ query: string, max 200 }`).
  - System prompt: project overview + the 17 station slugs + Valibot schema description.
  - User prompt: the raw query.
  - LLM call (provider determined by spike).
  - Parse response via `v.safeParse` against a strict output schema: `{ origin_slug, destination_slug, intent: "find_nearest" | "calculate_fare" | "plan_trip" | "unknown" }`.
  - On schema mismatch: throw a typed error; the form action catches and falls back to direct UI with a banner.
  - Rate limit at the Worker level: 10 req/min per IP via KV counter.
- Secrets: `ANTHROPIC_API_KEY` or `WORKERS_AI_TOKEN` in `.env.local` (server-only).

### Tests first

- Unit: `parse-query` with a mocked LLM client — correct output shape, schema rejection path, rate-limit path.
- Unit: output-schema rejection — if the LLM returns an unknown slug, the schema rejects.
- Integration: the form submits, disables during action, shows result; error banner on LLM failure.
- E2E: `tests/e2e/nl-finder.spec.ts`:
  - Submit "cheapest way from mirpur 10 to motijheel".
  - See extracted stations + fare.
  - Submit gibberish, see fallback banner.

### Verification gate

- `bun run ci` green.
- Security: API keys server-only, rate limit enforced (verified by E2E).
- Coverage ≥ 80% on the feature.
- `grep -r "ANTHROPIC_API_KEY\|WORKERS_AI_TOKEN" dist/` returns zero matches.

### Skills / subagents / MCP

- `claude-api` skill if Anthropic chosen.
- `ai-sdk` skill if Vercel AI SDK used.
- `superpowers:test-driven-development` skill.
- `security-reviewer` subagent — MANDATORY before merge.
- Context7: Anthropic SDK or Cloudflare Workers AI latest.

### Exit criteria

- NL finder lives at `/ask`, works for 10 hand-picked test queries, degrades gracefully.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 12 — AI-SEO & MCP Server

**Goal:** Site is discoverable by AI search engines via per-station prerendered pages + JSON-LD, and an MCP server exposes the deterministic logic to any MCP client (Claude Desktop, Cursor, etc.).
**Model:** **Opus 4.6 primary** — MCP protocol compliance + JSON-LD correctness review + tool-schema design. Sonnet 4.6 for per-station page implementation, sitemap, llms.txt, and tests; Haiku 4.5 for robots.txt + static files.
**Depends on:** Sprints 1, 5.
**AGENTS.md sections engaged:** §7.

### Deliverables

- **Per-station prerender**:
  - `src/routes/station.$slug.tsx` — dynamic route with `loader` returning the station, `staticPaths` enumerating all 17 slugs.
  - Rich page per station: name, coordinates, adjacent stations, fares to all other stations, embedded map (lazy).
  - `head()` with per-station title, description, canonical, OG tags.
  - JSON-LD blocks: `TransitStation` + `GeoCoordinates` + `BreadcrumbList`.
- `public/llms.txt` — structured project summary for LLM crawlers (format per llmstxt.org).
- `public/robots.txt` — update to explicitly allow `GPTBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`.
- `src/sitemap.xml.ts` — dynamic route generating a sitemap covering home, about, finder, fares, trip-planner, and all 17 station pages.
- **MCP server**:
  - Separate Worker route at `/mcp` implementing the MCP protocol over HTTP+SSE.
  - Tools exposed, each with a shared Valibot schema imported from `src/data/`:
    - `find_nearest_station(lat, lng)` → `{slug, name, distanceKm}`.
    - `calculate_fare(from_slug, to_slug)` → `{bdt, stops}`.
    - `get_walking_route(from_lat, from_lng, to_slug)` → `[[lng, lat], ...]` (cached).
    - `plan_trip(from_slug, to_slug)` → `{stops, fare, distanceKm, estimatedMinutes}`.
    - `list_stations()` → `[{slug, name, lat, lng, status}, ...]`.
  - Rate limit: 60 req/min per API key (issued via a simple landing page).
  - Documentation: `docs/MCP_SERVER.md` with install instructions for Claude Desktop and Cursor.

### Tests first

- Unit: JSON-LD shape for each station (use `schema-dts` or a hand-rolled type guard).
- Unit: MCP tool handlers against Valibot schemas — valid input, invalid input, edge cases.
- Integration: `llms.txt` and `robots.txt` served with correct content-type.
- Integration: sitemap contains all expected URLs.
- E2E: `tests/e2e/station-pages.spec.ts` — load 3 sample station pages, verify JSON-LD parses, verify navigation to adjacent stations.
- MCP protocol compliance: use `@modelcontextprotocol/sdk` test harness against the local MCP server.

### Verification gate

- `bun run ci` green.
- Lighthouse SEO = 100 on `/station/motijheel` (sample).
- JSON-LD validates via schema.org's structured data tool (manual check).
- MCP server passes protocol compliance.
- Successfully register the MCP server in Claude Desktop locally and call `list_stations()`.

### Skills / subagents / MCP

- `ai-seo` skill.
- `mcp-builder` skill — primary reference.
- `mcp-server-patterns` skill.
- `documentation-writer` skill for `docs/MCP_SERVER.md`.
- Context7: `@modelcontextprotocol/sdk` latest.

### Exit criteria

- Per-station pages are prerendered and indexable.
- MCP server callable from Claude Desktop.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 13 — Performance, A11y & Lighthouse Hardening

**Goal:** Final perf + a11y pass. Lighthouse ≥ 95 on every page, every category. WCAG AA confirmed.
**Model:** Sonnet 4.6 primary — Opus 4.6 for bundle-issue diagnosis, a11y report synthesis, and budget-tuning judgment; Haiku 4.5 for mechanical `loading="lazy"` sweeps and image-format batch conversion.
**Depends on:** Sprints 4–12.
**AGENTS.md sections engaged:** §1 (Lighthouse ≥ 95 + WCAG AA targets).

### Deliverables

- **Images**: audit all raster assets; convert to AVIF + WebP via `@squoosh/lib` or Vite plugin; add `srcset` + `sizes` to every `<img>`; add `loading="lazy"` except hero images.
- **Fonts**: subset Space Grotesk and Oxanium to Latin + Latin Extended; preload both with `<link rel="preload">`.
- **Preload hints**: critical CSS inlined, main JS chunk preloaded, map chunk `preloadModule` on the finder/planner routes.
- **Bundle analysis**: run `vite-bundle-analyzer` or equivalent; any chunk > 100 KB must be justified in a comment or split.
- **Web Vitals reporter**: wire `web-vitals` lib (already a dep) to log CLS, LCP, INP, FID to console in dev and to a tiny analytics endpoint (or POST to Cloudflare Analytics) in prod.
- **A11y audit**:
  - `@axe-core/playwright` on every route, zero critical/serious issues.
  - Keyboard navigation: every interactive element reachable via Tab, focus visible, Escape closes dialogs.
  - Skip-to-main link on every page.
  - Screen reader manual pass with VoiceOver (Mac) and NVDA (Windows) — document findings in `docs/A11Y_REPORT.md`.
  - Reduced motion: verify all animations disable under `prefers-reduced-motion: reduce`.
  - Color contrast: all text meets WCAG AA 4.5:1 (or 3:1 for large text).
- **Lighthouse CI budgets** tightened: perf ≥ 95, a11y ≥ 95, best-practices ≥ 95, SEO ≥ 95, PWA ≥ 95. CI fails if any drop.

### Tests first

- E2E: axe-core zero critical/serious on every route (sweep).
- E2E: Tab order matches visual order on the home page and all forms.
- E2E: `matchMedia('prefers-reduced-motion: reduce')` mock disables Motion animations.
- Lighthouse CI `lhci assert` with all budgets enforced in `.lighthouserc.json`.

### Verification gate

- Lighthouse dashboard green across the board for every page.
- Zero axe-core critical/serious on every page.
- Bundle initial load ≤ 180 KB gzipped.
- LCP < 2.5 s on local (Fast 3G throttled).
- CLS < 0.1.

### Skills / subagents / MCP

- `web-design-guidelines` skill — primary.
- `performance-optimization` skill.
- `vercel-react-best-practices` skill.
- `ui-ux-pro-max` skill for final critique.
- `agent-browser` for manual a11y sweeps.

### Exit criteria

- Every page hits all Lighthouse targets.
- A11y report committed.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Sprint 14 — Cloudflare Workers Deploy

**Goal:** Production deployment on Cloudflare Workers Static Assets with staging + production environments, semantic-release, full CI/CD.
**Model:** **Opus 4.6 primary** — Worker entry design + CSP headers + secret routing + deployment-critical security review (mandatory `security-reviewer` gate). Sonnet 4.6 for `wrangler.toml` + GH Actions YAML + smoke tests; Haiku 4.5 for post-deploy shell commands.
**Depends on:** all prior sprints.
**AGENTS.md sections engaged:** §1 (deploy target), §5.6 (secret handling).

### Deliverables

- `wrangler.toml`:
  - `name = "metro-station-finder"`, `main = "src/worker.ts"`, `compatibility_date`.
  - `[assets] directory = "dist"`, `binding = "ASSETS"`.
  - `[env.staging]` and `[env.production]` sections with distinct routes or `workers_dev` hostnames.
  - `[[kv_namespaces]]` bindings: `ORS_CACHE`, `RATE_LIMIT`.
- `src/worker.ts`:
  - `fetch(request, env, ctx)` entry.
  - Routes matching `/api/*` → server functions.
  - Routes matching `/mcp/*` → MCP handler from Sprint 12.
  - Everything else → `env.ASSETS.fetch(request)`.
  - Adds security headers: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security`.
- Secrets via `wrangler secret put`:
  - `ORS_KEY`
  - `ANTHROPIC_API_KEY` or `WORKERS_AI_TOKEN`
  - Any others identified during sprints.
- GitHub Actions:
  - `.github/workflows/deploy-staging.yml` — runs on push to `main`, deploys to staging env.
  - `.github/workflows/deploy-production.yml` — runs on published release, deploys to production env.
- `release.config.ts` (already present) — verify it's publishing GitHub releases and updating CHANGELOG correctly via a dry run.
- Custom domain: point `metro.<your-domain>.dev` at the Worker.
- Post-deploy smoke test (Playwright against the staging URL) as part of the deploy workflow.

### Tests first

- CI: `wrangler deploy --dry-run --env staging` on every PR.
- Post-deploy: Playwright smoke test against staging URL verifying home page loads, navbar works, station finder and fare calculator work, `ORS_KEY` not present in any network response.

### Verification gate

- Staging URL reachable and functional.
- Production URL reachable after manual promotion.
- Lighthouse run against the production URL ≥ 95 on all categories.
- `semantic-release --dry-run` confirms next version + changelog entries.
- `grep -r "ORS_KEY\|ANTHROPIC_API_KEY" dist/` zero matches.
- CSP headers verified via `curl -I` (no `unsafe-inline` for scripts except the FOUC-blocking theme script, which is hash-allowed).

### Skills / subagents / MCP

- `agent-skills:ci-cd-and-automation` skill.
- `agent-skills:shipping-and-launch` skill — primary.
- `gh-cli` skill.
- `cpp-build-resolver` — no, not applicable.
- `security-reviewer` subagent on the Worker entry + CSP.
- Context7: `wrangler` latest, `@cloudflare/workers-types` latest.

### Exit criteria

- Production site live at the custom domain.
- v1.0.0 published via semantic-release.
- Changelog committed.
- Merge to `main`; semantic-release cuts the next version tag on feat/fix commits.

---

## Appendix A — Claude skills / subagents / MCP map

| Need                                | Preferred tool                                                            |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Broad codebase exploration          | `Explore` subagent                                                        |
| Implementation design before code   | `Plan` subagent                                                           |
| Post-edit review (every sprint)     | `code-reviewer` subagent                                                  |
| Security review (Sprints 7, 11, 14) | `security-reviewer` subagent                                              |
| TDD enforcement                     | `tdd-guide` subagent, `superpowers:test-driven-development` skill         |
| Brainstorming UX ambiguities        | `superpowers:brainstorming` skill                                         |
| Debugging failing tests             | `superpowers:systematic-debugging` skill                                  |
| Docs lookup (any 2026 library)      | Context7 MCP                                                              |
| Reference v0 repo / legacy chrome   | GitHub MCP                                                                |
| Frontend quality                    | `frontend-design`, `web-design-guidelines`, `vercel-react-best-practices` |
| Tailwind patterns                   | `tailwind-design-system`                                                  |
| MCP server construction (Sprint 12) | `mcp-builder`, `mcp-server-patterns`                                      |
| Claude API usage (Sprint 11)        | `claude-api`                                                              |
| E2E authoring                       | `e2e-testing`, `playwright-best-practices`, `agent-browser`               |
| Git discipline                      | `superpowers:git-workflow-and-versioning`, `git-commit`                   |
| CI/CD + deploy                      | `agent-skills:ci-cd-and-automation`, `agent-skills:shipping-and-launch`   |
| Docs + ADRs                         | `agent-skills:documentation-and-adrs`, `documentation-writer`             |

## Appendix B — Per-sprint 2026 feature callouts

| Sprint | Feature leveraged                                                      | Why it matters                         |
| ------ | ---------------------------------------------------------------------- | -------------------------------------- |
| 1      | TS 6 discriminated unions, Valibot `v.pipe` + `v.check`                | Schema-level symmetry assertion        |
| 2      | Tailwind v4 `@theme inline`, `@property --angle`, `color-mix`          | Design tokens without config.js        |
| 3      | React 19 `ref` as prop                                                 | No `forwardRef` in nav/theme/highlight |
| 4      | React 19 Document Metadata, Tailwind container queries                 | Per-route meta, responsive hero        |
| 6      | React 19 `lazy` + `Suspense`, `preloadModule`                          | SSR-safe MapLibre + warm chunk         |
| 7      | TanStack Start `createServerFn` + Valibot validator; TanStack Query v5 | Typed server RPC                       |
| 8      | TanStack Router `validateSearch`                                       | Typed URL state                        |
| 10     | Vite 8 + `vite-plugin-pwa` `injectManifest`                            | Fine-grained SW control                |
| 11     | React 19 `useActionState` + `useOptimistic` + `<form action>`          | Native form actions                    |
| 12     | TanStack Start `staticPaths`, MCP SDK                                  | Dynamic prerender + tool exposure      |
| 13     | `@axe-core/playwright`, Lighthouse CI 0.15, INP metric                 | Modern a11y + perf gates               |
| 14     | Cloudflare Workers Static Assets, `[assets]` binding                   | Zero-cost hosting                      |

## Appendix C — Security checklist (applies every sprint)

1. No secrets in client code — `grep -r "ORS_KEY\|ANTHROPIC_API_KEY" dist/` on every build.
2. All user input validated at the boundary via Valibot.
3. CSP headers set on the Worker response (no `unsafe-inline` for scripts; the FOUC theme script is hash-allowed).
4. No `dangerouslySetInnerHTML` except the documented FOUC-blocking theme script.
5. Every server function has: input schema, rate limit (if user-triggered), error boundary that doesn't leak stack traces, structured logging without PII.
6. Dependencies audited: `bun pm audit` in CI, fail on high/critical.
7. No new `@ts-ignore`, `@ts-expect-error`, `eslint-disable`, or `oxlint-disable` without a justifying comment citing the specific reason.
8. `git diff` pre-commit scan for any line containing `key`, `secret`, `token`, `password` — manual review.
9. On any new dependency: check maintenance status (weekly commits in last 90 days), license (MIT/Apache/BSD preferred), and known CVEs.
10. Lefthook pre-push catches what pre-commit misses.

## Appendix D — Dependency additions schedule

Every dep add requires user approval per AGENTS.md §10. Requesting in sprint order so the user sees them in context:

| Sprint | Dep                                                                                   | Reason                                                             |
| ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 2      | `motion`                                                                              | Animations: background, section wrapper, highlight, animated badge |
| 2      | shadcn adds: `badge`, `card`, `separator`, `sheet`, `tabs`, `accordion`, `hover-card` | Base primitives for sections                                       |
| 6      | `maplibre-gl` (via mapcn install)                                                     | Maps                                                               |
| 6      | mapcn component: `@mapcn/map`                                                         | Map primitive                                                      |
| 10     | `vite-plugin-pwa` (already in devDeps — verify, else add), `workbox-*`                | PWA runtime                                                        |
| 11     | `@anthropic-ai/sdk` OR `@cloudflare/workers-types` (only if Cloudflare AI chosen)     | LLM client                                                         |
| 12     | `@modelcontextprotocol/sdk`, `schema-dts`                                             | MCP server + JSON-LD types                                         |
| 13     | `@axe-core/playwright`                                                                | A11y gate in E2E                                                   |
| 14     | `wrangler` (dev dep), `@cloudflare/workers-types`                                     | Deploy tooling                                                     |

## Appendix E — Glossary

- **Gate** — the set of checks that must pass before a sprint is "done". See §0.2.
- **Surgical change** — a change that touches only files directly required by the task. See AGENTS.md §2.3.
- **SWR** — stale-while-revalidate, a caching strategy where stale cached content is served immediately and revalidated in the background.
- **FOUC** — Flash of Unstyled Content. Specifically here: a light-theme flash before React hydrates in dark mode.
- **JSON-LD** — JSON for Linked Data, the structured-data format for SEO and AI discoverability.
- **MCP** — Model Context Protocol, the Anthropic-led standard for exposing tools and resources to LLM clients.
- **SSG** — Static Site Generation, the build-time prerender pattern used by TanStack Start in this project.

---

## Appendix F — Model routing & shared memory

### F.1 Memory layers

Shared context lives on the filesystem under version control. Any model — Opus, Sonnet, or Haiku — can reconstruct full state by reading these files. No external DB, no session store, no provider-specific memory.

| Layer      | Files                                              | Change rate | Read when                      |
| ---------- | -------------------------------------------------- | ----------- | ------------------------------ |
| Rules      | `AGENTS.md`, `CLAUDE.md`                           | rare        | every session start            |
| Plan       | `docs/IMPLEMENTATION_PLAN.md`                      | per sprint  | active sprint section only     |
| Live state | `docs/HANDOFF.md`, `docs/SPRINT_LOG.md`, `git log` | per sprint  | every session start            |
| Decisions  | `docs/ADRs/*.md`                                   | sparse      | on demand when referenced      |
| Personal   | `~/.claude/projects/.../memory/`                   | on feedback | Claude only, non-authoritative |

### F.2 Session startup protocol (all models)

```
1. Read AGENTS.md + CLAUDE.md               (~3 k tokens, cache-warm after first read)
2. Read docs/HANDOFF.md                     (~400 tokens)
3. Read IMPLEMENTATION_PLAN.md §"Sprint N"  (~1.5 k tokens, active sprint only)
4. git log --oneline -20                    (recent history and current SHA)
5. Begin work — surface assumptions before any non-trivial change (AGENTS.md §2.1).
```

Floor: ~5 k tokens cold-start per session. The prompt cache (5-minute TTL) amortizes the rules + plan reads across subsequent turns within one session.

### F.3 Session end protocol (all models)

```
1. Overwrite docs/HANDOFF.md with updated state (active sprint, next action, blockers, decisions).
2. If a sprint boundary was reached:
     - Append a paragraph to docs/SPRINT_LOG.md recording the merge commit SHA.
     - semantic-release will cut a version tag automatically on feat/fix merges; never create manual tags.
3. Commit via `bun run commit` (Conventional Commits, no --no-verify).
4. If a non-obvious architectural decision was made:
     - Write an ADR under docs/ADRs/NNN-kebab-title.md.
```

### F.4 Per-sprint primary model

Bold marks sprints where Opus is primary because the work is novel, high-risk, or security-critical. Everything else defaults to Sonnet (most sprints) or Haiku (pure mechanical load).

| #   | Sprint                    | Primary      | Supporting                                                        |
| --- | ------------------------- | ------------ | ----------------------------------------------------------------- |
| 0   | Foundation & Guardrails   | Haiku 4.5    | Sonnet 4.6 for CI YAML                                            |
| 1   | Data & Pure Logic         | Sonnet 4.6   | Opus 4.6 for Valibot + fare audit; Haiku for fixtures             |
| 2   | Design System & Theme     | Sonnet 4.6   | Opus for `@theme inline` + CVA check; Haiku for `shadcn add` runs |
| 3   | Navigation & Root Shell   | Sonnet 4.6   | Opus for FOUC/CSP review; Haiku for icon rename                   |
| 4   | Home Page Port            | Sonnet 4.6   | Haiku for icon rename + techLogos; Opus for glass-card review     |
| 5   | Routing Stubs & About     | Haiku 4.5    | Sonnet for meta + About content                                   |
| 6   | Maps Foundation           | **Opus 4.6** | Sonnet for markers + layer                                        |
| 7   | Station Finder Feature    | **Opus 4.6** | Sonnet for UI + E2E                                               |
| 8   | Fare Calculator Feature   | Sonnet 4.6   | Haiku for fixtures                                                |
| 9   | Trip Planner Feature      | Sonnet 4.6   | Opus for `clipLineToSegment` algorithm                            |
| 10  | PWA & Offline             | **Opus 4.6** | Sonnet for implementation + E2E                                   |
| 11  | AI Layer Phase 1          | **Opus 4.6** | Sonnet for form components                                        |
| 12  | AI-SEO & MCP Server       | **Opus 4.6** | Sonnet for per-station pages + sitemap                            |
| 13  | Performance & A11y        | Sonnet 4.6   | Opus for diagnosis; Haiku for sweeps                              |
| 14  | Cloudflare Workers Deploy | **Opus 4.6** | Sonnet for wrangler + YAML                                        |

**Distribution:** Opus primary on 6/15 sprints (all novel, risky, or security-critical). Sonnet primary on 7/15. Haiku primary on 2/15 (pure mechanical load).

**Automatic subagent routing.** The implementing agent spawns subagents via the `Agent` tool with an **explicit `model` parameter** based on this table and the within-sprint micro-cycle in §F.5. Claude Code does not auto-route subagents based on the plan — routing is a convention this plan commits to. Concretely:

- Spawning `code-reviewer` or `security-reviewer` for a Gate phase → `model: "opus"`, regardless of the sprint's primary.
- Spawning `Explore` for a wide file scan → `model: "haiku"` for well-defined sweeps, `"sonnet"` for judgment-heavy exploration.
- Spawning `refactor-cleaner` for the Cleanup phase → `model: "haiku"`.
- Spawning `Plan` for implementation design on a novel sprint → `model: "opus"`.

The **main-session** model is picked by the user once at session start via `/model` in the Claude Code CLI (or via the UI). It cannot be changed mid-conversation. For the primary model of the active sprint, see the table above.

### F.5 Within-sprint micro-cycle

Every sprint follows this pattern regardless of primary model:

```
Design phase    → Opus 4.6    [state assumptions, pick approach, surface tradeoffs]
  ↓
Build phase     → sprint primary model [the bulk of the work]
  ↓
Gate phase      → Opus 4.6    [code-reviewer + security-reviewer subagents on the diff]
  ↓
Cleanup phase   → Haiku 4.5   [lint fix, rename sweeps, boilerplate stubs]
```

When the sprint primary is Opus, the Build phase stays Opus. The Design and Gate phases are always Opus regardless. The Cleanup phase is always Haiku regardless.

### F.6 Quota & speed efficiency rules (Claude Code Max)

This project is implemented on **Claude Code Max (5x)** — a subscription plan with weekly + rolling session quotas, not per-token API billing. Routing therefore optimizes for **quota headroom, speed, and quality-per-task**, not dollars. Opus is the slowest and burns quota fastest; Sonnet is ~2× faster and noticeably lighter on quota; Haiku is the fastest and lightest. Use the lightest model that can do the job correctly.

1. **One sprint = one conversation arc.** Don't mix sprints in a single session — context bloats and slows every tool call. Exception: micro-sprints (0 and 5) may share a session.
2. **Front-load cold reads in a single message** so the prompt cache (5-minute TTL) stays warm across subsequent turns. Scattered reads miss the cache and pay the full token cost every time.
3. **Delegate wide file scans to the `Explore` subagent** with an explicit `model: "haiku"` for well-defined sweeps (e.g. "find all `lucide-react` imports") or `model: "sonnet"` for judgment-heavy exploration. The main loop sees only a ~200-token summary.
4. **Commit often.** Git log + diff become free auxiliary memory for the next session. A well-committed sprint needs zero verbal handoff beyond the HANDOFF.md refresh.
5. **Never read** `routeTree.gen.ts`, `bun.lock`, `node_modules/`, or anything in `dist/`. They waste quota without adding value.
6. **Review subagents read the diff, not the whole codebase** — spawn `code-reviewer` and `security-reviewer` with `model: "opus"` for Gate phases; they stay cheap because they only see the changeset.
7. **Don't re-read `IMPLEMENTATION_PLAN.md` mid-sprint.** The active section was loaded at session start and will not change during the sprint.
8. **Batch parallel tool calls** whenever reads/writes are independent — one message with 5 parallel calls beats 5 sequential turns and keeps the cache warm.
9. **Spawn Haiku for mechanical sweeps** mid-session (rename 40 imports, add `loading="lazy"` everywhere, generate 17 test fixtures) rather than doing them in the main loop. Saves quota on the outer model and runs faster.

### F.7 How to switch primary models mid-sprint

On Claude Code Max, the main session's model is set via `/model` at session start (or the Claude Code UI) and **stays fixed for the conversation**. Subagents can override per spawn via the `Agent` tool's `model` parameter. To hand the primary work to a different model:

1. Commit the work-in-progress (a WIP commit is fine — squash later via semantic-release).
2. Update `docs/HANDOFF.md` with the current state, next action, and any in-flight decisions.
3. End the session.
4. Start a new session, run `/model <target>` to pick the model for the next phase, then read `AGENTS.md` → `CLAUDE.md` → `docs/HANDOFF.md` → the active sprint section in the plan.

Do not attempt to switch the main-session model mid-conversation — Claude Code doesn't support it, and context doesn't transfer cleanly even if it did. The filesystem is the handoff channel.

**Subagents are different.** When this plan says "Haiku for fixtures, Opus for security review," the implementing agent spawns those via `Agent` with an explicit `model` parameter on the same turn. Subagent routing is automatic within a session as long as the implementer follows the per-sprint table in §F.4 and the micro-cycle in §F.5.
