# Workflow

## Task preparation

Separate discussion/research, settled specification, ticket preparation and implementation. Research/brainstorm, challenge domain terms against documents, settle spec and testing seams, then create bounded tickets. Superpowers selects process; reviewed Pocock skills deepen it. Inspect available skill files before claiming use. Use [reviewed skills](skills.md), the [Plane adapter](plane.md), [specification template](../templates/specification.md) and [ticket template](../templates/plane-ticket.md). `to-spec`/`to-tickets` are conceptual stages, not installed invocations.

Ready requires linked settled spec/decision, bounded independently verifiable slice, failure/boundary acceptance checks, blocker relations, required tools/data and check plan. Acceptance checks must be able to fail on base. Material unknowns resolved; open blockers keep ticket Backlog. Ready is canonical; no duplicate ready label.

## Execution and review

Backlog captures scope; Specifying settles it; Ready records bounded readiness; explicit task authorization starts work; In Progress is active implementation; In Review carries PR/evidence; Done requires verified merge to main unless the explicit owner exception below applies. Cancelled explains why and links replacement where relevant. Record blocked label, native dependency and explanation while retaining lifecycle state. One active implementation plus one review per agent is policy guidance, not enforced WIP.

Use isolated checkout/worktree when required. Preserve explicit exclusions. Submit one fresh-session outcome per ticket/PR. Record base, head, commands/results, unrun checks, review disposition and remaining gaps. Do not expand into unrelated cleanup. Attribute agent commits and pull requests as the [attribution policy](attribution.md) says (`Co-Authored-By` trailer, Claude Code footer, never `Signed-off-by`).

## Independent review

The earlier rule required "applicable independent review before merge" without defining it. This section is the one definition; the rule is not weaker: review is still required before merge wherever it applied, and now a recorded reviewer is also checked by CI (a required status check on both rulesets, see Enforcement status below).

**Principle.** A reviewer that shares the author's context and rationale tends to agree with it. Claude Code subagents start with a fresh context window and see only a delegation message, not the parent conversation (Web-verified: <https://code.claude.com/docs/en/sub-agents>, read 2026-11-04).

**The independent reviewer** is an agent or person that:

- has a fresh context and is a different session from the author (a new agent session, not the implementer continuing);
- has read-only tools: it cannot edit, write, run commands or reach the network;
- does not see the implementer's reasoning, summary of intent or earlier conversation, only the ticket or specification, the base and head commits and the committed diff;
- reviews the committed diff against the ticket or specification, using the [review checklist](review-checklist.md);
- reports findings ranked Critical, Important or Minor, each with evidence (file and line), and states what it verified and what it could not verify.

Claude Code binds this to `.claude/agents/independent-reviewer.md` (`tools: Read, Glob, Grep`; Bash is excluded because tool patterns cannot restrict it). The checklist is the tool-neutral source of truth.

**Triage.** Reports are leads, not authority. The orchestrator verifies each finding against the code, then records one disposition per finding: fixed (commit), disproved (with evidence), accepted (with reason and who accepted) or deferred (to a ticket). Critical findings are fixed or disproved before merge; Important findings are fixed, disproved, accepted or deferred with the reason stated. Merge only after the dispositions are recorded and hosted checks are green.

**Record.** Every pull request body has a `Reviewer` section: the agent definition or person, the session or run reference, and the link to the disposition. The `Reviewer record` check (`.github/workflows/reviewer-record.yml`, logic and cases in `scripts/reviewer-record.ts`) proves only that the section is present, is not a placeholder (for example "pending", "TBD", "to be recorded", "n/a") and carries a reference a reader can follow: a URL, a `#<number>` pull request or comment reference, or a `session:` / `run:` token, plus identity text. It cannot prove that a review happened; the linked reviewer output and disposition are the evidence. Parsing rules: HTML comments are ignored, CRLF bodies from the web UI are read, the section ends at a heading of the same or higher level (sub-headings stay inside), headings in fenced code are ignored, the first non-empty `Reviewer` section wins, and Setext (underlined) headings are not supported. A body over 32768 characters fails with a clear message because it cannot be passed safely as one environment string. The body is untrusted input and reaches the script only through an environment variable (<https://docs.github.com/en/actions/reference/security/secure-use>, read 2026-11-04). A renamed file counts as both its old and new path, so moving code into `docs/` is still a code change.

**Enforcement status.** The check lives in its own workflow, not in `quality.yml`, because it must re-run when the pull request body is edited (`edited` trigger) and `quality.yml` cancels in-flight runs, including the Cloudflare preview deploy, when a new run starts. Re-running an old workflow run reuses its original event payload, so it checks a stale body; editing the body starts a fresh run with the new text. Both rulesets, `feature/metro-rebuild` (26426527) and `main` (26467450), require both status checks, `Quality gates` and `Reviewer record` (GitHub Actions, integration 15368), so a failing or missing `Reviewer record` blocks merge exactly as a failing `Quality gates` does. A pull request body therefore needs a `## Reviewer` section carrying a reference (a URL, a `#<number>` reference, or a `session:` / `run:` token) before it can merge.

**Docs-only and trivial changes.** A change whose every file is markdown under `docs/` or at the repository root may write `none (docs only)` in `Reviewer`; CI accepts the marker only for such changes. Docs-only is the one case where review is not applicable, and it is not a waiver for rules text: such a pull request still needs a green `Quality gates` and the owner directs the merge. Any change touching code, workflows, scripts, configuration, templates or `.claude/` needs a recorded independent reviewer, however small. Typos in code are not exempt.

**Current default and open decision.** Today the default is an agent reviewer plus hosted checks, and the owner directs merges. Open decision (not made here): whether the human owner must also review every pull request. Until decided, no pull request is blocked on owner review beyond directing the merge.

## Integration exception

Owner currently requires ticket PRs target `feature/metro-rebuild`. Merge only under explicit ticket authorization. For the authorized rebuild tickets, the owner permits Done after verified merge to `feature/metro-rebuild`, required CI and resolved applicable review. This overrides the source guide main-only rule for those tickets. Native Merged-to-Done automation cannot check PR base or CI; flag/reconcile premature state transitions rather than redefine Done. METRO-11 prepares main from reviewed independent rebuild lineage. Default stays unchanged until v1.0.0 is fully ready to release; follow the [release-time transition](../development.md#release-time-branch-transition) as planned in [ADR-0008](../adr/0008-default-branch-switch.md) and the [cutover runbook](cutover-runbook.md). Master removal remains separately authorized. The base branch named here changes to `main` only at [cutover runbook](cutover-runbook.md) step 6.4, in the same reviewed edit as CONTRIBUTING.md and plane.md (`branches:check` fails if only some change).

Done does not mean released. Release assignment records intended shipping; GitHub tag/release SHA plus deployment/smoke evidence establishes shipping. See [maintenance](maintenance.md) and [quality gates](quality-gates.md).

Source: supplied Metro operating guide (144aa09c-cd9a-4ce6-9161-a28826bb405b) and bootstrap specification (e1defa37-c65c-430e-8a8b-5f8d0f7fffe3), captured in [evidence](../evidence/metro-8.md).
