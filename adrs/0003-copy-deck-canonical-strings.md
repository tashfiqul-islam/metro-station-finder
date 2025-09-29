# ADR-0003: Copy Deck & Canonical Strings

**Date:** 2025-09-27  
**Status:** Accepted  
**Supersedes:** None  
**Superseded by:** None  

---

## Context

To prevent UI inconsistencies, error messages and labels must be standardized.  
Previously, strings were scattered across components, leading to mismatched punctuation, capitalization, and translations.  

Constraints:  

- Must support test automation with exact string assertions.  
- Must make copy updates predictable and versioned.  
- Must align with accessibility (labels, ARIA attributes).

---

## Decision

All UI strings, error/empty states, CTA labels, and toast messages will be managed in a **copy deck section** of the spec and stored in a canonical source.  

- Copy Deck lives in repo as markdown with IDs.  
- QA asserts exact matches against IDs.  
- Components must import from this source only.  

---

## Consequences

- ✅ One source of truth → prevents drift.  
- ✅ Easy QA string assertions.  
- ✅ Enables localization in future phases.  
- ⚠️ Requires copy governance (cannot hotfix UI strings ad-hoc).  

---

## Related

- [ADR-0004: Diagnostics & Privacy Toggle](0004-diagnostics-privacy-toggle.md)

---

## References

- [WCAG 2.2: Clear and Consistent Labels](https://www.w3.org/TR/WCAG22/#consistent-identification)  
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)  
- [NNGroup: Microcopy Matters](https://www.nngroup.com/articles/microcontent-how-to-write-headlines-page-titles-and-subject-lines/)  
