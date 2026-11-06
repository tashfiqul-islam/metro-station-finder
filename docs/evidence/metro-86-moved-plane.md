# METRO-86 moved text: Plane adapter, issue tracker and triage labels

Moved from docs/agents/plane.md, issue-tracker.md and triage-labels.md at revision db8d5e5 on 2026-11-06 (METRO-86). Repo-verified: the text below is copied unchanged from that revision; nothing was reworded, so its original dates, labels (Confirmed, Repo-verified, Web-verified, Unverified) and ticket references keep their original meaning. The rules in force live in [plane.md](../agents/plane.md). Frozen after this ticket.

## From plane.md, lines 3-3

**Confirmed / Repo-verified:** this adapter is based on the connected Plane tool schemas read on 2026-11-02 and project guide/spec pages. [Evidence](metro-10.md) records sources and limits. Tools may change: inspect their live schema before publishing. This document authorizes no writes. Research → settled spec → approved slices → authorized publishing → readiness review → separately authorized implementation. No parallel dispatch is implied.

## From plane.md, lines 13-30

Names below are actions of the connected `plane` tools, not invented CLI commands.

| Need                  | Operation and preservation rules                                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read/create spec      | `page.retrieve` / `page.create`, `project_id`, `name`, `description_html`; use `parent_id` OR `collection_id` if applicable, never both. Parent fixed at creation. Record returned UUID/URL.                                                                                                      |
| Revise spec           | Retrieve before `page.update`; body replacement must preserve existing content and reviewed source revision. Do not overwrite concurrent edits.                                                                                                                                                   |
| Attach spec to ticket | `page.list_workitem_pages`, then `page.attach_to_workitem` with project/work-item/page IDs if absent. Detach uses the returned work-item-page link ID, not Page UUID.                                                                                                                             |
| Create ticket         | `workitem.create` with project UUID, `name`, `description_html`, state UUID, `external_source`, `external_id`. Body uses [ticket template](../templates/plane-ticket.md). Update preserves omitted fields; HTML wins over stripped text.                                                          |
| Native dependency     | `workitem_relation.list` / `list_definitions`, then `create` on the **dependent** work item with `relation_type: blocked_by` and `workitem_ids: [blockerUuid]`. Read back both endpoints: dependent blocked_by blocker; blocker blocking dependent. Body links alone do not implement dependency. |
| State                 | `state.list` in project; match agreed names and use returned UUID in work-item create/update. Backlog → Specifying → Ready → In Progress → In Review → Done; Cancelled explains disposition. Do not create/rename states or duplicate Ready as a label. System Triage is reserved.                |
| Module                | Resolve existing module; `module.manage_workitems` with project/module IDs and `add_ids`; verify `list_workitems`. Module membership is separate from create-ticket body.                                                                                                                         |
| Milestone             | Resolve existing milestone; `milestone.manage_workitems` with project/milestone IDs and `add_ids`; verify `list_workitems`. Preserve intended target/date and source link.                                                                                                                        |
| Release               | Resolve workspace release; `release.manage_workitems` with release ID and `add_ids`; verify `list_workitems`. Release is workspace scoped. `release_date` maps to UI Target date; distinct hidden `target_date` must not be substituted. Version/tag separate.                                    |
| Source/group links    | `workitem_link.list` then `create` with project/work-item IDs, HTTP(S) URL and title when missing. Add spec/module/milestone/release URLs to body as durable context too. Links do not substitute for native membership.                                                                          |

Membership `add_ids`/`remove_ids` are strings in the inspected connector schema, while relation `workitem_ids` is an array. Use one UUID string per membership call; do not invent multi-ID serialization. Existing group membership only; creating or changing modules/milestones/releases needs explicit scope. If an intended group is absent, report the gap rather than silently inventing it. Assignment means intended shipping, not shipped. Release requires tag/release SHA plus deployment/smoke evidence under [workflow](../agents/workflow.md).

