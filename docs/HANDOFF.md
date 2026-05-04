# HANDOFF.md

Short snapshot of current project state. Overwritten at every sprint boundary. Keep under 500 words. **Every session reads this before starting work. Every session updates it before ending.**

---

## Current state

**Active sprint:** Sprint 6 — Maps Foundation
**Status:** ready to start after Phase 5.5 hardening
**Primary model for this sprint:** Opus 4.6 primary (top-risk sprint). Sonnet 4.6 for markers and metro-line layer.

**Last-completed sprint:** Phase 5.5 — pre-Sprint 6 docs, SSR, metadata, DX, and test hardening pass
**Last commit on `master`:** `e08c503` — `refactor: remove verbose comment from vite build config`

_Note: Due to self-referential updates, HANDOFF.md may lag by one commit. Verify via `git log --oneline -1` at session start (step 4 of startup protocol)._

## Next action

Begin Sprint 6 per `docs/IMPLEMENTATION_PLAN.md` §"Sprint 6". Key tasks:

1. Install mapcn (ask user first per AGENTS.md §10): `bunx shadcn@latest add @mapcn/map`
2. Create `src/components/common/map-canvas.tsx` — React.lazy SSR-safe wrapper around mapcn Map
3. Render skeleton during lazy load, error boundary for window-less prerender
4. Create `src/features/station-finder/components/station-markers.tsx` — map 17 stations as markers
5. Create `src/features/station-finder/components/metro-line-layer.tsx` — GeoJSON metro-6 line layer
6. Wire preview into `/station-finder` route
7. Tests: integration (map-canvas renders skeleton), E2E (markers load, offline overlay, no crash)
8. Verification: bun run ci passes, bundle analysis confirms chunk-split, prerender doesn't crash.

Phase 5.5 completed before this handoff:

1. Home page no longer suppresses prerender output behind a mounted gate.
2. `/about` now has route-level metadata via shared head helper.
3. SEO config is env-backed via `VITE_SITE_URL` and optional `VITE_TWITTER_HANDLE`; placeholder `.local` canonical removed.
4. Temporary valid OG placeholder asset added at `/og-image.svg` and documented in `.env.example`.
5. Root shell now includes manifest/favicon links and typed router 404 navigation.
6. Footer internal legal links now use typed router `Link`.
7. Stale about/meta/navigation tests were rewritten to current router/runtime behavior; stable Chromium smoke is green with `--workers=1`.
8. Windows-hostile `clean`/`reinstall` scripts were replaced with cross-platform Node-based cleanup.
9. Confirmed dead files were deleted: unused navbar helpers, `footer-watermark`, `progressive-blur`, and `hero-data`.
10. `bun run lint && bun run typecheck && bun run test && bun run test:coverage && bun run build` passes locally.
11. Stable Chromium smoke passes locally: `bun run test:e2e -- --project=chromium --workers=1 tests/e2e/meta.spec.ts tests/e2e/navigation.spec.ts`.
12. Coverage is now fully green: `100%` statements / branches / functions / lines.
13. Bundle budget baseline recorded from the latest build: `index-BxvgZ2rj.js` = `126,991 B gzip`; pessimistic initial JS including `routes-CLqFTYwP.js` = `146,755 B gzip`, which is under the documented `180 KB gzip` budget.
14. Server-bundle audit note: the large `657.90 kB` TanStack Router file seen during Nitro build is in `.output/server/_libs/` and is server-only, not part of the browser JS budget. Largest current server libs are `@tanstack/react-router...[657.90 kB]`, `phosphor-icons__react.mjs [105.61 kB]`, and `tailwind-merge.mjs [85.65 kB]`. Re-check server/runtime bundle shape again when switching from current Nitro `node-server` build output to the actual Cloudflare deployment target.
15. `vite.config.ts` now uses `preview.port = 4173`, which keeps TanStack Start prerender/build from colliding with a local dev server on `server.port = 3000`.
16. Brand assets are now organized under `public/brand/` with `logo/`, `icon/`, `icon/source/`, `favicon/`, and `pwa/` subfolders. Root head links and `manifest.json` now point at those generated assets, and the obsolete root `public/favicon.ico` was removed.

## Bonus UI Sprint retro (1 line)

Pre-Sprint 6 polish pass: TechStackSection overflow-clip fix + Zed swap + card hover glow; JourneySection scroll-driven TimelineDot animation; HeroSection single-column restore with font-sans h1, feature pills, and badge shimmer; About page full redesign from tab-switcher to scroll-storytelling (overview → mission pull-quote → feature cards → tech stack → contact). 193 tests passing, all hooks green.

## Sprint 5 retro (1 line)

About page (664 LOC) ported with Phosphor icons and Base UI Accordion. Per-route head() meta, canonical, OG/Twitter Card, JSON-LD WebPage added to all 5 routes. NotFoundComponent upgraded with warning icon. 116 tests passing (5 integration About + 6 E2E meta), bun run ci green, all routes prerendered with correct SEO.

## In-flight decisions

- **LLM provider for Sprint 11** — research spike deferred until Sprint 11 begins.
- **Tile fallback** — OpenFreeMap only unless runtime issues surface in Sprint 6.
- **Server bundle size** — current client budget is healthy, but server-only Nitro bundle shape should be re-measured under the eventual Cloudflare deployment target before deployment work.

## Blockers

None for Sprint 6 start.

## Session startup protocol

1. Read `AGENTS.md` + `CLAUDE.md` — rules + Claude-specific notes.
2. Read **this file** (`docs/HANDOFF.md`) for current state.
3. Read `docs/IMPLEMENTATION_PLAN.md` §"Sprint 6" for the active sprint.
4. `git log --oneline -20` for recent history and the current SHA.
5. Begin work. Surface assumptions before any non-trivial change (AGENTS.md §2.1).

## Session end protocol

1. Overwrite this file with updated state.
2. If a sprint boundary was reached: append to `docs/SPRINT_LOG.md` recording the merge commit SHA. semantic-release owns version tag creation.
3. Commit via `bun run commit`.
4. If a non-obvious decision was made: write an ADR.

---

_Full routing strategy and memory-layer design: `docs/IMPLEMENTATION_PLAN.md` Appendix F._
