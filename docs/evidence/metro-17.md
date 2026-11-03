# METRO-17 agent skills configuration evidence

Date: 2026-11-03. Base: d350c4141f13124acc563c26d47038ffa737ad6b (`feature/metro-rebuild`). Scope: documentation routing for installed engineering skills; no product, CI, deployment, Plane schema or default-branch change. Specification: [agent-skills-setup](../specifications/agent-skills-setup.md), revision 2026-11-03-r1.

## Source-to-ticket review

**Confirmed / Tool-verified (Plane connector, 2026-11-03; readbacks are controller observations, not reproducible from the repository):** the Plane Page `4be6fd07-a5b1-414c-b46f-6bc0ecf46393`, the work item `5db7d8f7-eebe-421f-9ba8-aa4c7a2607ec` (METRO-17) and the repository mirror carry the same identity, five criteria (SKL-1 to SKL-5), three seams, scope, exclusions and grouping. Work item: label `area:agents`, module 01 (read back through `module.list_workitems`), milestone Agent guidance and feature-parity baseline accepted (read back through `milestone.list_workitems`), spec Page attached, assignee the owner, release explicitly unassigned. Native blockers: empty list.

Identity lookup: the filtered external-identity request returned 404 (ambiguous), so a complete project listing of nine work items was read; none carried `metro-spec` / `agent-skills-setup/setup`. Creation then proceeded once.

## Decisions

- Tracker is Plane, not GitHub Issues, because [Plane adapter](../agents/plane.md) governs tickets; GitHub is the code host.
- Triage roles map to existing Plane states because Plane forbids a duplicate Ready label and reserves System Triage; no label or state was created. The agent/human split inside Ready lives in the work-item body.
- No `CONTEXT.md`: [reviewed skills](../agents/skills.md) forbid competing canonical `CONTEXT` documents, so the glossary is the vocabulary source. This corrected an earlier draft that pointed skills at a root `CONTEXT.md`.

## Checks

**Controller-reported local runs** (command output not committed; commands reproducible from the repository), on this branch on 2026-11-03 under `mise exec --` (Bun 1.4.4, Node 26.13.0) after `bun run bootstrap` (frozen lockfile):

| Criterion | Check | Result |
| --- | --- | --- |
| SKL-1 | Relative-link resolution over `AGENTS.md`, `issue-tracker.md`, `triage-labels.md`, `domain.md` and the specification mirror; count of `## Agent skills` headings | 0 broken links; exactly 1 section |
| SKL-2/3/4 | Text scan for `gh issue`, label creation and `CONTEXT.md` in `AGENTS.md`, `issue-tracker.md`, `triage-labels.md` and `domain.md` | Only prohibitions match; no instruction to use them |
| SKL-5 | `bun run check` | Format clean (17 files), boundary passed, 80 tests / 134 expectations, five type projects passed |
| SKL-5 | `scripts/verify-metro-preparation.ps1` with reviewed roots | PASS: 30 skill files, 2 tickets |
| SKL-5 | `scripts/test-metro-preparation.ps1` with reviewed roots | PASS: 11 negative cases |

Fail-on-base: base `AGENTS.md` has no Agent skills section and base has no `docs/agents/issue-tracker.md`, so SKL-1 cannot pass on base.

## Review

An independent read-only review (`code-reviewer` agent, 2026-11-03) found six issues, none critical; all were fixed before commit:

- `needs-triage` mapped to reserved System Triage without saying agents may not write it; it is now read-only for agents, with Backlog for new unevaluated items.
- The AFK/HITL split had no named home; it now points to the ticket template's "Evidence and readiness" section.
- `domain.md` allowed an owner-approved `CONTEXT.md` that `skills.md` does not permit; the exception was removed.
- `issue-tracker.md` now flags `workitem_comment` and `pql` as unspecified by the Plane adapter.
- Evidence file lists now name files, and evidence provenance labels distinguish tool-verified readbacks from controller-reported local runs.

## Gaps

**Unknown:** the link and text scans are one-off local commands, not committed gates; repository formatting gates cover JSON, JSONC and TOML only, not Markdown. **Unknown:** no required CI or branch protection exists on `feature/metro-rebuild` (METRO-12 in progress); the PR therefore has no CI evidence. Skill behavior under the new configuration was not exercised end to end; correctness of the mapping rests on the Plane adapter and state list read on 2026-11-03.
