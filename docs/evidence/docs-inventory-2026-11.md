# Docs inventory, 2026-11

Evidence for METRO-75. Base `origin/feature/metro-rebuild` at `c98f407`. Kinds are defined in [docs/README.md](../README.md); this table classifies every file under `docs/` on that base plus `docs/README.md` and this file. To regenerate, list `docs/` and apply the README map; the live check is `scripts/docs-structure.test.ts`.

**Repo-verified.** Findings:

- 83 tracked files plus `docs/README.md` and this inventory were classified; none lacked a kind.
- No file was moved. Two runbooks (`docs/agents/cutover-runbook.md`, `docs/agents/deploy-runbook.md`) sit among the guides; they are classified by exact rows. Moving them would rewrite links in routed documents and tests for no behavior gain, so this is flagged, not changed.
- `docs/superpowers/plans/` is named after a tool, not a kind; its six dated plans are `history`. Five of them contain 48 task-list items in total, tolerated only because history is frozen.
- No file under `docs/specifications/` contains a task-list item, so the new specification check passes without rewriting anything.
- ADR numbering skips 0010 (not changed, out of scope).

| File                                                         | Kind      | Title                                                                         |
| ------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------- |
| `docs/README.md`                                             | index     | Documentation map                                                             |
| `docs/adr/0000-template.md`                                  | template  | ADR-NNNN: Short decision title                                                |
| `docs/adr/0001-foundation-baseline.md`                       | decision  | ADR-0001: Foundation baseline                                                 |
| `docs/adr/0002-runtime-topology.md`                          | decision  | ADR-0002: Runtime topology                                                    |
| `docs/adr/0003-contracts.md`                                 | decision  | ADR-0003: Contracts                                                           |
| `docs/adr/0004-supply-chain-and-ci-policy.md`                | decision  | ADR-0004: Supply-chain and CI policy                                          |
| `docs/adr/0005-test-strategy.md`                             | decision  | ADR-0005: Test strategy                                                       |
| `docs/adr/0006-cloudflare-preview.md`                        | decision  | ADR-0006: Per-pull-request Cloudflare preview                                 |
| `docs/adr/0007-release-sync.md`                              | decision  | ADR-0007: GitHub-canonical release sync to Plane                              |
| `docs/adr/0008-default-branch-switch.md`                     | decision  | ADR-0008: Default-branch switch from master to main for v1.0.0                |
| `docs/adr/0009-maps-provider-design.md`                      | decision  | ADR-0009: Maps, Places, Routes and geolocation design                         |
| `docs/adr/0011-security-headers.md`                          | decision  | ADR-0011: Security headers, report-only CSP and asset caching                 |
| `docs/adr/0012-production-deploy.md`                         | decision  | ADR-0012: Production deploy with staged rollout, smoke and automatic rollback |
| `docs/adr/0013-api-error-format.md`                          | decision  | ADR-0013: API error format and response compatibility rule                    |
| `docs/adr/0014-language-level-and-worker-types.md`           | decision  | ADR-0014: Language level per project and the Workers type source              |
| `docs/adr/0015-tsconfig-structure.md`                        | decision  | ADR-0015: Shared tsconfig structure                                           |
| `docs/agents/api.md`                                         | guide     | API and contracts                                                             |
| `docs/agents/architecture.md`                                | guide     | Architecture                                                                  |
| `docs/agents/attribution.md`                                 | guide     | AI attribution and commit trailers                                            |
| `docs/agents/cutover-runbook.md`                             | runbook   | Default-branch cutover runbook (master to main, v1.0.0)                       |
| `docs/agents/deploy-runbook.md`                              | runbook   | Production deploy runbook                                                     |
| `docs/agents/domain.md`                                      | guide     | Domain Docs                                                                   |
| `docs/agents/github-settings.md`                             | guide     | GitHub security settings (METRO-48)                                           |
| `docs/agents/issue-tracker.md`                               | guide     | Issue tracker: Plane                                                          |
| `docs/agents/maintenance.md`                                 | guide     | Maintenance                                                                   |
| `docs/agents/observability.md`                               | guide     | Observability                                                                 |
| `docs/agents/plane.md`                                       | guide     | Plane preparation adapter                                                     |
| `docs/agents/quality-gates.md`                               | guide     | Quality gates                                                                 |
| `docs/agents/release-policy.md`                              | guide     | Version and tag policy                                                        |
| `docs/agents/review-checklist.md`                            | guide     | Independent review checklist                                                  |
| `docs/agents/security.md`                                    | guide     | Security, permissions and location                                            |
| `docs/agents/skills.lock.json`                               | data      |                                                                               |
| `docs/agents/skills.md`                                      | guide     | Reviewed skills and preparation                                               |
| `docs/agents/testing.md`                                     | guide     | Testing and bugs                                                              |
| `docs/agents/triage-labels.md`                               | guide     | Triage Labels                                                                 |
| `docs/agents/ui.md`                                          | guide     | UI and accessibility                                                          |
| `docs/agents/untrusted-input.md`                             | guide     | Untrusted input for agents                                                    |
| `docs/agents/workflow.md`                                    | guide     | Workflow                                                                      |
| `docs/development.md`                                        | reference | Local workspace                                                               |
| `docs/evidence/audit-2026-11.md`                             | evidence  | METRO-30 audit: the project against current 2026 standards                    |
| `docs/evidence/ci-timings-2026-11.json`                      | evidence  |                                                                               |
| `docs/evidence/ci-timings-2026-11.md`                        | evidence  | CI job timings, November 2026 (METRO-59)                                      |
| `docs/evidence/dhaka-mrt-line-6.md`                          | evidence  | Dhaka MRT Line-6 research evidence (METRO-65)                                 |
| `docs/evidence/docs-inventory-2026-11.md`                    | evidence  |                                                                               |
| `docs/evidence/metro-10.md`                                  | evidence  | METRO-10 evidence — 2026-11-02                                                |
| `docs/evidence/metro-11.md`                                  | evidence  | METRO-11 workspace evidence                                                   |
| `docs/evidence/metro-12.md`                                  | evidence  | METRO-12 local gate evidence                                                  |
| `docs/evidence/metro-16.md`                                  | evidence  | METRO-16 configuration evidence                                               |
| `docs/evidence/metro-17.md`                                  | evidence  | METRO-17 agent skills configuration evidence                                  |
| `docs/evidence/metro-8.md`                                   | evidence  | METRO-8 acceptance evidence                                                   |
| `docs/evidence/metro-9.md`                                   | evidence  | METRO-9 evidence                                                              |
| `docs/evidence/metro-cloudflare-preview.md`                  | evidence  | METRO-13 evidence: Cloudflare preview with smoke and rollback                 |
| `docs/evidence/metro-editor-projects.md`                     | evidence  | METRO-26 evidence: editor type errors                                         |
| `docs/evidence/metro-foundation-closeout.md`                 | evidence  | METRO-18 evidence: foundation closeout                                        |
| `docs/evidence/metro-foundation-dev-runtime.md`              | evidence  | METRO-21 evidence: dev runtime                                                |
| `docs/evidence/metro-foundation-hygiene.md`                  | evidence  | METRO-19 evidence: foundation hygiene                                         |
| `docs/evidence/metro-foundation-supply-chain.md`             | evidence  | METRO-20 evidence: supply chain                                               |
| `docs/evidence/metro-foundation-test-pyramid.md`             | evidence  | METRO-22 evidence: test pyramid                                               |
| `docs/evidence/metro-release-draft.md`                       | evidence  | METRO-24 evidence: draft GitHub release from a Plane release                  |
| `docs/evidence/metro-release-sync.md`                        | evidence  | METRO-14 evidence: GitHub release, tag and release log sync to Plane          |
| `docs/evidence/ubuntu-onboarding-2026-11.md`                 | evidence  | Ubuntu onboarding run, November 2026 (METRO-55)                               |
| `docs/examples/plane-preparation/README.md`                  | example   | Local Plane preparation dry run                                               |
| `docs/examples/plane-preparation/source.json`                | example   |                                                                               |
| `docs/examples/plane-preparation/tickets.json`               | example   |                                                                               |
| `docs/examples/untrusted-input/PROTOCOL.md`                  | example   | Prompt-injection red-team protocol                                            |
| `docs/examples/untrusted-input/ticket.json`                  | example   |                                                                               |
| `docs/product/feature-parity.md`                             | reference | Feature parity baseline                                                       |
| `docs/product/glossary.md`                                   | reference | Glossary                                                                      |
| `docs/specifications/agent-skills-setup.md`                  | contract  | Agent skills configuration specification                                      |
| `docs/specifications/cloudflare-preview.md`                  | contract  | Specification: Cloudflare preview with smoke evidence and rollback (METRO-13) |
| `docs/specifications/foundation-completion.md`               | contract  | Foundation completion specification                                           |
| `docs/specifications/foundation-hardening.md`                | contract  | Foundation hardening specification                                            |
| `docs/specifications/maps-provider-design.md`                | contract  | Specification: Maps, Places, Routes and geolocation design (METRO-39)         |
| `docs/specifications/nearest-station.md`                     | contract  | METRO-40: station domain model and nearest-station specification              |
| `docs/specifications/quality-gates.md`                       | contract  | METRO-12: canonical quality gates                                             |
| `docs/specifications/release-draft.md`                       | contract  | Specification: Plane release to draft GitHub release (METRO-24)               |
| `docs/specifications/release-sync.md`                        | contract  | Specification: GitHub release to Plane release sync (METRO-14)                |
| `docs/superpowers/plans/2026-11-02-bootstrap-evidence.md`    | history   | METRO-8 and METRO-9 implementation plan                                       |
| `docs/superpowers/plans/2026-11-02-metro-10-preparation.md`  | history   | METRO-10 Preparation Implementation Plan                                      |
| `docs/superpowers/plans/2026-11-03-foundation-completion.md` | history   | Foundation completion handoff (METRO-18 → METRO-19..22)                       |
| `docs/superpowers/plans/2026-11-03-foundation-hardening.md`  | history   | Foundation Hardening Implementation Plan                                      |
| `docs/superpowers/plans/2026-11-03-metro-11-workspace.md`    | history   | METRO-11 workspace implementation plan                                        |
| `docs/superpowers/plans/2026-11-03-quality-gates.md`         | history   | METRO-12 implementation plan                                                  |
| `docs/templates/plane-ticket.md`                             | template  | [Slice title]                                                                 |
| `docs/templates/specification.md`                            | template  | Settled specification                                                         |
