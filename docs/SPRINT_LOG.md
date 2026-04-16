# Sprint Log

Append-only log of what shipped, what was deferred, and what surprised us per sprint. One paragraph per sprint, chronological. Overwriting existing entries is forbidden — errors stay in the log as history.

**Entry template:**

```
## Sprint N — Title
**Dates:** YYYY-MM-DD → YYYY-MM-DD
**Commit:** `<short-sha>` — subject line of the merge commit
**Primary model used:** Opus 4.6 | Sonnet 4.6 | Haiku 4.5 (+ supporting)

**Shipped:** one or two sentences on what merged.
**Deferred:** anything that slipped to a future sprint and why.
**Surprised us:** anything that turned out harder, easier, or different than the plan said — this is the most valuable field for future sprints.
**ADRs written:** NNN-title (if any).
```

---

_Entries appear below in chronological order as sprints complete._

---

## Sprint 0 — Foundation & Guardrails

**Commit:** `0fb4a66` — `chore: initialize project toolchain, docs, and ci/cd`
**Primary model used:** Opus 4.6 (this session ran on Opus rather than the Haiku-primary routing in Appendix F.4 — deliberate pragmatic call for session continuity; the volume of coordination in Sprint 0 made subagent delegation more expensive than inline work; flagged in real time).

**Shipped:**

- Project-level rules and plan: `AGENTS.md`, `CLAUDE.md`, `docs/IMPLEMENTATION_PLAN.md` (15 sprints + Appendices A–F including model-routing and shared-memory protocol), `docs/HANDOFF.md`, `docs/SPRINT_LOG.md` (this file), `docs/ADRs/README.md`.
- Project metadata: `LICENSE` (MIT), `CHANGELOG.md` (semantic-release-managed).
- CI/CD: `.github/workflows/ci.yml` (full `bun run ci` on PR + push to main), `.github/workflows/release.yml` (semantic-release gated on CI success via `workflow_run`), `.github/dependabot.yml` (weekly npm groups + github-actions updates).
- Committed the pre-existing Oxlint + Oxfmt + Lefthook + commitlint + release-config + Vitest + Playwright toolchain that was in the working tree but had never been committed.
- Rewrote `public/manifest.json` for MSF branding; deleted the stale `.cta.json` from `create-tanstack-app`; fixed `.vscode/settings.json` top-level formatter (`esbenp.prettier-vscode` → `oxc.oxc-vscode`).
- Added `tests/unit/scaffold.test.ts` guarding `package.json` name, packageManager, and required scripts.
- Excluded `.claude/` from `.gitignore`, `.prettierignore`, and `oxlint.config.ts` `ignorePatterns`.
- `bun run ci`: **EXIT=0**, typecheck clean, lint 0/0, 4/4 tests passing, build with prerender green.

**Deferred:** Real PWA icon assets (Sprint 10, `vite-plugin-pwa` phase). CODEOWNERS (not needed for a single-maintainer repo).

**Surprised us:** Two things.

1. **Baseline CI was red on first run.** Ultracite flagged `.claude/settings.local.json` — Claude Code's editor-local state file that had been written into the working tree by a prior session and was being linted because no ignore rule excluded it. Fix was to add `.claude/` to three ignore layers (`.gitignore`, `.prettierignore`, `oxlint.config.ts` `ignorePatterns`) and re-run `bunx ultracite fix` to auto-format the two Markdown files (`AGENTS.md`, `docs/IMPLEMENTATION_PLAN.md`) that oxfmt wanted tightened.
2. **The repo had exactly one commit** (`feat: initial commit`) and ~30 files of uncommitted scaffold + toolchain configuration in the working tree. Sprint 0's commit was therefore much larger than the plan scoped — it had to carry the full pre-existing Oxlint/Oxfmt/Lefthook/Vitest/Playwright setup alongside the Sprint 0 deliverables. This is a one-time cost; all subsequent sprints will start from a properly committed baseline.

