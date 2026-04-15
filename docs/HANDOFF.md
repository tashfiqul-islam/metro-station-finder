# HANDOFF.md

Short snapshot of current project state. Overwritten at every sprint boundary. Keep under 500 words. **Every session reads this before starting work. Every session updates it before ending.**

---

## Current state

**Active sprint:** Sprint 2 — Design System & Theme
**Status:** not started
**Primary model for this sprint:** Sonnet 4.6 primary — Opus 4.6 for `@theme inline` consolidation design and CVA decorator check; Haiku 4.5 for `shadcn add` runs + mechanical imports.

**Last-completed sprint:** Sprint 1 — Data & Pure Logic
**Last commit on `main`:** pending Sprint 1 commit (branch: master)

## Next action

Begin Sprint 2 per `docs/IMPLEMENTATION_PLAN.md` §"Sprint 2". Key tasks:

1. Consolidate `src/styles.css` with `@theme inline`, oklch primary, glassmorphism utility, font imports.
2. Add shadcn primitives via `bunx shadcn@latest add` (ask user before install).
3. Port `glass-card.tsx`, `section-wrapper.tsx`, `unified-background.tsx` from legacy.
4. Port `animation-constants.ts`, `animated-badge.tsx`, `highlight.tsx`.
5. Add `motion` dependency (ask first). Verify CVA has no runtime decorators.
6. Write integration tests for each new component.

## Sprint 1 retro (1 line)

All 17 stations, 17×17 fare matrix, MRT-6 geojson, and all pure logic (haversine, findNearest, calculateFare, planTrip, clipLineToSegment) implemented TDD, 58 tests passing, 0 lint errors, bun run ci exit 0.

**Note:** `mrt6-line.geojson` is hand-traced from station coordinates (17-point LineString). OSM Overpass verification deferred — can replace the typed `src/data/mrt6-line.ts` export when better data is sourced.

## In-flight decisions

- **LLM provider for Sprint 11** — research spike deferred until Sprint 11 begins. Decision owner: Sprint 11. Write as ADR `001-llm-provider.md` when made.
- **Tile fallback** — OpenFreeMap only unless it proves unreliable at runtime. No action required unless Sprint 6 smoke tests show problems.

## Blockers

None.

## Session startup protocol

1. Read `AGENTS.md` + `CLAUDE.md` — rules + Claude-specific notes.
2. Read **this file** (`docs/HANDOFF.md`) for current state.
3. Read `docs/IMPLEMENTATION_PLAN.md` §"Sprint 2" for the active sprint.
4. `git log --oneline -20` for recent history and the current SHA.
5. Begin work. Surface assumptions before any non-trivial change (AGENTS.md §2.1).

## Session end protocol

1. Overwrite this file with updated state.
2. If a sprint boundary was reached: append to `docs/SPRINT_LOG.md` recording the merge commit SHA. semantic-release owns version tag creation.
3. Commit via `bun run commit`.
4. If a non-obvious decision was made: write an ADR.

---

_Full routing strategy and memory-layer design: `docs/IMPLEMENTATION_PLAN.md` Appendix F._
