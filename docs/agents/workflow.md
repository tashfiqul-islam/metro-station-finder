# Workflow

## Task preparation

Separate discussion/research, settled specification, ticket preparation and implementation. Research/brainstorm, challenge domain terms against documents, settle spec and testing seams, then create bounded tickets. Superpowers selects process; reviewed Pocock skills deepen it. Inspect available skill files before claiming use. The supplied operating guide records to-spec/to-tickets as unavailable; reviewed setup belongs to METRO-10. Do not substitute an invented invocation.

Ready requires linked settled spec/decision, bounded independently verifiable slice, failure/boundary acceptance checks, blocker relations, required tools/data and check plan. Acceptance checks must be able to fail on base. Material unknowns resolved; open blockers keep ticket Backlog. Ready is canonical; no duplicate ready label.

## Execution and review

Backlog captures scope; Specifying settles it; Ready authorizes bounded work; In Progress is active implementation; In Review carries PR/evidence; Done requires verified merge to main. Cancelled explains why and links replacement where relevant. Record blocked label, native dependency and explanation while retaining lifecycle state. One active implementation plus one review per agent is policy guidance, not enforced WIP.

Use isolated checkout/worktree when required. Preserve explicit exclusions. Submit one fresh-session outcome per ticket/PR. Record base, head, commands/results, unrun checks, review disposition and remaining gaps. Do not expand into unrelated cleanup.

## Integration exception

Owner currently requires ticket PRs target `feature/metro-rebuild`. Do not merge, change default branch or delete master under this documentation task. Integration merge alone does **not** satisfy canonical Done: required CI, resolved applicable review and merge to main remain required. Native Merged-to-Done automation cannot check PR base or CI; flag/reconcile premature state transitions rather than redefine Done. Default migration/protection belongs to METRO-11.

Done does not mean released. Release assignment records intended shipping; GitHub tag/release SHA plus deployment/smoke evidence establishes shipping. See [maintenance](maintenance.md) and [quality gates](quality-gates.md).

Source: supplied Metro operating guide (144aa09c-cd9a-4ce6-9161-a28826bb405b) and bootstrap specification (e1defa37-c65c-430e-8a8b-5f8d0f7fffe3), captured in [evidence](../evidence/metro-8.md).
