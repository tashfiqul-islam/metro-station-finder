# HANDOFF.md

Short snapshot of current project state. Overwritten at every sprint boundary. Keep under 500 words. **Every session reads this before starting work. Every session updates it before ending.**

---

## Current state

**Active sprint:** Sprint 3 — Map Integration (MapLibre GL + OpenFreeMap tiles)
**Status:** not started
**Primary model for this sprint:** Sonnet 4.6 primary

**Last-completed sprint:** Sprint 2 — Design System & Theme
**Last commit on `master`:** _(see git log — Sprint 2 merge)_

## Next action

Begin Sprint 3 per `docs/IMPLEMENTATION_PLAN.md` §"Sprint 3". Key tasks:

1. Add `maplibre-gl` and `@maplibre/maplibre-gl-style-spec` dependencies.
2. Implement `MapView` component with MapLibre GL canvas, OpenFreeMap tile source.
3. Overlay MRT-6 line geojson (`src/data/mrt6-line.ts`) as a GeoJSON layer.
4. Add station markers with click-to-select behaviour.
5. Write integration tests for the map component.

## Sprint 2 retro (1 line)

Design system and shell components implemented: glassmorphism CSS utilities, animation tokens, color helpers, `GlassCard`, `SectionWrapper`, `UnifiedBackground`, `AnimatedBadge`, `Highlight` compound system, all shadcn primitives (accordion, badge, card, hover-card, separator, sheet, tabs) converted to arrow-expression style, 15 integration tests passing, 73 total tests, `bun run ci` exit 0.

**Key decisions / surprises:**

- `COMPLEX_OPACITY_VALUES.*` changed from arrays to scalars (legacy bug); array values crash `useTransform`.
- `"use client"` directives stripped from all ported files (TanStack Start, not Next.js).
- shadcn@latest generates `function` declarations; all converted to arrow expressions to satisfy ultracite `func-style` rule.
- `HighlightItem` complexity (34) above oxlint max (20); suppressed inline with `// eslint-disable-next-line complexity` — the component is a direct port of a multi-mode polymorphic UI primitive.
- `tests/setup.ts` split into shared + `tests/setup.integration.ts` to avoid `window is not defined` in the Node unit test environment.

## In-flight decisions

- **LLM provider for Sprint 11** — deferred until Sprint 11. ADR `001-llm-provider.md` to be written then.
- **Tile fallback** — OpenFreeMap only unless runtime smoke tests in Sprint 6 show problems.

## Blockers

None.

## Session startup protocol

1. Read `AGENTS.md` + `CLAUDE.md` — rules + Claude-specific notes.
2. Read **this file** (`docs/HANDOFF.md`) for current state.
3. Read `docs/IMPLEMENTATION_PLAN.md` §"Sprint 3" for the active sprint.
4. `git log --oneline -20` for recent history and the current SHA.
5. Begin work. Surface assumptions before any non-trivial change (AGENTS.md §2.1).

## Session end protocol

1. Overwrite this file with updated state.
2. If a sprint boundary was reached: append to `docs/SPRINT_LOG.md` recording the merge commit SHA. semantic-release owns version tag creation.
3. Commit via `bun run commit`.
4. If a non-obvious decision was made: write an ADR.

---

_Full routing strategy and memory-layer design: `docs/IMPLEMENTATION_PLAN.md` Appendix F._
