# Architecture Decision Records

Short docs capturing non-obvious architectural decisions. One file per decision. Numbered sequentially. Read on demand, not on every session start.

## When to write an ADR

Write an ADR when any of these are true:

- A choice between two viable technologies (e.g. LLM provider, tile fallback, cache backend)
- A deviation from `AGENTS.md` rules (if ever justified — must be approved first)
- A pattern that will affect multiple future sprints
- A decision a new contributor would second-guess without context

Don't write an ADR for:

- Obvious, rule-driven choices already captured in `AGENTS.md`
- Trivial style or naming preferences
- Temporary experiments not yet committed

## Format

Each ADR lives at `NNN-kebab-title.md` (three-digit sequential number) and follows this template:

```
# NNN. [Title]

- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | superseded-by-NNN | deprecated
- **Sprint:** N
- **Author:** name

## Context

What problem are we solving? What constraints apply? What forces are at play?
One or two paragraphs.

## Decision

What did we choose? Be specific. Name the exact library, pattern, or approach.

## Alternatives considered

- **Option A** — one-line reason we did not pick it.
- **Option B** — one-line reason we did not pick it.

## Consequences

What becomes easier? What becomes harder? What tradeoff do we accept?
List both positive and negative outcomes.

## References

Links to docs, prior art, issues, or PRs.
```

## Index

Empty. First ADR will likely appear in:

- **Sprint 6** — map SSR strategy (lazy wrapper pattern), if it turns out non-obvious.
- **Sprint 11** — LLM provider (Cloudflare Workers AI vs Anthropic Claude).
- **Sprint 14** — Cloudflare deployment topology (Static Assets vs Pages, KV namespace structure).

As ADRs are written, add a line here: `- [001 — Title](001-title.md)`.
