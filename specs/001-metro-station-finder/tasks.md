# Tasks: Metro Station Finder Phase 1 MVP

**Input**: Design documents from `/specs/001-metro-station-finder/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## ✅ Phase 1 Setup Complete (T001-T021)

**Status**: All Phase 1 setup tasks have been completed successfully!

### **Completed Tasks:**

- **T001-T005**: Core dependencies installed (Next.js 15, React 19, TypeScript 5.9, etc.)
- **T006-T009**: Configuration files set up (tsconfig.json, biome.jsonc, next.config.ts, env)
- **T010-T020**: Advanced development setup (shadcn/ui, VS Code, scripts, Git hooks, documentation)
- **T021**: Semantic-release workflow with automated versioning and release management

### **Key Achievements:**

- ✅ **World-class TypeScript configuration** with strictest settings
- ✅ **Ultracite linting** with comprehensive rules
- ✅ **shadcn/ui components** initialized and working
- ✅ **VS Code workspace** fully configured
- ✅ **Git hooks** with Lefthook for code quality
- ✅ **Development scripts** for all common tasks
- ✅ **AI development tools** for enhanced productivity
- ✅ **Project documentation** and guidelines

### **Ready for Phase 2:**

The project is now ready to proceed with **Phase 2: Static Data & Type Definitions (T022-T028)**.

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/`, `lib/`, `components/` at repository root
- **Static Data**: `lib/data/` for station and fare data
- **Components**: `components/ui/` for shadcn/ui components
- **Hooks**: `lib/hooks/` for custom React hooks
- **Utils**: `lib/utils/` for utility functions

## Commit Message Standards

All commits must follow the simple conventional commit format:

- **Format**: `type(scope): short precise description` (max 50 chars)
- **Release Notes Ready**: Messages must be suitable for automatic release notes
- **Phase-Based Structure**: Each phase gets one commit for clean release notes
- **Examples**:
  - `feat(init): project setup & configuration` ✅ **Phase 1 Complete**
  - `feat(data): static data & type definitions` ⏳ **Phase 2 Pending**
  - `feat(utils): core utilities & validation` ⏳ **Phase 3 Pending**
  - `feat(hooks): react hooks & state management` ⏳ **Phase 4 Pending**
  - `feat(ui): ui components setup` ⏳ **Phase 5 Pending**
  - `feat(pages): page components setup` ⏳ **Phase 6 Pending**
  - `feat(api): api integration & client functions` ⏳ **Phase 7 Pending**
  - `feat(testing): testing implementation` ⏳ **Phase 8 Pending**
  - `feat(perf): performance & optimization` ⏳ **Phase 9 Pending**
  - `feat(final): final integration & polish` ⏳ **Phase 10 Pending**
  - `feat(release): production ready v1.0.0` ⏳ **Production Release Pending**

## Release Strategy

- **11 Total Commits**: 10 phase commits + 1 final production commit
- **Clean Release Notes**: Each commit represents a complete phase
- **Semantic Versioning**: Automated versioning with semantic-release
- **v1.0.0 Target**: First major release after all phases complete

## Phase 1: Project Setup & Configuration

### T001: [X] Install Core Dependencies

Install Next.js, React, TypeScript, and essential development dependencies using latest versions.

**Files**: `package.json`
**Command**: `bun add next@latest react@latest react-dom@latest typescript@latest @types/node@latest @types/react@latest @types/react-dom@latest`

### T002: [X] Install UI & Styling Dependencies

Install Tailwind CSS, Framer Motion, and icon libraries. shadcn/ui will be initialized separately.

**Files**: `package.json`
**Command**: `bun add -D tailwindcss@latest postcss@latest autoprefixer@latest lucide-react@latest framer-motion@latest next-themes@latest`

### T003: [X] Install Google Maps & Geolocation Dependencies

Install Google Maps API integration using the latest @vis.gl/react-google-maps library.

**Files**: `package.json`
**Command**: `bun add @vis.gl/react-google-maps@latest`

### T004: [X] Install Development & Testing Dependencies

Install testing frameworks, linting tools, and development utilities.

**Files**: `package.json`
**Command**: `bun add -D vitest@latest @testing-library/react@latest @testing-library/jest-dom@latest @playwright/test@latest @vitejs/plugin-react@latest jsdom@latest`

