
# Implementation Plan: Metro Station Finder Phase 1 MVP

- **Branch**: `001-metro-station-finder` | **Date**: 2025-09-27 | **Spec**: [spec.md](./spec.md)
- **Input**: Feature specification from `/specs/001-metro-station-finder/spec.md`

## Execution Flow (/plan command scope)

```text
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific instructions **(optional; only if this repo manages such agents)**.
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Build a fast, accessible web application that helps users find the nearest Dhaka metro station from any address or current location, and calculate fares between stations. The system uses static data, Google Maps integration, and modern React patterns with Next.js 15, TypeScript, and shadcn/ui components.

**Runtime & Package Manager**: Node.js latest (runtime) + Bun (package manager). Bun is not the prod JS runtime.

## Phase 2 Implementation Status ✅

**Phase 2 Complete**: All type definitions and static data have been successfully implemented with modern TypeScript 2025 patterns.

### Completed Deliverables

- **Type System**: Complete type definitions in `lib/types/` with branded types and Result patterns
- **Static Data**: MRT-6 station data and fare matrix in `lib/data/`
- **Constants**: Centralized constants in `lib/constants.ts` with proper typing
- **Modern Patterns**: TypeScript 2025 features including `satisfies`, template literals, exhaustive checking

### Key Implementation Details

- **17 MRT-6 Stations**: 16 operational + 1 under construction (Kamalapur)
- **Complete Fare System**: Matrix-based pricing with discount support
- **Google Places Integration**: Full API type definitions with quota management
- **Type Safety**: Branded types for all domain objects preventing type confusion
- **Error Handling**: Standardized Result pattern for consistent error management

## Commit Strategy

**Phase-Based Commits**: Each development phase is represented by a single, comprehensive commit for clean release notes:

- **11 Total Commits**: 10 phase commits + 1 final production commit
- **Format**: `feat(scope): phase description (phase X)`
- **Release Notes**: Each commit tells a clear story of project evolution
- **v1.0.0 Target**: First major release after all phases complete

See [ADR-0005: Phase-Based Commit Strategy](../../adrs/0005-phase-based-commit-strategy.md) for full details.

## Source of Truth

This plan derives from `/specs/001-metro-station-finder/spec.md` and the ADR set in `./adrs/`.  
If the plan and spec/ADRs diverge, **spec + ADRs win**; update this plan to match.

## Runtime Enforcement

- **Runtime**: Node.js latest (prod + dev)
- **Package manager**: Bun (install, scripts)
- CI enforces with:
  - `.nvmrc` / `engines.node` = `>=24`
  - Build fails if `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is missing or blank

## Technical Context

- **Language/Version**: TypeScript 5.x with strict mode
- **Primary Dependencies**: Next.js 15, React 19, @react-google-maps/api, Tailwind CSS, shadcn/ui, Zod
- **Storage**: Static TypeScript constants (no database)
- **Testing**: Vitest, @testing-library/react, Playwright
- **Target Platform**: Web browsers (Tier A: Chrome, Safari, Firefox, Edge; iOS ≥16, Android Chrome ≥120)
- **Project Type**: Web application (single project)
- **Performance Goals**: LCP < 2.0s, INP < 200ms, CLS < 0.10, Lighthouse ≥ 90, JS ≤ 100 KiB gz
- **Constraints**: Zero external API costs, offline-capable for core searches/fare logic after initial load (no offline maps), WCAG 2.2 AA compliance
- **Scale/Scope**: 16 metro stations, static fare data, mobile-first responsive design
- **Accessibility**: WCAG 2.2 AA compliance

### Client hooks layer

Purpose: Encapsulate UI state, a11y behaviors, and availability logic without introducing new domain entities or APIs. Hooks compose static data and existing utilities.

