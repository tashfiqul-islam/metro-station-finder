# Workflow

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

## Task preparation

Separate discussion/research, settled specification, ticket preparation and implementation. Research/brainstorm, challenge domain terms against documents, settle spec and testing seams, then create bounded tickets. Superpowers selects process; reviewed Pocock skills deepen it. Inspect available skill files before claiming use. Use [reviewed skills](skills.md), the [Plane adapter](plane.md), [specification template](../templates/specification.md) and [ticket template](../templates/plane-ticket.md). `to-spec`/`to-tickets` are conceptual stages, not installed invocations.

Ready requires linked settled spec/decision, bounded independently verifiable slice, failure/boundary acceptance checks, blocker relations, required tools/data and check plan. Acceptance checks must be able to fail on base. Material unknowns resolved; open blockers keep ticket Backlog. Ready is canonical; no duplicate ready label.

## Execution and review

Backlog captures scope; Specifying settles it; Ready records bounded readiness; explicit task authorization starts work; In Progress is active implementation; In Review carries PR/evidence; Done requires verified merge to main unless the explicit owner exception below applies. Cancelled explains why and links replacement where relevant. Record blocked label, native dependency and explanation while retaining lifecycle state. One active implementation plus one review per agent is policy guidance, not enforced WIP.

Use isolated checkout/worktree when required. Preserve explicit exclusions. Submit one fresh-session outcome per ticket/PR. Record base, head, commands/results, unrun checks, review disposition and remaining gaps. Do not expand into unrelated cleanup.

## Integration exception

Owner currently requires ticket PRs target `feature/metro-rebuild`. Merge only under explicit ticket authorization. For the authorized rebuild tickets, the owner permits Done after verified merge to `feature/metro-rebuild`, required CI and resolved applicable review. This overrides the source guide main-only rule for those tickets. Native Merged-to-Done automation cannot check PR base or CI; flag/reconcile premature state transitions rather than redefine Done. METRO-11 prepares main from reviewed independent rebuild lineage. Default stays unchanged until v1.0.0 is fully ready to release; follow the [release-time transition](../development.md#release-time-branch-transition). Master removal remains separately authorized.

Done does not mean released. Release assignment records intended shipping; GitHub tag/release SHA plus deployment/smoke evidence establishes shipping. See [maintenance](maintenance.md) and [quality gates](quality-gates.md).

Source: supplied Metro operating guide (144aa09c-cd9a-4ce6-9161-a28826bb405b) and bootstrap specification (e1defa37-c65c-430e-8a8b-5f8d0f7fffe3), captured in [evidence](../evidence/metro-8.md).
