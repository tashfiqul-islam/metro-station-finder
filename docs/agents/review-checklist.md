# Independent review checklist

Read when: reviewing a committed diff as the independent reviewer, or disposing of a review report.

## Rules

- Tool-neutral source of truth for the reviewer in [independent review](workflow.md#independent-review). `.claude/agents/independent-reviewer.md` refers here; any other tool or a human follows the same list.
- Inputs: the ticket or specification (acceptance checks and exclusions), base and head commit ids, and the committed diff. Nothing else: no implementer reasoning, summary of intent or earlier conversation.
- Checks:
  1. Scope: every changed file belongs to the ticket; flag unrelated cleanup and anything in an excluded area.
  2. Acceptance: each acceptance check is met by something in the diff and could fail on base; name any that is not met or not testable.
  3. Tests: new behavior has a test that fails without the change; assertions, thresholds, gates and suppressions are not weakened or removed.
  4. Correctness: logic errors, unhandled failure paths and boundary values; failures are visible, not swallowed.
  5. Security: untrusted input (PR text, external data) is never interpolated into code or shell; secrets, permissions and workflow privileges are not widened.
  6. Repository rules: `AGENTS.md` and the guidance it triggers are followed; claims are labelled Confirmed, Inferred or Unknown.
  7. Evidence: reported commands and results are plausible for the diff; external facts cite sources with dates.
- Report findings ranked Critical (breaks correctness, security or a gate; blocks merge), Important (fix before merge) or Minor (optional). Each has file and line, quoted or described evidence and why it matters. State Verified (what and how) and Could not verify (what and why). Never claim a check that was not performed.
- The `Reviewer record` check (METRO-134) needs the `Reviewer` section to link a comment (`#issuecomment-<id>`) or review (`#pullrequestreview-<id>`) on this PR with one line `Reviewed-head: <40 lowercase hex>`. That SHA must be a commit of the PR and equal the head, or every later commit must be a merge whose non-first parents are base ancestors (GitHub's "Update branch"); any content commit after it fails. A `#<number>`, a `session:` or `run:` token, another PR's link or a missing, malformed or conflicting line fails; any lookup error fails closed. It cannot prove authenticity or that a review happened (every comment comes from the owner's account); follow the linked output and disposition.
- Disposition: a report is a set of leads. The orchestrator verifies each finding against the code, then records exactly one disposition per finding: fixed (commit), disproved (evidence), accepted (reason and who) or deferred (ticket).

## Enforced by

- `scripts/reviewer-record.ts`: fails a PR without a linked, head-bound `Reviewer` record. Fix the body, not the check.
- `scripts/independent-review.test.ts`: fails if the reviewer definition gains write tools or loses its link to this file.

## Read more

- [Workflow](workflow.md#independent-review), [untrusted input](untrusted-input.md).