**ADRs written:** none.

## Sprint 1 — Data & Pure Logic

**Merge commit:** `bdab88d`
**Model routing:** Sonnet 4.6 primary throughout (no subagent delegation; logic was compact and inline was faster than orchestration overhead).

**Shipped:**

- `src/lib/validation.ts` — Valibot helpers: `parseOrThrow`, `isSlug`, `clampLatitude`, `clampLongitude` + shared `SlugSchema`, `LatitudeSchema`, `LongitudeSchema`
- `src/data/stations.ts` — 17 MRT-6 stations (kebab-case slugs, `nameEn`, `nameBn`, lat/lng, `orderIndex`, `status`), Valibot-validated at module load
- `src/data/fares.ts` — 17×17 DMTCL fare matrix, symmetry + diagonal-zero + non-negative-integer assertions at load
- `src/data/mrt6-line.geojson` + `src/data/mrt6-line.ts` — hand-traced LineString (17 points); `.ts` wrapper needed because Rolldown/Vite does not treat `.geojson` as JSON by default (no vite.config change required this sprint)
- `src/features/station-finder/logic.ts` — `haversineKm`, `findNearest`
- `src/features/fare-calculator/logic.ts` — `calculateFare`, `InvalidStationError`
- `src/features/trip-planner/logic.ts` — `planTrip`, `clipLineToSegment`
- 58 unit tests across 6 test files, 100% coverage on all new files

**Deferred:**

- OSM Overpass fetch for `mrt6-line.geojson` (open research item — hand-traced coordinates are usable for all Sprint 1 tests)
- No ADRs written (no non-obvious architectural decisions made)

**Surprises:**

- `.geojson` imports fail at Rolldown/Vite parse time — resolved by creating a typed `.ts` re-export (`src/data/mrt6-line.ts`). A vite.config plugin could fix this properly in a future sprint.
- Ultracite enforces `no-non-null-assertion` + `no-plusplus` + `func-style` (arrow expressions) — required rewriting loops to `for...of` and converting function declarations to arrow functions.

## Sprint 2 — Design System & Theme

**Merge commit:** `e8a0a4c`
**Model routing:** Sonnet 4.6 primary throughout.

**Shipped:**

- `src/styles.css` — glassmorphism utilities (`.glass-card`), `--header-height`/`--footer-height` custom properties, `@property --angle`, `@keyframes shimmer-spin`
- `src/lib/color.ts` — `hexToRgba`, `withAlpha` color helpers
- `src/components/ui/animation-constants.ts` — motion design tokens; fixed legacy `COMPLEX_OPACITY_VALUES.*` from arrays to scalars (array values crash `useTransform`)
- `src/components/common/glass-card.tsx` — thin div wrapper applying `.glass-card` CSS class
- `src/components/common/section-wrapper.tsx` — scroll-driven `motion.section` with `useInView` and reduced-motion support
- `src/components/common/unified-background.tsx` — scroll-driven blob animations using `useTransform`
- `src/components/ui/animated-badge.tsx` — conic gradient shimmer badge with optional anchor; `ChevronRight` (lucide) → `CaretRight` (Phosphor)
- `src/components/ui/highlight.tsx` — full `Highlight`/`HighlightItem` compound system; extracted `useHighlightItemEffect` custom hook and `buildCommonHandlers` helper to satisfy oxlint; `// eslint-disable-next-line complexity` on `HighlightItem` (inherent multi-mode polymorphic branching)
- shadcn primitives added and converted to arrow expressions: accordion, badge, card, hover-card, separator, sheet, tabs
- `src/components/ui/button.tsx` — added `variant="primary"` and `asChild` via Base UI `render` prop
- `src/routes/__root.tsx` — `UnifiedBackground` mounted in root layout
- 15 integration tests (glass-card, section-wrapper, animated-badge, highlight); `tests/setup.ts` split into shared + `tests/setup.integration.ts`
- 73 total tests passing, `bun run ci` exit 0