### T005: [X] Install Validation & Type Safety Dependencies

Install Zod for runtime validation and type safety utilities.

**Files**: `package.json`
**Command**: `bun add zod@latest @hookform/resolvers@latest react-hook-form@latest`

### T006: [X] [P] Update TypeScript Configuration

Configure strictest TypeScript settings in `tsconfig.json` following latest documentation.

**Files**: `tsconfig.json`
**Changes**: Enable all strict flags, update target to ES2024, configure module resolution for Node.js latest

### T007: [X] [P] Configure Ultracite Linting

Set up Ultracite with strictest rules for TypeScript and React following latest documentation.

**Files**: `biome.jsonc`, `.vscode/settings.json`
**Changes**: Configure linter rules, formatter settings, and TypeScript integration with latest Ultracite features

### T008: [X] [P] Configure Next.js Settings

Update Next.js configuration for optimal performance and security following latest documentation.

**Files**: `next.config.ts`
**Changes**: Enable strict mode, configure image domains, set up experimental features for Next.js 15

### T009: [X] [P] Set Up Environment Variables

Create environment variable templates and validation following latest patterns.

**Files**: `.env.example`, `.env.local`, `lib/env.ts`
**Changes**: Define Google Maps API key variables, create Zod schema for validation

### T010: [X] [P] Install Advanced Development Dependencies

Install performance monitoring, analytics, and advanced development tools.

**Files**: `package.json`
**Command**: `bun add -D @next/bundle-analyzer@latest @vercel/analytics@latest @vercel/speed-insights@latest babel-plugin-react-compiler@latest`

### T011: [X] [P] Install shadcn/ui and UI Dependencies

Install shadcn/ui CLI and essential UI component dependencies.

**Files**: `package.json`
**Command**: `bun add -D shadcn@latest class-variance-authority@latest clsx@latest tailwind-merge@latest`

### T012: [X] [P] Install Git Hooks and Development Tools

Install Lefthook for Git hooks and advanced development utilities.

**Files**: `package.json`
**Command**: `bun add -D lefthook@latest`

### T013: [X] [P] Configure VS Code Settings

Set up VS Code workspace settings for optimal development experience.

**Files**: `.vscode/settings.json`, `.vscode/extensions.json`, `.vscode/launch.json`
**Changes**: Configure Biome formatter, recommended extensions, debug configurations

### T014: [X] [P] Create Development Scripts

Create comprehensive development and utility scripts for project management.

**Files**: `scripts/health-check.mjs`, `scripts/validate-project.mjs`, `scripts/setup-dev.mjs`, `scripts/cleanup.mjs`, `scripts/dev-tools.mjs`, `scripts/ai-dev-tools.mjs`, `scripts/pre-build.mjs`, `scripts/post-build.mjs`, `scripts/prepare.mjs`, `scripts/post-install.mjs`
**Changes**: Health checks, project validation, development tools, AI assistance scripts

### T015: [X] [P] Configure Lefthook Git Hooks

Set up comprehensive Git hooks for code quality and automated checks.

**Files**: `lefthook.yml`, `.lefthook/pre-commit/`, `.lefthook/pre-push/`, `.lefthook/commit-msg/`, `.lefthook/post-commit/`
**Changes**: Pre-commit, pre-push, commit message validation, post-commit cleanup

### T016: [X] [P] Initialize shadcn/ui Components

Initialize shadcn/ui with optimal configuration and add essential components.

**Files**: `components.json`, `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/dialog.tsx`
**Changes**: Configure shadcn/ui, add utility functions, install core UI components

### T017: [X] [P] Create TypeScript Type Declarations

Create custom type declarations for CSS modules and Google Maps API.

**Files**: `types/css.d.ts`, `types/google-maps.d.ts`
**Changes**: CSS module types, Google Maps API type extensions

### T018: [X] [P] Create Project Documentation

Create comprehensive project documentation and development guides.

**Files**: `DEV-COMMANDS.md`, `.cursorrules`
**Changes**: Development command reference, AI assistant guidelines

### T019: [X] [P] Configure Advanced Package.json Scripts

Set up comprehensive npm scripts for development, testing, analysis, and deployment.

