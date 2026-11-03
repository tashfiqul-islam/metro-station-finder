# Domain Docs

How the engineering skills consume this repo's domain documentation. Layout: single-context. The canonical vocabulary is [the glossary](../product/glossary.md); [reviewed skills](skills.md) forbid competing canonical `CONTEXT` documents.

## Before exploring, read these

- [`docs/product/glossary.md`](../product/glossary.md): canonical domain terms.
- [`docs/product/feature-parity.md`](../product/feature-parity.md): behavior baseline for the rebuild.
- **`docs/adr/`**: ADRs touching the area you are about to work in, if the directory exists.
- **`CONTEXT.md`** at the repo root, if one exists. None is planned.

If an optional file or directory does not exist, **proceed silently**. Do not flag its absence or suggest creating it upfront. Skills that would create `CONTEXT.md` (for example `grill-with-docs`) must not do so; any such file would compete with the glossary. Record vocabulary changes in the glossary instead, within explicit ticket scope.

## File structure

```
/
├── docs/
│   ├── adr/                  (optional)
│   └── product/
│       ├── glossary.md
│       └── feature-parity.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the glossary. Do not drift to synonyms the glossary avoids.

If the concept you need is not defined, either you are inventing language the project does not use (reconsider) or there is a real gap: report it rather than silently coining a term.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly instead of silently overriding it:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
