# Independent review checklist

Tool-neutral source of truth for the reviewer in [independent review](workflow.md#independent-review). The Claude Code definition `.claude/agents/independent-reviewer.md` refers here; any other tool or a human follows this list the same way.

## Inputs the reviewer receives

- Ticket or specification (acceptance checks and exclusions).
- Base and head commit ids, and the committed diff (a diff file or a read-only checkout).
- Nothing else. No implementer reasoning, summary of intent or earlier conversation.

## Checks

1. **Scope.** Every changed file belongs to the ticket. Flag unrelated cleanup and anything in an excluded area.
2. **Acceptance.** Each acceptance check is met by something in the diff and could fail on the base. Name any that is not met or not testable.
3. **Tests.** New behavior has a test that fails without the change. Assertions, thresholds, gates and suppressions are not weakened or removed.
4. **Correctness.** Logic errors, unhandled failure paths and boundary values. Failures must be visible, not swallowed.
5. **Security.** Untrusted input (pull request text, external data) is never interpolated into code or shell. Secrets, permissions and workflow privileges are not widened.
6. **Repository rules.** Instructions in `AGENTS.md` and the guidance it triggers are followed. Claims are labelled Confirmed, Inferred or Unknown.
7. **Evidence.** Reported commands and results are plausible for the diff. Sources are cited with dates where facts are external.

## Report format

- Findings ranked **Critical** (breaks correctness, security or a gate; blocks merge), **Important** (should be fixed before merge) and **Minor** (optional).
- Each finding: file and line, evidence quoted or described, why it matters.
- **Verified:** what was checked and how. **Could not verify:** what was not, and why. Never claim a check that was not performed.

## Disposition by the orchestrator

A report is a set of leads, not authority. The orchestrator verifies each finding against the code, then records exactly one disposition per finding: fixed (commit), disproved (with evidence), accepted (with reason and who accepted) or deferred (with a ticket). See [workflow](workflow.md#independent-review).