- useStationSearch: local autocomplete over `lib/data/stations.ts`
- useFareCalculator: fare helpers over `lib/data/fares.ts`
- useGeolocation: permissioned browser location + Result handling
- useGooglePlaces: guarded Places calls with input gating
- useTheme: theme switching and system preference
- useQueryParamsState: sync filters/sort/pagination to URL (Zod-validated)
- useDebouncedValue: debounce inputs and requests
- useOnlineStatus: online/offline-aware UI fallbacks
- useLiveRegion: polite/assertive screen reader announcements
- useGeolocationPermission: permission lifecycle state
- useMapAvailability: feature flag + env/key/quota checks → map/list fallback
- useNearestStation: composes geolocation + distance utils

### Code Style Rules (enforced)

- Node built-ins imported via `node:` protocol (e.g., `import * as fs from 'node:fs/promises'`)
- No `any` in `src/` (TypeScript strict)
- No UI literals: use Copy IDs only

### Browser Support Matrix (Tier-A)

| Platform | Minimum Version | Notes |
|---|---:|---|
| Chrome (Win/macOS/Android) | 120 | E2E + Lighthouse CI target |
| Safari (iOS/iPadOS) | 16.0 | VoiceOver sanity checks |
| Firefox (Win/macOS) | Latest ESR | Axe CI parity |
| Edge (Win) | Latest Stable | Chromium parity |

## Command Contract

**Command**: `/plan` (read-only)
**Inputs**:

- `spec_path`: `/specs/001-metro-station-finder/spec.md`
- `constitution_path`: `/memory/constitution.md`
- `adrs_dir`: `./adrs/`

**Outputs (created/updated by /plan only)**:

- `plan.md` (this file)
- `research.md` (Phase 0 outline with decisions/rationales/alternatives)
- `data-model.md` (entities, schemas)
- `contracts/` (client-side function interfaces)
- `quickstart.md` (test scenarios & runbook)

**Non-Outputs**:

- `tasks.md` (created by `/tasks`, not `/plan`)

### Validation Rules (executed by /plan)

- **Paths exist**: `spec_path`, `constitution_path`, `adrs_dir`
- **Spec gates**: spec contains "Requirements", "Copy Deck", "ADR Appendix"
- **ADRs present**: `./adrs/0001-maps-provider-integrations.md`, `./adrs/0002-static-data-source-strategy.md`, `./adrs/0003-copy-deck-canonical-strings.md`, `./adrs/0004-diagnostics-privacy-toggle.md` each include a `Status:` field
- **Constitution**: matrix table exists with only `PASS` statuses
- **Artifacts**: `research.md`, `data-model.md`, `contracts/*`, `quickstart.md` created/updated this run
- **No scope leakage**: `tasks.md` must not be created or modified

## Constitution Compliance Matrix

