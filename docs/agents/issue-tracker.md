# Issue tracker: Plane

Issues and PRDs for this repo live as Plane work items (workspace `metro-station-finder`, project METRO, UUID `1ab13b1b-d537-4524-8f18-45ee42262dc4`). GitHub is the code host only (PRs, branches); do not use `gh issue` for tickets.

Operate through the connected Plane MCP tools (`workitem`, `workitem_comment`, `workitem_relation`, `state`, `label`, `page`, ...). Inspect the live tool schema before calling; schemas may change.

The full adapter (identity, idempotency, publish/retry rules, state flow) is [plane.md](plane.md). Read it before any write. Key points:

- Use full UUIDs for API arguments; `METRO-10`-style display IDs resolve via `workitem.retrieve_by_identifier`.
- Stable identity: `external_source = metro-spec`, `external_id = <specification-id>/<slice-id>`. Search with both fields (include archived, follow all cursors) before creating. Never retry a create blindly.
- Create new work in Backlog or Specifying first; move to Ready only when authorized and readiness checks pass.
- Dependencies are native `blocked_by` relations, not body links or `relates_to`.
- Ticket body follows [the ticket template](../templates/plane-ticket.md); specs follow [the specification template](../templates/specification.md).

## Conventions

Action names below follow the connected tools as inspected on 2026-11-03; `workitem_comment` and the `pql` filter are not specified by [plane.md](plane.md), so verify them against the live schema before use.

- **Create an issue**: `workitem.create` with project UUID, `name`, `description_html`, state UUID, `external_source`, `external_id`.
- **Read an issue**: `workitem.retrieve_by_identifier` (display ID) or `workitem.retrieve` (UUID), plus `workitem_comment` list for comments.
- **List issues**: `workitem.list` with project UUID and `pql` filter; follow cursors.
- **Comment**: `workitem_comment` create.
- **Change state**: `state.list` for the UUID, then `workitem.update`.
- **Labels**: `label` tool; follow the taxonomy and rules in [plane.md](plane.md#labels). Exactly one `area:*` label per new work item; do not invent labels.
- **Close**: move to Done (needs acceptance evidence per [workflow](workflow.md)) or Cancelled with a reason comment.

## When a skill says "publish to the issue tracker"

Create a Plane work item per the rules above. [plane.md](plane.md) authorizes no writes: obtain explicit authorization naming the spec, slices and external writes first.

## When a skill says "fetch the relevant ticket"

Retrieve the work item (and its comments, relations and attached Pages) via the Plane tools.
