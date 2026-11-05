# Documentation map

Every file under `docs/` has exactly one kind. The Kinds table defines the kinds and the Map table assigns files to them. Machine-checked by `scripts/docs-structure.test.ts`: a docs file with no map row, a map row that matches no file, a map row whose kind is not in the Kinds table, a kind in the Kinds table that no row uses, and task-list items (`- [ ]`) in `docs/specifications/`. Every other "must never contain" entry and every naming rule is advisory and enforced only by review. Method and the full file list: [inventory](evidence/docs-inventory-2026-11.md). Agents start from the root `CLAUDE.md`, which routes to the guides.

## Kinds

| Kind      | What it is                                                          | Owner (who may change it)                                | Must never contain                                            |
| --------- | ------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| index     | this map                                                            | repository owner; changes need a ticket                  | rules or content that belong to another kind                  |
| guide     | standing rules, policies and how-tos for agents and contributors    | repository owner; changes need a ticket                  | per-ticket status, secrets, copied code                       |
| runbook   | an operational procedure run by a person at a known moment          | repository owner                                         | undated claims that it was run; secrets                       |
| contract  | current settled specification of behavior (`docs/specifications/`)  | the ticket that settles it; later tickets amend in place | copied exact types, implementation checklists, history        |
| decision  | an ADR in MADR form: one decision, its context and alternatives     | accepted ADRs change only by a new superseding ADR       | work tracking, edits that rewrite the decision after the fact |
| evidence  | dated record of what was checked, with commands, results and limits | the ticket that produced it; frozen afterwards           | policy, or claims without a revision and a label              |
| history   | dated plans and baselines kept for traceability                     | nobody; frozen. Corrections go in a new document         | anything presented as current                                 |
| reference | product facts and local-development facts that code does not state  | repository owner                                         | rules for agents (those are guides)                           |
| template  | a form copied to start a spec, ticket or ADR                        | repository owner                                         | real content for one ticket                                   |
| example   | synthetic fixtures that demonstrate a template or protocol          | repository owner                                         | real tracker entities or credentials                          |
| data      | machine-read JSON/lock files that a script or test checks           | the script or test that reads it                         | prose rules                                                   |

## Map

First cell is a path: a trailing `/` covers a directory, otherwise it is one file. An exact file row beats a directory row.

| Path                             | Kind      | Note                                                              |
| -------------------------------- | --------- | ----------------------------------------------------------------- |
| `docs/README.md`                 | index     | this file                                                         |
| `docs/agents/`                   | guide     | policies and how-tos routed from `CLAUDE.md`                      |
| `docs/agents/cutover-runbook.md` | runbook   | default-branch cutover, run by the owner                          |
| `docs/agents/deploy-runbook.md`  | runbook   | production deploy and rollback                                    |
| `docs/agents/skills.lock.json`   | data      | pinned skill hashes, checked by the preparation scripts and tests |
| `docs/adr/`                      | decision  | MADR, numbered `NNNN-title.md`; `0000-template.md` is the form    |
| `docs/adr/0000-template.md`      | template  | the ADR form                                                      |
| `docs/specifications/`           | contract  | one settled specification per ticket slice                        |
| `docs/evidence/`                 | evidence  | ticket evidence and dated audits; see Naming                      |
| `docs/product/`                  | reference | legacy parity and glossary                                        |
| `docs/development.md`            | reference | local workspace facts                                             |
| `docs/templates/`                | template  | specification and Plane ticket forms                              |
| `docs/examples/`                 | example   | synthetic preparation and untrusted-input fixtures                |
| `docs/superpowers/plans/`        | history   | dated task plans; their task lists are frozen history             |

## Ownership: code, docs, Plane, git

- **Code owns exact shapes.** Types, schemas, error codes and route tables live in `packages/` and `apps/` (for example `@metro/contracts`). A contract says what must hold and links the file; it does not copy the type. A copy drifts, the code does not.
- **Docs own intent and rules.** Contracts: what behavior is settled. Decisions: why. Guides: how to work. Evidence: what was observed on which revision.
- **Plane owns work tracking.** Status, task breakdown, blockers and acceptance progress live in the ticket, not in a document.
- **Git owns history.** Superseded text is removed from current documents; the old text stays in git. A decision is superseded by a new ADR, never silently edited.
- **Root `CLAUDE.md` owns routing and guardrails.** Only the repository owner changes it, and it is not described further here.

## Rules

1. **No copied exact types in specifications.** Name the type or schema and link its file. Write the contract in terms of observable behavior and failure cases.
2. **No implementation checklists in specifications.** Markdown task-list items (`- [ ]`) are rejected by the check in `docs/specifications/`, including inside blockquotes, but not inside fenced code. Limits: an indented task item (four or more spaces) and one inside an HTML comment are still counted, and an unclosed fence is reported. Work tracking lives in Plane. Templates, Plane ticket forms and frozen `history` plans may contain checklists because they are forms or frozen records, not current contracts.

## Naming

- ADR: `docs/adr/NNNN-short-title.md`, number never reused.
- Evidence: `metro-<ticket-or-topic>.md` for ticket evidence (for example `metro-12.md`, `metro-release-sync.md`), `<topic>-YYYY-MM.md` for dated audits and measurements (for example `audit-2026-11.md`). One file, `dhaka-mrt-line-6.md`, fits neither pattern. Naming is a convention; it is not machine-checked.
- Plans: `YYYY-MM-DD-topic.md`.
- Specifications: lower-case topic name; the ticket and revision are in the header.

## Status vocabulary

- ADR: `Proposed`, `Accepted`, `Rejected`, `Deprecated`, `Superseded by ADR-NNNN` (checked by `scripts/adr.test.ts`).
- Runbooks may open with `Status: plan` until run. Evidence and plans carry a date instead of a status.
- Content that describes only the legacy baseline carries the `Historical baseline` banner (checked by `scripts/docs-drift.test.ts`).
- No other status words are enforced; do not invent new ones without extending this section.

## Adding a document

Pick the kind first. If none fits, change this README (new kind, owner and prohibition) in the same pull request; the check then covers the new file. A file whose row is missing fails `bun test`.