| ID  | Article | Area                              | Evidence (file/section)             | Status |
|-----|---------|-----------------------------------|-------------------------------------|--------|
| C-IV  | IV      | Accessibility (WCAG 2.2 AA)       | quickstart.md → a11y scenarios       | PASS   |
| C-V   | V       | Performance budgets               | Summary → Performance Goals          | PASS   |
| C-VI  | VI      | Zod at boundaries                 | data-model.md                        | PASS   |
| C-VII | VII     | Static data only                  | Technical Context → Storage          | PASS   |
| C-VIII| VIII    | UI system (shadcn/Tailwind)       | Technical Context → UI               | PASS   |
| C-XI  | XI      | Maps via @react-google-maps/api   | Technical Context → Maps             | PASS   |
| C-XII | XII     | Quality gates (lint/test/CI)      | Generated Artifacts section          | PASS   |
| C-XIV | XIV     | Security (keys/headers)           | spec.md → Security Compliance        | PASS   |
| C-XXIV| XXIV    | Phase-1 limitations               | spec.md → Out of Scope               | PASS   |
| C-I   | I       | Bun usage (PM only)               | Summary → Runtime & PM               | PASS   |
| C-II  | II      | TypeScript strict, no `any`       | Technical Context                    | PASS   |
| C-III | III     | Server-first; client where needed | Project Structure                    | PASS   |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```text
app/                          # Next.js App Router (RSC by default)
├── page.tsx                  # Homepage with search interface
├── layout.tsx               # Root layout with navigation
├── globals.css              # Global styles + Tailwind
├── stations/                # Station finder page
│   └── page.tsx
├── fare-calculator/         # Fare calculator page
│   └── page.tsx
└── about/                   # About page
    └── page.tsx

components/                  # React components
├── ui/                     # shadcn/ui components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── map/                    # Map-related components
│   ├── map-view.tsx
│   ├── map-marker.tsx
│   └── map-controls.tsx
├── station/                # Station-related components
│   ├── station-finder.tsx
│   ├── station-card.tsx
│   └── station-list.tsx
├── fare/                   # Fare-related components
│   ├── fare-calculator.tsx
│   └── fare-display.tsx
└── layout/                 # Layout components
    ├── header.tsx
    ├── footer.tsx
    └── navigation.tsx

lib/                        # Business logic & utilities
├── data/                   # Static metro station data
│   ├── stations.ts
│   ├── fares.ts
│   └── index.ts
├── utils/                  # Helper functions
│   ├── distance.ts
│   ├── fare-calculator.ts
│   └── geolocation.ts
├── types/                  # TypeScript type definitions
│   ├── station.types.ts
│   ├── fare.types.ts
│   └── common.types.ts
├── constants/              # App-wide constants
│   └── index.ts
└── map/                    # Map utilities
    └── styles.ts

tests/                      # Test files
├── unit/                   # Vitest unit tests
├── integration/            # Integration tests
└── e2e/                    # Playwright E2E tests
    └── station-finder.spec.ts

public/                     # Static assets
├── icons/
└── images/
```

**Structure Decision**: Single project web application using Next.js App Router with clear separation of concerns between components, business logic, and data.

## Exit Criteria (for /plan to succeed)

- ✅ Constitution matrix rows = PASS only
- ✅ `research.md`, `data-model.md`, `contracts/*`, `quickstart.md` created/updated in the current run
- ✅ ADR traceability table present and references ADR-0001..0004
- ✅ Non-Goals + Assumptions included
- ✅ No `tasks.md` created/modified

## Phase 0: Research & Architecture ✅ COMPLETED

**Status**: ✅ **COMPLETED** - All research and architectural decisions finalized

### Completed Deliverables (Phase 0)

1. **Technology Research** → `research.md`:
   - ✅ Next.js 15 + React 19 modern patterns research
   - ✅ TypeScript 5.x strict mode configuration
   - ✅ Node.js latest runtime decisions
   - ✅ Bun package manager integration
   - ✅ Google Maps API integration patterns
   - ✅ Static data strategy and performance optimization
   - ✅ Testing framework selection (Vitest, RTL, Playwright)
   - ✅ Deployment strategy (Vercel static hosting)

2. **Data Architecture** → `data-model.md`:
   - ✅ Complete data model with strictest TypeScript standards
   - ✅ Branded types for domain safety (`StationId`, `TakaAmount`, etc.)
   - ✅ Immutable data structures with `readonly` properties
   - ✅ Zod validation schemas for runtime type safety
   - ✅ Result pattern implementation for error handling
   - ✅ Type guards and utility functions

3. **Service Contracts** → `contracts/`:
   - ✅ Station search functions (`contracts/stations.md`)
   - ✅ Fare calculation functions (`contracts/fares.md`)
   - ✅ Geolocation functions (`contracts/geolocation.md`)
   - ✅ All contracts follow strictest TypeScript standards
   - ✅ Consistent Result pattern and error handling

4. **Testing Strategy** → `quickstart.md`:
   - ✅ 10 comprehensive test scenarios
   - ✅ Performance and accessibility validation
   - ✅ E2E testing approach with Playwright

## Phase 1: Foundation & Core Setup

**Prerequisites**: Phase 0 completed ✅

**Objective**: Establish project foundation with modern tooling and core infrastructure