**Deferred:**

- Visual sanity check (scratch page with `<GlassCard><AnimatedBadge /></GlassCard>`) — deferred; `bun run ci` verifies structural correctness; visual pass belongs in Sprint 3 browser smoke test

**Surprises:**

- `"use client"` directives in shadcn-generated files must be stripped (TanStack Start, not Next.js).
- shadcn@latest emits `function` declarations; all 7 component files manually converted to arrow expressions for ultracite `func-style` compliance.
- `tests/setup.ts` runs in both Node and jsdom environments; `Object.defineProperty(window, ...)` throws in Node — required splitting browser stubs into a separate `tests/setup.integration.ts`.
- oxlint `complexity` max is 20; `HighlightItem` (ported from a multi-mode UI library) hits 32 even after extracting hooks and helpers — suppressed with inline disable comment.

**ADRs written:** none.

## Sprint 3 — Navigation & Root Shell

**Merge commit:** `60656c7`
**Model routing:** Sonnet 4.6 primary throughout.

**Shipped:**

- `src/routes/__root.tsx` — full port: FOUC-blocking inline `<script>` (minified iife, verbatim logic from legacy), `QueryClientProvider` with 6 named time-constant helpers matching legacy, `UnifiedBackground`, `NavBar`, `<main>` with `paddingTop: var(--header-height)`, dev-gated `TanStackDevtools`/`ReactQueryDevtools`, `notFoundComponent` with home link, `head()` with title/description/viewport/charset/stylesheet
- `src/lib/web-vitals.ts` — CLS/FCP/INP/LCP/TTFB reporting (dev-console only)
- `src/components/ui/navbar.tsx` — 5 nav items (Home/Station Finder/Station Fares/Trip Planner/About), Phosphor icons (`House`, `MapPin`, `Calculator`, `Path`, `Info`, `List`, `X`), `Highlight`/`HighlightItem` desktop pill, `createPortal` mobile dropdown with click-outside + Escape, `aria-current="page"` via TanStack Router `activeProps`
- `src/components/navbar/logo.tsx` — `Train` (Phosphor duotone), responsive `Metro Station Finder` / `MSF`
- `src/components/navbar/github.tsx` — `GithubLogo` (Phosphor), accessible anchor
- `src/components/navbar/theme.tsx` — 3-state (`light | dark | system`), Base UI `Menu.RadioGroup` dropdown, `localStorage`-backed, `applyTheme` sets `data-theme` + `classList`
- `tests/integration/navbar.test.tsx` — 6 tests: all 5 nav items render, home link `aria-current`, logo responsive spans, hamburger opens/closes (Escape + outside click)
- `tests/integration/theme.test.tsx` — 4 tests: trigger renders, Dark/System/Light selections update `localStorage` and `html` class
- `tests/e2e/navigation.spec.ts` — desktop nav items, page title, SPA no-reload, mobile menu
- `tests/e2e/theme-no-fouc.spec.ts` — dark system preference → `.dark` class before paint, light preference, stored theme overrides system
- `tests/setup.integration.ts` — localStorage stub via `Map` (jsdom's `--localstorage-file` flag breaks native `Storage`)
- 83 total tests, `bun run ci` exit 0

**Deferred:**

- Lighthouse `≥95` audit and `@axe-core/playwright` a11y pass — deferred to a dedicated browser smoke test session after Sprint 4 (app needs content to be meaningful)
- Visual browser smoke test — same deferral

**Surprises:**

- jsdom's `--localstorage-file` flag renders the built-in `localStorage` non-functional in integration tests; resolved with a `Map`-backed `Storage` stub in `tests/setup.integration.ts`.
- Base UI `Menu.RadioItem` renders with `role="menuitemradio"`, not `"menuitem"` — initial test query `findByRole("menuitem")` failed.
- `data-[status=active]` is TanStack Router's Link activation class; `activeProps={{ "aria-current": "page" }}` is the idiomatic way to wire accessible active state.
- oxlint `no-plusplus` bans `++` in E2E tests — must use `+= 1`.
- Ultracite reformats `dataset.theme = x` to `dataset["theme"] = x` (TypeScript `noPropertyAccessFromIndexSignature` + formatting consistency).

**ADRs written:** none.

## Sprint 4 — Home Page Port

**Merge commit:** `a0af66e` — `feat: implement sprint 4 — home page port`
**Model routing:** Sonnet 4.6 primary throughout.

**Shipped:**

- `src/lib/constants/hero-data.ts` — Phosphor icon refs (`NavigationArrow`, `Calculator`) for CTA buttons
- `src/pages/home/home-page.tsx` — root home page assembling all 6 sections with hydration guard
- `src/pages/home/sections/hero-section.tsx` — hero with Base UI Button render-prop pattern, `.glass-card`, Phosphor icons
- `src/pages/home/sections/story-section.tsx` — story cards with `.glass-card`, Phosphor icons (`CheckCircle`, `Lightbulb`, `MapPin`, `Target`, `Users`)
- `src/pages/home/sections/tech-stack-section.tsx` — `TECH_LOGOS` array (Google Maps/Zod removed; MapLibre/Valibot/mapcn added), `InfiniteSlider` + `ProgressiveBlur`
- `src/pages/home/sections/features-section.tsx` — features grid; "Interactive Maps" copy updated to MapLibre + OpenFreeMap + OpenRouteService
- `src/pages/home/sections/journey-section.tsx` — `Timeline` with new `v1.0.0 — 2026 Rebuild` entry (TanStack Start migration)
- `src/pages/home/sections/maintainer-section.tsx` — maintainer card with Phosphor icons (`ArrowSquareOut`, `Briefcase`, `GraduationCap`, `MapPin`)
- `src/components/ui/infinite-slider.tsx` — ported from legacy (stripped "use client", converted to arrow function)
- `src/components/ui/progressive-blur.tsx` — ported from legacy (stripped "use client", converted to arrow function)
- `src/components/ui/timeline.tsx` — ported from legacy (stripped "use client")
- `src/styles.css` — `.glass-card` extended with light-mode `background-color`, `box-shadow`, `-webkit-backdrop-filter`
- `tests/integration/hero-section.test.tsx`, `story-section.test.tsx`, `tech-stack-section.test.tsx`, `features-section.test.tsx`, `journey-section.test.tsx`, `maintainer-section.test.tsx` — integration tests for all 6 sections
- `tests/e2e/home.spec.ts` — smoke test: all section IDs visible, h1 "Precision", no console errors, primary CTA href
- Public assets migrated: 17 tech-stack SVGs, social SVGs, `tashfiq.png`; `react-use-measure` installed
- 111 total tests, `bun run ci` exit 0

**Deferred:**

- `as string` casts on `<Link to=...>` for unregistered routes — will be removed in Sprint 5/6 when those routes are registered in `routeTree.gen.ts`
- Visual browser smoke test and Lighthouse audit — deferred to after Sprint 5

**Surprised us:**

- Base UI `Button.asChild` is `React.ReactElement` (render prop), not a Radix UI boolean — every CTA call-site required rewriting to `asChild={<Link to={...}>...</Link>}`.
- `vi.fn().mockImplementation(() => ({...}))` cannot be used as a constructor; `@floating-ui/dom autoUpdate` activates ResizeObserver when it's defined (even as a mock), breaking Theme tests. Resolution: leave ResizeObserver undefined globally; mock `@/components/ui/timeline` locally in the journey-section test only.
- Ultracite `func-style` rule flagged `export function Foo(...)` declarations in ported components — all converted to `export const Foo = (...): React.ReactElement =>`.
- Timeline's `getByText` queries failed with "multiple elements" because the component renders text in both a badge `<span>` and a heading `<h3>` — switched to `getAllByText(...).length >= 1`.

**ADRs written:** none.
