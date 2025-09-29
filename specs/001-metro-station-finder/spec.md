# Feature Specification: Metro Station Finder Phase 1 MVP

**Feature Branch**: `001-metro-station-finder`  
**Created**: 2025-09-27  
**Status**: Draft  
**Spec Version**: 1.0.0  
**Owner**: [Tashfiqul Islam](https://github.com/tashfiqul-islam/)

**Input**: User description: "Metro Station Finder Phase 1 MVP - Nearest station finder, fare calculator, static data only, core pages with maps, no accounts/payments/real-time data"

## Execution Flow (main)

```text
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:

   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

As a Dhaka metro commuter, I want to find the nearest metro station from my current location or any address, and calculate fares between stations, so that I can plan my journey efficiently and know the cost before traveling.

### Acceptance Scenarios

1. **Given** a user opens the homepage, **When** they type "Novo Theatre" in the destination search field, **Then** they see Google Places autocomplete suggestions and can select their destination to find the nearest metro station
2. **Given** a user is on the station finder page, **When** they click "Use Current Location", **Then** the system requests geolocation permission and shows the nearest station if granted
3. **Given** a user is on the fare calculator page, **When** they type in the origin station dropdown, **Then** they see local station autocomplete suggestions and can select their origin and destination stations to see fare and travel time
4. **Given** a user searches for a location, **When** no metro stations are found within 5 km, **Then** they see a helpful message suggesting nearby landmarks or alternative search terms
5. **Given** a user is viewing station results, **When** they click on a station, **Then** they see detailed station information including amenities and nearby attractions
6. **Given** the map fails to load or 3 s pass after initialization attempt, **When** the user searches, **Then** the system shows the nearest station in a list view with a Retry Map action
7. **Given** keyboard users on the Station Finder, **When** focus reaches the map container, **Then** a "Skip to results list" link is available and moves focus to the results panel
8. **Given** Diagnostics off is enabled, **When** the user searches, **Then** searching does not add to history; toggling it on → history resumes
9. **Given** a device/browser with Do Not Track enabled on first visit, **When** the user opens the app, **Then** Diagnostics are OFF, no search history is created, and the Settings/About toggle shows Off with a "Settings saved." toast only when explicitly toggled On (no automatic toast on first load)

### Edge Cases

- What happens when geolocation is denied or unavailable?
- How does the system handle invalid or ambiguous address inputs?
- What occurs when a user searches for a location outside Dhaka city limits?
- How does the system respond when no stations are found within 5km radius?
- What happens when the map fails to load due to network issues?
- No stations within 5 km → show message + suggest nearest 3 stations by distance
- Search point > 25 km from Dhaka centroid → 'Out of service area' + manual station selection
- Map unavailable → after 3s from map-init attempt or on error event, render list view + retry
- Provider/quota error → Use canonical string from Copy Deck
- No results found → Use canonical string from Copy Deck

## Out of Scope (Phase 1)

- No external POI/nearby attractions
- No real-time travel times; only static heuristics if shown
- No transfers in Phase-1; static line only
- No external data fetching for amenities
- No server-side APIs beyond static hosting
- No user accounts or personal data collection
- No payment integration or ticket purchasing
- No multi-language support (English only)

## Requirements *(mandatory)*

### Functional Requirements

See Requirement ↔ ADR Traceability for rationale mapping.

- **FR-001**: System MUST allow users to search for destinations using Google Places autocomplete to find the nearest metro station
- **FR-002**: System MUST provide Google Places autocomplete suggestions for destination search (minimum 3 characters, within daily quota limits)
- **FR-003**: System MUST calculate and display the nearest metro station from any given location
- **FR-004**: System MUST show distance to nearest station; walking time optional. If shown: walking_minutes = round(distance_m / 75)
- **FR-005**: System MUST allow users to use their current location to find the nearest station
- **FR-006**: System MUST display an interactive map showing user location and nearest station
- **FR-007**: System MUST calculate fares between any two metro stations
- **FR-007a**: System MUST provide station selection dropdowns with local autocomplete for fare calculator (origin and destination stations)
- **FR-008**: System MUST display fare information in Bangladeshi Taka (৳). Fares display as ৳1,234 (no decimals); any computed non-integer fare rounds up
- **FR-009**: System MUST show estimated travel time between stations using static heuristics only
- **FR-010**: System MUST provide station-to-station route information (no transfers in Phase-1; static line; time = stations_between * minutes_per_stop (fixed at 2 min))
- **FR-011**: System MUST display station amenities (if available in static data); do not fetch external nearby attractions in Phase-1
- **FR-012**: System MUST support both light and dark themes
- **FR-013**: System MUST work on mobile devices with touch-optimized interface
- **FR-014**: System MUST provide keyboard navigation for all interactive elements
- **FR-015**: System MUST display clear error messages when location search fails
- **FR-016**: System MUST handle geolocation denial gracefully with manual input fallback
- **FR-017**: System MUST show loading states during search and calculation operations
- **FR-018**: System MUST display station information in a clear, accessible format
- **FR-019**: System MUST provide search history for recent location searches (stored locally, max 3 entries, no sync/PII, clearable; respects Do Not Track)
- **FR-020**: System MUST show featured stations on the homepage for quick access
- **FR-021**: If geolocation denied/unavailable, System MUST provide manual input and landmark suggestions
- **FR-022**: Google Places autocomplete MUST be used for destination search; when daily quota is reached, fall back to manual lat/lng input; station selection dropdowns use local station data only
- **FR-023**: If user requests walking directions, System MUST open external directions in a new tab using origin (user point) → station
- **FR-024**: System MUST display explicit rationale before geolocation prompt: "We only use your location once to find nearby stations. We don't store it."; show a link to Privacy Policy; no precise location retained; Privacy link appears on every page footer and next to the geolocation CTA
- **FR-025**: When results are shown outside operating hours, System MUST display a subtle note ("Service typically operates ~07:30–22:00; check on arrival")
- **FR-026**: External directions default to Google Maps on web; on iOS devices, system may open Apple Maps; manual copyable address is always available
- **FR-027**: System MUST provide a "Shortcuts & Help" overlay (opened with "?") listing keyboard shortcuts and map controls
- **FR-028**: On provider/quota/error conditions, System MUST show a neutral message and keep manual lat/lng & station entry available
- **FR-029**: System MUST display 24-hour times and metric units only; all time estimates carry "(est.)"
- **FR-030**: A "Diagnostics off" toggle is available in Settings/About; when enabled (or when Do Not Track is detected), no search history is stored and any existing history is cleared immediately
- **FR-031**: Error/empty states use fixed strings from a copy deck section in this spec; QA can assert exact match
- **FR-032**: Fare formatting always uses ৳1,234 style (non-breaking space optional), minimum 0, and ceil() after all discounts. No decimals, no currency code alternatives
- **FR-033**: Service-hours note is computed using device local time in Asia/Dhaka (no DST). If the device TZ differs, still evaluate against Dhaka time
- **FR-034**: If a landmark string doesn't match the local alias list, show "Try station name or a different landmark" and keep manual lat/lng entry available
- **FR-035**: When prefers-reduced-motion is on, suppress non-essential UI transitions and any auto-pan/zoom animations; results update without animated motion
- **FR-036**: Directions link MUST include travelmode=walking and numeric origin/destination to 5+ decimal places; open in new tab with rel="noopener"
- **FR-037**: Station/landmark search is case/whitespace/diacritic-insensitive and tolerates 1-char typo for names ≥5 chars (e.g., "Farmgat" → Farmgate)
- **FR-038**: Nearest-station and fare results are announced via aria-live="polite" on update; loading uses aria-busy
- **FR-039**: When no station within 5 km, suggested stations list is sorted by distance asc, then alphabetical (tie-break)
- **FR-040**: When the map is unavailable, the list view exposes the same actions (open directions, copy address, etc.) as the map view
- **FR-041**: CTA labels use canonical strings from Copy Deck: "Use Current Location", "Retry Map", "Shortcuts & Help", "Clear History", "Open Directions"
- **FR-042**: When a map (or static map image) is shown, required map/data attributions are always visible, keyboard reachable, and open in a new tab with `rel="noopener noreferrer"`
- **FR-043**: All time stamps/notes are computed against Asia/Dhaka regardless of device TZ; show "local time" tooltip if device TZ differs
- **FR-044**: Search history stores only the raw input string, never coordinates; clearing history shows a confirmation toast and cannot be undone
- **FR-045**: With poor/no network after initial load, users can still: search station names/aliases, compute nearest using manual lat/lng, and compute fares (all from local data)
- **FR-046**: Distance formatting rules are locale-agnostic (always metric, decimal point ".", thin-space thousands separators optional); walking time uses ceil and appends "min (est.)"
- **FR-047**: App honors min width 320px, optimized for 1080p+, and renders correctly on 4K; layout follows Mobile/Tablet/Desktop breakpoints; no horizontal scroll on Tier-A browsers
- **FR-048**: Map style swaps with app theme in ≤200ms without noticeable reflow; verify road/POI contrast meets WCAG guidance for low-vision (legible roads and labels in both themes)
- **FR-049**: All map controls are keyboard-reachable; tab order: Skip link → search → results → map → footer; zoom and "recenter" buttons have aria-labels and visible focus
- **FR-050**: "Shortcuts & Help" overlay is a focus trap, opens with ?, closes with Esc and Close button, and returns focus to the opener
- **FR-051**: Diagnostics are on by default; if Do Not Track = true, diagnostics auto-off and remain off until explicitly enabled; toast "Settings saved." confirms state change
- **FR-052**: Each error/empty state also exposes a non-PII problem code (e.g., GEO_DENIED, NO_STATIONS, PROVIDER_FAIL, OUT_OF_AREA) for QA assertions and logs (frontend only)
- **FR-053**: All external links (directions, docs) open with target="_blank" rel="noopener noreferrer"; keyboard hint text provided ("opens in new tab")
- **FR-054**: UI strings in Copy Deck are the single source of truth; UI must render exact matches (case/punctuation). Add IDs to each string so QA can assert
- **FR-055**: System MUST implement comprehensive API quota management with rate limiting, daily limits, and graceful degradation
- **FR-056**: System MUST prevent API abuse with client-side rate limiting (max 10 requests per minute per user)
- **FR-057**: System MUST disable Google Places autocomplete when daily quota is reached and show manual input fallback
- **FR-058**: System MUST implement API key security with HTTP referrer restrictions and domain validation
- **FR-059**: System MUST cache API responses locally to minimize redundant requests and extend quota lifespan
- **FR-060**: System MUST monitor API usage and display quota status to users when approaching limits

### Key Entities *(include if feature involves data)*

- **Station**: Represents a metro station with unique ID, name, coordinates, amenities, and operational status
- **Fare**: Represents fare calculation between two stations with amount, travel time, and route details
- **Location**: Represents a geographic point with coordinates, address, and search context
- **SearchResult**: Represents search output with station information, distance, and walking directions

### Constants

- **walking_speed**: 75 m/min (for walking time calculations)
- **minutes_per_stop**: 2 minutes (for travel time between stations)
- **service_area_radius**: 25 km from Dhaka centroid
- **search_radius**: 5 km (maximum distance for "nearest station" search)
- **dhaka_centroid**: 23.7779, 90.3971 (coordinates for geofence calculations)
- **distance_display**: <1000 m → meters; ≥1000 m → km
- **km_decimals**: 1
- **data_version**: dmrtc_fares_2024-12-15
- **time_rounding**: ceil to whole minutes
- **service_hours**: 07:30–22:00 local (Asia/Dhaka)
- **directions_url_template**: origin {lat,lng} → destination {lat,lng} (walking)
- **google_places_daily_quota**: 1000 requests/day (free tier)
- **google_maps_daily_quota**: 28,000 map loads/day (free tier)
- **google_geocoding_daily_quota**: 40,000 requests/day (free tier)
- **autocomplete_min_chars**: 3 characters minimum
- **rate_limit_window**: 1 minute sliding window
- **max_requests_per_minute**: 10 requests (conservative limit)
- **api_key_restrictions**: HTTP referrer restrictions, IP restrictions

---

### Requirement ↔ ADR Traceability

| Area | Spec Anchor | ADR |
|---|---|---|
| Maps provider & lazy client load | FR-006, Article XI | ADR-0001 |
| Static data (stations/fares), offline fallback | FR-022, FR-045, Article VII | ADR-0002 |
| Copy Deck ownership, canonical strings | FR-031, FR-041, FR-054, Copy Deck | ADR-0003 |
| Diagnostics/DNT behavior | FR-030/051, Glossary "Search History" | ADR-0004 |

---

## Review & Acceptance Checklist

**GATE**: Automated checks run during main() execution

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Clarifications

### Session 2025-09-27

- Q: Map Integration Strategy → A: Interactive map with async loading and client-side components only
- Q: Static Data Source Strategy → A: Static data constants with all 16 stations and fare rules
- Q: Phase-1 Scope Clarification → A: Reclassified Phase-2 features, added explicit heuristics for walking/travel times
- Q: Performance & Accessibility Acceptance → A: Made criteria pass/fail blocking with specific measurable targets
- Q: Privacy & Data Retention → A: Search history stored locally only, max 3 entries, no sync/PII, clearable; respects Do Not Track

---

## Execution Status

### Processing Status

Updated by main() during processing

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---

## Constitutional Alignment Verification

### Article V (Performance) Compliance

- **LCP Target**: < 2.0s for initial page load
- **INP Target**: < 200ms for all interactions
- **JS Budget**: ≤ 100 KiB gz on first load
- **Performance Monitoring**: Lighthouse CI integration required

### Article IV (Accessibility) Compliance

- **WCAG 2.2 AA**: Full compliance required
- **Keyboard Navigation**: All interactive elements accessible
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: ≥ 4.5:1 for text, ≥ 3:1 for large text
- **Focus Management**: Visible focus indicators and logical tab order

### Article VII (Static Data) Compliance

- **Data Source**: Static data constants for all 16 stations and fare rules
- **No External APIs**: Station and fare data from local constants only
- **Version Control**: Data changes require deployment
- **Cost Optimization**: Zero external API calls for data retrieval

### Article VIII (UI/UX) Compliance

- **Design System**: Modern component library with consistent styling
- **Typography**: Ropa Sans as primary font family (single weight: 400)
- **Theme Support**: Light and dark mode with smooth transitions
- **Mobile-First**: Touch-optimized interface with responsive design
- **Interactive Elements**: Smooth micro-interactions and animations

### Article XI (Maps) Compliance

- **Map Provider**: Interactive map integration with async loading
- **Performance**: 60fps target for map interactions
- **Theme Integration**: Map styles switch with application theme
- **Privacy**: Geolocation only on user intent, no persistent location storage
- **Fallback**: Graceful degradation when map fails to load
- **Cost Optimization**: Lazy loading, local autocomplete, cached map instances to minimize API calls

### Article XII (Quality Gates) Compliance

- **Type Safety**: Strict mode with zero `any` types
- **Code Quality**: Linting with zero errors/warnings
- **Testing**: Comprehensive test coverage (unit, integration, E2E)
- **Performance**: Budget enforcement in CI/CD pipeline

### Article XIV (Security) Compliance

- **API Security**: Domain-restricted API keys with HTTP referrer restrictions
- **Rate Limiting**: Client-side rate limiting (10 requests/minute per user)
- **Quota Management**: Daily quota monitoring with graceful degradation
- **Security Headers**: CSP, HSTS, X-CTO, Referrer-Policy
- **No PII**: No personal data collection or storage
- **Dependencies**: Regular security audits and updates
- **API Abuse Prevention**: Request deduplication and caching strategies

### Article XXIV (Phase 1 Limitations) Compliance

- **No Accounts**: No user registration or authentication
- **No Payments**: Information only, no transaction processing
- **No Real-Time Data**: Static schedule and fare information
- **No Offline Maps**: Internet connection required for map functionality
- **English Only**: No internationalization in Phase 1
- **Minimal Analytics**: Basic diagnostics only, no user tracking

---

## Glossary

- **Service Area**: 25 km radius from Dhaka centroid; locations outside this area show "Out of service area" message
- **Nearest**: Station within 5 km radius with shortest distance to user location. Tie-break: prefer shorter walking time; if equal, first by alphabetical station name
- **Station Pair**: Origin and destination stations for fare calculation
- **Featured Stations**: Fixed order: Uttara North → Agargaon → Farmgate → Motijheel
- **Search History**: Last 3 location searches stored locally, no sync/PII, clearable, respects Do Not Track. Search history is cleared when user toggles 'Diagnostics off' or clicks 'Clear History'
- **Landmark Search**: Matches local alias list only (e.g., "Farmgate," "Motijheel commercial area"); no external POI calls
- **Map a11y**: "Skip to results" link must be visible on focus and operable via keyboard

---

## Copy Deck

### Error Messages (Canonical Strings)

| ID | String |
|---|---|
| err.provider_unavailable | Service temporarily unavailable. Please try manual entry or station search. |
| err.no_results | No stations found nearby. Try a different location or landmark. |
| err.out_of_area | Out of service area |
| err.landmark_not_found | Try station name or a different landmark |
| note.geo_denied | We only use your location once to find nearby stations. We don't store it. |
| note.service_hours | Service typically operates ~07:30–22:00; check on arrival |

### CTA Labels

| ID | String |
|---|---|
| cta.use_current_location | Use Current Location |
| cta.retry_map | Retry Map |
| cta.shortcuts_help | Shortcuts & Help |
| cta.clear_history | Clear History |
| cta.open_directions_walking | Open Directions (walking) |

### Toasts

| ID | String |
|---|---|
| toast.history_cleared | History cleared. |
| toast.settings_saved | Settings saved. |

### Landmark Aliases (Examples)

- "Farmgate" → Farmgate Station
- "Motijheel commercial area" → Motijheel Station  
- "Uttara North" → Uttara North Station

### Help Overlay

| ID | String |
|---|---|
| help.title | Shortcuts & Help |

### Problem Codes (Non-PII)

- **GEO_DENIED**: Geolocation permission denied
- **NO_STATIONS**: No stations found within search radius
- **PROVIDER_FAIL**: Map provider/API failure
- **OUT_OF_AREA**: Search point outside service area
- **NETWORK_ERROR**: Network connectivity issues
- **INVALID_INPUT**: Invalid search input provided

---

## Success Metrics

### Performance Targets (BLOCKING)

- **Core Web Vitals**: LCP < 2.0s, INP < 200ms, CLS < 0.10 (4G mobile)
- **Lighthouse Score**: ≥ 90 for Performance (mobile) - FAILURE BLOCKS RELEASE
- **Bundle Size**: JS ≤ 100 KiB gz, CSS ≤ 40 KiB gz
- **Search Response**: < 100ms for station search operations
- **Map Performance**: 60fps target for pan/zoom; theme switch updates map style within 200ms

### Accessibility Targets (BLOCKING)

- **axe-core**: 0 critical/serious violations - FAILURE BLOCKS RELEASE
- **Keyboard Navigation**: 100% of features accessible via keyboard; keyboard shortcuts for focus & zoom have labels
- **Screen Reader**: Full compatibility with major screen readers; SR labels on search, results, and map controls
- **Color Contrast**: All text meets minimum contrast ratios
- **Focus Management**: Visible focus states for all interactive elements

### User Experience Targets

- **Search Success Rate**: > 95% of valid searches return results
- **Error Recovery**: Clear error messages with actionable guidance
- **Mobile Usability**: Touch targets ≥ 44px, responsive design
- **Theme Consistency**: Seamless light/dark mode switching

### Quality Targets (BLOCKING)

- **Type Safety**: 100% TypeScript strict mode compliance
- **Test Coverage**: > 90% code coverage for critical paths
- **Lint Compliance**: Zero linting errors or warnings
- **Security**: Zero high-severity vulnerabilities
- **Fare Accuracy**: Fares must match official table 100%; add QA cross-check list; failures block release
- **Browser Matrix**: Tier-A browsers only; E2E smoke passes on latest Chrome, Safari, Firefox, Edge; mobile: iOS ≥16, Android Chrome ≥120
- **Data QA Gate**: Station dataset and fare table carry version tag; PR must include changelog entry for any data changes
- **Data Provenance**: Require data_version (e.g., dmrtc_fares_2024-12-15) and a one-line source note in the About page

---

## Definition of Done

### Technical Requirements (BLOCKING)

- [ ] All performance budgets met (LCP < 2.0s, INP < 200ms) - FAILURE BLOCKS RELEASE
- [ ] Lighthouse Performance ≥ 90 (mobile) - FAILURE BLOCKS RELEASE
- [ ] axe-core: 0 critical/serious violations - FAILURE BLOCKS RELEASE
- [ ] TypeScript strict mode with zero `any` types
- [ ] All tests passing (unit, RTL, E2E)
- [ ] Lint/format clean with zero errors
- [ ] Bundle size within defined limits
- [ ] Security headers properly configured
- [ ] Error boundaries implemented for all major components
- [ ] Fare accuracy: 100% match with official table - FAILURE BLOCKS RELEASE
- [ ] Browser matrix: E2E smoke passes on Tier-A browsers - FAILURE BLOCKS RELEASE
- [ ] Privacy Policy & Attribution links present on footer
- [ ] Glossary added to spec; constants documented (walking_speed, minutes_per_stop)
- [ ] SEO basics (title/description per page, sitemap.xml, robots.txt)
- [ ] Outside service hours note appears on results and fare views
- [ ] No horizontal scroll at 320px and 4K resolutions verified
- [ ] Map theme switch completes within 200ms budget
- [ ] Help overlay focus trap and Esc close functionality verified
- [ ] data_version surfaced on About page; changelog entry present for any station/fare change
- [ ] Problem codes exposed for all error/empty states
- [ ] Copy Deck strings render exact matches with IDs for QA assertion
- [ ] Map controls keyboard accessible with proper tab order
- [ ] Diagnostics default on, DNT auto-off behavior verified

### User Experience Requirements

- [ ] Search functionality works for all valid Dhaka locations
- [ ] Fare calculation accurate for all station pairs
- [ ] Map displays correctly in both light and dark themes
- [ ] Mobile interface optimized for touch interactions
- [ ] Keyboard navigation works for all features
- [ ] Loading states provide clear feedback
- [ ] Error messages are helpful and actionable

### Content Requirements

- [ ] All station data accurate and up-to-date
- [ ] Fare information matches official metro pricing
- [ ] Station amenities information complete
- [ ] Search suggestions relevant and helpful
- [ ] Featured stations showcase key locations
- [ ] About page provides clear project information

### Documentation Requirements

- [ ] README updated with setup instructions
- [ ] API documentation for all public interfaces
- [ ] Component documentation with usage examples
- [ ] Performance optimization notes documented
- [ ] Accessibility testing procedures documented

---

## ADR Appendix

> See also: [./adrs/README.md](./adrs/README.md) and [./adrs/CONTRIBUTING-adrs.md](./adrs/CONTRIBUTING-adrs.md) for how to propose, review, and evolve ADRs.

- [ADR-0001: Map Provider & Integration](./adrs/0001-maps-provider-integrations.md)  
  Status: Accepted — Decision: Use @react-google-maps/api with async client-only loading and lazy init.
- [ADR-0002: Static Data Source Strategy](./adrs/0002-static-data-source-strategy.md)  
  Status: Accepted — Decision: Bundle all station + fare data as TypeScript constants; no external fetch.
- [ADR-0003: Copy Deck & Canonical Strings](./adrs/0003-copy-deck-canonical-strings.md)  
  Status: Accepted — Decision: All UI strings managed in copy deck section with IDs for QA assertions.
- [ADR-0004: Diagnostics & Privacy Toggle](./adrs/0004-diagnostics-privacy-toggle.md)  
  Status: Accepted — Decision: Diagnostics toggle default ON; DNT auto-disable; local-only history.

---

## API Security & Quota Management

### Google Maps API Usage

**Required APIs**:

- **Google Places API**: Autocomplete for destination search
- **Google Maps JavaScript API**: Interactive map display
- **Google Geocoding API**: Address to coordinates conversion

**Daily Quota Limits (Free Tier)**:

- Places API: 1,000 requests/day
- Maps JavaScript API: 28,000 map loads/day
- Geocoding API: 40,000 requests/day

### Security Measures

**API Key Protection**:

- HTTP referrer restrictions (domain-specific)
- IP address restrictions (if needed)
- API key rotation strategy
- Environment variable storage

**Rate Limiting**:

- Client-side rate limiting: 10 requests/minute per user
- Request deduplication to prevent duplicate calls
- Debounced autocomplete (300ms delay)
- Cached responses to minimize API calls

**Quota Management**:

- Real-time quota monitoring
- Graceful degradation when limits reached
- User notification when approaching limits
- Manual input fallback when autocomplete disabled

### Abuse Prevention

**Request Validation**:

- Minimum query length (3 characters)
- Input sanitization and validation
- Duplicate request detection
- Malicious input filtering

**Caching Strategy**:

- Local storage for autocomplete results
- Session-based response caching
- TTL-based cache invalidation
- Offline capability for cached data

---

## Risk Assessment

### High-Risk Areas

- **Map Performance**: Map integration may impact Core Web Vitals
- **Geolocation Privacy**: User location handling must comply with privacy standards
- **Data Accuracy**: Static data must be kept current and accurate
- **Mobile Performance**: Touch interactions and responsive design complexity

### Mitigation Strategies

- **Performance**: Lazy load maps, optimize bundle size, implement performance budgets
- **Privacy**: Clear privacy policy, minimal data collection, user consent for geolocation
- **Data**: Regular data updates, validation scripts, error handling for missing data
- **Mobile**: Extensive mobile testing, progressive enhancement, touch optimization

### Contingency Plans

- **Map Failure**: Fallback to list view with distance calculations
- **Geolocation Denied**: Manual location input with clear instructions
- **Data Issues**: Graceful error handling with user-friendly messages
- **Performance Issues**: Progressive loading and skeleton screens

---