**Scope**: Project initialization, data layer implementation, and core business logic

**Key Deliverables**:

- Modern development environment with strictest TypeScript configuration
- Static data layer with branded types and Zod validation
- Core business logic functions following Result pattern
- Comprehensive error handling and type safety

**Technical Architecture**:

- Next.js 15 with App Router and Server Components
- TypeScript 5.x with strictest settings and zero `any` tolerance
- Bun package manager with optimized lockfile
- Biome (Ultracite) for linting and formatting
- Vitest for unit testing, Playwright for E2E testing
- Lefthook for pre-commit hooks

**Reference Files**:

- `tsconfig.json` - TypeScript configuration
- `biome.jsonc` - Linting and formatting rules for Ultracite.ai
- `package.json` - Dependencies and scripts
- `data-model.md` - Complete data model
- `contracts/stations.md` - Station search interface
- `contracts/fares.md` - Fare calculation interface
- `contracts/geolocation.md` - Geolocation interface
- Constitution Article II (Type Safety)
- Constitution Article VII (Static Data Strategy)

## Phase 2: UI Components & User Interface

**Prerequisites**: Phase 1 completed

**Objective**: Build modern, accessible UI components with shadcn/ui and Tailwind CSS

**Scope**: Design system setup, core UI components, and interactive features

**Key Deliverables**:

- Complete design system with shadcn/ui and Tailwind CSS
- Accessible UI components following WCAG 2.2 AA standards
- Interactive features with proper state management
- Responsive design optimized for mobile-first approach

**Technical Architecture**:

- shadcn/ui component library with custom theme
- Tailwind CSS with custom design tokens
- Ropa Sans font integration (single weight: 400)
- Dark/light theme system with next-themes
- Framer Motion for smooth animations
- React 19 patterns with Server/Client Components

**Reference Files**:

- `spec.md` - Functional requirements (FR-001 to FR-054)
- `contracts/geolocation.md` - Geolocation functions
- `contracts/fares.md` - Fare calculation functions
- Constitution Article IV (Accessibility)
- Constitution Article VIII (UI/UX Standards)
- Constitution Article X (Maps & Geolocation)
- `research.md` - UI/UX technology decisions

## Phase 3: Pages & Routing

**Prerequisites**: Phase 2 completed

**Objective**: Implement application pages and routing with Next.js App Router

**Scope**: Page implementation, navigation, layout, and SEO optimization

**Key Deliverables**:

- Complete page structure with Next.js App Router
- Responsive navigation and layout system
- SEO-optimized pages with proper metadata
- Error handling and fallback pages

**Technical Architecture**:

- Next.js 15 App Router with file-based routing
- Server Components for static content
- Client Components for interactive features
- Metadata API for SEO optimization
- Error boundaries and custom error pages
- Responsive layout with mobile-first design

**Reference Files**:

- `spec.md` - User scenarios and requirements
- `quickstart.md` - Test scenarios
- Constitution Article VIII (UI/UX Standards)

## Phase 4: Testing & Quality Assurance

**Prerequisites**: Phase 3 completed

**Objective**: Comprehensive testing strategy with unit, integration, and E2E tests

**Scope**: Unit testing, integration testing, E2E testing, and quality validation

**Key Deliverables**:

- Complete test suite with high coverage
- Automated testing pipeline
- Accessibility compliance validation
- Performance testing and optimization

**Technical Architecture**:

- Vitest for unit testing with TypeScript support
- React Testing Library for component testing
- Playwright for E2E testing across browsers
- axe-core for accessibility testing
- Lighthouse CI for performance testing
- Test coverage reporting and CI integration

**Reference Files**:

- `contracts/*.md` - Function interfaces
- `data-model.md` - Data validation
- `quickstart.md` - Test scenarios
- Constitution Article IV (Accessibility)
- Constitution Article V (Performance)
- Constitution Article XII (Quality Gates)

## Phase 5: Performance & Optimization

