<!--
Sync Impact Report:
Version change: 1.0.0 (initial version)
-->

# Constitution - Metro Station Finder

## Project Mission

Build a **fast, accessible, and impeccably engineered** web application that helps users find the nearest Dhaka metro station from any address or current location, and calculate fares between stations. The system is **AI‑first** (Spec‑Kit slash workflow), prioritizes **performance, maintainability, and clarity**, and remains **simple and focused** while leaving clean seams for future growth (multi‑city, new providers).

---

## Article I: Runtime & Tooling Sovereignty

**All development, build, test, and deployment operations SHALL use Bun as the exclusive runtime and package manager with Node.js latest.**

* **Node.js Latest**: Use the latest stable Node.js version (currently 24.8.0) for optimal performance and latest features
* **Bun Package Manager**: No npm, Yarn, or pnpm commands shall be used or documented
* All scripts in `package.json` MUST be executable with `bun run`
* CI/CD MUST install and use Bun (`oven-sh/setup-bun@v2`) with Node.js latest
* Dependencies are managed exclusively with `bun add` / `bun remove`; lockfile integrity enforced
* `bunfig.toml` pins exact versions and uses text lockfile for reviewable diffs
* **Engine Requirements**: `package.json` MUST specify `"engines": {"node": ">=24.0.0"}`

*Rationale: Bun yields superior performance and DX; Node.js latest provides cutting-edge features and performance improvements; Next.js 15 is fully compatible with Node.js latest; mixed package managers create inconsistency.*

---

## Article II: Type Safety as Foundation

**All code SHALL adhere to strict TypeScript with zero tolerance for `any` types.**

* `strict: true` with **all** strict flags enabled (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `isolatedModules`, etc.).
* Prefer inference; where unclear, explicitly type function parameters and returns.
* **Unknown at boundaries**: treat external/untrusted data as `unknown` and validate with **Zod** before use.
* Zod schemas for env config, station dataset, URL/query params, and user inputs; schemas co‑located with code.
* Any exceptional `any` MUST include a TODO, rationale, and remediation plan.

*Rationale: Type safety prevents runtime defects and enables fearless refactoring.*

---

## Article III: Server‑First Architecture

**React Server Components (RSC) SHALL be the default; Client Components only for essential interactivity.**

* Use RSC for data plumbing, static rendering, and streaming; minimize client JS.
* Client Components are limited to map interactions, geolocation, text input, theme toggle, and purposeful animations.
* Prefer declarative data via RSC over client fetch; use Suspense and streaming to reduce TTI.
* Progressive enhancement: core flows operate acceptably with reduced JS.

*Rationale: Server‑first improves performance, SEO, and developer focus.*

---

## Article IV: Accessibility as Requirement

**All interfaces SHALL meet WCAG 2.2 AA without exception.**

* Contrast: ≥ 4.5:1 (text), ≥ 3:1 (large/UI); visible focus; logical tab order.
* Proper semantics/roles/labels; screen‑reader compatibility; error states announced.
* Full keyboard support for all interactive elements and flows.
* Respect `prefers-reduced-motion`; **dark/light theme** support mandatory.
* No feature ships without a11y validation (automated checks + spot manual check).

*Rationale: Accessibility is a fundamental right; inclusive design benefits all.*

---

## Article V: Performance as UX (Budgets & Tactics)

**Performance SHALL be budgeted, measured, and enforced.**

* **Core Web Vitals (mobile 4G):** LCP < 2.0s, **INP < 200ms**, CLS < 0.10; Lighthouse Performance ≥ 90.
* **Initial budgets:** JS ≤ 100 KiB gz, CSS ≤ 40 KiB gz on first load; avoid heavy client libs.
* Lazy‑load non‑critical UI (map, heavy components); stream content with Suspense.
* Use `next/image` (responsive) and `next/font` (subsetted).
* Debounce inputs ≥ 300ms; memoize local search; implement client-side rate limiting (10 req/min) for API protection.
* Deterministic algorithms (distance, fare) complete **< 100ms**.

### Performance Regression Policy

* **CI Blocking**: If Lighthouse/INP drops more than 2 points, PR is blocked until addressed
* **Performance Budgets**: Enforced in CI; fails on regressions (Lighthouse CI or equivalent)
* **Monitoring**: Track Core Web Vitals trends; alert on significant degradation
* **Rollback Trigger**: Performance regressions > 5 points trigger immediate rollback consideration

### Scalability Hooks

* **Multi-City Data**: Design data structures to support multiple metro systems
* **Real-Time Feeds**: Architecture prepared for live schedule/status updates
* **Provider Abstraction**: `DataProvider` interface enables future API/KV/DB without breaking UI
* **Clean Seams**: All major components designed for future feature expansion

*Rationale: Speed is core UX and reach; scalability ensures long-term viability.*

---

## Article VI: Data Integrity & Validation

**All data SHALL be validated at boundaries using typed schemas.**

* **Zod** validates env vars, station dataset, URL params, and user input.
* Geographic constraints enforced (lat ∈ [-90, 90], lng ∈ [-180, 180]).
* Station IDs MUST exist in static dataset before computation.
* Errors use a consistent, typed client‑side problem‑details shape.
* Haversine and fare rules are pure, deterministic, and unit‑tested.

*Rationale: Boundary validation protects system integrity and user trust.*

---

## Article VII: Static Data as Single Source of Truth (Phase 1)

**Station and fare data SHALL be static, typed, and versioned; design for future providers.**

* Station metadata lives in typed TS modules under `lib/data/`; never hardcoded in components.
* Fare rules implemented as pure functions; co‑locate schema + tests.
* Data changes require deployment (acceptable for v1).
* Introduce a `DataProvider` seam (`StaticDataProvider` default) to enable future API/KV/DB without breaking UI.

*Rationale: Simplicity and reliability now; easy migration later.*

---

## Article VIII: UI/UX & Design System

**Design SHALL be modern, clean, minimal, and highly interactive with intuitive user flows.**

### Design Philosophy

* **Modern & Clean**: Minimalist aesthetic with purposeful whitespace and clear visual hierarchy
* **Interactive & Intuitive**: Every interaction must feel natural and provide immediate feedback
* **Mobile-First**: Touch-friendly interfaces with appropriate sizing and spacing
* **Consistent Theming**: Dark/light mode parity with semantic color tokens
* **Performance-Driven**: Smooth animations that enhance UX without compromising speed

### Component Standards

