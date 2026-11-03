# Foundation completion handoff (METRO-18 → METRO-19..22)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (or superpowers:executing-plans when no subagents). One slice = one ticket = one branch = one PR. Steps use checkbox syntax.

**Goal:** bring the rebuild foundation to the reference standard before any feature work. The docs are truthful; pins are current behind a cooldown; Renovate, hardened CI and commit rules are in place; web and API run from one origin with typed contracts; a coverage-enforced test pyramid covers every layer.

**Spec (binding):** Plane Page `646323d4-2031-452a-a23c-dd64da4e9a32`, revision `2026-11-03-r1`. Repository mirror: [foundation-completion.md](../../specifications/foundation-completion.md). Criterion IDs (`FND-*`) and seam IDs (`FND-*S*`) are contractual; copy them into tests, evidence and PR bodies.

**Base:** `feature/metro-rebuild` at `827d0a7` (clean). This plan and the spec mirror are **uncommitted** in the working tree; METRO-19 commits them.

## Session start (fresh agent)

1. Work in `D:\project-x\metro-station-finder`. Do **not** start in a separate worktree: this plan and the spec mirror are untracked in this checkout, and a new worktree would not contain them. Run `git status`. Expect exactly the two untracked files `docs/specifications/foundation-completion.md` and this plan, on `feature/metro-rebuild` at or after `827d0a7`. Run `git fetch` and fast-forward if the remote moved. Stop if the tree is dirty in any other way.
2. Run `mise install`, then `mise exec -- bun run bootstrap`, then `mise exec -- hk install --mise`, then `mise exec -- bun run check` to get a green baseline. Record the baseline result before any edit.
3. Re-read live Plane state: METRO-18..22, METRO-13, METRO-14, METRO-15 (state, blockers, comments). Reconcile against the ticket map below; if Plane differs, Plane wins, and you report the drift.
4. Commits are signed. If signing prompts the owner (hardware key or passphrase), say so and wait; never disable signing.
5. Read `C:/Users/Tashfiq/AppData/Local/Temp/claude/55f20b9302a72187/552a2a6e-3892-49d0-9788-ce91bf834e74/scratchpad/plane-ledger.md` if it exists (the operation ledger from preparation). Continue it in `.local/plane-ledger.md`, which is ignored.

## Ticket map

| Order | Ticket   | Slice          | State at handoff | Blocked by         | Branch                                 |
| ----- | -------- | -------------- | ---------------- | ------------------ | -------------------------------------- |
| —     | METRO-18 | parent         | Ready            | —                  | none (tracking only)                   |
| 1     | METRO-19 | `hygiene`      | Ready            | —                  | `ticket/metro-foundation-hygiene`      |
| 2a    | METRO-20 | `supply-chain` | Backlog          | METRO-19           | `ticket/metro-foundation-supply-chain` |
| 2b    | METRO-21 | `dev-runtime`  | Backlog          | METRO-19           | `ticket/metro-foundation-dev-runtime`  |
| 3     | METRO-22 | `test-pyramid` | Backlog          | METRO-20, METRO-21 | `ticket/metro-foundation-test-pyramid` |

METRO-20 and METRO-21 may run in parallel once METRO-19 merges. Whichever merges second rebases. Plane project UUID: `1ab13b1b-d537-4524-8f18-45ee42262dc4`. States: Backlog `5ee67553-d24e-47b3-a9ca-8e1e19ea0d26`, Ready `e02a405f-1962-4b21-b7e5-0e73ee5bdb7b`, In Progress `c452ccf9-747d-4442-a678-e51245ee0405`, In Review `7dadf61d-18dd-4f5e-aa44-73825b56ca0d`, Done `271388b7-0eba-4659-af9c-acef83950caa`.

## Authorization (owner, 2026-11-03)

- Authorized: implementation, independent review, PR to `feature/metro-rebuild`, merge after green `Quality gates` and resolved review, ticket-branch deletion, and Plane transitions Ready → In Progress → In Review → Done for METRO-19..22. Move each blocked child to Ready only after all of its blockers are Done. Close METRO-18 after FND-P1/P2.
- **Not** authorized: default-branch switch, touching `master`, deployment/preview, release, product features, frontend stack choices, editing historical `docs/evidence/*`, weakening any gate.
- HITL (ask the owner): Renovate GitHub App installation and repository rulesets (FND-S7). Also any plugin/version incompatibility that would need a downgrade (FND-R1 stop condition).

