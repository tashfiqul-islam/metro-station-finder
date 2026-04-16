# HANDOFF.md

Short snapshot of current project state. Overwritten at every sprint boundary. Keep under 500 words. **Every session reads this before starting work. Every session updates it before ending.**

---

## Current state

**Active sprint:** Sprint 6 — Maps Foundation
**Status:** not started
**Primary model for this sprint:** Opus 4.6 primary (top-risk sprint). Sonnet 4.6 for markers and metro-line layer.

**Last-completed sprint:** Sprint 5 — Routing Stubs & About Page
**Last commit on `master`:** `f490eaa` — `fix: correct last commit sha in handoff.md`

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

## Sprint 5 retro (1 line)

About page (664 LOC) ported with Phosphor icons and Base UI Accordion. Per-route head() meta, canonical, OG/Twitter Card, JSON-LD WebPage added to all 5 routes. NotFoundComponent upgraded with warning icon. 116 tests passing (5 integration About + 6 E2E meta), bun run ci green, all routes prerendered with correct SEO.

## In-flight decisions

- **LLM provider for Sprint 11** — research spike deferred until Sprint 11 begins.
- **Tile fallback** — OpenFreeMap only unless runtime issues surface in Sprint 6.

## Blockers

None.

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
