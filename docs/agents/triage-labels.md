# Triage Labels

The skills speak in terms of five canonical triage roles. In Plane these map to project states, not labels: [plane.md](plane.md) forbids duplicating Ready as a label, reserves System Triage, and forbids creating or renaming states. Do not create new labels for these roles.

| Role in mattpocock/skills | Plane equivalent                 | Meaning                                                                                                                                                                                                                   |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `needs-triage`            | System Triage (intake)           | Maintainer needs to evaluate this issue. Reserved and read-only for agents: only the owner or Plane automation places items there; never move, create or rename it. An agent-created, unevaluated item starts in Backlog. |
| `needs-info`              | Specifying state                 | Waiting on reporter/owner for more information. Add a blocked label only if one already exists; explain in a comment.                                                                                                     |
| `ready-for-agent`         | Ready state, body records AFK    | Fully specified, ready for an AFK agent.                                                                                                                                                                                  |
| `ready-for-human`         | Ready state, body records HITL   | Requires human implementation or a human decision.                                                                                                                                                                        |
| `wontfix`                 | Cancelled state + reason comment | Will not be actioned.                                                                                                                                                                                                     |

Both ready roles share the Ready state; no label duplicates Ready. Record the AFK/HITL split from the specification slice's "Review needs" field in the work item's "Evidence and readiness" section ([ticket template](../templates/plane-ticket.md)), e.g. `Implementation mode: AFK`. Resolve state UUIDs with `state.list`; never infer from names. Move to Ready only when authorized and readiness review passes ([plane.md](plane.md)).

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding row above.