## Read before starting (in order)

1. `AGENTS.md` and its trigger table. This work hits tooling, architecture, API, UI, testing, security and quality-gates rows, so read all of `docs/agents/*.md`.
2. The spec mirror, in full, plus your slice's Plane ticket (`workitem retrieve_by_identifier`).
3. `docs/development.md`, `docs/agents/quality-gates.md`, `docs/agents/maintenance.md` and the latest evidence files (`docs/evidence/metro-12.md`, `metro-16.md`).
4. Every source file you will touch. The repo is about 3k lines; read the full scripts you change, including their tests.

## Environment facts (Repo-verified)

- Shell: PowerShell 7. Run every command as `mise exec -- bun run <task>`; the guard rejects a non-pinned Bun or Node. A global `bun` on this machine is 1.4.0, but the pin is 1.4.4.
- If the managed runner changes temp/profile directories, use the `.local/` environment overrides documented in `docs/development.md`.
- Install hooks per checkout with `mise exec -- hk install --mise`. Hook fixture tests need `hk`, `git` and `bun` on PATH and network access for the first hk schema fetch.
- Every test or script that runs `git` against a fixture **must** use `cleanGitEnv()` (`scripts/git-env.ts`). Linked worktrees export `GIT_DIR` to hooks.
- Format and lint read untracked files. Stray scratch files fail pre-commit by design; keep scratch outside the repo.
- `bun run smoke` needs a Playwright browser: `mise exec -- bun run playwright install chromium`.
- dependency-cruiser is routed to the TS 6 compiler API through `scripts/dependency-parser.ts`; `tsc` is TS 7. Keep that seam.

## Per-slice loop (repeat for each ticket)

- [ ] Retrieve the ticket and confirm its state is Ready and every blocker is Done. Move it to In Progress.
- [ ] Branch from fresh `feature/metro-rebuild` (`git fetch; git switch -c <branch> origin/feature/metro-rebuild`).
- [ ] Verify each **Unverified** item that the slice depends on (Context7 first, then official docs, then installed `.d.ts`). Record the result with a label (Context7-verified / Web-verified / Repo-verified) in the slice evidence file.
- [ ] TDD per criterion. Write the failing check, run it and record RED. Implement, then record GREEN. Never edit an assertion to pass.
- [ ] Run the focused tests, then the full canonical suite: `check`, `build`, `smoke`, `bundle:check`, `scan`. For METRO-19 also run both `scripts/*-metro-preparation.ps1` scripts with the three reviewed roots from `docs/agents/skills.md`.
- [ ] Write the evidence file `docs/evidence/metro-foundation-<slice>.md`. Include: base and head SHAs, a criterion-to-evidence table, exact commands and results, RED/GREEN records, pin/version evidence, unrun checks, and Unknowns.
- [ ] Self-review the diff. Then request an independent review (superpowers:requesting-code-review). Fix Critical and Important findings; record the disposition of each finding in the evidence.
- [ ] Make signed conventional commits. Push, then open a PR to `feature/metro-rebuild` using the PR template (or the METRO-19-introduced template). Move the ticket to In Review and comment the PR URL.
- [ ] Merge only when hosted `Quality gates` is green and review is resolved. Delete the ticket branch, comment the merge SHA plus evidence on the ticket, and move it to Done.
- [ ] For each newly unblocked dependent, re-check its blockers and move it to Ready.

## Slice notes (beyond the spec)

**METRO-19 hygiene**

- Commit the uncommitted spec mirror and this plan first, as `docs: add foundation completion spec and handoff`.
- The link gate must cope with GitHub-style anchors: lowercase, spaces become `-`, punctuation stripped, duplicate headings get `-1`. Ignore `http(s)://` and `mailto:`. Code fences must not be parsed as links.
- Historical evidence files contain links to the legacy baseline that the gate must not break. External links are skipped, so this is fine; verify it.
- ADR-0001 records the _existing_ decisions only, with their evidence links. It must not invent new decisions.

