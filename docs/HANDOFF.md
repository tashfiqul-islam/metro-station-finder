# HANDOFF.md

Short snapshot of current project state. Overwritten at every sprint boundary. Keep under 500 words. **Every session reads this before starting work. Every session updates it before ending.**

---

## Current state

**Active sprint:** Sprint 5 — Station Finder UI
**Status:** not started
**Primary model for this sprint:** Sonnet 4.6 primary

**Last-completed sprint:** Sprint 4 — Home Page Port
**Last commit on `master`:** _(see git log — Sprint 4 merge)_

## Next action

Begin Sprint 5 per `docs/IMPLEMENTATION_PLAN.md` §"Sprint 5". Key tasks:

1. Build `/station-finder` route and page shell.
2. Integrate MapLibre GL JS with OpenFreeMap tiles.
3. Implement `findNearest` UI: geolocation button, nearest-station card.
4. Add `mapcn` map component wiring.
5. Integration + E2E tests; `bun run ci` must be green.

## Sprint 4 retro (1 line)

Home Page Port: all 6 sections ported with 2026 deltas (Phosphor icons, MapLibre/Valibot/mapcn copy, v1.0.0 rebuild timeline entry), InfiniteSlider/ProgressiveBlur/Timeline UI components ported, 111 tests, `bun run ci` exit 0.

**Key decisions / surprises:**

- Base UI `Button` uses `asChild?: React.ReactElement` render prop (not Radix UI boolean `asChild`) — legacy code pattern required full rewrite at every call-site.
- TanStack Router typed `to` prop rejects unregistered routes (`/station-finder`, `/station-fares`, etc.) — cast to `as string` until Sprint 5/6 register those routes in `routeTree.gen.ts`.
- `vi.fn().mockImplementation(() => ({...}))` with arrow function body cannot be used as a constructor; `@floating-ui/dom autoUpdate` checks `typeof ResizeObserver === 'function'` and calls `new ResizeObserver(callback)` when defined — adding any ResizeObserver mock to `setup.integration.ts` broke Theme tests. Solution: leave ResizeObserver undefined globally; mock `@/components/ui/timeline` locally in `journey-section.test.tsx`.
- `export function Foo(...)` syntax flagged by ultracite `func-style`; all ported components converted to `export const Foo = (...): React.ReactElement =>`.

## In-flight decisions

- **LLM provider for Sprint 11** — deferred until Sprint 11. ADR `001-llm-provider.md` to be written then.
- **Tile fallback** — OpenFreeMap only unless runtime smoke tests in Sprint 6 show problems.

## Blockers

None.

## Session startup protocol

1. Read `AGENTS.md` + `CLAUDE.md` — rules + Claude-specific notes.
2. Read **this file** (`docs/HANDOFF.md`) for current state.
3. Read `docs/IMPLEMENTATION_PLAN.md` §"Sprint 5" for the active sprint.
4. `git log --oneline -20` for recent history and the current SHA.
5. Begin work. Surface assumptions before any non-trivial change (AGENTS.md §2.1).

## Session end protocol

1. Overwrite this file with updated state.
2. If a sprint boundary was reached: append to `docs/SPRINT_LOG.md` recording the merge commit SHA. semantic-release owns version tag creation.
3. Commit via `bun run commit`.
4. If a non-obvious decision was made: write an ADR.

---

_Full routing strategy and memory-layer design: `docs/IMPLEMENTATION_PLAN.md` Appendix F._