**Files**: `package.json`
**Changes**: Add 50+ scripts for development, testing, analysis, monitoring, deployment

### T020: [X] [P] Set Up TypeScript Scripts Configuration

Configure separate TypeScript configuration for utility scripts.

**Files**: `tsconfig.scripts.json`
**Changes**: Configure TypeScript for Node.js scripts with proper module resolution

### T021: [X] [P] Implement Semantic-Release Workflow

Set up a comprehensive semantic-release workflow with 2025 best practices for automated versioning, changelog generation, and release management.

**Files**: `.releaserc.json`, `commitlint.config.mjs`, `.github/workflows/release.yml`, `package.json`
**Changes**:

- Configure semantic-release with latest plugins and patterns
- Set up conventional commits with commitlint (simple format, max 50 chars)
- Create automated release workflow
- Configure beautiful release notes generation
- Integrate with GitHub Actions for CI/CD

**Dependencies**: Latest semantic-release documentation and plugins
**Command**: `bun add -D semantic-release @semantic-release/changelog @semantic-release/git @semantic-release/github @commitlint/config-conventional @commitlint/cli`

---

## 📝 **COMMIT NOTE - Phase 1 Complete**

**Commit Message**: `feat(init): project setup & configuration`
**When to Commit**: After ALL Phase 1 tasks (T001-T021) are completed
**Status**: ✅ **COMPLETED** - Phase 1 commit done

---

## Phase 2: Static Data & Type Definitions

### T022: [P] Create Core Type System ✅

Define branded types and core domain types with strict TypeScript patterns.

**Files**: `lib/types/index.ts`
**Status**: ✅ **COMPLETED** - Core branded types, Result patterns, error codes, constants
**Changes**: All foundational types with strict TypeScript patterns

### T023: [P] Create Station Types ✅

Define Station entity and related types with complete search functionality.

**Files**: `lib/types/station.ts`
**Status**: ✅ **COMPLETED** - Station entities, amenities, search results, utilities
**Changes**: Complete station type system with search and filtering

### T024: [P] Create Fare Types ✅

Define Fare entity and ticket types with complete pricing system.

**Files**: `lib/types/fare.ts`
**Status**: ✅ **COMPLETED** - Fare calculations, discounts, routes, ticket types
**Changes**: Complete fare calculation type system

### T025: [P] Create Geolocation Types ✅

Define geolocation and location-related types with privacy controls.

**Files**: `lib/types/geolocation.ts`
**Status**: ✅ **COMPLETED** - Location handling, service area validation, privacy controls
**Changes**: Complete geolocation type system

### T026: [P] Create Google Places Types ✅

Define Google Places API response types with quota management.

**Files**: `lib/types/places.ts`
**Status**: ✅ **COMPLETED** - Google Places API integration, quota management, rate limiting
**Changes**: Complete Google Places type system

### T027: [P] Create Search & UI Types ✅

Define search logic, UI component props, React hooks, and utility function types.

**Files**: `lib/types/search.ts`, `lib/types/ui.ts`, `lib/types/hooks.ts`
**Status**: ✅ **COMPLETED** - Search logic, UI component props, React hooks types
**Changes**: Complete type system for search, UI components, and React hooks with modern TypeScript 2025 patterns

### T028: [P] Create Static Data Files ✅

Implement static station data, fare rules, and centralized constants.

**Files**: `lib/data/stations.ts`, `lib/data/fares.ts`, `lib/constants.ts`
**Status**: ✅ **COMPLETED** - Static station data, fare rules, centralized constants
**Changes**: Complete static data implementation with MRT-6 station data, fare matrix, and centralized constants using modern TypeScript 2025 patterns

---

## 📝 **COMMIT NOTE - Phase 2 Complete**

**Commit Message**: `feat(data): static data & type definitions`
**When to Commit**: After ALL Phase 2 tasks (T022-T028) are completed
**Status**: ✅ **COMPLETED** - Phase 2 commit done

---

## Phase 3: Core Utilities & Validation

### T029: [P] Create Distance Calculation Utilities

Implement Haversine formula and distance utilities.

**Files**: `lib/utils/distance.ts`
**Changes**: calculateDistance, formatDistance, distance validation

### T030: [P] Fare Calculation Utilities (reference existing)

