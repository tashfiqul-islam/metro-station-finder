# ADR-0007: GitHub-canonical release sync to Plane

- Status: Accepted
- Date: 2026-11-04
- Ticket and specification: [release-sync](../specifications/release-sync.md)

## Context

Releases exist in two places: GitHub tags and releases, and Plane releases with release tags and release logs. They must not drift, and publishing must never fake a shipped state or touch work items.

## Decision

- GitHub is canonical. A workflow on `release` events runs a typed, unit-tested script that reads current GitHub state for the tag and reconciles Plane: release, release tag and release log.
- Plane records are matched by name, never duplicated; historical released records are left alone; a planned unreleased record is claimed.
- `released` requires a successful `production` GitHub deployment for the tagged commit; until production exists nothing becomes released.
- The Plane key is a single secret in an approval-gated environment, set on one step, with no cache restored into the job.
- Idempotency uses a content hash kept in the Plane release tag description, because Plane's editor may rewrite stored HTML.

## Consequences

- Hand edits to the Plane release log persist until GitHub's notes change.
- The reverse direction (Plane to GitHub) is a separate decision: an automatic trigger needs either a schedule on the default branch or a webhook receiver.
- The Plane REST paths for workspace-level release patch and tags were taken from the vendor documentation; the live test on a throwaway tag proves them.

## Alternatives considered

Not recorded when this ADR was written; not reconstructed here.

## Confirmation

- `scripts/release-sync.test.ts` and `scripts/release-workflow.test.ts`.
