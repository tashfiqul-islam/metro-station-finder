# Architecture Decision Records (ADRs)

This directory contains decision logs for the **Metro Station Finder** project.  
Each ADR documents a single architectural or product decision, the context, and the consequences.

---

## Index

| ADR ID | Title                               | Date       | Status    | Supersedes | Superseded by |
|--------|-------------------------------------|------------|-----------|------------|----------------|
| [0001](0001-map-provider-integration.md) | Map Provider & Integration         | 2025-09-27 | Accepted | – | – |
| [0002](0002-static-data-source-strategy.md) | Static Data Source Strategy        | 2025-09-27 | Accepted | – | – |
| [0003](0003-copy-deck-canonical-strings.md) | Copy Deck & Canonical Strings      | 2025-09-27 | Accepted | – | – |
| [0004](0004-diagnostics-privacy-toggle.md) | Diagnostics & Privacy Toggle       | 2025-09-27 | Accepted | – | – |
| [0005](0005-phase-based-commit-strategy.md) | Phase-Based Commit Strategy         | 2024-12-19 | Accepted | – | – |

---

## Conventions

- **Date**: ISO format (`YYYY-MM-DD`) of decision acceptance.  
- **Status**: `Proposed`, `Accepted`, `Superseded`, or `Rejected`.  
- **Links**: Each ADR is a markdown file in this folder.  
- **Supersedes / Superseded by**: Used when one ADR replaces or updates another.  

---

## Workflow

1. Create a new ADR file: `adrs/NNNN-title.md`  
   - Increment `NNNN` sequentially.  
   - Use lowercase-kebab-case for title.  

2. Update this `README.md` with the new ADR.  

3. Status lifecycle:
   - `Proposed` → pending review.  
   - `Accepted` → merged and binding.  
   - `Superseded` → replaced by a newer ADR.  
   - `Rejected` → considered but declined.  

---

## References

- [Michael Nygard: Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)  
- [adr-tools](https://github.com/npryce/adr-tools) (inspiration for format)  
- [ThoughtWorks: ADRs in Practice](https://www.thoughtworks.com/radar/techniques/lightweight-architecture-decision-records)  
