# ADR-0004: Diagnostics & Privacy Toggle

**Date:** 2025-09-27  
**Status:** Accepted  
**Supersedes:** None  
**Superseded by:** None  

---

## Context

Search history is useful for UX (recent stations/landmarks) but poses privacy concerns.  
Some users prefer minimal tracking; browsers may signal this with Do Not Track (DNT).  

Constraints:  

- Must never store PII.  
- Must honor privacy signals automatically.  
- Must let users opt out at any time.  

---

## Decision

Provide a **Diagnostics toggle** in Settings/About:  

- Default ON.  
- If DNT is true → auto-disable.  
- When off → no search history is stored; existing history cleared immediately.  
- Changes confirmed via toast "Settings saved."  

---

## Consequences

- ✅ Privacy-respecting by default.  
- ✅ Transparent toggle with immediate effect.  
- ✅ Aligns with modern compliance expectations.  
- ⚠️ Loss of UX convenience when diagnostics off.  
- ⚠️ Slight increase in test surface (two modes).  

---

## Related

- [ADR-0003: Copy Deck & Canonical Strings](0003-copy-deck-canonical-strings.md)

---

## References

- [Do Not Track (MDN Web Docs)](https://developer.mozilla.org/en-US/docs/Web/Security/Do_Not_Track)  
- [GDPR Article 25: Data Protection by Design](https://gdpr-info.eu/art-25-gdpr/)  
- [W3C Privacy Principles](https://www.w3.org/Privacy/)  