* **shadcn/ui** (Radix-based) for accessible, consistent component primitives
* **Tailwind CSS** as utility-first styling layer with custom design tokens
* **Design Tokens Enforcement:** All spacing/colors/fonts come from centralized tokens; no inline Tailwind classes
* **Ropa Sans** as primary font family via `next/font` for optimal loading
* **Framer Motion** for purposeful micro-interactions; respect `prefers-reduced-motion`
* **Lucide React** icons for consistency; decorative icons marked `aria-hidden`
* **next-themes** for theme state management; CSS variables drive all colors

### User Interaction Patterns

* **Google Places Autocomplete**: 3+ character minimum, debounced 300ms, with quota management and rate limiting
* **Map Integration**: Pin A (user location) → Pin B (selected destination) with route visualization
* **Progressive Disclosure**: Information cards appear contextually at bottom of viewport
* **Gesture Support**: Swipe, pinch, tap interactions optimized for mobile
* **Loading States**: Skeleton screens and progress indicators for all async operations

*Rationale: Modern UX patterns create trust and engagement; consistency enables rapid development.*

---

## Article IX: React Patterns & Component Design

**Components SHALL be small, typed, and composable using modern React 19 patterns.**

* **Server Components First**: Use React Server Components (RSC) as default; Client Components only for essential interactivity
* **Modern React 19 Patterns**: Leverage `use()` hook, Actions API, `useOptimistic`, and partial hydration
* **Form Handling**: Prefer **uncontrolled inputs + form actions** for simple forms; use `useActionState` for complex form state
* **Performance Optimization**: Minimal `useMemo`/`useCallback` unless profiling justifies; let React 19 compiler optimize
* **Custom Hooks**: Extract reusable hooks (`useNearestStation`, `useThemeSync`, etc.) with strong types
* **Error Boundaries**: Implement comprehensive error boundaries for all major components
* **Suspense Integration**: Use Suspense boundaries for streaming and lazy loading
* **Co-location**: Tests and stories (if added) near components; keep public APIs stable

*Rationale: Modern React 19 patterns improve performance, developer experience, and predictability for both humans and LLMs.*

---

## Article X: Site Structure & Layout Architecture

**Site structure SHALL be intuitive, content-focused, and optimized for core user journeys.**

### Page Hierarchy

* **Homepage**: Hero section with search input, featured stations, quick access to fare calculator
* **Station Finder**: Primary search interface with autocomplete, map view, and results
* **Fare Calculator**: Station-to-station fare calculation with route visualization
* **Documentation**: API docs, usage guides, and developer resources
* **About**: Project information, data sources, and contact details

### Layout Principles

* **Header**: Persistent navigation with theme toggle, search shortcut, and mobile menu
* **Main Content**: Full-width map with overlay controls; responsive sidebar for desktop
* **Bottom Sheet**: Mobile-first information cards that slide up from bottom
* **Floating Action Button**: Quick access to geolocation and search on mobile
* **Footer**: Links, data attribution, and social links

### Layout Breakpoints

* **Mobile**: 320px-768px (single column, bottom sheet navigation)
* **Tablet**: 768px-1024px (sidebar + map, enhanced touch targets)
* **Desktop**: 1024px+ (full sidebar, hover states, keyboard shortcuts)

### Content Strategy

* **Homepage**: Value proposition, search CTA, featured stations, quick fare check
* **Search Results**: Map + list view, distance/fare info, station details
* **Station Details**: Photos, amenities, real-time info, nearby attractions
* **Fare Results**: Route visualization, cost breakdown, alternative options

*Rationale: Clear information architecture reduces cognitive load and improves task completion.*

---

## Article XI: Maps & Geolocation

**Mapping SHALL be efficient, privacy‑aware, theme‑aware, and extremely performant.**

### Map Implementation Standards

* **@react-google-maps/api** with async loader; mount map only when needed; keep instance stable.
* **Local station autocomplete** (Fuse or simple filter) as default → zero external calls; debounce ≥ 300ms.
* **Google Places Autocomplete** for destination search with 300ms debounce, client-side rate limiting (10 req/min), and quota management.
* **Haversine** for nearest‑station; avoid Distance Matrix until explicitly scoped.
* Geolocation only on user intent (button); handle denial gracefully; do not persist precise location.
* Map styling switches with theme (dark/light); markers clustered only if necessary.

### Map Performance Requirements

* **Smooth Interactions**: Target 60fps for all map interactions (pan, zoom, rotate) - best effort
* **Lazy Loading**: Load map only when user interacts with map-related features
* **Stable Map Instance**: Keep map instance stable across re-renders
* **Debounced Autocomplete**: Local autocomplete debounced ≥300ms
* **Memory Management**: Clean up event listeners and map instances properly
* **Marker Optimization**: Use virtualization/clustering when N>100 markers
* **Theme Switching**: Style swap from `lib/map/styles.ts` without performance impact

### Map Styling Implementation

* **Theme Switching**: Smooth transition between light and dark map styles
* **Performance**: Styling changes must not impact map performance
* **Consistency**: Map styles must align with overall application theme
* **Accessibility**: Ensure sufficient contrast for all map elements
* **Styling Configuration**: Map styles defined in `lib/map/styles.ts`; constitution references the file

#### Light Mode Map Style Specifications