Leverage existing fare calculation implemented in `lib/data/fares.ts`; do not duplicate utilities. Confirm exports and types are consumable by API layer in Phase 7.

**Files**: `lib/data/fares.ts`
**Changes**: Ensure exported functions (`calculateFare`, `getFareRules`, helpers) are used as the single source of truth; adapters (if needed) will be added in Phase 7 `lib/api/fares.ts`.

### T031: [P] Geolocation Utilities (reference existing)

Use existing geolocation types/utilities in `lib/types/geolocation.ts`; avoid duplicate wrappers. Phase 7 will expose API functions as needed.

**Files**: `lib/types/geolocation.ts`
**Changes**: Confirm existing helpers (error mapping, capability checks, creation functions) cover use cases; API wrappers will be added in Phase 7 `lib/api/geolocation.ts`.

### T032: [P] Type Guards (confirm & extend if needed)

Confirm existing type guards across `lib/types/*` are sufficient; add any missing guards only if gaps are found (co-locate with the relevant type module).

**Files**: `lib/types/*`
**Changes**: Validate presence of guards like `isStationId`, `isCoordinates`, `isTakaAmount`, `isPlaceId`; add narrowly scoped guards where necessary.

### T033: [P] Create Validation Schemas

Implement Zod schemas for all data validation.

**Files**: `lib/schemas/index.ts`
**Changes**: StationSchema, FareSchema, GeolocationSchema, PlacesSchema

---

## 📝 **COMMIT NOTE - Phase 3 Complete**

**Commit Message**: `feat(utils): core utilities & validation`
**When to Commit**: After ALL Phase 3 tasks (T029-T033) are completed
**Status**: ✅ **COMPLETED** - Phase 3 commit done

---

## Phase 4: React Hooks & State Management

### T034: [P] Create Station Search Hook

Implement custom hook for station search functionality.

**Files**: `lib/hooks/useStationSearch.ts`
**Changes**: useStationSearch hook with local autocomplete

### T035: [P] Create Fare Calculator Hook

Implement custom hook for fare calculation.

**Files**: `lib/hooks/useFareCalculator.ts`
**Changes**: useFareCalculator hook with station selection

### T036: [P] Create Geolocation Hook

Implement custom hook for geolocation functionality.

**Files**: `lib/hooks/useGeolocation.ts`
**Changes**: useGeolocation hook with error handling

### T037: [P] Create Google Places Hook

Implement custom hook for Google Places autocomplete.

**Files**: `lib/hooks/useGooglePlaces.ts`
**Changes**: useGooglePlaces hook with quota management

### T038: [P] Create Theme Hook

Implement custom hook for theme management.

**Files**: `lib/hooks/useTheme.ts`
**Changes**: useTheme hook with system preference detection

---

## 📝 **COMMIT NOTE - Phase 4 Complete**

**Commit Message**: `feat(hooks): react hooks & state management`
**When to Commit**: After ALL Phase 4 tasks (T034-T038) are completed
**Status**: ⏳ **PENDING** - Phase 4 tasks not yet started

---

## Phase 5: Design System, Theming & UI Components (shadcn/ui)

### T039: [P] Set Up shadcn/ui Components

Initialize shadcn/ui and install base components using the latest CLI.

**Files**: `components.json`, `components/ui/`
**Command**: `bunx shadcn@latest init` and then `bunx shadcn@latest add button input card`

### T040: [P] Configure Tailwind CSS v4 tokens & theme

Define design tokens (colors, spacing, radii, typography) and enable dark mode class strategy; wire tokens into `app/globals.css`.

**Files**: `tailwind.config.ts`, `app/globals.css`
**Changes**: Token scales as CSS variables, content paths, dark mode configuration

### T041: [P] Integrate Ropa Sans via next/font with CSS variables

Set up `Ropa_Sans` and bind to `--font-sans` variable for global usage.

**Files**: `app/layout.tsx`, `app/globals.css`
**Changes**: next/font import, root className variables, base typography

### T042: [P] Add ThemeProvider (next-themes) and html class switching

Provide theme context and support `system | light | dark`, ensure SSR-safe class switching.

**Files**: `app/layout.tsx`
**Changes**: Wrap with `ThemeProvider`, set `attribute="class"`, defaultTheme, disableTransitionOnChange