**Prerequisites**: Phase 4 completed

**Objective**: Optimize performance and ensure production readiness

**Scope**: Performance optimization, accessibility audit, and UX refinement

**Key Deliverables**:

- Optimized bundle size within performance budgets
- Core Web Vitals compliance (LCP < 2.0s, INP < 200ms, CLS < 0.10)
- Lighthouse Performance score ≥ 90
- WCAG 2.2 AA accessibility compliance
- Mobile-first responsive optimization

**Technical Architecture**:

- Bundle analysis and code splitting optimization
- Lazy loading for non-critical components
- Image optimization with next/image
- Font optimization with next/font
- Performance monitoring and analytics
- Caching strategies for static assets

**Reference Files**:

- Constitution Article IV (Accessibility)
- Constitution Article V (Performance)
- `spec.md` - Accessibility requirements
- `research.md` - Performance optimization strategies

## Phase 6: Deployment & Production

**Prerequisites**: Phase 5 completed

**Objective**: Deploy to production with monitoring and maintenance

**Scope**: Production deployment, validation, and ongoing monitoring

**Key Deliverables**:

- Production deployment on Vercel
- Environment configuration and security
- Performance monitoring and analytics
- Error tracking and alerting
- Production validation and smoke testing

**Technical Architecture**:

- Vercel deployment with Next.js optimization
- Environment variables and secrets management
- Custom domain with SSL/TLS
- CDN and edge caching
- Performance monitoring with Vercel Analytics
- Error tracking and logging

**Reference Files**:

- Constitution Article I (Runtime & Tooling)
- Constitution Article XII (Quality Gates)
- `quickstart.md` - Validation scenarios
- `research.md` - Deployment strategy

## Phase Completion Criteria

### Phase 1 Completion Criteria

- Core business logic functions implemented and tested
- TypeScript strict mode with zero errors
- Data validation and error handling working correctly
- Development environment fully configured

### Phase 2 Completion Criteria

- Complete design system with shadcn/ui and Tailwind CSS
- All UI components built and accessible
- Dark/light theme system working
- Responsive design verified across breakpoints

### Phase 3 Completion Criteria

- All pages implemented with Next.js App Router
- Navigation and layout system working
- SEO metadata configured
- Error pages and fallbacks implemented

### Phase 4 Completion Criteria

- Complete test suite with high coverage
- All tests passing (unit, integration, E2E)
- Accessibility compliance verified
- Performance budgets met

### Phase 5 Completion Criteria

- Lighthouse Performance score ≥ 90
- Core Web Vitals compliance achieved
- Bundle size within performance budgets
- Mobile performance optimized

### Phase 6 Completion Criteria

- Production deployment successful on Vercel
- Environment and security configured
- Performance monitoring active
- Production validation completed

## Contracts Directory (client-side function interfaces)

- `contracts/stations.md` (was: stations-api.md)
- `contracts/fares.md`    (was: fares-api.md)
- `contracts/geolocation.md` (was: geolocation-api.md)

> These are TypeScript function contracts for client-side logic; **no backend endpoints**.

## ADR Traceability

| Topic | Plan Section | ADR |
|---|---|---|
| Maps provider & async load | Technical Context → Maps | ADR-0001 |
| Static data strategy | Technical Context → Storage | ADR-0002 |
| Copy Deck governance | Quickstart & Contracts | ADR-0003 |
| Diagnostics & DNT | Phase 1 Design Notes | ADR-0004 |

## Development Approach & Methodology

### Technical Architecture Principles

**Modern React Patterns**:

- Server Components for static content and data fetching
- Client Components only for interactive features (maps, forms, animations)
- React 19 features: `use()`, Actions API, `useOptimistic`, partial hydration
- Concurrent rendering with `useTransition` and `Suspense`

**TypeScript Excellence**:

- Strict mode with all strict flags enabled
- Branded types for domain safety at boundaries
- Zero `any` types tolerance
- Zod validation for runtime type safety
- Result pattern for error handling

