# METRO-10 Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make researched specifications reproducibly preparable as independent Plane tickets without publishing sample tickets or starting implementation.

**Architecture:** Repository guidance owns the Plane adapter; reviewed installed skills supply process and requirements techniques. Content pins and a local dry run prove lookup and field preservation without global tool changes or tracker writes.

**Tech Stack:** Markdown, JSON and dependency-free PowerShell validation; no application scaffold.

**Spec:** [METRO-10](https://app.plane.so/metro-station-finder/browse/METRO-10/) and its linked operating guide/bootstrap specification. Ticket acceptance text is captured in the task brief for review.

## Global Constraints

- Start from independent root `68ade0727739fd9d16dc7997178a867af678d4eb`; no master ancestry, product code or scaffold.
- Preserve scope, acceptance criteria, blockers and testing seams from source specification to ticket preparation.
- Use actual installed skill names; record exact reviewed content revisions and honest provenance limits. No global skill installation or update in this ticket.
- Superpowers owns workflow; Pocock skills deepen it. Preparation does not authorize dispatch, implementation or publishing.
- Dry run is local only: no sample Plane tickets, pages, links or state mutations.
- User authorized this ticket's implementation, review, PR merge into `feature/metro-rebuild`, Done and ticket branch deletion; main/default migration is owned by METRO-11; no migration in METRO-10.
- PowerShell on Windows; fail visibly on missing inputs or drift. No fallback code or weakened tests.

## Review Focus

- Missing or changed skill files must fail lookup rather than pass on a version label.
- Missing acceptance criteria or testing seams must fail dry-run verification.
- Unknown, reversed or cyclic blocker references must not become publishable dependencies.
- A retry after partial publishing must reconcile stable identity before any create, never blindly duplicate.
- Repository guidance must distinguish preparation authorization, implementation authorization, integration Done and release.

## Task 1: Deliver reviewed skill and Plane preparation contract

**Files:**

- Create `docs/agents/skills.md`, `docs/agents/plane.md`, `docs/agents/skills.lock.json`.
- Create `docs/templates/specification.md`, `docs/templates/plane-ticket.md`.
- Create `docs/examples/plane-preparation/source.json`, `tickets.json`, `README.md`.
- Create `scripts/verify-metro-preparation.ps1` and focused negative-case checks if executable transformation requires them.
- Create `docs/evidence/metro-10.md`.
- Modify `AGENTS.md`, `docs/agents/workflow.md`, `docs/agents/quality-gates.md`, and `README.md` only where routing/status/setup statements need reconciliation.

**Interfaces:**

- Consumes: METRO-10 acceptance, installed skill files and provider tool definitions, existing operating guide and bootstrap specification.
- Produces: explicit read triggers; content-hash lock with configurable roots; documented install/update/review procedure; Plane page/work-item/native blocker/state/module/milestone/release mapping; source-to-ticket dry run with stable identities and traceable checks.

- [x] Read governing docs, actual skill contents/provenance and Plane tool schemas. Check Context7 then official sources for uncovered current guidance. Record what each source proves; do not infer compatibility from labels.
- [x] Document the reviewed skill set and hashes, actual triggers and adapter boundaries. Explain absence/presence of `to-spec` and `to-tickets` and how preparation works with available names.
- [x] Write specification/ticket templates and a bounded synthetic source with at least two independently verifiable tickets, one native blocker, explicit acceptance and failure checks, agreed testing seams and grouping links.
- [x] Implement a local validator that compares source and prepared fields, checks identities/blocker graph and validates installed content hashes via explicit roots. Add negative checks for omitted criteria/seams, unknown or cyclic blockers and hash drift. No network writes.
- [x] Document safe publishing/retry procedure using actual Plane operations, preserving partial progress and stopping on ambiguity. Reconcile read triggers and owner-authorized integration policy.
- [x] Run lookup, dry-run and negative checks; check Markdown links and `git diff --check`. Record exact commands, results, source links and limits in evidence.
- [x] Self-review; signed commit. Independent task review and whole-branch review precede PR/merge.