**Context7-verified:** [Plane relation API](https://developers.plane.so/api-reference/work-item-relations/create-work-item-relation) exposes `blocked_by`; [filtering docs](https://developers.plane.so/api-reference/v2/filtering-and-ordering) expose `external_source`/`external_id` identity lookup. Connector schema determines actual argument names above; do not mix raw REST and connector shapes.

## From plane.md, lines 46-50

**Confirmed (owner screenshots and two live test PRs, 2026-11-05):** the Plane GitHub integration is installed for this repository only. The `makeplane` bot comments "Linked to Plane Work Item(s)" on a pull request that names a `METRO-NN` identifier (branch, title or body). **It did not move any ticket state**: on PR #69 and PR #70 the ticket stayed in Backlog when the PR opened and when it merged, with the mapping below saved and, for #70, the project bound to the repository.

Configured mapping (kept, harmless): Draft Open → In Progress; Open, Review Requested, Ready for Merge → In Review; Merged → Done; Closed → no change; "Prevent issues from moving to an earlier state" on. Project Issue Sync is bound to the repository, direction **Unidirectional** (GitHub to Plane only; Issue Open → Backlog, Issue Closed → Cancelled). Never choose Bidirectional: it would copy Plane tickets into the public repository. The repository has no GitHub issues, so the binding imports nothing.

**Rule:** do not rely on the integration for state. The agent moves Plane states by hand and posts the closing comment, as before. A premature Done from a future automatic transition is reconciled by hand (rule 8 above). Cause of the missing transitions is Unknown; re-test only if Plane documents a change.

## From plane.md, lines 54-63

1. Confirm authorization names the spec, approved slices and external writes. Keep source revision and a local publishing ledger: stable key, returned UUID/URL, body revision, Page link, relations, memberships, state and readback evidence. Do not include tokens. The synthetic example is never publishable.
2. Re-read full settled source/comments and relevant [glossary](../product/glossary.md)/ADRs. Preserve global scope/exclusions/grouping and each slice's outcome, scope/exclusions, criterion IDs and Given/When/Then/failure observations, seam IDs/boundaries/fixtures/checks, blockers and verification. Resolve unknowns. Use [local dry run](../examples/plane-preparation/README.md) before writes; it verifies preservation, not business correctness.
3. Stable identity: `external_source = metro-spec`, `external_id = <specification-id>/<slice-id>`. Keep revision in body/ledger, not identity, so revisions do not create duplicate work. Search/list with both fields in project, follow all cursors and include archived work items (`list_archived` or bounded explicit inspection). Reconcile an existing Page by recorded UUID or Page external identity through complete listing/readback before creating one.
4. Zero exact matches permits creation only when lookup completed reliably. One match: retrieve and compare its spec identity, body and lifecycle; reuse matching work. More than one, unknown timeout outcome, conflict, inaccessible archived results or incomplete pagination: stop; reconcile manually. A create timeout is not evidence no item exists. Do not retry create blindly. Never merge/delete duplicates automatically.
5. Create/reconcile blockers before dependents in topological order. Create work items in Backlog/Specifying first. After each successful mutation, record returned ID immediately, retrieve and compare. On restart, reconcile ledger and remote identity first, then resume missing operations only. Read existing links, relation direction and memberships before adding; re-read after a timeout. Preserve successful partial work; no automatic destructive rollback.
6. Attach spec Page, apply native blockers and intended existing group memberships, add source links. Verify each independently. Never replace native blockers with generic `relates_to`; never remove a dependency solely to reach Ready. Stale or conflicting relations require review, not silent correction.
7. Readiness review checks linked settled revision, bounded verifiable outcome, failure/boundary checks, agreed seams, available tools/data, check plan and resolved material unknowns. Open blockers keep Backlog; add the `blocked` label (see Labels) plus the native relation and an explanation. Move to Ready only when authorized and all conditions pass. Preparation alone neither moves state nor implements.
8. Implementation/state progression follows explicit task authorization and [workflow](../agents/workflow.md). Done requires fresh acceptance evidence, resolved applicable review, required available CI and authorized merge policy. Automation cannot prove PR base/CI; reconcile premature Done. Ticket merges target `feature/metro-rebuild`; owner-authorized integration Done exception applies as documented. METRO-11 prepares `main` from reviewed independent rebuild history; the repository default stays unchanged until v1.0.0 is fully ready to release. Follow [ADR-0008](../adr/0008-default-branch-switch.md) and the [cutover runbook](../agents/cutover-runbook.md) for that later switch; the base branch named here changes at runbook step 6.4, together with CONTRIBUTING.md and workflow.md. Done remains distinct from release.

**Unknown:** remote publishing/idempotency/permission enforcement were not write-tested. No transactional guarantees, automatic uniqueness or duplicate protection are assumed. Missing connector capability is a stop condition for that step; report exact limitation, retain the ledger, and obtain an authorized supported route.

## From issue-tracker.md, lines 1-33

Whole former guide.

### Issue tracker: Plane

Issues and PRDs for this repo live as Plane work items (workspace `metro-station-finder`, project METRO, UUID `1ab13b1b-d537-4524-8f18-45ee42262dc4`). GitHub is the code host only (PRs, branches); do not use `gh issue` for tickets.

Operate through the connected Plane MCP tools (`workitem`, `workitem_comment`, `workitem_relation`, `state`, `label`, `page`, ...). Inspect the live tool schema before calling; schemas may change.

The full adapter (identity, idempotency, publish/retry rules, state flow) is [plane.md](../agents/plane.md). Read it before any write. Key points:

- Use full UUIDs for API arguments; `METRO-10`-style display IDs resolve via `workitem.retrieve_by_identifier`.
- Stable identity: `external_source = metro-spec`, `external_id = <specification-id>/<slice-id>`. Search with both fields (include archived, follow all cursors) before creating. Never retry a create blindly.
- Create new work in Backlog or Specifying first; move to Ready only when authorized and readiness checks pass.
- Dependencies are native `blocked_by` relations, not body links or `relates_to`.
- Ticket body follows [the ticket template](../templates/plane-ticket.md); specs follow [the specification template](../templates/specification.md).

#### Conventions

Action names below follow the connected tools as inspected on 2026-11-03; `workitem_comment` and the `pql` filter are not specified by [plane.md](../agents/plane.md), so verify them against the live schema before use.

- **Create an issue**: `workitem.create` with project UUID, `name`, `description_html`, state UUID, `external_source`, `external_id`.
- **Read an issue**: `workitem.retrieve_by_identifier` (display ID) or `workitem.retrieve` (UUID), plus `workitem_comment` list for comments.
- **List issues**: `workitem.list` with project UUID and `pql` filter; follow cursors.
- **Comment**: `workitem_comment` create.
- **Change state**: `state.list` for the UUID, then `workitem.update`.
- **Labels**: `label` tool; follow the taxonomy and rules in [plane.md](../agents/plane.md). Exactly one `area:*` label per new work item; do not invent labels.
- **Close**: move to Done (needs acceptance evidence per [workflow](../agents/workflow.md)) or Cancelled with a reason comment.

#### When a skill says "publish to the issue tracker"

Create a Plane work item per the rules above. [plane.md](../agents/plane.md) authorizes no writes: obtain explicit authorization naming the spec, slices and external writes first.

#### When a skill says "fetch the relevant ticket"

Retrieve the work item (and its comments, relations and attached Pages) via the Plane tools.

## From triage-labels.md, lines 1-15

Whole former guide.

### Triage Labels

The skills speak in terms of five canonical triage roles. In Plane these map to project states, not labels: [plane.md](../agents/plane.md) forbids duplicating Ready as a label, reserves System Triage, and forbids creating or renaming states. Do not create new labels for these roles; the labels that do exist are in [plane.md](../agents/plane.md).

| Role in mattpocock/skills | Plane equivalent                 | Meaning                                                                                                                                                                                                                   |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `needs-triage`            | System Triage (intake)           | Maintainer needs to evaluate this issue. Reserved and read-only for agents: only the owner or Plane automation places items there; never move, create or rename it. An agent-created, unevaluated item starts in Backlog. |
| `needs-info`              | Specifying state                 | Waiting on reporter/owner for more information. Add the `blocked` label per [plane.md](../agents/plane.md); explain in a comment.                                                                                         |
| `ready-for-agent`         | Ready state, body records AFK    | Fully specified, ready for an AFK agent.                                                                                                                                                                                  |
| `ready-for-human`         | Ready state, body records HITL   | Requires human implementation or a human decision.                                                                                                                                                                        |
| `wontfix`                 | Cancelled state + reason comment | Will not be actioned.                                                                                                                                                                                                     |

Both ready roles share the Ready state; no label duplicates Ready. Record the AFK/HITL split from the specification slice's "Review needs" field in the work item's "Evidence and readiness" section ([ticket template](../templates/plane-ticket.md)), e.g. `Implementation mode: AFK`. Resolve state UUIDs with `state.list`; never infer from names. Move to Ready only when authorized and readiness review passes ([plane.md](../agents/plane.md)).

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding row above.
