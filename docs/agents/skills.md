# Reviewed skills

Read when: choosing a process skill, preparing a specification or tickets, or changing the installed skill set or its lock.

## Rules

- Select process first (`superpowers:using-superpowers`), then inspect this repository's instructions. Read the actual installed skill files before relying on them; passing hashes does not prove a process was followed. Superpowers selects process; reviewed Pocock skills deepen it.
- `to-spec` and `to-tickets` are conceptual stages, not installed skills. Use `to-prd` for specification synthesis and `to-issues` for slicing, with the [Plane adapter](plane.md). Plane Pages replace GitHub issue publication; Ready is the canonical state, not a `ready-for-agent` label. A prepared AFK slice still needs implementation authorization and never launches agents by itself.
- Triggers and Metro boundaries:

  - Creative feature or design: `brainstorming`. Settle design before implementation; preparation is not approval.
  - Isolation: `using-git-worktrees`. Reuse a suitable checkout; keep independent rebuild lineage.
  - Approved multi-step spec: `writing-plans`. Record a bounded plan and verification.
  - Authorized plan execution: `subagent-driven-development`. The controller dispatches implementer, spec review and quality review; the implementer does not spawn. No dispatch from ticket preparation.
  - Behavior work: `test-driven-development`. Failing behavior check first; keep agreed seams.
  - Failure or bug: `systematic-debugging`. Establish cause before patching.
  - Completion or review: `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `finishing-a-development-branch`. Fresh evidence, [independent review](workflow.md#independent-review), authorized integration only.
  - Requirements unclear: `grill-me`. Explore evidence, one question at a time, no implicit edit.
  - Domain language or decisions: `grill-with-docs`. Use the [glossary](../product/glossary.md), [parity](../product/feature-parity.md) and ADRs. Create no competing `CONTEXT.md`; the glossary is canonical. Write nothing during read-only discussion.
  - Research into spec: `to-prd`. [Specification template](../templates/specification.md).
  - Slice preparation: `to-issues`. [Ticket template](../templates/plane-ticket.md); keep HITL or AFK, vertical outcomes and blockers; local draft until publishing is authorized.
  - Readiness: `triage`. Plane lifecycle and blocker rules; keep any AI-authorship disclosure on posted content.

- Domain docs are single-context: skills read the glossary, parity doc and the ADRs that touch the area. A missing optional file is not reported. Use glossary terms in names, titles and tests. If a needed term is missing, report the gap rather than coining one. If output contradicts an ADR, say so explicitly.
- `docs/agents/skills.lock.json` pins 35 reviewed files by SHA256 for `claude-code`. Installing or updating skills is a separate authorized environment change; never overwrite shared skills to pass the lock. Read changed instructions and supporting files, compare process ownership, Plane publication rules and vocabulary, update the lock only after review (uppercase SHA256 from `Get-FileHash -Algorithm SHA256`), review the lock diff with the behavior change, and never auto-regenerate pins to silence drift. A newly required supporting file is read, reviewed and pinned first. Before any install or update, inventory existing locations and metadata and save the reviewed files and metadata outside the product tree for rollback. Record commands and results; restore the saved content if adoption fails and rerun the hashes. Do not claim a rollback was tested unless it was.
- Verify with `scripts/verify-metro-preparation.ps1 -SkillRoots $roots` and `scripts/test-metro-preparation.ps1 -SkillRoots $roots` (PowerShell 7; supply the real installation roots for `superpowers`, `pocock` and `tooling`). A missing root or file, path escape or changed byte stops validation.

## Enforced by

- `scripts/docs-drift.test.ts`: fails if the lock loses `agent: claude-code`, names a Codex path or a user home path.
- `scripts/verify-metro-preparation.ps1`: fails on missing, escaped or changed files. Fix the install or review and re-pin; do not edit the check.

## Read more

- [Moved skills detail](../evidence/metro-86-moved-skills.md): provenance limits, the dated install route, the lookup roots used on the reviewed machine.
- [METRO-10 evidence](../evidence/metro-10.md), [METRO-11 evidence](../evidence/metro-11.md), [agent-skills-setup](../specifications/agent-skills-setup.md).