**METRO-20 supply-chain**

- The pin refresh happens first, then everything else, so that later slices start on current versions.
- `minimumReleaseAge` interacts with the frozen lockfile. Confirm `bun install --frozen-lockfile` still succeeds when locked versions are older than the cooldown. Record the result.
- Renovate's `minimumReleaseAge` uses a duration string ("3 days"), while Bun uses seconds. The guard test compares their normalized values.
- Rulesets: prepare the exact `gh api` payload in evidence and hand it to the owner. Do not apply it without the owner's explicit go.

**METRO-21 dev-runtime**

- Gate everything on verified Vite 8 support in `@cloudflare/vite-plugin` and `@vitejs/plugin-react`. If either lacks it, stop, set the `needs-decision` label, comment the evidence and ask the owner.
- The route move (`/__scaffold/status` → `/api/scaffold/status`) changes the smoke and docs. Update every reference, including `docs/development.md`.
- Keep the bundle budget unchanged (250000 raw / 80000 gzip, production mode, `NODE_ENV` unset). The schema library choice must fit inside it.

**METRO-22 test-pyramid**

- Bun's coverage threshold is enforced **per file**. Any test that loads scripts like `smoke`/`dev` pulls them into coverage, so structure the code so that only unit-testable modules are loaded by unit tests.
- Keep `bun run smoke` as the canonical name used by hk and CI. The CI `build` job installs all three browsers with `--with-deps`, using the cache from METRO-20.

## Stop conditions (report, don't work around)

- A required tool or plugin is incompatible with the pinned versions.
- A gate can pass only by relaxing an assertion, budget, threshold or strict flag.
- A Plane lookup is ambiguous or a create times out (see `docs/agents/plane.md`). Never retry a create blindly.
- A scope question arises that is not answered by the spec. Ask the owner; do not expand scope.

## Next batch to Ready (owner-authorized readiness review)

The owner authorizes moving the next unblocked batch to Ready **only if** each item passes the Ready definition (`docs/agents/workflow.md`, `docs/agents/plane.md` step 7). Run this review once the foundation is complete:

- **METRO-13** (Cloudflare preview; `cebb9766-1f74-4bd6-a047-bb82ef356fad`). Blockers: METRO-12 (Done) and METRO-21. When METRO-21 is Done, review it for readiness:
  - Its body predates the rebuild workflow. It has no stable identity, no settled spec revision, its acceptance criteria lack failure-check detail, and its Done text still says "merged to main".
  - Reconcile it against the topology delivered by METRO-21 (ADR-0002). If a settled spec and bounded criteria can be written from existing decisions, append a dated "Readiness review" section to its body (preserving the existing content) and move it to Ready. The review records: base SHA; criteria with failure checks; testing seams; the `feature/metro-rebuild` integration-Done exception; the METRO-21 topology; the open owner inputs (Cloudflare account and API token provisioning are HITL).
  - If material decisions remain (account, secrets, preview naming), move it to Specifying and label it `needs-decision`. Comment the exact questions. Do not invent answers.
- **METRO-14** (releases; `ccf5b305-4260-4312-882f-f70a7f972041`). Blocked by METRO-13. It stays Backlog. Confirm the native relation exists and comment the status.
- **METRO-15** (web spec; `13e095d6-46ad-4470-91ad-416187e5654d`). Already Ready. Append a readiness note that the foundation landed: the new runtime, contracts, test layers and ADRs are inputs, and frontend stack choices (router, styling, data fetching, i18n) are now in its scope as explicit decisions. Do not change its state.
- Report the resulting Ready column to the owner with links.

## Final (METRO-18)

- [ ] When all four children are Done, run a fresh-context whole-foundation review against the spec on the integration SHA. Resolve Critical and Important findings (as a follow-up ticket if they are out of slice scope).
- [ ] Comment FND-P1/P2 evidence on METRO-18 and move it to Done. Report to the owner: merged SHAs, gaps, HITL items still open.
