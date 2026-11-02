# [Slice title]

Preparation only. Do not publish or implement without the relevant authorization.

- Stable identity: external_source `metro-spec`; external_id `[specification ID]/[slice ID]`
- Specification: [canonical Page URL + immutable revision]
- Slice ID: [source ID]
- Outcome: [copy source observable outcome]
- Scope: [copy every included behavior]
- Exclusions: [copy every exclusion]
- State: [existing native state UUID; Backlog while blockers remain]
- Module: [native module UUID and URL]
- Milestone: [native milestone UUID and URL]
- Release: [native release UUID and URL, or explicit unassigned decision]
- Required tools/data: [availability, fixtures, access]

## Acceptance criteria

Copy each source criterion ID and complete Given/When/Then text. Preserve each failure/boundary check and expected result; do not replace them with a summary or a link alone.

## Testing seams and check plan

Copy each source seam ID, boundary, fixture and checks. Map each criterion to observable evidence and the command/manual procedure that can fail on base. Record unavailable checks as gaps; do not invent commands.

## Native blockers

List source blocker slice IDs and reasons. After authorization and identity reconciliation, resolve to work-item UUIDs and create `blocked_by` from this dependent to those blockers. Read back both ends. Text alone is insufficient. No blockers means an explicit empty list.

## Evidence and readiness

Record source revision, source-to-ticket field review, check plan, material unknowns, reviewer and decision. Ready uses the native state, never a duplicate label. Readiness is separate from dispatch/implementation authorization. Follow the [Plane adapter](../agents/plane.md) for safe retries, membership operations and the operation ledger.