**Performance-First Design**:

- Bundle size budgets: JS ≤ 100 KiB gz, CSS ≤ 40 KiB gz
- Core Web Vitals targets: LCP < 2.0s, INP < 200ms, CLS < 0.10
- Lighthouse Performance ≥ 90
- Lazy loading for non-critical components
- Static data strategy to minimize API calls

**Accessibility Standards**:

- WCAG 2.2 AA compliance mandatory
- Keyboard navigation for all interactive elements
- Screen reader compatibility
- Focus management and ARIA labels
- Mobile-first responsive design

### Development Workflow

**Phase-Based Development**:

- Each phase has clear objectives and completion criteria
- Dependencies between phases are explicit
- Reference files ensure consistency across development
- Constitution compliance verified at each phase

**Quality Gates**:

- TypeScript strict mode with zero errors
- All tests passing (unit, integration, E2E)
- Performance budgets met
- Accessibility compliance verified
- Code review and approval required

**Testing Strategy**:

- Test-Driven Development (TDD) approach
- Unit tests for business logic and utilities
- Component tests with React Testing Library
- E2E tests with Playwright for user journeys
- Performance testing with Lighthouse CI

## Non-Goals (Phase 1, hard stop)

- No server APIs, no database, no authentication, no payments
- No real-time data (schedules/positions)
- No internationalization (English-only)
- No analytics beyond local diagnostics toggle

## Assumptions (release-blocking if false)

- Station + fare data fit within **JS ≤ 100 KiB gz** and **CSS ≤ 40 KiB gz**
- Domain-restricted Google Maps API key available at build/runtime
- Tier-A browsers per spec; older browsers not supported

## Technical Implementation Guidelines

### Code Organization

**File Structure**:

```text
lib/
├── data/           # Static data constants
├── schemas/        # Zod validation schemas
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
└── components/     # Reusable UI components
```

**Naming Conventions**:

- Files: kebab-case (`station-search.ts`)
- Components: PascalCase (`StationSearch`)
- Functions: camelCase (`searchStations`)
- Types: PascalCase (`StationId`, `SearchResult`)
- Constants: UPPER_SNAKE_CASE (`DHAKA_CENTROID`)

### Error Handling Strategy

**Result Pattern**:

- All functions return `Result<T, E>` or `ApiResponse<T, E>`
- Never throw exceptions for expected control flow
- Structured error codes with user-friendly messages
- Error boundaries for React components

**Validation**:

- Zod schemas for all external data
- Type guards for runtime type checking
- Input validation at component boundaries
- Graceful degradation for missing features

### Performance Optimization

**Bundle Optimization**:

- Tree-shaking for unused code
- Dynamic imports for non-critical components
- Image optimization with `next/image`
- Font optimization with `next/font`

**Runtime Performance**:

- Memoization for expensive calculations
- Debouncing for search inputs
- Virtual scrolling for large lists
- Lazy loading for map components

### Security Considerations

**API Security**:

- Domain-restricted Google Maps API key
- Environment variables for sensitive data
- No API keys in client-side code
- CSP headers for XSS protection

**Privacy**:

- No PII collection or storage
- Local storage only for user preferences
- DNT (Do Not Track) compliance
- Geolocation only on user consent

## Complexity Tracking

**Note**: Fill ONLY if Constitution Check has violations that must be justified

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |

## Risk Register + Mitigations

- Map performance
  - Mitigation: lazy load map, skeleton UI, Lighthouse budget checks in CI
- Data accuracy
  - Mitigation: versioned static data, QA cross-check list, `data_version` surfaced in About
- Privacy
  - Mitigation: DNT auto-off diagnostics, geolocation rationale string, no PII
- A11y regressions
  - Mitigation: axe-core CI gate = 0 serious/critical violations
- Map outage rollback
  - Kill-switch: `NEXT_PUBLIC_MAPS_DISABLED=true` → app forces list-view fallback and hides map UI.
  - CI check: ensures fallback path still passes axe + Playwright smoke.

