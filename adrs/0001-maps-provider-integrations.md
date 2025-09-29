# ADR-0001: Map Provider & Integration

**Date:** 2025-09-27  
**Status:** Accepted  
**Supersedes:** None  
**Superseded by:** None  

---

## Context

The Metro Station Finder Phase 1 MVP requires interactive map functionality to show the user’s location, nearest stations, and fare routes.  
Options considered included:

- Google Maps JavaScript API  
- OpenStreetMap with Leaflet or Mapbox  
- Static pre-rendered maps  

Constraints:  

- Must load quickly on mobile.  
- Must support light/dark themes.  
- Must comply with Google TOS if chosen.  
- Must minimize API call costs.

---

## Decision

We will use **@react-google-maps/api** with async loading and client-side components only.  

- No server-side rendering of maps.  
- Map loads on user interaction, not on initial bundle.  
- Autocomplete and nearest station search handled with **local static data**, not the Google Places API.  

---

## Consequences

- ✅ Performance: Async loading keeps bundle slim.  
- ✅ Cost: Limits API usage by relying on local data.  
- ✅ UX: Smooth zoom/pan and theme-aware styling.  
- ⚠️ Dependency: Bound to Google Maps terms and quotas.  
- ⚠️ Risk: Map integration may impact Core Web Vitals if not optimized.

---

## Related

- [ADR-0002: Static Data Source Strategy](0002-static-data-source-strategy.md)  
- [ADR-0003: Copy Deck & Canonical Strings](0003-copy-deck-canonical-strings.md)

---

## References

- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms)  
- [Google Maps JavaScript API Documentation](https://developers.google.com/maps/documentation/javascript)  
- [WCAG 2.2 Guidelines](https://www.w3.org/TR/WCAG22/) (map theming and accessibility)  