### T043: [P] Define semantic color system (light/dark)

Map semantic colors (background, foreground, card, accent, border, ring, muted, destructive, etc.) to CSS variables for both themes.

**Files**: `app/globals.css`, `tailwind.config.ts`
**Changes**: CSS variable palettes for `:root` and `.dark` selectors

### T044: [P] Create Theme Toggle Component

Build theme switching component.

**Files**: `components/ui/theme-toggle.tsx`
**Changes**: ThemeToggle component with system preference support

### T045: [P] Ensure map theme switching uses `lib/map/styles.ts`

Wire map style selection (light/dark) to app theme; verify a11y contrast.

**Files**: `components/ui/map.tsx`
**Changes**: Select `lightModeMapStyle`/`darkModeMapStyle` based on theme

### T046: [P] Create Search Input Component

Build search input with autocomplete functionality.

**Files**: `components/ui/search-input.tsx`
**Changes**: SearchInput component with debouncing and validation

### T047: [P] Create Station Card Component

Build station information display component.

**Files**: `components/ui/station-card.tsx`
**Changes**: StationCard component with distance and amenities

### T048: [P] Create Fare Display Component

Build fare calculation display component.

**Files**: `components/ui/fare-display.tsx`
**Changes**: FareDisplay component with ticket types and pricing

### T049: [P] Create Map Component

Build Google Maps integration component using @vis.gl/react-google-maps.

**Files**: `components/ui/map.tsx`
**Changes**: Map component with markers; theme switching using latest @vis.gl/react-google-maps API; ensure required map/data attributions are visible, keyboard reachable, and open with `rel="noopener noreferrer"`; support `NEXT_PUBLIC_MAPS_DISABLED` kill‑switch to render accessible list‑view fallback

---

## 📝 **COMMIT NOTE - Phase 5 Complete**

**Commit Message**: `feat(ui): design system, theming, and core components`
**When to Commit**: After ALL Phase 5 tasks (T039-T049) are completed
**Status**: ⏳ **PENDING** - Phase 5 tasks not yet started

---

## Phase 6: Page Components

### T050: [P] Create Homepage Component

Build main landing page with search and featured stations.

**Files**: `app/page.tsx`
**Changes**: Homepage with hero section, search input, featured stations

### T051: [P] Create Station Finder Page

Build station search and results page.

**Files**: `app/station-finder/page.tsx`
**Changes**: StationFinder page with map and results list; includes visible on-focus "Skip to results" link, keyboard navigation, and list‑view fallback when map is disabled/unavailable

### T052: [P] Create Fare Calculator Page

Build fare calculation page with station selection.

**Files**: `app/fare-calculator/page.tsx`
**Changes**: FareCalculator page with origin/destination selection

### T053: [P] Create About Page

Build information and attribution page.

**Files**: `app/about/page.tsx`
**Changes**: About page with project info, data attribution (per provider ToS), Privacy Policy link in footer, and diagnostics toggle (respects Do Not Track)

---

## 📝 **COMMIT NOTE - Phase 6 Complete**

**Commit Message**: `feat(pages): page components setup`
**When to Commit**: After ALL Phase 6 tasks (T050-T053) are completed
**Status**: ⏳ **PENDING** - Phase 6 tasks not yet started

---

## Phase 7: API Integration & Client Functions

### T054: [P] Implement Station Search Functions

Implement client-side station search functions from contracts.

**Files**: `lib/api/stations.ts`
**Changes**: searchStations, getAllStations, getStationById functions importing static data from `lib/data/stations.ts` and types/utilities from `lib/types/*`; no network calls

### T055: [P] Implement Fare Calculation Functions

Implement client-side fare calculation functions from contracts.

**Files**: `lib/api/fares.ts`
**Changes**: calculateFare, getFareRules, getTicketTypes functions importing from `lib/data/fares.ts` and `lib/types/*`; thin adapter only (no network)

### T056: [P] Implement Geolocation Functions

Implement client-side geolocation functions from contracts.

**Files**: `lib/api/geolocation.ts`
**Changes**: getCurrentLocation, getNearestStation, validateLocation functions using browser APIs and `lib/types/geolocation.ts`; no server endpoints

### T057: [P] Implement Google Places Functions

