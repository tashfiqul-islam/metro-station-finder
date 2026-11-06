# Workflow

Read when: preparing or implementing a ticket, opening or reviewing a PR, committing as an agent, or naming a release.

## Rules

### Task preparation

- Keep research, settled specification, ticket preparation and implementation separate. Settle domain terms, spec and test seams, then create bounded tickets. Use [skills](skills.md), the [Plane adapter](plane.md), the [specification](../templates/specification.md) and [ticket](../templates/plane-ticket.md) templates.
- Ready needs a linked settled spec or decision, a bounded independently verifiable slice, failure and boundary acceptance checks that can fail on base, blocker relations, required tools and data, a check plan and no material unknowns. Open blockers keep it in Backlog. Ready is the state, not a label.

### Execution

- Backlog captures scope; Specifying settles it; Ready records readiness; explicit task authorization starts work; In Progress is implementation; In Review carries the PR and evidence; Done needs a verified merge to `main` unless the integration rule below applies; Cancelled gives a reason and the replacement.
- One fresh-session outcome per ticket and PR, in an isolated worktree. Keep explicit exclusions; no unrelated cleanup. Record base, head, commands and results, unrun checks, review disposition and remaining gaps. One active implementation and one review per agent is guidance, not enforced WIP.
- The owner requires that ticket PRs target `feature/metro-rebuild`. Merge only under explicit ticket authorization. For authorized rebuild tickets Done follows a verified merge to `feature/metro-rebuild` with required CI and resolved review; this overrides the main-only source rule for those tickets. Flag premature automatic Done. The default stays until v1.0.0 is ready; the base branch named here changes only at [cutover runbook](cutover-runbook.md) step 6.4 together with CONTRIBUTING.md and plane.md. Done is not released: shipping needs a tag, its SHA, and deployment plus smoke evidence.

### Independent review

- Every PR whose files are not all markdown under `docs/` or at the root gets an independent review. Docs-only PRs skip it and write `none (docs only)` in `Reviewer`; they still need green `Quality gates`. The owner's merge is the owner review. Typos in code are not exempt.
- The reviewer has a fresh context in a different session, has read-only tools, sees only the ticket or spec, base and head commits and the committed diff (no implementer reasoning), follows the [review checklist](review-checklist.md), ranks findings Critical, Important or Minor with file and line, and states what it verified and could not verify. Claude Code binds this to `.claude/agents/independent-reviewer.md`.
- Reports are leads, not authority. Verify each finding, then record one disposition: fixed (commit), disproved (evidence), accepted (reason, who) or deferred (ticket). Fix or disprove Critical findings before merge; fix, disprove, accept or defer Important findings with the reason stated. Merge only after dispositions are recorded and hosted checks are green.
- The PR body has a `Reviewer` section naming the agent or person, a reference (a URL, a `#<number>`, or a `session:` / `run:` token) and the disposition link. It proves presence, not that a review happened.

### Attribution

- Agent commits end with a blank line and one trailer: `Co-Authored-By: <agent name and model> <noreply@anthropic.com>`. Agent PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Agents never add `Signed-off-by`: it is a person's own certification. Human-only commits carry no trailer. A person may sign off their own commit.
- Merge commits are the default. If a PR with agent commits is squash-merged, the merger checks the final message ends with the trailer.

### Releases

- Tags follow SemVer: `v<major>.<minor>.<patch>` or `v<major>.<minor>.<patch>-<prerelease>` (for example `v1.0.0-rc.1`). No leading zeros, no `+build` metadata. Git tag, GitHub release name, Plane release name and Plane tag are one string. `package.json` versions stay `0.0.0`. `v0.0.1` and `v0.0.2` are legacy; the first rebuild release is `v1.0.0`. A change to the HTTP contract or documented behavior is MAJOR.
- A stable tag points at a default-branch commit that passed `Quality gates`. Never move, reuse or delete a published tag except to retract a faulty release (the next release takes the next number). Dry runs use `v0.0.0-<name>-test` only while immutable releases are off.
- The owner chooses the version. Agents and automation never choose or change a version string, create a tag, publish or edit a release. Notes start as the Plane release log, are edited by the owner, then GitHub is canonical. Notes list METRO tickets and PRs and a `Deferred` heading. A stable release becomes `released` only after a successful `production` deployment and smoke; a prerelease, draft or retracted release never does.
- Release procedure: the owner (or an agent on the owner's explicit instruction) creates the Plane release named with the tag and dispatches `release-draft`; the owner publishes the draft, which creates the tag. The `release` environment approval gates every run.

## Enforced by

- `scripts/reviewer-record.ts` and the `Reviewer record` workflow: fail a PR body without a real `Reviewer` section. Fix the body.
- `scripts/commit-message.ts` (hook and CI): rejects non-Conventional subjects and a `Signed-off-by` with an AI-agent address; names are never matched. It does not require the trailer. Extend its identity list only with a test.
- `scripts/base-branch.ts` (`branches:check`): fails when CONTRIBUTING.md, this file and plane.md name different base branches.
- `validateTag` in `scripts/release-sync.ts`: fails a tag that breaks the grammar above.

## Read more

- [Review and CI enforcement details](../evidence/metro-86-moved-workflow.md): parsing rules, ruleset IDs, attribution decisions, merge methods.
- [ADR-0008](../adr/0008-default-branch-switch.md), [release-sync](../specifications/release-sync.md), [release-draft](../specifications/release-draft.md).