* **Landscape**: Light gray (#f9f9f9) background for clean, minimal look
* **Roads**: Subtle road styling with desaturated colors
* **Water**: Soft blue (#acbcc9) with reduced saturation
* **Parks**: Light green (#c5dac6) for natural areas
* **Administrative**: Reduced visibility for cleaner appearance
* **POI**: Minimized point of interest visibility

#### Dark Mode Map Style Specifications

* **Overall**: Desaturated theme with blue-gray hue (#e7ecf0)
* **Roads**: Reduced saturation (-70) for subtle road visibility
* **Transit**: Hidden transit features for cleaner dark appearance
* **POI**: Hidden points of interest for minimal dark theme
* **Water**: Simplified water visibility with reduced saturation

#### Map Styling Implementation Requirements

* **Theme Switching**: Smooth transition between light and dark map styles
* **Performance**: Styling changes must not impact map performance
* **Consistency**: Map styles must align with overall application theme
* **Accessibility**: Ensure sufficient contrast for all map elements
* **Customization**: Easy to modify and extend styling configurations

### Map Responsive Design & Resolution Support

* **Resolution Support**: 320px minimum width, optimized for 1080p and above, 4K support
* **Responsive Breakpoints**: Mobile (320-767px), Tablet (768-1023px), Desktop (1024px+)
* **Dynamic Sizing**: Map container adapts to available viewport space
* **Aspect Ratio**: Maintain 16:9 ratio on desktop, adapt on mobile
* **Touch Optimization**: Larger touch targets on mobile devices
* **Gesture Support**: Swipe, pinch, and tap interactions on mobile
* **Keyboard Navigation**: Full keyboard support on desktop

### Map Interaction Optimization

* **Focus Animations**: Elegant transitions when switching between routes
* **Event Handling**: Optimized event listeners for map interactions
* **Performance**: All interaction requirements defined in Map Performance Requirements above

### Cross-Device Consistency

* **Visual Hierarchy**: Maintain consistent information architecture
* **Interaction Patterns**: Similar user flows across all devices
* **Content Priority**: Most important information visible on all screen sizes
* **Navigation**: Consistent navigation patterns with device-appropriate controls
* **Accessibility**: Full accessibility support across all device types

*Rationale: Great UX without unnecessary API cost or data leakage, with exceptional performance and visual appeal.*

---

## Article XI-B: API Security & Quota Management

**API usage SHALL be secured, monitored, and protected against abuse with comprehensive quota management.**

### API Security Standards

* **Domain Restrictions**: Google Maps API key restricted to specific domains and HTTP referrers
* **Rate Limiting**: Client-side rate limiting of 10 requests per minute per user
* **Request Validation**: Input sanitization, minimum query length (3 characters), and duplicate request detection
* **Caching Strategy**: Local storage caching to minimize API calls and extend quota lifespan
* **Environment Security**: API keys stored in environment variables only, never in repository

### Quota Management

* **Daily Limits**: Places API (1,000 req/day), Maps JavaScript API (28,000 loads/day), Geocoding API (40,000 req/day)
* **Graceful Degradation**: Automatic fallback to manual input when quota exceeded
* **User Notifications**: Clear communication when approaching or exceeding limits
* **Quota Monitoring**: Real-time quota status tracking and display
* **Abuse Prevention**: Request deduplication, malicious input filtering, and usage pattern monitoring

### Cost Protection

* **Conservative Limits**: 10 requests/minute per user (well within free tier)
* **Caching Strategy**: Reduces API calls by 70-80% through intelligent caching
* **Request Optimization**: Debounced autocomplete and duplicate request elimination
* **Fallback Mechanisms**: Manual input always available when autocomplete disabled

*Rationale: Protect against API abuse, prevent quota exhaustion, and maintain cost control while ensuring excellent user experience.*

---

## Article XII: Quality Gates & Testing Policy

**No code SHALL merge without passing comprehensive automated checks.**

* **Ultracite (Biome)**: lint/format = **0** errors/warnings.
* **TypeScript**: strict typecheck = **0** errors.
* **Tests**:

  * Unit (Vitest) for utilities (distance, fare) and component logic.
  * RTL for accessible interactions and state.
  * Playwright E2E for critical journeys (load, find nearest, theme toggle).
* Performance budgets enforced; CI fails on regressions (Lighthouse CI or equivalent).
* **Lefthook** pre‑commit runs format/lint/tests on staged files.

*Rationale: Automated gates prevent regressions and institutionalize quality.*

---

## Article XIII: Developer Experience & Automation

**DX SHALL be automated, fast, and opinionated.**

* **Ultracite** replaces ESLint + Prettier; single source of truth for style and lint.
* Consistent editor config; format‑on‑save; AI instructions (if any) mirror lint rules.
* **Conventional Commits** enforced via **commitlint** (`commit-msg` hook).
* **Lefthook** orchestrates pre‑commit checks; CI repeats all gates.
* **Vitest** watch for rapid TDD; **Playwright** traces on flaky E2E failures.

### CI/CD Rules of Engagement

* **Branch Protection:** `main` requires: typecheck, lint, unit, e2e, Lighthouse budget
* **Preview Environments:** Every PR deploys a preview; reviewers validate a11y/perf
* **Cache Strategy:** Bun cache persisted between jobs; Playwright browsers cached
* **Release Automation:** `main` merges trigger `semantic-release` and Vercel production deploy if budgets pass

### Commit Conventions & PR Templates

* **Conventional Commits:** Enforced via `commitlint` (`commit-msg` hook)
* **PR Templates:** Must include "Checklist: perf/a11y/security/tests/type-safety"
* **Commit Message Format:** `type(scope): short precise description` (max 50 chars)
* **Release Notes Ready:** Commit messages must be suitable for automatic release notes
* **Simple & Clear:** Avoid verbose descriptions; focus on what changed
* **Examples:**
  * `feat(auth): add google oauth login`
  * `fix(maps): resolve marker positioning bug`
  * `docs(readme): update setup instructions`
  * `refactor(api): simplify station data fetching`
* **PR Requirements:** All checklist items must be verified before merge

### Local Developer Experience

* **Environment Setup:** Required `.env.example` with all necessary variables
* **VSCode Settings:** Pre-configured settings for consistent development experience
* **Onboarding Friction:** Minimal setup time; single command to get running
* **Documentation:** Clear setup instructions in README with troubleshooting guide

*Rationale: Automation creates predictable, rapid iteration loops.*

---

## Article XIV: Security & Privacy

**Security and privacy SHALL be enforced from day one.**

* No PII collection/storage in v1; privacy‑friendly defaults.
* Google Maps API key is **domain‑restricted** with HTTP referrer restrictions; secrets never in repo; env‑only.
* **API Security**: Rate limiting (10 req/min), quota management, and abuse prevention implemented
* Pre‑GA headers enforced: CSP, HSTS, X‑CTO, Referrer‑Policy; no unsafe inline scripts/styles.
* Dependencies audited and updated promptly; supply‑chain vigilance.

### CI/CD Security Standards

* **Dependency Scanning:** Automated vulnerability scanning with immediate patch requirements
* **Secret Scanning:** Prevent secrets from being committed to repository
* **Security Headers:** Automated testing of security headers in preview environments
* **Access Control:** Review and audit access to production environments

### Dependency Security

* **Lockfile Integrity:** `bun.lock` integrity enforced; no manual lockfile modifications
* **Dependency Pinning:** Exact versions pinned; automated updates via Renovate/Dependabot
* **Supply Chain Security:** Audit all dependencies for known vulnerabilities weekly
* **Update Strategy:** Keep dependencies current while maintaining stability

### Feature Flagging & Rollout Security

* **Feature Flags:** Use feature flags to control feature rollout; avoid exposing partial features
* **Gradual Rollout:** New features deployed behind flags with gradual user exposure
* **Kill Switch:** Ability to disable features instantly in production
* **A/B Testing:** Secure A/B testing implementation without data leakage

### Incident Response

* **Response Playbook:** Documented incident response procedures (placeholder for future)
* **Communication Plan:** Clear escalation and communication protocols
* **Recovery Procedures:** Automated rollback and recovery processes
* **Post-Incident Review:** Mandatory post-incident analysis and improvement

*Rationale: Reduce risk surface early; protect users and keys.*

---

## Article XV: Git & Releases

**History SHALL be clear, and releases fully automated.**

* Conventional Commits (`type(scope): short precise description (phase X)`), max 50 chars, release-notes ready.
* **Phase-Based Structure:** Each phase gets one commit for clean release notes (11 total commits for v1.0.0)
* **semantic-release** automates SemVer tagging and release notes on main.
* Every merge to main is releasable; PR checks are required.
* Commit messages must be concise and suitable for automatic release notes generation.

### CI/CD Release Standards

* **Automated Versioning:** `semantic-release` determines version based on conventional commits
* **Release Notes:** Automated generation of changelog and release notes
* **Quality Gates:** All quality checks must pass before release
* **Rollback Strategy:** Automated rollback capability for production issues

### Rollback SLA

* **Production Outages:** Rollback must complete in <10 minutes for critical production issues
* **Performance Regressions:** Rollback triggered for >5 point Lighthouse/INP drops
* **Automated Rollback:** CI/CD system capable of automated rollback on failure detection
* **Recovery Time:** Maximum 15 minutes from issue detection to rollback completion

*Rationale: Structured history enables automation and trust.*

---

## Article XVI: Documentation & Best Practices

**Documentation SHALL be living, accurate, and always reflect latest industry standards.**

### Documentation Requirements

* **MCP Tools Integration**: Fetch latest documentation before implementing any technology
* **No Hallucinated Code**: All implementations MUST be based on verified, current documentation
* **Best Practices Compliance**: Follow latest industry standards and official recommendations
* **Version-Specific Guidance**: Pin to specific versions and document upgrade paths

### Code Documentation Standards

* **JSDoc Comments**: All public APIs, complex functions, and business logic
* **Inline Comments**: Explain "why" not "what" for non-obvious decisions
* **Type Documentation**: Complex types and interfaces must have usage examples
* **Performance Notes**: Document performance implications and optimization opportunities
* **Accessibility Notes**: Document a11y considerations and testing requirements

### Development Practices

* **Latest Patterns**: Use modern React patterns, Next.js features, and TypeScript capabilities
* **Performance-First**: Every implementation must consider performance implications
* **Efficient Algorithms**: Optimize for speed, memory usage, and bundle size
* **Error Handling**: Comprehensive error boundaries and user-friendly error messages
* **Testing Coverage**: Document test strategies and coverage requirements

### Documentation Structure

* **README**: Setup, scripts, environment variables, and development workflow
* **API Documentation**: Component APIs, hooks, and utility functions
* **ADR**s: Architecture Decision Records for significant technical decisions
* **Code Comments**: LLM-friendly comments that explain intent and contracts

*Rationale: Accurate documentation prevents bugs, enables rapid development, and ensures maintainability.*

---

## Article XVII: Code Quality & Efficiency Standards

**Code SHALL be extremely efficient, performance-driven, and follow latest industry patterns.**

### Performance-Driven Development

* **Bundle Optimization**: Tree-shaking, code splitting, and dynamic imports for optimal loading
* **Runtime Performance**: Memoization, virtualization, and efficient algorithms
* **Memory Management**: Prevent memory leaks, optimize re-renders, and manage state efficiently
* **Network Optimization**: Minimize API calls, implement caching strategies, and optimize data fetching
* **Rendering Performance**: Use React.memo, useMemo, useCallback judiciously based on profiling

### Code Efficiency Standards

* **Algorithmic Complexity**: O(n) or better for user-facing operations; document O(n²) or worse
* **Bundle Size**: Every dependency must justify its inclusion; prefer smaller alternatives
* **Runtime Speed**: Critical paths must complete in < 100ms; document and test performance
* **Memory Usage**: Monitor and optimize memory consumption; avoid unnecessary object creation
* **Network Efficiency**: Minimize data transfer; implement proper caching and compression

### Modern Development Patterns

* **React 19 Features**: Use latest React patterns, concurrent features, and optimization techniques
* **Next.js 15 Capabilities**: Leverage App Router, Server Components, and streaming
* **TypeScript 5.x**: Use latest type features, utility types, and strict mode capabilities
* **Modern CSS**: CSS Grid, Flexbox, Container Queries, and modern layout techniques
* **Web APIs**: Use latest browser APIs with proper fallbacks and progressive enhancement

### Code Organization

* **Single Responsibility**: Each function, component, and module has one clear purpose
* **Composition over Inheritance**: Favor composition patterns and higher-order components
* **Pure Functions**: Prefer pure functions for business logic; document side effects
* **Error Boundaries**: Comprehensive error handling with user-friendly fallbacks
* **Type Safety**: Leverage TypeScript's type system to prevent runtime errors

### Documentation & Comments

* **JSDoc Standards**: Document all public APIs with examples and parameter descriptions
* **Inline Comments**: Explain complex business logic, performance optimizations, and workarounds
* **Type Comments**: Document complex types, generics, and type constraints
* **Performance Comments**: Document performance implications and optimization opportunities
* **Accessibility Comments**: Document a11y considerations and testing requirements

*Rationale: Efficient code reduces maintenance burden, improves user experience, and enables scaling.*

---

## Article XVIII: Browser Support Matrix

**The application SHALL clearly define supported browsers and fallback behavior.**

### Browser Support Tiers

* **Tier A (fully supported):** Latest Chrome, Edge, Firefox, and Safari; iOS Safari ≥ 16; Android Chrome ≥ 120.
* **Tier B (best‑effort):** One major version behind Tier A.
* **Not Supported:** IE, legacy Android WebView, desktop Safari < 16.

### Progressive Enhancement Strategy

* **Core Features:** Nearest station search and fare calculation remain usable without JS‑heavy UI
* **Map Features:** Interactive map requires JavaScript; graceful fallback to static map or list view
* **Feature Detection:** Use capability checks (e.g., `navigator.geolocation`) with graceful fallbacks
* **Performance:** Optimize for Tier A browsers while ensuring basic functionality on Tier B

### Fallback Behavior

* **JavaScript Disabled:** Show static station list with basic search functionality
* **Geolocation Denied:** Provide manual location input with clear instructions
* **Map API Unavailable:** Display station list with distance calculations
* **Modern Features Unsupported:** Graceful degradation to core functionality

*Rationale: Explicit support avoids surprise regressions and sets QA scope.*

---

## Article XIX: Error Handling & Empty States

**Errors SHALL be typed, user‑safe, and instructive; empty states SHALL be designed.**

### Typed Error System

```typescript
export type UiProblem = {
  code: 'GEO_DENIED'|'NO_STATIONS'|'INVALID_COORDS'|'NETWORK_FAIL'|'UNKNOWN';
  message: string; // user‑safe
  hint?: string;   // recovery guidance
}
```

### Error Boundaries

* **Map Component:** Error boundary around map with friendly fallback and retry
* **Search Component:** Error boundary for search failures with alternative suggestions
* **Heavy Client Components:** Individual error boundaries for each interactive component

### Empty States Design

* **No Results:** Suggest popular stations and search tips ("Try a nearby landmark")
* **Geolocation Denied:** Offer manual search and explain privacy stance
* **Network Failure:** Show retry button with offline mode suggestions
* **Loading States:** Skeleton screens and progress indicators for all async operations

### Error Logging

* **Non-PII Context:** Only capture browser info, feature flags, and error codes
* **User-Safe Messages:** Never log sensitive user data or personal information
* **Recovery Guidance:** Provide actionable hints for error resolution

### Error Monitoring Integration

* **Observability Platform:** Integrate with error observability (Sentry, LogRocket, etc.) for non-PII client errors
* **Error Tracking:** Track error rates and patterns for quality improvement
* **Alert Thresholds:** Set up alerts for error rate spikes or critical failures
* **Error Boundaries:** Comprehensive error boundary coverage for all major components

*Rationale: Predictable, humane failure modes improve trust.*

---

## Article XX: Observability & Minimal Telemetry

**Collect minimal, privacy‑respecting diagnostics strictly for quality.**

### Privacy-First Approach

* **No PII Collection:** Never collect personal information, location data, or search queries
* **Opt-Out Respect:** Honor `Do Not Track` header and provide "Diagnostics off" toggle
* **Minimal Data:** Only collect essential performance and error metrics

### Performance Monitoring

* **Core Web Vitals:** LCP/INP samples via `web-vitals` where available
* **Hydration Timing:** Track client-side hydration performance
* **Bundle Analysis:** Monitor bundle size and loading performance
* **Error Rates:** Count UI errors by code (from `UiProblem`), not stack traces

### Quality Metrics

* **Feature Usage:** Anonymous feature adoption rates (search, map, fare calc)
* **Performance Budgets:** Track against defined performance targets
* **Accessibility:** Monitor a11y error rates and compliance metrics

*Rationale: Improve quality without profiling users.*

---

## Article XXI: Dependency Policy

**Dependencies SHALL be adopted and retained only with clear value and health.**

### Adoption Criteria

* **Measurable Benefit:** Clear DX or performance improvement with quantified impact
* **Active Maintenance:** Regular updates, responsive maintainers, clear roadmap
* **Permissive License:** MIT, Apache 2.0, or compatible licenses only
* **Bundle Impact:** Runtime deps must be < 10 KiB gz unless explicitly justified

### Review Process

* **Weekly Audits:** Automated vulnerability scanning with immediate patch requirements
* **Bundle Analysis:** Track bundle size impact for every dependency addition
* **Health Checks:** Monitor package maintenance status and community adoption
* **Removal Policy:** Replace stale or heavy deps with native/first-party alternatives

### Security Standards

* **Supply Chain Security:** Audit all dependencies for known vulnerabilities
* **License Compliance:** Ensure all licenses are compatible with project goals
* **Update Strategy:** Keep dependencies current while maintaining stability

*Rationale: Prevent silent bloat and supply‑chain risk.*

---

## Article XXII: Legal & Attribution

**All third‑party content SHALL be attributed and licensed appropriately.**

### Maps Attribution

* **Google Maps:** Display required attribution per Google Maps ToS
* **Map Data:** Attribute data providers and maintain compliance
* **Styling:** Ensure custom map styles comply with usage terms

### Data Sources

* **Metro Data:** Attribute Dhaka Metro data providers in About section
* **License Terms:** List data license and usage terms clearly
* **Updates:** Maintain current attribution as data sources change

### Icons & Fonts

* **Icon Licensing:** Ensure all icons allow bundling and distribution
* **Font Licensing:** Verify font licenses for web usage and embedding
* **Notice Files:** Include required NOTICE files for licensed content

### Legal Compliance

* **Terms of Service:** Comply with all third-party service terms
* **Privacy Policy:** Maintain clear privacy policy for data handling
* **Accessibility:** Ensure legal compliance with accessibility requirements

*Rationale: Legal clarity prevents takedowns and builds credibility.*

---

## Article XXIII: Governance & Compliance

**Constitutional authority SHALL be enforced through clear governance procedures and compliance verification.**

### Amendment Procedure

1. **Document Rationale & Impact**: Clear justification for constitutional changes
2. **Update Constitution + ADR**: Both constitution and Architecture Decision Records updated
3. **Migration Plan**: Implementation strategy for breaking changes
4. **Semantic-Release Version Bump**: Automated versioning for constitutional changes
5. **Maintainer Approval**: Required approval from project maintainers

### Compliance Enforcement

* **PR Verification**: All PRs MUST verify performance, a11y, security, tests, and type-safety checklists
* **Constitutional Violations**: Reject PRs that violate constitution regardless of functionality
* **Quality Gates**: No code merges without passing comprehensive automated checks
* **Documentation Updates**: Constitution changes require corresponding documentation updates

### ADR Requirements

* **Major Architectural Decisions**: Every significant technical decision SHALL have an ADR
* **Decision Tracking**: ADRs must be created before implementation begins
* **Review Process**: ADRs require team review and approval
* **Living Documents**: ADRs must be updated when decisions change

*Rationale: Clear governance ensures constitutional compliance and prevents drift.*

---

## Article XXIV: Non-Goals (Phase 1)

**Explicitly out of scope for v1:** accounts/auth, payments, real‑time updates, offline maps, multi‑language, server APIs beyond static hosting, analytics beyond minimal diagnostics.

### Phase 1 Limitations

* **No User Accounts:** No registration, login, or personal data collection
* **No Payment Integration:** Information only, no ticket purchasing or payment processing
* **No Real-Time Data:** Static schedule and fare information only
* **No Offline Maps:** Map functionality requires internet connection
* **No Multi-Language:** English only for Phase 1
* **No Server APIs:** Static hosting only, no backend services
* **No Advanced Analytics:** Minimal diagnostics only, no user tracking

### Future Considerations

* **Phase 2 Planning:** Document potential features for future phases
* **Architecture Preparation:** Design with future features in mind
* **Data Structure:** Ensure current data structure can support future enhancements

### Internationalization Strategy (Future)

* **Centralized Translation Files:** All user-facing strings in translation files; no hardcoded strings
* **Language Support:** Architecture prepared for multi-language support
* **Locale Management:** Date/time/number formatting based on user locale
* **RTL Support:** Design system prepared for right-to-left languages

### Analytics Kill Switches

* **Telemetry Control:** Clear "Diagnostics off" toggle for users
* **Opt-Out Respect:** Honor `Do Not Track` header and user preferences
* **Data Deletion:** Ability to delete all collected data on user request
* **Privacy by Default:** Minimal data collection with explicit user consent

*Rationale: Protect focus and speed for Phase 1 delivery.*

---

## Article XXV: Delivery Workflow (Spec‑Kit)

**Slash workflow SHALL govern delivery; clarifications are a hard gate.**

* `/constitution` → `/specify` (MVP scope, acceptance criteria, open questions) → `/plan` (thin slices) → `/tasks` (actionable, test‑backed) → `/implement` (code + tests) → `/clarify` (resolve ambiguity) → `/analyze` (outcomes, perf/a11y/security checks).
* Each slice ships tests + docs; no vague tasks or open questions left unaddressed.
* Prompts/specs deterministic; consistent naming; small focused files.

### Agent Rules

* **Always target specific file paths**; never create new directories without specification
* **Never invent APIs**; when unsure, run `/clarify` to resolve ambiguity
* **Keep PRs "thin vertical slice"** + tests; avoid large, multi-feature changes
* **Don't bypass Lefthook or CI gates**; all code must pass automated checks

*Rationale: Process discipline keeps humans and LLMs aligned.*

---

## Article XXVI: File Naming & Import Conventions

**File naming and import structures SHALL follow consistent, predictable patterns for maintainability.**

### File Naming Conventions

* **Components**: PascalCase for React components (`StationCard.tsx`, `FareCalculator.tsx`)
* **Utilities**: camelCase for utility functions (`calculateDistance.ts`, `formatFare.ts`)
* **Types**: PascalCase with `.types.ts` suffix (`Station.types.ts`, `Fare.types.ts`)
* **Constants**: UPPER_SNAKE_CASE for constants (`STATION_DATA.ts`, `FARE_RULES.ts`)
* **Hooks**: camelCase with `use` prefix (`useNearestStation.ts`, `useThemeSync.ts`)
* **Pages**: kebab-case for routes (`station-finder/page.tsx`, `fare-calculator/page.tsx`)

### Import Structure Standards

* **Grouped Imports**: React imports first, then third-party, then local imports
* **Absolute Imports**: Use `@/` alias for clean import paths (`@/components/ui/Button`)
* **Barrel Exports**: Create `index.ts` files for clean re-exports
* **Type Imports**: Use `import type` for TypeScript types
* **Default Exports**: Prefer named exports for better tree-shaking

### README.md Standards

* **Auto-Update Triggers**: Update README when adding new features, changing setup, or modifying scripts
* **Essential Sections**: Setup, scripts, environment variables, project structure, contributing guidelines
* **Code Examples**: Include working code snippets for common tasks
* **Visual Hierarchy**: Use clear headings, bullet points, and code blocks
* **Keep Current**: Remove outdated information; add migration notes for breaking changes

*Rationale: Consistent naming and imports improve developer experience and reduce cognitive load.*

---

## Article XXVII: Phase 1 Content Strategy & Site Architecture

**Phase 1 content SHALL be minimal, focused, and provide immediate value while establishing foundation for growth.**

### Core Content Philosophy

* **Essential First**: Only include content that directly serves the primary user journey
* **Progressive Enhancement**: Start simple, add complexity based on user feedback
* **Mobile-First Content**: Prioritize mobile content hierarchy and touch interactions
* **Performance-Focused**: Every piece of content must justify its impact on load time
* **Accessibility-First**: All content must be accessible and screen-reader friendly

### Phase 1 Site Structure (Minimal Viable Content)

#### Homepage Content (Bento Grid Layout)

* **Hero Search Card** (2x2 grid cell):
  * Clear value proposition: "Find the nearest metro station in Dhaka"
  * Primary search input with placeholder: "Enter your location or address"
  * Call-to-action: "Find Nearest Station" button
  * Background: Subtle gradient or metro-themed imagery

* **Quick Stats Cards** (1x1 grid cells):
  * "16 Stations" (total operational stations)
  * "20.1 km" (system length)
  * "Every 8-12 min" (service frequency)
  * Each with icon and brief description

* **Featured Stations Card** (2x1 grid cell):
  * Horizontal scrollable list of 4 key stations
  * Uttara North, Agargaon, Farmgate, Motijheel
  * Each with brief "Nearby" description and thumbnail
  * Clickable to show on map

* **Quick Fare Check Card** (1x2 grid cell):
  * Simple origin/destination selector
  * Instant fare display with visual emphasis
  * "Calculate Fare" button with prominent styling

* **Service Info Card** (1x1 grid cell):
  * Operating hours and basic service information
  * Link to detailed schedule page
  * Emergency contact or service updates

#### Station Finder Page

* **Search Interface**:
  * Google Places autocomplete (3+ character minimum)
  * Current location button
  * Search history (last 3 searches)
* **Map View**:
  * Interactive Google Maps
  * User location pin (Pin A)
  * Nearest station pin (Pin B)
  * Route visualization
* **Results Panel**:
  * Station name and distance
  * Walking directions
  * Fare information
  * Station amenities (elevator, escalator, etc.)

#### Fare Calculator Page

* **Route Selection**:
  * Origin station dropdown
  * Destination station dropdown
  * Date/time picker (for peak/off-peak)
* **Fare Display**:
  * Single journey fare
  * MRT Pass discount information
  * Alternative route options
* **Route Details**:
  * Travel time estimate
  * Station-to-station breakdown
  * Transfer information (if applicable)

### Content Design Patterns (Inspired by Reference Images)

#### Information Cards

* **Clean Typography**: Sans-serif fonts with clear hierarchy
* **Subtle Shadows**: Rounded corners with minimal elevation
* **Color Coding**: Consistent color system for different content types
* **Progressive Disclosure**: Essential info first, details on interaction

#### Data Presentation

* **Tabular Data**: Clean tables for schedules and fare information
* **Visual Hierarchy**: Bold headings, subtle subtext, clear data points
* **Status Indicators**: Color-coded status (operational, under construction, planned)
* **Interactive Elements**: Hover states, click feedback, loading states

#### Mobile-First Layout

* **Bottom Sheets**: Information cards slide up from bottom on mobile
* **Floating Actions**: Quick access buttons for common actions
* **Swipe Gestures**: Navigate between different views
* **Touch Targets**: Minimum 44px touch targets for all interactive elements

### Content Consistency Standards

* **Tone**: Professional yet approachable, helpful and informative
* **Language**: Simple, clear English with minimal jargon
* **Currency**: Always display fares in Bangladeshi Taka (৳)
* **Time Format**: 24-hour format (07:30, 19:45)
* **Distance**: Meters for short distances, kilometers for longer routes
* **Accessibility**: Alt text for images, proper heading structure, keyboard navigation

### Phase 1 Content Limitations

* **No User Accounts**: No registration, login, or personal data collection
* **No Real-Time Data**: Static schedule and fare information only
* **No Payment Integration**: Information only, no ticket purchasing
* **No Social Features**: No reviews, ratings, or user-generated content
* **No Multi-Language**: English only for Phase 1

*Rationale: Focused content enables rapid development while establishing user value and technical foundation.*

---

## Article XXVIII: Project Structure Canon

```bash
metro-station-finder/
├── app/                      # Next.js App Router directory
│   ├── globals.css           # Global styles and Tailwind imports
│   ├── layout.tsx            # Root layout component
│   ├── page.tsx              # Homepage
│   ├── stations/             # Stations routes
│   │   ├── page.tsx          # Stations list page
│   │   └── [id]/page.tsx     # Dynamic route for station detail
│   └── fare-calculator/      # Fare calculator routes
│       └── page.tsx          # Fare calculator page
├── components/               # Reusable React components
│   ├── ui/                   # shadcn/UI components
│   ├── map/                  # Map-related components
│   │   ├── MapView.tsx       # Google Maps wrapper
│   │   └── MarkerIcon.tsx    # Custom marker component
│   ├── StationList.tsx       # Station list component
│   ├── StationDetails.tsx    # Station detail component
│   ├── FareCalculator.tsx    # Fare calculator component
│   └── theme-toggle.tsx      # Dark/light mode toggle
├── lib/                      # Utilities and data
│   ├── data/                 # Static data
│   │   ├── stations.ts       # Station data
│   │   └── fares.ts          # Fare calculation data
│   ├── utils/                # Helper functions
│   │   ├── distance.ts       # Haversine formula
│   │   ├── fare.ts           # Fare calculation logic
│   │   └── format.ts         # Formatting utilities
│   ├── types/                # TypeScript types
│   │   └── station.ts        # Station and related types
│   └── constants/            # Constants
│       └── map.ts            # Map configuration
├── tests/                    # Unit and integration tests
│   ├── setup.ts              # Test setup file
│   ├── utils/                # Test utilities
│   └── components/           # Component tests
├── e2e/                      # End-to-end tests
│   └── metro-station.spec.ts # E2E test scenarios
├── public/                   # Static assets
│   └── favicon.ico
├── .env.local.example        # Environment variables example
├── package.json              # Package configuration
├── bunfig.toml               # Bun configuration
├── tsconfig.json             # TypeScript configuration
├── biome.jsonc               # Ultracite/Biome configuration
├── playwright.config.ts      # Playwright configuration
├── vitest.config.ts          # Vitest configuration
├── commitlint.config.js      # Commitlint configuration
├── lefthook.yml              # Git hooks configuration
└── README.md                 # Project documentation
```

* Keep files small and purposeful; avoid god‑components.
* Public APIs stable; internal details private.
* Follow Next.js App Router conventions for routing.

---

## Article XXIX: Font Implementation Standards

**Typography SHALL use Ropa Sans as the primary font family with optimal loading and fallback strategies.**

### Font Configuration

* **Primary Font**: Ropa Sans for all text content (headings, body, data)
* **Font Loading**: Use `next/font/google` with Ropa_Sans for optimal performance
* **Font Weights**: Regular (400) only - Ropa Sans is not available in other weights
* **Fallback Stack**: `'Ropa Sans', sans-serif` with system fallbacks
* **Loading Strategy**: Preload critical font weights, lazy load others

### Implementation Example

```typescript
// app/layout.tsx
import { Ropa_Sans } from 'next/font/google'

export const ropaSans = Ropa_Sans({ 
  subsets: ['latin'], 
  weight: '400', 
  variable: '--font-sans' 
})
```

### Implementation Requirements

* **Next.js Font**: Configure Ropa Sans in `next.config.js` or `app/layout.tsx`
* **CSS Variables**: Define font family in CSS custom properties for theming
* **Tailwind Integration**: Add Ropa Sans to Tailwind font family configuration
* **Performance**: Ensure font loading doesn't block critical rendering path
* **Accessibility**: Maintain readability with proper font size and contrast

### Typography Hierarchy

* **H1-H3**: Ropa Sans Regular (400) with larger font-size for main headings
* **H4-H6**: Ropa Sans Regular (400) with medium font-size for subheadings
* **Body Text**: Ropa Sans Regular (400) for paragraphs and content
* **Interactive**: Ropa Sans Regular (400) with color emphasis for buttons and links
* **Data Display**: Ropa Sans Regular (400) for numbers and codes
* **Visual Hierarchy**: Achieved through font-size, color, and spacing since only one weight is available

*Rationale: Consistent typography with Ropa Sans creates brand identity and improves readability.*

---

## Article XXX: Content Inspiration & Design Patterns

**Content design SHALL draw inspiration from successful patterns while maintaining unique identity and user value.**

### Design Inspiration Principles

* **Adapt, Don't Copy**: Extract successful patterns and adapt them to our specific use case
* **User-Centric**: Every design decision must serve the primary user journey
* **Performance-First**: Visual elements must not compromise loading speed or accessibility
* **Mobile-Native**: Design for mobile first, then enhance for larger screens
* **Accessibility-First**: All visual elements must be accessible and inclusive
* **Unique Identity**: Do not mimic branding of Dhaka Metro; create unique identity to avoid IP issues

### Content Pattern Library (Inspired by Reference Images)

#### Statistical Cards

* **Pattern**: Clean cards with large numbers and descriptive labels
* **Application**: Station count, system length, service frequency
* **Design**: Rounded corners, subtle shadows, color-coded backgrounds
* **Accessibility**: High contrast ratios, screen reader friendly labels

#### Information Tables

* **Pattern**: Clean tabular data with clear headers and organized rows
* **Application**: Schedule information, fare tables, station details
* **Design**: Minimal borders, alternating row colors, clear typography
* **Accessibility**: Proper table headers, keyboard navigation, screen reader support

#### Station Cards

* **Pattern**: Grid layout with individual station information cards
* **Application**: Featured stations, search results, station listings
* **Design**: Consistent card sizing, hover effects, clear hierarchy
* **Accessibility**: Focus indicators, keyboard navigation, descriptive alt text

#### Route Information

* **Pattern**: Clear origin-destination pairs with fare and time information
* **Application**: Popular routes, fare calculator results, route planning
* **Design**: Color-coded routes, clear typography, visual hierarchy
* **Accessibility**: High contrast, clear labels, keyboard accessible

#### Bento Grid Layouts (Apple-Inspired)

* **Pattern**: Asymmetric grid with varying card sizes and visual hierarchy
* **Application**: Feature showcases, homepage highlights, service overviews
* **Design**: Large hero cards, smaller feature cards, mixed content types
* **Accessibility**: Proper heading structure, keyboard navigation, screen reader support
* **Use Cases**:
  * Homepage: Hero search + quick stats + featured stations
  * Service Overview: Schedule info + fare calculator + station map
  * Features: Key benefits + statistics + call-to-action

### Content Hierarchy Standards

* **Primary Information**: Station names, fares, distances, times
* **Secondary Information**: Descriptions, amenities, alternative options
* **Tertiary Information**: Additional details, help text, legal information
* **Visual Weight**: Use font size, color, and spacing to establish clear hierarchy

### Color System (Inspired by Reference Images)

* **Primary**: Deep teal/green for main actions and highlights
* **Secondary**: Blue tones for information and data
* **Accent**: Red/maroon for warnings and important information
* **Neutral**: Gray scale for text and backgrounds
* **Status**: Green for success, red for errors, yellow for warnings

### Typography Standards

* **Primary Font**: Ropa Sans for all headings and body text
* **Headings**: Ropa Sans Regular (400), clear hierarchy through font-size (H1-H6)
* **Body Text**: Ropa Sans Regular (400), appropriate line height
* **Data**: Ropa Sans Regular (400) for numbers, times, and codes (maintains consistency)
* **Interactive**: Ropa Sans Regular (400) with color emphasis for links and buttons
* **Font Loading**: Use `next/font` with Ropa Sans for optimal performance
* **Fallbacks**: Sans-serif fallback stack for loading states
* **Accessibility**: Minimum 16px font size, high contrast ratios

### Layout Patterns

* **Grid Systems**: Consistent spacing and alignment
* **Card Layouts**: Rounded corners, subtle shadows, consistent padding
* **Bento Grids**: Apple-inspired asymmetric layouts for feature showcases
* **Navigation**: Clear hierarchy, consistent placement, mobile-friendly
* **Forms**: Clear labels, helpful placeholders, error states
* **Modals**: Focus management, escape key support, backdrop dismissal

### Bento Grid Implementation Guidelines

#### Design Principles

* **Asymmetric Layout**: Mix large hero cards with smaller feature cards
* **Visual Hierarchy**: Use size, color, and positioning to guide attention
* **Content Variety**: Combine different content types (text, images, interactive elements)
* **Responsive Design**: Adapt gracefully from desktop to mobile layouts
* **Whitespace**: Generous spacing between cards for clean, modern look

#### Card Size Variations

* **Hero Cards**: 2x2 or 2x1 grid cells for primary features
* **Feature Cards**: 1x1 grid cells for secondary information
* **Wide Cards**: 2x1 grid cells for horizontal content (tables, lists)
* **Tall Cards**: 1x2 grid cells for vertical content (statistics, images)

#### Content Types for Bento Grids

* **Search Interface**: Large hero card with search input and CTA
* **Quick Stats**: Small cards with numbers and labels
* **Featured Stations**: Medium cards with station info and images
* **Service Information**: Wide cards with schedules or fare tables
* **Interactive Elements**: Cards with buttons, forms, or mini-apps

#### Mobile Adaptations

* **Stacked Layout**: Convert grid to vertical stack on mobile
* **Swipe Navigation**: Allow horizontal scrolling for wide grids
* **Progressive Disclosure**: Show key cards first, expand on interaction
* **Touch Optimization**: Ensure adequate touch targets and spacing

#### Accessibility Considerations

* **Logical Tab Order**: Ensure keyboard navigation follows visual hierarchy
* **Screen Reader Support**: Proper heading structure and ARIA labels
* **Focus Management**: Clear focus indicators for interactive cards
* **Color Contrast**: Maintain high contrast ratios for all text content
* **Reduced Motion**: Respect `prefers-reduced-motion` for animations

*Rationale: Consistent design patterns create familiarity and trust while maintaining unique brand identity.*

---

## Article XXXI: Definition of Done (Checklist)

* [ ] Meets performance budgets; no Lighthouse/INP regressions.
* [ ] No a11y violations; keyboard & SR paths verified.
* [ ] Type‑safe; Zod validations updated.
* [ ] Tests added/updated (unit/RTL/E2E) and passing in CI.
* [ ] Lint/format clean; bundle within budgets.
* [ ] Docs/ADR updated where applicable.

---

## Enforcement & Evolution

This constitution governs all development decisions for Metro Station Finder. Deviations require explicit, time‑boxed exceptions with rationale. Constitutional violations in reviews SHALL be rejected regardless of functionality.

**Amendment procedure:**

1. Document rationale & impact
2. Update Constitution + ADR
3. Migration plan if needed
4. semantic-release version bump
5. Maintainer approval

**Compliance:** All PRs MUST verify performance, a11y, security, tests, and type‑safety checklists.

---

**Version**: 1.0.0 | **Ratified**: 2025‑09‑27 | **Last Amended**: 2025‑09‑27
