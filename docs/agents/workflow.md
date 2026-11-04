# Workflow

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

## Task preparation

Separate discussion/research, settled specification, ticket preparation and implementation. Research/brainstorm, challenge domain terms against documents, settle spec and testing seams, then create bounded tickets. Superpowers selects process; reviewed Pocock skills deepen it. Inspect available skill files before claiming use. Use [reviewed skills](skills.md), the [Plane adapter](plane.md), [specification template](../templates/specification.md) and [ticket template](../templates/plane-ticket.md). `to-spec`/`to-tickets` are conceptual stages, not installed invocations.

Ready requires linked settled spec/decision, bounded independently verifiable slice, failure/boundary acceptance checks, blocker relations, required tools/data and check plan. Acceptance checks must be able to fail on base. Material unknowns resolved; open blockers keep ticket Backlog. Ready is canonical; no duplicate ready label.

## Execution and review

Backlog captures scope; Specifying settles it; Ready records bounded readiness; explicit task authorization starts work; In Progress is active implementation; In Review carries PR/evidence; Done requires verified merge to main unless the explicit owner exception below applies. Cancelled explains why and links replacement where relevant. Record blocked label, native dependency and explanation while retaining lifecycle state. One active implementation plus one review per agent is policy guidance, not enforced WIP.

Use isolated checkout/worktree when required. Preserve explicit exclusions. Submit one fresh-session outcome per ticket/PR. Record base, head, commands/results, unrun checks, review disposition and remaining gaps. Do not expand into unrelated cleanup.

## Independent review

The earlier rule required "applicable independent review before merge" without defining it. This section is the one definition; the rule is not weaker: review is still required before merge wherever it applied, and now a recorded reviewer is also enforced by CI (see the comparison in the METRO-36 pull request).

**Principle.** A reviewer that shares the author's context and rationale tends to agree with it. Claude Code subagents start with a fresh context window and see only a delegation message, not the parent conversation (Web-verified: <https://code.claude.com/docs/en/sub-agents>, read 2026-11-04).

**The independent reviewer** is an agent or person that:

- has a fresh context and is a different session from the author (a new agent session, not the implementer continuing);
- has read-only tools: it cannot edit, write, run commands or reach the network;
- does not see the implementer's reasoning, summary of intent or earlier conversation, only the ticket or specification, the base and head commits and the committed diff;
- reviews the committed diff against the ticket or specification, using the [review checklist](review-checklist.md);
- reports findings ranked Critical, Important or Minor, each with evidence (file and line), and states what it verified and what it could not verify.

Claude Code binds this to `.claude/agents/independent-reviewer.md` (`tools: Read, Glob, Grep`; Bash is excluded because tool patterns cannot restrict it). The checklist is the tool-neutral source of truth.

**Triage.** Reports are leads, not authority. The orchestrator verifies each finding against the code, then records one disposition per finding: fixed (commit), disproved (with evidence), accepted (with reason and who accepted) or deferred (to a ticket). Critical findings are fixed or disproved before merge; Important findings are fixed, disproved, accepted or deferred with the reason stated. Merge only after the dispositions are recorded and hosted checks are green.

**Record.** Every pull request body has a `Reviewer` section: the agent definition or person, the session or run reference, and the link to the disposition. The `Reviewer record` job in `.github/workflows/quality.yml` is part of `Quality gates` and fails an empty, placeholder or link-only value (logic and cases in `scripts/reviewer-record.ts`). The body is untrusted input and reaches the script only through an environment variable (<https://docs.github.com/en/actions/reference/security/secure-use>, read 2026-11-04).

**Docs-only and trivial changes.** A change whose every file is markdown under `docs/` or at the repository root may write `none (docs only)` in `Reviewer`; CI accepts the marker only for such changes. Docs-only is the one case where review is not applicable, and it is not a waiver for rules text: such a pull request still needs a green `Quality gates` and the owner directs the merge. Any change touching code, workflows, scripts, configuration, templates or `.claude/` needs a recorded independent reviewer, however small. Typos in code are not exempt.

**Current default and open decision.** Today the default is an agent reviewer plus hosted checks, and the owner directs merges. Open decision (not made here): whether the human owner must also review every pull request. Until decided, no pull request is blocked on owner review beyond directing the merge.

## Integration exception

Owner currently requires ticket PRs target `feature/metro-rebuild`. Merge only under explicit ticket authorization. For the authorized rebuild tickets, the owner permits Done after verified merge to `feature/metro-rebuild`, required CI and resolved applicable review. This overrides the source guide main-only rule for those tickets. Native Merged-to-Done automation cannot check PR base or CI; flag/reconcile premature state transitions rather than redefine Done. METRO-11 prepares main from reviewed independent rebuild lineage. Default stays unchanged until v1.0.0 is fully ready to release; follow the [release-time transition](../development.md#release-time-branch-transition). Master removal remains separately authorized.

Done does not mean released. Release assignment records intended shipping; GitHub tag/release SHA plus deployment/smoke evidence establishes shipping. See [maintenance](maintenance.md) and [quality gates](quality-gates.md).

Source: supplied Metro operating guide (144aa09c-cd9a-4ce6-9161-a28826bb405b) and bootstrap specification (e1defa37-c65c-430e-8a8b-5f8d0f7fffe3), captured in [evidence](../evidence/metro-8.md).
