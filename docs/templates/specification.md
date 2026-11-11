# Settled specification

Preparation only. Approval of this document does not authorize tracker writes, dispatch or implementation. Replace every bracketed field before readiness review.

- Identity: [stable specification ID; never reuse for another specification]
- Revision: [immutable revision or repository SHA]
- Source: [repository path of the settled spec; immutable revision (path@SHA)]
- Decision owner and approval: [who approved what, date and evidence]
- Research: [sources, observed facts, inferences and unresolved questions]
- Domain: [links to canonical glossary, parity requirements and applicable ADRs]
- Problem and intended outcome: [user-visible result]
- Scope: [explicit included behavior]
- Exclusions: [explicit excluded behavior]
- Constraints and contracts: [inputs, outputs, permissions, data and failure behavior]
- Grouping: module [URL/UUID]; milestone [URL/UUID]; release [URL/UUID or explicit unassigned decision]
- Open decisions: [resolve material unknowns before Ready]

## Slice [stable slice ID]

Repeat for each bounded, independently verifiable vertical slice. Split by observable outcome, not implementation layer.

- Title and outcome: [concrete behavior]
- Scope: [included behavior for this slice]
- Exclusions: [excluded behavior for this slice]
- Blocked by: [stable slice IDs; empty list if none; explain reason]
- Required tools/data: [available fixtures, access and contracts]
- Acceptance [stable criterion ID]: Given [state], when [action], then [observable result].
- Failure/boundary checks: [specific bad input, denied operation or boundary and expected visible behavior]
- Testing seam [stable seam ID]: [public contract/boundary under test]
- Fixture: [deterministic setup/input and expected output]
- Check plan: [exact check and criterion mapping; explain how it fails on base]
- Review needs: [HITL decisions or AFK execution, with reasons]

## Readiness record

[Reviewer, reviewed revision, unresolved blockers, acceptance-to-seam mapping and disposition.] Preserve all slice criteria, failure checks, testing seams and blockers in prepared tickets. Use the [tracker](../agents/tracker.md) for authorized ticket creation and reconciliation. Use the [local example](../examples/plane-preparation/README.md) to exercise preservation; it does not evaluate research quality or authorize Ready.
