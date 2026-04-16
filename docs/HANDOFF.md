# HANDOFF.md

Short snapshot of current project state. Overwritten at every sprint boundary. Keep under 500 words. **Every session reads this before starting work. Every session updates it before ending.**

---

## Current state

**Active sprint:** Sprint 5 — Routing Stubs & About Page
**Status:** not started
**Primary model for this sprint:** Haiku 4.5 primary — Sonnet 4.6 for per-route meta authoring and About page content review.

**Last-completed sprint:** Sprint 4 — Home Page Port
**Last commit on `master`:** `084db88` — `style: apply oxfmt tailwind v4 utility normalization`

## Next action

Begin Sprint 5 per `docs/IMPLEMENTATION_PLAN.md` §"Sprint 5". Key tasks:

1. Port `/about` page from legacy (`D:/Projects/metro-station-finder/src/routes/about.tsx`, 664 LOC). Strip `"use client"`, replace Lucide with Phosphor icons. Uses Tabs + Accordion + Badge + Separator (all already added via shadcn in Sprint 2).
2. Add per-route `head()` meta to every route: title (with site suffix), description, canonical `<link>`, Open Graph tags, Twitter Card tags.
3. Add JSON-LD `WebPage` block to every route via `head()`.
4. Flesh out the `notFoundComponent` in `__root.tsx` with a Phosphor warning icon and a link home (currently a basic centered 404).
5. Stub routes for `/station-finder`, `/station-fares`, `/trip-planner` already exist from Sprint 4 — verify they have correct headings and meta, upgrade if needed.
6. Integration tests for About page content (tabs switch, accordion expands).
7. E2E test: every route has `<title>`, `<meta name="description">`, `<link rel="canonical">`, valid JSON-LD.

## Sprint 4 retro (1 line)

All 6 home sections ported with Phosphor icons and updated tech stack copy. InfiniteSlider, ProgressiveBlur, and Timeline UI components ported. 111 tests passing, bun run ci exit 0. Deprecated Phosphor icon aliases required 3 fix commits.

## In-flight decisions

- **LLM provider for Sprint 11** — research spike deferred until Sprint 11 begins.
- **Tile fallback** — OpenFreeMap only unless runtime issues surface in Sprint 6.

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
