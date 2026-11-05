# Plane preparation adapter

**Confirmed / Repo-verified:** this adapter is based on the connected Plane tool schemas read on 2026-11-02 and project guide/spec pages. [Evidence](../evidence/metro-10.md) records sources and limits. Tools may change: inspect their live schema before publishing. This document authorizes no writes. Research → settled spec → approved slices → authorized publishing → readiness review → separately authorized implementation. No parallel dispatch is implied.

## Project and storage

Workspace `metro-station-finder`; project UUID `1ab13b1b-d537-4524-8f18-45ee42262dc4`. Use full UUIDs for API arguments; `METRO-10` is a display identifier, resolved through `workitem.retrieve_by_identifier`. Do not infer UUIDs from names.

Store settled specification as a project Plane Page using [specification template](../templates/specification.md). Keep a repository copy/revision where appropriate. Record immutable source revision, decisions, exclusions and criterion/seam IDs in every ticket. A link to a mutable Page alone is insufficient provenance. Existing sources: [operating guide](https://app.plane.so/metro-station-finder/projects/1ab13b1b-d537-4524-8f18-45ee42262dc4/pages/144aa09c-cd9a-4ce6-9161-a28826bb405b), [bootstrap specification](https://app.plane.so/metro-station-finder/projects/1ab13b1b-d537-4524-8f18-45ee42262dc4/pages/e1defa37-c65c-430e-8a8b-5f8d0f7fffe3).

## Native mapping

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

Membership `add_ids`/`remove_ids` are strings in the inspected connector schema, while relation `workitem_ids` is an array. Use one UUID string per membership call; do not invent multi-ID serialization. Existing group membership only; creating or changing modules/milestones/releases needs explicit scope. If an intended group is absent, report the gap rather than silently inventing it. Assignment means intended shipping, not shipped. Release requires tag/release SHA plus deployment/smoke evidence under [workflow](workflow.md).

**Context7-verified:** [Plane relation API](https://developers.plane.so/api-reference/work-item-relations/create-work-item-relation) exposes `blocked_by`; [filtering docs](https://developers.plane.so/api-reference/v2/filtering-and-ordering) expose `external_source`/`external_id` identity lookup. Connector schema determines actual argument names above; do not mix raw REST and connector shapes.

## Labels

Labels classify a work item. They never duplicate a Plane state, module, milestone, release or work item type; Ready stays a native state. Module, initiative, milestone and release are set separately, exactly one of each per ticket.

- `area:*`, exactly one per work item, set at creation: `area:agents` (agent rules, reviewed skills, instruction routing, task prep), `area:api` (HTTP contracts, Hono delivery, external adapters), `area:delivery` (CI, deployment, releases, GitHub/Plane alignment, production operations), `area:docs` (documentation, ADRs, specifications, evidence, records), `area:domain` (pure business rules, validated transit data), `area:tooling` (workspace, tool versions, hooks, build, lint, type and test infrastructure), `area:web` (web UI, interaction and accessibility).
- `quality:*`, zero or more cross-cutting concerns: `quality:accessibility` (keyboard, focus, screen readers, contrast), `quality:observability` (logging, metrics, uptime, SLOs, performance measurement), `quality:security` (secrets, input validation, permissions, location privacy, supply chain), `quality:testing` (test strategy, coverage, test order, test infrastructure).
- Status flags, only while true. Remove when resolved, or when the item is Done or Cancelled:
  - `needs-decision`: an open material choice; resolve before Ready.
  - `needs-owner-action`: an open step only the owner can do outside the repo (console, settings, credentials).
  - `blocked`: an explicit `blocked_by` relation plus an explanation; keep the workflow state.
- New labels need owner approval and a one-line description. Do not invent labels.

## GitHub integration (pull request state mapping)

**Confirmed (owner screenshot, 2026-11-05):** the Plane GitHub integration is installed for the repository only, with this pull request state mapping on project METRO:

| GitHub pull request event | Plane state |
| ------------------------- | ----------- |
| Draft Open                | In Progress |
| Open                      | In Review   |
| Review Requested          | In Review   |
| Ready for Merge           | In Review   |
| Merged                    | Done        |
| Closed (not merged)       | no change   |

"Prevent issues from moving to an earlier state due to PR updates" is on. Project issue sync is off: GitHub issues are not used, work lives in Plane.

A pull request links to a ticket by its `METRO-NN` identifier in the branch name, title or body. Because Merged maps to Done, merge only when the hosted `Quality gates` check is green and review is resolved (see rule 8 above). A premature Done is reconciled by hand. Observed behavior is recorded on METRO-25.

## Publish and retry without duplicates

1. Confirm authorization names the spec, approved slices and external writes. Keep source revision and a local publishing ledger: stable key, returned UUID/URL, body revision, Page link, relations, memberships, state and readback evidence. Do not include tokens. The synthetic example is never publishable.
2. Re-read full settled source/comments and relevant [glossary](../product/glossary.md)/ADRs. Preserve global scope/exclusions/grouping and each slice's outcome, scope/exclusions, criterion IDs and Given/When/Then/failure observations, seam IDs/boundaries/fixtures/checks, blockers and verification. Resolve unknowns. Use [local dry run](../examples/plane-preparation/README.md) before writes; it verifies preservation, not business correctness.
3. Stable identity: `external_source = metro-spec`, `external_id = <specification-id>/<slice-id>`. Keep revision in body/ledger, not identity, so revisions do not create duplicate work. Search/list with both fields in project, follow all cursors and include archived work items (`list_archived` or bounded explicit inspection). Reconcile an existing Page by recorded UUID or Page external identity through complete listing/readback before creating one.
4. Zero exact matches permits creation only when lookup completed reliably. One match: retrieve and compare its spec identity, body and lifecycle; reuse matching work. More than one, unknown timeout outcome, conflict, inaccessible archived results or incomplete pagination: stop; reconcile manually. A create timeout is not evidence no item exists. Do not retry create blindly. Never merge/delete duplicates automatically.
5. Create/reconcile blockers before dependents in topological order. Create work items in Backlog/Specifying first. After each successful mutation, record returned ID immediately, retrieve and compare. On restart, reconcile ledger and remote identity first, then resume missing operations only. Read existing links, relation direction and memberships before adding; re-read after a timeout. Preserve successful partial work; no automatic destructive rollback.
6. Attach spec Page, apply native blockers and intended existing group memberships, add source links. Verify each independently. Never replace native blockers with generic `relates_to`; never remove a dependency solely to reach Ready. Stale or conflicting relations require review, not silent correction.
7. Readiness review checks linked settled revision, bounded verifiable outcome, failure/boundary checks, agreed seams, available tools/data, check plan and resolved material unknowns. Open blockers keep Backlog; add the `blocked` label (see [Labels](#labels)) plus the native relation and an explanation. Move to Ready only when authorized and all conditions pass. Preparation alone neither moves state nor implements.
8. Implementation/state progression follows explicit task authorization and [workflow](workflow.md). Done requires fresh acceptance evidence, resolved applicable review, required available CI and authorized merge policy. Automation cannot prove PR base/CI; reconcile premature Done. Ticket merges target `feature/metro-rebuild`; owner-authorized integration Done exception applies as documented. METRO-11 prepares `main` from reviewed independent rebuild history; the repository default stays unchanged until v1.0.0 is fully ready to release. Follow [ADR-0008](../adr/0008-default-branch-switch.md) and the [cutover runbook](cutover-runbook.md) for that later switch; the base branch named here changes at runbook step 6.4, together with CONTRIBUTING.md and workflow.md. Done remains distinct from release.

**Unknown:** remote publishing/idempotency/permission enforcement were not write-tested. No transactional guarantees, automatic uniqueness or duplicate protection are assumed. Missing connector capability is a stop condition for that step; report exact limitation, retain the ledger, and obtain an authorized supported route.