Implement Google Places autocomplete functions with quota management using @vis.gl/react-google-maps.

**Files**: `lib/api/places.ts`
**Changes**: searchDestinations, getQuotaStatus, isAutocompleteAvailable functions using latest @vis.gl/react-google-maps Places API; quota/rate limiting and caching per constants; no custom backend

---

## 📝 **COMMIT NOTE - Phase 7 Complete**

**Commit Message**: `feat(api): api integration & client functions`
**When to Commit**: After ALL Phase 7 tasks (T054-T057) are completed
**Status**: ⏳ **PENDING** - Phase 7 tasks not yet started

---

## Phase 8: Testing Implementation

### T058: [P] Set Up Test Configuration

Configure Vitest and React Testing Library.

**Files**: `vitest.config.ts`, `test-setup.ts`
**Changes**: Test configuration, setup files, mock implementations

### T059: [P] Create Unit Tests for Utilities

Write unit tests for all utility functions.

**Files**: `__tests__/utils/`
**Changes**: Tests for distance, fare, geolocation, and validation utilities

### T060: [P] Create Component Tests

Write tests for all UI components.

**Files**: `__tests__/components/`
**Changes**: Tests for SearchInput, StationCard, FareDisplay, Map components

### T061: [P] Create Hook Tests

Write tests for all custom hooks.

**Files**: `__tests__/hooks/`
**Changes**: Tests for useStationSearch, useFareCalculator, useGeolocation hooks

### T062: [P] Create Integration Tests

Write integration tests for complete user flows.

**Files**: `__tests__/integration/`
**Changes**: Tests for station search, fare calculation, geolocation flows

---

## 📝 **COMMIT NOTE - Phase 8 Complete**

**Commit Message**: `feat(testing): testing implementation`
**When to Commit**: After ALL Phase 8 tasks (T058-T062) are completed
**Status**: ⏳ **PENDING** - Phase 8 tasks not yet started

---

## Phase 9: Performance & Optimization

### T063: [P] Implement Code Splitting

Add dynamic imports and code splitting for optimal loading.

**Files**: `components/`, `app/`
**Changes**: Lazy load map component, dynamic imports for heavy components

### T064: [P] Optimize Bundle Size

Implement tree shaking and bundle optimization.

**Files**: `next.config.ts`, `package.json`
**Changes**: Bundle analyzer, tree shaking configuration

### T065: [P] Implement Caching Strategy

Add client-side caching for API responses and static data.

**Files**: `lib/utils/cache.ts`
**Changes**: Cache utilities, TTL management, quota-aware caching

### T066: [P] Add Performance Monitoring

Implement Core Web Vitals monitoring and performance budgets.

**Files**: `lib/utils/performance.ts`
**Changes**: Performance monitoring, Lighthouse CI integration

---

## 📝 **COMMIT NOTE - Phase 9 Complete**

**Commit Message**: `feat(perf): performance & optimization`
**When to Commit**: After ALL Phase 9 tasks (T063-T066) are completed
**Status**: ⏳ **PENDING** - Phase 9 tasks not yet started

---

## Phase 10: Final Integration & Polish

### T067: [P] Update Global Styles

Configure Tailwind CSS and global styles.

**Files**: `app/globals.css`, `tailwind.config.ts`
**Changes**: Custom design tokens, Ropa Sans font integration

### T068: [P] Add Error Boundaries

Implement comprehensive error boundaries for all major components.

**Files**: `components/error-boundary.tsx`
**Changes**: Error boundaries for map, search, and fare calculation

### T069: [P] Implement Accessibility Features

Add ARIA labels, keyboard navigation, and screen reader support.

**Files**: `components/`, `app/`
**Changes**: ARIA attributes, focus management, keyboard shortcuts

### T070: [P] Add Loading States

Implement skeleton screens and loading indicators.

**Files**: `components/ui/loading.tsx`
**Changes**: Loading components, skeleton screens, progress indicators

### T071: [P] Create Documentation

Generate API documentation and usage guides.

**Files**: `docs/`, `README.md`
**Changes**: API docs, setup instructions, troubleshooting guide

### T072: [P] Final Testing & Validation

Run complete test suite and validate all functionality.

**Files**: `__tests__/`, `quickstart.md`
**Changes**: Execute all tests, validate quickstart scenarios

