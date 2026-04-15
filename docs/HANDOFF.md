# HANDOFF.md

Short snapshot of current project state. Overwritten at every sprint boundary. Keep under 500 words. **Every session reads this before starting work. Every session updates it before ending.**

---

## Current state

**Active sprint:** Sprint 1 — Data & Pure Logic
**Status:** not started
**Primary model for this sprint:** Sonnet 4.6 (Opus 4.6 for Valibot schema design + DMTCL fare-matrix audit; Haiku 4.5 for test fixtures)

**Last-completed sprint:** Sprint 0 — Foundation & Guardrails
**Last commit on `main`:** `0fb4a66` — `chore: initialize project toolchain, docs, and ci/cd`

## Next action

Begin Sprint 1 per `docs/IMPLEMENTATION_PLAN.md` §"Sprint 1". TDD, in this order:

1. Write Valibot schemas for `Station` and the fare matrix in `src/lib/validation.ts` (+ shared helpers).
2. Write failing unit tests for haversine, findNearest, calculateFare, planTrip/clipLineToSegment, and all schema rejection cases. Colocate where natural, `tests/unit/` otherwise.
3. Implement `src/data/stations.ts` (17 stations, `const` + Valibot-validated at module load), `src/data/fares.ts` (17×17 matrix, symmetry + diagonal asserted at load), `src/data/mrt6-line.geojson` (LineString, source from OSM Overpass or hand-trace).
4. Implement `src/features/*/logic.ts` — haversine, findNearest, calculateFare, planTrip — until tests pass.
5. Verify 100% coverage on the new files.

**Open research item:** The MRT-6 OSM relation via Overpass needs verification. If the data is incomplete or noisy, fall back to hand-tracing from the station coordinates in `src/data/stations.ts`.

## In-flight decisions

- **LLM provider for Sprint 11** — research spike deferred until Sprint 11 begins. Decision owner: Sprint 11. Write as ADR `001-llm-provider.md` when made.
- **Tile fallback** — OpenFreeMap only unless it proves unreliable at runtime. No action required unless Sprint 6 smoke tests show problems.

## Blockers

None.

## Sprint 0 retro (1 line)

Baseline CI was not green on first pass — Ultracite flagged `.claude/settings.local.json` (editor-local state). Fixed by excluding `.claude/` from `.gitignore`, `.prettierignore`, and `oxlint.config.ts` `ignorePatterns`. All 9 deliverables shipped; `bun run ci` green with 4/4 tests.

## Session startup protocol

1. Read `AGENTS.md` + `CLAUDE.md` — rules + Claude-specific notes.
2. Read **this file** (`docs/HANDOFF.md`) for current state.
3. Read `docs/IMPLEMENTATION_PLAN.md` §"Sprint 1" for the active sprint.
4. `git log --oneline -20` for recent history and the current SHA.
5. Begin work. Surface assumptions before any non-trivial change (AGENTS.md §2.1).

## Session end protocol

1. Overwrite this file with updated state.
2. If a sprint boundary was reached: append to `docs/SPRINT_LOG.md` recording the merge commit SHA. semantic-release owns version tag creation.
3. Commit via `bun run commit`.
4. If a non-obvious decision was made: write an ADR.

---

_Full routing strategy and memory-layer design: `docs/IMPLEMENTATION_PLAN.md` Appendix F._
