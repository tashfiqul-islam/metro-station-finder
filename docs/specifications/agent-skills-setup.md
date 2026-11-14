# Agent skills configuration specification

Source: Plane Page 4be6fd07-a5b1-414c-b46f-6bc0ecf46393, project 1ab13b1b-d537-4524-8f18-45ee42262dc4. Retrieved 2026-11-03. METRO-17: 5db7d8f7-eebe-421f-9ba8-aa4c7a2607ec. Read-only mirror; remote operation/status evidence belongs to the controller.

Identity: agent-skills-setup. Immutable revision: 2026-11-03-r1. Decision owner: Tashfiqul Islam; requested the setup, tracker, label and domain-doc choices in this chat on 2026-11-03 (Plane as tracker, state-based triage mapping, single-context domain docs).

## Research

**Repo-verified:** the repository remote is GitHub, and the [tracker guide](../agents/tracker.md) makes GitHub issues in `metro-station-finder/planning` the tracker. Status is a project field, there is no duplicate Ready label, and the Status options are fixed. [Reviewed skills](../agents/skills.md) forbid competing canonical `CONTEXT` documents; [the glossary](../product/glossary.md) is canonical. No `CONTEXT.md`, `docs/adr` or `CLAUDE.md` existed, so `AGENTS.md` is the instruction file edited.

## Problem and outcome

The installed Pocock engineering skills (`to-issues`, `to-prd`, `triage`, `diagnose`, `tdd`, `improve-codebase-architecture`) assume GitHub issues, default triage labels and a root `CONTEXT.md`. Without per-repo configuration they would call `gh issue`, create duplicate labels and invent competing domain documents. Outcome: a documented, link-checked configuration that routes them to GitHub issues in the planning repo, project Status and the existing glossary.

## Scope

An Agent skills section in `AGENTS.md` linking three new documents under `docs/agents`: `issue-tracker.md` (Plane operations and write-authorization rule), `triage-labels.md` (five triage roles mapped to Plane states, no new labels) and `domain.md` (single-context layout; glossary and parity are the vocabulary source). This mirror and METRO-17 evidence. Amended by METRO-86 (2026-11-06): those three documents were merged into `plane.md` (tracker operations and triage roles) and `skills.md` (single-context domain rules); the `AGENTS.md` Agent skills section links them there and the behavior is unchanged. Amended by planning#152 (2026-11-15): Plane was retired on 2026-11-11; plane.md was replaced by tracker.md, which holds tracker operations and the triage roles; behavior is otherwise unchanged.

## Exclusions

No Plane state, label, module or workspace changes. No `CONTEXT.md` or ADR creation. No skill installation or change to the skill lock. No permission, contract, gate-policy, CI, product or default-branch change.

## Acceptance

- SKL-1: Given AGENTS.md, when a reader follows the Agent skills section, then each of the three linked documents exists, every relative link resolves, and the section appears exactly once.
- SKL-2: Given the triage role table, when each of the five roles is looked up, then it maps to a project Status: Backlog (`needs-triage`), Specifying plus `blocked` (`needs-info`), Ready with Mode AFK (`ready-for-agent`), Ready with Mode HITL (`ready-for-human`), Cancelled (`wontfix`), and no document asks for a new label or Status option.
- SKL-3: Given the issue tracker document, when a skill needs to publish, then it directs to the tracker guide and `gh issue` (or the GitHub MCP connector) against `metro-station-finder/planning`, states that writes need explicit authorization, and no Plane instruction remains.
- SKL-4: Given the domain document, when a skill needs vocabulary or ADRs, then it reads docs/product/glossary.md, feature-parity.md and docs/adr if present, and does not create a competing canonical CONTEXT document.
- SKL-5: Given the completed branch, when the existing check and preparation validator run, then they still pass; the PR targets feature/metro-rebuild and the default branch is unchanged.

## Testing seams

- SKL-S1: link and anchor resolution over AGENTS.md and docs/agents (SKL-1).
- SKL-S2: text search for forbidden instructions and Status names against the project's Status options (SKL-2/3/4).
- SKL-S3: `bun run check` and `scripts/verify-metro-preparation.ps1` (SKL-5).

Documentation-only: checks fail on base because the section and documents do not exist.

## Grouping and readiness

Module 01 Agent governance and specifications (3b25e001-554b-4b49-a222-bca99fb9ea2a); milestone Agent guidance and feature-parity baseline accepted (aa088bdc-4e40-49b6-9bb4-a19bd7422179); release unassigned (documentation does not establish shipping). Blockers: none. Open decisions: none. AFK implementation and merge to `feature/metro-rebuild` authorized by the owner in this chat.
