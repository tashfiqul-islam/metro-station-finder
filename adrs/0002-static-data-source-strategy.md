# ADR-0002: Static Data Source Strategy

**Date:** 2025-09-27  
**Status:** Accepted  
**Supersedes:** None  
**Superseded by:** None  

---

## Context

The Phase 1 MVP does not include real-time APIs or server-hosted backends.  
Station data (16 total) and fare rules are relatively stable, updated only occasionally by Dhaka MRT authority.  

Options considered:  

- Hardcoded constants in codebase  
- JSON/CSV file hosted on CDN  
- External API fetch  

Constraints:  

- Zero cost per request.  
- Offline-like performance.  
- Type safety and immutability.

---

## Decision

We will use **hardcoded TypeScript constants** under `lib/data/` for all stations and fare rules.  

- Exposes a `StaticDataProvider` interface to future-proof.  
- All data changes require a redeploy (intentional).  
- Includes metadata like `data_version` for provenance.  

---

## Consequences

- ✅ Zero API cost.  
- ✅ Maximum speed: data bundled with app.  
- ✅ Type-safe access in TypeScript.  
- ⚠️ Manual updates needed when fares change.  
- ⚠️ No real-time sync in Phase 1.

---

## Related

- [ADR-0001: Map Provider & Integration](0001-map-provider-integration.md)

---

## References

- [Dhaka Mass Transit Company Ltd. (DMTCL)](https://dmtcl.gov.bd/) (official fares & stations)  
- [Metro Rail Route Maps](https://dmtcl.gov.bd/)  
- [TypeScript Handbook: Modules & Constants](https://www.typescriptlang.org/docs/)  
