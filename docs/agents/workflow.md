# Workflow

Read when: preparing or implementing a ticket, opening or reviewing a PR, committing as an agent, or naming a release.

## Rules

### Preparation

- Keep research, settled specification, ticket preparation and implementation separate: settle domain terms, spec and test seams, then create bounded tickets. Use [skills](skills.md), the [Plane adapter](plane.md), the [specification](../templates/specification.md) and [ticket](../templates/plane-ticket.md) templates.
- Ready needs a linked settled spec or decision, a bounded independently verifiable slice, failure and boundary checks that can fail on base, blocker relations, required tools and data, a check plan and no material unknowns. Open blockers keep it in Backlog. Ready is state, not label.

### Execution

- Backlog captures scope; Specifying settles it; Ready records readiness; explicit authorization starts work; In Progress is implementation; In Review carries the PR and evidence; Done needs a verified merge to `main` unless the integration rule below applies; Cancelled gives a reason and replacement.
- One fresh-session outcome per ticket and PR, in an isolated worktree; keep explicit exclusions, no unrelated cleanup. Record base, head, commands and results, unrun checks, review disposition and gaps. One implementation and one review per agent is guidance, not enforced WIP.
- The owner requires that ticket PRs target `feature/metro-rebuild`. Merge only under explicit ticket authorization. For authorized rebuild tickets Done follows a verified merge to `feature/metro-rebuild` with required CI and resolved review (overriding the main-only rule). Flag premature automatic Done. The default stays until v1.0.0 is ready; this base changes only at [cutover runbook](cutover-runbook.md) step 6.4, with CONTRIBUTING.md and plane.md. Done is not released: shipping needs a tag, its SHA, and deployment plus smoke evidence.
- Never merge the base into an open PR speculatively; update a branch only when GitHub reports it behind and you are about to merge, preferably with server-side "Update branch". Its merges pass signed commits: GitHub signs web-interface commits ([Web-verified](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification)); #129 to #131 (2026-11-10) are `verified` (Repo-verified).
- The PR body is the record; write a `docs/evidence/` file only for investigations, measurements or decisions later docs cite.

### Independent review

- Every PR whose files are not all markdown under `docs/` or at the root gets an independent review. Docs-only PRs write `none (docs only)` in `Reviewer` and still need green `Quality gates`. The owner's merge is the owner review. Code typos are not exempt.
- The reviewer works in a fresh, different session with read-only tools and sees only the ticket or spec, base and head commits and the committed diff (no implementer reasoning). It follows the [review checklist](review-checklist.md), ranks findings Critical, Important or Minor with file and line, and states what it verified and could not.
- Reports are leads, not authority. Verify each finding, then record one disposition: fixed (commit), disproved (evidence), accepted (reason, who) or deferred (ticket). Fix or disprove Critical findings before merge; Important findings also allow accept or defer, with the reason. Merge only after dispositions are recorded and hosted checks are green.
- The PR body has a `Reviewer` section naming the agent or person, a reference (URL, `#<number>`, or `session:` / `run:` token) and the disposition link. It proves presence only.

### Attribution

- Agent commits end with a blank line and one trailer: `Co-Authored-By: <agent name and model> <noreply@anthropic.com>`. Agent PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Agents never add `Signed-off-by` (a person's own certification). Human-only commits carry no trailer; a person may sign off their own.
- Merge commits are the default. If a PR with agent commits is squash-merged, the merger checks the final message ends with the trailer.

### Releases

- Tags follow SemVer: `v<major>.<minor>.<patch>[-<prerelease>]`, no leading zeros, no `+build`. Git tag, GitHub release, Plane release and Plane tag share one string. `package.json` versions stay `0.0.0`. `v0.0.1` and `v0.0.2` are legacy; the first rebuild release is `v1.0.0`. An HTTP contract or documented behavior change is MAJOR.
- A stable tag points at a default-branch commit that passed `Quality gates`. Never move, reuse or delete a published tag except to retract a faulty release (the next takes the next number). Dry runs use `v0.0.0-<name>-test` only while immutable releases are off.
- The owner chooses the version. Agents and automation never choose or change a version, create a tag, or publish or edit a release. Notes start as the Plane release log, the owner edits them, then GitHub is canonical; they list METRO tickets, PRs and a `Deferred` heading. Only a stable release after a successful `production` deployment and smoke becomes `released`; a prerelease, draft or retracted one never does.
- Release procedure: the owner (or an agent on explicit instruction) creates the Plane release named with the tag and dispatches `release-draft`; the owner publishes the draft, creating the tag. `release` environment approval gates every run.

## Enforced by

- `scripts/reviewer-record.ts` and the `Reviewer record` workflow: fail a PR body without a real `Reviewer` section.
- `scripts/commit-message.ts` (hook and CI): rejects non-Conventional subjects and a `Signed-off-by` with an AI-agent address; names are never matched and the trailer is not required. Extend its identity list only with a test.
- `scripts/base-branch.ts` (`branches:check`): fails when CONTRIBUTING.md, this file and plane.md name different bases.
- `validateTag` (`scripts/release-sync.ts`): fails a tag that breaks the grammar.

## Read more

- [Enforcement details](../evidence/metro-86-moved-workflow.md): parsing, ruleset IDs, merge methods. [ADR-0008](../adr/0008-default-branch-switch.md).
