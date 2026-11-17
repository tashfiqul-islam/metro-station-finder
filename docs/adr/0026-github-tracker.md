# ADR-0026: GitHub issues and the Metro project as the tracker

- Status: Accepted
- Date: 2026-11-15
- Ticket and specification: metro-station-finder/planning#152, none (decision record)

## Context

[ADR-0001](0001-foundation-baseline.md) decision 6 chose Plane as the issue tracker. The Plane trial ended on 2026-11-11 and the owner would not pay for it. Tracking moved on 2026-11-11 to the private repository `metro-station-finder/planning` in the free organization `metro-station-finder` (planning#151, tashfiqul-islam/metro-station-finder#140).

The migration (tools and mapping in `tools/migration/` of the planning repository) created issues 1-137 from Plane (7 of them closed placeholders that keep Plane numbering), Initiatives #138-142 and Epics #143-150, with 112 comments, 21 blocked-by links, the hierarchy, labels and fields. Its verifier reported 0 problems. These counts are copied from the settled ticket planning#152; the migration tools live in the private planning repository and were not re-run for this ADR.

A project on the personal account was rejected because personal accounts get no issue types or issue fields (tested before the move).

## Decision

We will keep tickets as GitHub issues in `metro-station-finder/planning`, with issue types Initiative, Epic, Task and Bug, sub-issues, native blocked-by links and the organization issue fields Initiative, Module, Release, Mode, Spec, Priority, Effort, Start date and Target date. They are tracked in the organization project Metro (number 1), whose Status is the workflow state. The code repository holds code only.

Pull requests move Status through `.github/workflows/tracker-sync.yml` and the GitHub App `metro-tracker-sync` (planning#153). The [tracker guide](../agents/tracker.md) is the operating manual. This supersedes decision 6 of ADR-0001.

## Consequences

- One host for code and tickets. `gh` and the GitHub MCP connector work without a Plane connector.
- The connector has no project tools, so Status writes go through `gh`.
- Closing keywords do not act across repositories, hence the sync workflow.
- The repository transfer to the organization and the release flow are decided separately before v1.0.0. The release flow is still Plane-based: `release-sync.yml`, `release-draft.yml`, [ADR-0007](0007-release-sync.md) and [ADR-0008](0008-default-branch-switch.md) items 9 and 13.

## Alternatives considered

- Stay on Plane on a paid plan. Rejected for cost; the owner wants no new paid service.
- GitHub Projects on the personal account. Rejected: no issue types or issue fields.
- Another vendor such as Linear or Jira. Rejected: a second host and connector for no gain.

## Confirmation

- `scripts/gates/base-branch.ts` (`branches:check`) reads `docs/agents/tracker.md`.
- `scripts/gates/routing.test.ts` routes ticket triggers to the tracker guide.
- `scripts/ci/tracker-sync.test.ts` and `scripts/ci/tracker-sync-workflow.test.ts` test the status sync.
- The rest is `None (policy)`.
