# Contributing ADRs

## Quick Start

1. Create a file in `adrs/` named `NNNN-short-title.md` (increment `NNNN`).
2. Use the ADR template from `adrs/0001-*.md` as a guide.
3. Fill in: Context, Decision, Status, Consequences.
4. Run `bun run adr:index` locally to refresh the index.
5. Commit both the new ADR and the updated `adrs/README.md`.

## Rules of Thumb

- One decision per ADR.
- Keep titles short; details live in the body.
- Prefer “Accepted” only after review/approval.
- If replacing a previous ADR, set:
  - `Supersedes: 00XX-previous-title` in the new ADR, and
  - `Superseded by: 00YY-new-title` in the old ADR.

## Review Checklist

- Decision is specific and testable.
- Alternatives considered are documented.
- Status is accurate (`Proposed` vs `Accepted`).
- Consequences (trade-offs) are honest and explicit.

## CI

A GitHub Action updates the ADR index on every push that touches `adrs/*.md`.
