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