## Change Control

- Changes to maps, data source, diagnostics/privacy, or copy governance must update ADR-0001…0004.
- See also: ADR Appendix in `spec.md` and `/adrs/README.md` for proposal workflow.

## Copy Deck Contract

- **Single source**: spec.md "Copy Deck" tables
- **Generated mapping**: `/lib/copy.ts` built from spec (build-time script)
- **Usage**: Components import by **ID** only (no literals)
- **CI**: Fails if:
  - An ID in code has no spec entry
  - A literal UI string appears where an ID is expected

## Verification Hooks (CI)

All release gates are automated in CI. A release can only be promoted if **all hooks pass**.

### Core Budgets & Quality

- **Performance budgets**  
  Lighthouse CI (mobile) must pass with `lighthouse-budgets.json`:
  - LCP ≤ 2000 ms  
  - INP ≤ 200 ms  
  - CLS ≤ 0.10  

- **Bundle size**  
  CI fails if built assets exceed:
  - JS ≤ 100 KiB gz  
  - CSS ≤ 40 KiB gz  

- **Type safety**  
  `tsc --noEmit` must pass; no `any` allowed in `src`.

- **Lint/style**  
  Biome/Ultracite passes with zero errors.  
  Node built-ins must use `node:` protocol.

### Accessibility

- **Playwright + axe**  
  Assertions = 0 serious/critical violations.

- **A11y smokes**  
  - Screen reader labels present for search, results, map controls.  
  - Keyboard trap test for **“Shortcuts & Help” modal** (`?` opens, `Esc` closes, focus restored).

### Spec & Copy Governance

- **Spec-drift guard**  
  Script generates `/lib/copy.ts` from `spec.md` Copy Deck.  
  CI fails if:
  1. A component imports an ID not present in spec.  
  2. A hard-coded literal is found where a Copy ID is required.

### Scope Guards

- **Plan integrity**  
  CI fails if `tasks.md` is created/modified during `/plan`.  
- **No API creep**  
  CI fails if `app/api/**` or `pages/api/**` exists during Phase 1.

### Security & Env

- **Env guard**  
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` must be set in CI.  
- **Kill-switch path**  
  CI runs smoke tests with `NEXT_PUBLIC_MAPS_DISABLED=true` to verify list-view fallback.  

### Data Integrity

- **Fare parity**  
  Deterministic test loads `lib/data/fares.ts` and validates all station pairs against `spec.md` fare table (100% match).

### Solo Release Gates

All seven checks in **Release Sign-off (Solo)** must pass:

1. Spec & ADR alignment (`spec-drift` check)  
2. Performance budgets (Lighthouse CI)  
3. Accessibility (axe tests)  
4. Data accuracy (fare/station parity)  
5. Bundle size (JS/CSS thresholds)  
6. Env & security (Maps key + CSP/HSTS)  
7. Offline fallback (kill-switch smoke)  

**Release is blocked if any gate fails.**

## Data Versioning Policy

- Every release pins `data_version` (e.g., `dmrtc_fares_2024-12-15`)
- `About` page displays `data_version` and one-line source note
- Any data change requires a CHANGELOG entry + version bump

## Security & Privacy Posture

- API keys: domain-restricted (Google Maps); stored in env, never checked in
- Headers (at hosting): CSP, HSTS, Referrer-Policy; no inline scripts where avoidable
- PII: none collected; search history local-only; diagnostics off when DNT is true
- Geolocation: permission rationale shown; no persistent storage of coordinates

## Open Questions

None.

## Progress Tracking

**Note**: This checklist is updated during execution flow

### Phase Status

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

### Gate Status

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

### Generated Artifacts

- ✅ `research.md` - Comprehensive technology research and modern best practices (2025)
- ✅ `data-model.md` - Complete data model with TypeScript interfaces
- ✅ `contracts/stations.md` - Station search function contracts (client-side)
- ✅ `contracts/fares.md` - Fare calculation function contracts (client-side)
- ✅ `contracts/geolocation.md` - Geolocation function contracts (client-side)
- ✅ `quickstart.md` - Comprehensive testing guide with 10 test scenarios

**Note**: All "contracts" are actually TypeScript interfaces for client-side functions, not backend API endpoints.

### Enhanced Research Coverage

The `research.md` now includes comprehensive coverage of:

- **🚀 Core Framework & Runtime**: Next.js 15, React 19 with modern patterns (Server Components, Actions API, useOptimistic), TypeScript strict mode, Node.js latest, Bun
- **🏗️ Architecture & Data Strategy**: Zero APIs, static data approach, file-based routing, client-side calculations
- **🎨 UI/UX & Styling**: Tailwind CSS, shadcn/ui, Framer Motion, Lucide React, next/font, next/image, dark mode
- **🗺️ Maps & Geolocation**: Google Maps JS API, privacy-first geolocation, distance calculations
- **📊 Data Management & Validation**: Static TypeScript data, Zod v4, React state management, type safety
- **🛠️ Development Tools & Quality**: Ultracite, Vitest, Testing Library, Playwright, pre-commit hooks
- **🚦 CI/CD & Deployment**: GitHub Actions, Vercel, environment variables, static export ready
- **📦 Project Structure & Configuration**: Modern folder structure, package configs, TypeScript config

### Project Structure Documentation

The research includes a comprehensive project structure that follows Next.js App Router conventions:

```text
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