---

## 📝 **COMMIT NOTE - Phase 10 Complete**

**Commit Message**: `feat(final): final integration & polish`
**When to Commit**: After ALL Phase 10 tasks (T067-T072) are completed
**Status**: ⏳ **PENDING** - Phase 10 tasks not yet started

---

## 📝 **COMMIT NOTE - Production Release**

**Commit Message**: `feat(release): production ready v1.0.0`
**When to Commit**: After ALL phases (1-10) are completed and final production validation passes
**Status**: ⏳ **PENDING** - All phases must be completed first

---

## Dependencies

- Setup (T001-T021) before everything
- Data & Types (T022-T028) before utilities
- Utilities (T029-T033) before hooks
- Hooks (T034-T038) before components
- Components (T039-T049) before pages
- Pages (T050-T053) before API integration
- API Integration (T054-T057) before testing
- Testing (T058-T062) before optimization
- Optimization (T063-T066) before final integration
- Final Integration (T067-T072) last

## Parallel Execution Examples

### Phase 1 Setup (T006-T021 can run in parallel)

```bash
# Run these simultaneously:
Task: "Update TypeScript Configuration in tsconfig.json"
Task: "Configure Ultracite Linting in biome.jsonc" 
Task: "Configure Next.js Settings in next.config.ts"
Task: "Set Up Environment Variables in .env.example"
Task: "Install Advanced Development Dependencies"
Task: "Install shadcn/ui and UI Dependencies"
Task: "Install Git Hooks and Development Tools"
Task: "Configure VS Code Settings"
Task: "Create Development Scripts"
Task: "Configure Lefthook Git Hooks"
Task: "Initialize shadcn/ui Components"
Task: "Create TypeScript Type Declarations"
Task: "Create Project Documentation"
Task: "Configure Advanced Package.json Scripts"
Task: "Set Up TypeScript Scripts Configuration"
```

### Phase 2 Data & Types (T022-T028 can run in parallel)

```bash
# Run these simultaneously:
Task: "Create Core Type Definitions in lib/types/index.ts"
Task: "Create Station Data Types in lib/types/station.ts"
Task: "Create Fare Data Types in lib/types/fare.ts"
Task: "Create Geolocation Types in lib/types/geolocation.ts"
Task: "Create Google Places Types in lib/types/places.ts"
Task: "Create Station Static Data in lib/data/stations.ts"
Task: "Create Fare Rules Data in lib/data/fares.ts"
```

### Phase 3 Utilities (T029-T033 can run in parallel)

```bash
# Run these simultaneously:
Task: "Create Distance Calculation Utilities in lib/utils/distance.ts"
Task: "Confirm existing Fare/Geolocation utilities in lib/data/fares.ts and lib/types/geolocation.ts (no duplicate files)"
Task: "Confirm/extend Type Guards where necessary in lib/types/* (no standalone file)"
Task: "Create Validation Schemas in lib/schemas/index.ts"
```

## Notes

- [P] tasks = different files, no dependencies
- Verify tests fail before implementing (TDD approach)
- Commit after each task completion
- Each task is atomic and can be completed independently
- All tasks include specific file paths and clear deliverables
- Tasks are ordered by dependencies and execution phases

## Task Generation Rules

### **Applied during main() execution**

1. **From Contracts**:
   - Each contract file → contract test task [P]
   - Each endpoint → implementation task

2. **From Data Model**:
   - Each entity → model creation task [P]
   - Relationships → service layer tasks

3. **From User Stories**:
   - Each story → integration test [P]
   - Quickstart scenarios → validation tasks

4. **Ordering**:
   - Setup (T001-T021) → Data & Types (T022-T028) → Utilities (T029-T033) → Hooks (T034-T038) → Components (T039-T049) → Pages (T050-T053) → API Integration (T054-T057) → Testing (T058-T062) → Optimization (T063-T066) → Final Integration (T067-T072)
   - Dependencies block parallel execution

## Validation Checklist

### **GATE**: Checked by main() before returning

- [x] All contracts have corresponding tests
- [x] All entities have model tasks
- [x] All tests come before implementation
- [x] Parallel tasks truly independent
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Tasks follow thin vertical slice approach
- [x] Each task is AI-executable without additional context
