# Tracker

Read when: reading, preparing, creating or changing tickets, specs, labels, fields, states, milestones or hierarchy.

## Rules

- Tickets live in the private repo `metro-station-finder/planning` as GitHub issues, tracked in the org project **Metro** (`github.com/orgs/metro-station-finder/projects/1`). This public repo holds code only; never open tickets here. Use `gh` (2.94 or later) or the GitHub MCP connector; the connector has no project tools, so project Status changes go through `gh`. This guide authorizes no writes: research, settled spec, approved slices, authorized creation, readiness review, then separately authorized implementation.
- Keys: `METRO-NN` is `metro-station-finder/planning#NN`. Issues 1-137 came from Plane on 2026-11-11 (each body starts with a "Migrated from Plane" line); Plane is retired and read-only, so never write to it. In this repo, reference a ticket as `metro-station-finder/planning#NN`; a bare `#NN` here means a pull request in this repo.
- Issue types: Initiative, Epic, Task, Bug. Hierarchy is sub-issues: Initiative → Epic → Task or Bug (an umbrella Task may hold slice Tasks). Every Task or Bug has exactly one parent; read the tree with `gh issue view NN --json parent,subIssues`.
- Project Status is the workflow state: Backlog, Specifying, Ready, In Progress, In Review, Done, Cancelled. Do not add options or duplicate a state as a label. A new ticket starts in Backlog. Close Done issues as completed and Cancelled ones as not planned with a reason comment, then set Status (the project's close automation sets Done, so a Cancelled item needs Status set after closing).
- Triage roles map to Status, not labels: `needs-info` is Specifying plus `blocked`; `ready-for-agent` and `ready-for-human` are Ready with field Mode `AFK` or `HITL`; `wontfix` is Cancelled.
- Labels classify. Exactly one `area:*`: `agents`, `api`, `delivery`, `docs`, `domain`, `tooling`, `web`. Zero or more `quality:*`: `accessibility`, `observability`, `security`, `testing`. Status flags only while true: `needs-decision`, `needs-owner-action`, `blocked` (needs a blocked-by link and an explanation). Remove a flag when resolved or when the item closes. New labels need owner approval and a one-line description.
- Org issue fields (visible to members only): Initiative, Module, Release, Mode, Spec, Priority, Effort, Start date, Target date. Set Initiative, Module and Release on every Task and Bug. Release means intended shipping, not shipped. Spec holds the spec ID and immutable revision (path@SHA); a link to a mutable page is not provenance.
- Milestones are acceptance checkpoints in the planning repo; set one on every Task and Bug.
- Dependencies are native blocked-by links on the dependent issue (`gh issue edit NN --add-blocked-by MM`); read back both ends. Never use body text instead, and never remove a dependency just to reach Ready.
- Create with the planning repo's issue forms (Task, Bug, Epic, Initiative) or `gh issue create --type`; the body follows the [ticket template](../templates/ticket.md). Create blockers before dependents. Look up an existing issue before creating (`gh issue list --search`); never retry a create blindly or delete duplicates automatically.
- Branches: create the work branch from the ticket so its pull request shows in the issue's Development section: `gh issue develop NN --repo metro-station-finder/planning --branch-repo tashfiqul-islam/metro-station-finder --base feature/metro-rebuild --name ticket/metro-NN-slug`. The PR body's Ticket line names `metro-station-finder/planning#NN`. Closing keywords only act on the default branch, so move Status and close by hand after merge.
- Move to Ready only when authorized and the readiness review passes ([workflow](workflow.md)). Done needs fresh acceptance evidence, resolved review, green CI and authorized merge. Ticket merges target `feature/metro-rebuild`; the owner's integration exception applies as written in the workflow. The base branch named here changes at [cutover runbook](cutover-runbook.md) step 6.4 together with CONTRIBUTING.md and workflow.md.
- A missing tool capability is a stop condition: report the limit and get an authorized route.

## Enforced by

- `scripts/base-branch.ts` (`branches:check`): fails when this file, workflow.md and CONTRIBUTING.md name different base branches. Change them together.

## Read more

- Migration tools and the Plane-to-GitHub mapping: `tools/migration/` in the planning repo. Spec pages copied from Plane: `specs/` in the planning repo.
- [Retired Plane adapter](plane.md), [glossary](../product/glossary.md).
