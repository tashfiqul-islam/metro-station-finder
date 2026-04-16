# HANDOFF.md

Short snapshot of current project state. Overwritten at every sprint boundary. Keep under 500 words. **Every session reads this before starting work. Every session updates it before ending.**

---

## Current state

**Active sprint:** Sprint 4 — Home Page Port
**Status:** not started
**Primary model for this sprint:** Sonnet 4.6 primary — Haiku 4.5 for icon rename + `techLogos` + glass-card call-site rewrites; Opus 4.6 for post-refactor review

**Last-completed sprint:** Sprint 3 — Navigation & Root Shell
**Last commit on `master`:** _(see git log — Sprint 3 merge)_

## Next action

Begin Sprint 4 per `docs/IMPLEMENTATION_PLAN.md` §"Sprint 4". Key tasks:

1. Port all 6 home sections from legacy (`hero`, `tech-stack`, `architecture`, `features`, `journey`, `cta`).
2. Apply 2026 deltas: Phosphor icons, updated tech stack logos, MapLibre copy, journey v1.0.0 rebuild entry.
3. Rewrite all `glass-card` call-sites to use `<GlassCard>` component.
4. Write integration tests for each home section.
5. E2E: smoke test that `/` renders all sections.

## Sprint 3 retro (1 line)

Navigation & Root Shell implemented: full `__root.tsx` port with FOUC-blocking inline script, QueryClientProvider with named constants, `NavBar` with 5 Phosphor-icon nav items, `Theme` Base UI Menu dropdown, `Logo`, `GithubLink`, mobile hamburger (portal + click-outside + Escape), 25 integration + 83 total tests, `bun run ci` exit 0.

**Key decisions / surprises:**

- `@testing-library/user-event` not installed — used `fireEvent` throughout; sufficient for all test cases.
- jsdom's `--localstorage-file` flag leaves `localStorage` non-functional; replaced with a `Map`-backed stub in `tests/setup.integration.ts`.
- Base UI `Menu.RadioItem` has `role="menuitemradio"` (not `"menuitem"`) — tests updated accordingly.
- `data-[status=active]` is TanStack Router's Link active class; `activeProps={{ "aria-current": "page" }}` provides the correct ARIA attribute.
- `no-plusplus` oxlint rule bans `++`; E2E tests must use `+= 1`.

## In-flight decisions

- **LLM provider for Sprint 11** — deferred until Sprint 11. ADR `001-llm-provider.md` to be written then.
- **Tile fallback** — OpenFreeMap only unless runtime smoke tests in Sprint 6 show problems.

## Blockers

None.

## Session startup protocol

1. Read `AGENTS.md` + `CLAUDE.md` — rules + Claude-specific notes.
2. Read **this file** (`docs/HANDOFF.md`) for current state.
3. Read `docs/IMPLEMENTATION_PLAN.md` §"Sprint 4" for the active sprint.
4. `git log --oneline -20` for recent history and the current SHA.
5. Begin work. Surface assumptions before any non-trivial change (AGENTS.md §2.1).

## Session end protocol

1. Overwrite this file with updated state.
2. If a sprint boundary was reached: append to `docs/SPRINT_LOG.md` recording the merge commit SHA. semantic-release owns version tag creation.
3. Commit via `bun run commit`.
4. If a non-obvious decision was made: write an ADR.

---

_Full routing strategy and memory-layer design: `docs/IMPLEMENTATION_PLAN.md` Appendix F._