This structure is designed for:

- **Scalability**: Clear separation of concerns
- **Maintainability**: Easy to navigate and understand
- **AI-friendly**: Consistent patterns for AI tools
- **Modern practices**: Follows 2025 best practices

## Release Sign-off (Solo)

| Area | Automation Gate (must pass) | Evidence to attach in release notes |
|---|---|---|
| Spec & ADR alignment | `spec-drift` check (copy-ID sync) | ADR diff + spec commit hash |
| Performance budgets | Lighthouse CI with `lighthouse-budgets.json` | LH report URL/artifact |
| Accessibility | Playwright + axe: 0 serious/critical | Axe JSON artifact |
| Data accuracy (fares/stations) | Fare parity test vs spec table | Test output summary |
| Bundle size | JS ≤ 100 KiB gz, CSS ≤ 40 KiB gz | CI size report |
| Env & security | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` present + CSP/HSTS check | CI env check log |
| Offline fallback (no map) | Kill-switch smoke: `NEXT_PUBLIC_MAPS_DISABLED=true` | Playwright run artifact |

> If any gate fails, the release is blocked.

### Solo Release Checklist

- [ ] **Tag** release branch: `git tag -a vX.Y.Z -m "Metro Finder vX.Y.Z"`
- [ ] **Docs**: spec.md + ADRs updated and committed
- [ ] **CI**: ✅ Budgets, ✅ a11y, ✅ parity, ✅ env, ✅ kill-switch, ✅ no API creep
- [ ] **Data**: `data_version` bumped and shown on About page
- [ ] **Notes**: attach LH report + axe report + parity test summary
- [ ] **Deploy**: Vercel production promotion
- [ ] **Post-deploy smoke**: map on/off, search, fare, dark mode, keyboard modal

## Appendix: File Map

- Spec: `/specs/001-metro-station-finder/spec.md`
- Plan (this): `/specs/001-metro-station-finder/plan.md`
- Research: `/specs/001-metro-station-finder/research.md`
- Data model: `/specs/001-metro-station-finder/data-model.md`
- Contracts: `/specs/001-metro-station-finder/contracts/*.md`
- Quickstart: `/specs/001-metro-station-finder/quickstart.md`
- ADRs: `/adrs/0001..0004-*.md`, `/adrs/README.md`, `/adrs/CONTRIBUTING-adrs.md`
- Constitution: `/memory/constitution.md`

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
