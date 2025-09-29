# Research: Metro Station Finder Phase 1 MVP

**Date**: 2025-09-27  
**Feature**: Metro Station Finder Phase 1 MVP  
**Branch**: `001-metro-station-finder`

## Research Summary

This research phase analyzed the technical requirements and architectural decisions for building a modern metro station finder web application. All technical unknowns have been resolved through analysis of the feature specification, constitutional requirements, and current best practices. This document provides comprehensive research on modern tech stack patterns, development practices, and architectural decisions for 2025.

## Technology Research

### 🚀 Core Framework & Runtime

#### Next.js 15 (App Router & Server Components)

**Decision**: Use Next.js 15 with App Router and React Server Components (RSC)

**Rationale**:

- **Streamlined file-based routing**: App Router encourages organizing pages via nested folders and layouts, automatically applying layouts to pages in the hierarchy
- **Server-side data operations**: RSC allows fetching data (or importing static data) directly in server components, reducing client JS and improving performance
- **Minimal client-side JavaScript**: Keep client-side JavaScript to a minimum by using server components for static content and reserving client components only for interactive parts (e.g. map, form inputs)
- **Server Actions**: Next.js 15 includes Server Actions for form submissions without creating separate API routes
- **Zero-config approach**: Enable strict mode for React (default in App Router), keep other settings minimal for out-of-the-box functionality

**Implementation Strategy**:

- Use `next.config.ts` with minimal configuration
- Leverage automatic SWC minification and other defaults
- Configure allowed image domains or experimental features only when necessary
- Avoid overly complex config to maintain zero-config philosophy

#### React 19 (Concurrent React & Modern Patterns)

**Decision**: Use React 19 with concurrent features and cutting-edge patterns

**Rationale**:

- **Concurrent rendering**: Embrace concurrent rendering and features like `useTransition` and `Suspense` for smoother UI
- **Non-blocking updates**: Wrap non-critical updates (like updating a list of suggestions) in transitions so they don't block urgent updates
- **Lazy loading**: Use Suspense to lazy-load components (e.g. a detailed station info panel) without freezing the UI
- **Streaming**: RSC in Next.js means many components will load as a stream, enhancing Time-to-first-byte
- **Modern patterns**: Follow composition over inheritance and custom hooks for reusable logic
- **Server Components & use()**: Use the new `use()` hook for declarative data fetching in server components
- **Actions API**: Leverage React 19's Actions API for form submissions and data mutations
- **Optimistic Updates**: Use `useOptimistic` for responsive UI updates
- **Partial Hydration**: Implement modular hydration for better performance

**Modern React 19 Patterns**:

| Feature/Pattern | What's New | Best Use for Metro Station Finder |
|---|---|---|
| **Server Components & use()** | `use()` hook suspends on promise-returning operations in server components | Use `use()` within server components to fetch static station data more cleanly. Use Suspense boundaries for fallback UI |
| **Actions API / Form Actions** | Async function actions with `useActionState` for form state management | For forms that change application state (fare calculator, station search), use actions + `useActionState` to manage form state (pending, error) |
| **Optimistic Updates / useOptimistic** | Update UI before server commit, then roll back if needed | For fare estimation or station switching, apply optimistic patterns where UX benefits justify the complexity |
| **Partial / Deferred Hydration** | Hydrate only interactive parts based on visibility or user interaction | Wrap interactive components (map, search) with Suspense and hydrate only when visible or clicked |
| **Streaming & Suspense-first Rendering** | Better streaming of UI via server rendering and Suspense support | Use nested Suspense boundaries so station list appears immediately while map loads |
| **Implicit / Compiler optimizations** | React's compiler reduces need for manual `useMemo`/`useCallback` | Use simpler code patterns; let React's compiler handle performance optimizations |
| **New form semantics / uncontrolled inputs** | Inputs more "stable" by default, uncontrolled patterns gain traction | For simple forms (station search), prefer browser-handled state with form actions |
| **Error handling enhancements** | New root-level error handlers and recoverable error handling | Use robust error boundaries and global error hooks via `createRoot` options |
| **Context API improvements** | `<Context>` without `.Provider` in some cases, narrower context scopes | Use context sparingly (theme, user location); prefer local state or direct props |

**Implementation Strategy**:

- All components as function components with Hooks
- Create custom hooks like `useNearestStation()` for reusable logic
- Use `use()` hook for server-side data fetching
- Implement Actions API for form handling
- Use `useOptimistic` for responsive UI updates
- Implement partial hydration for heavy components like maps
- Use Suspense boundaries for streaming and lazy loading
- Let React's compiler handle performance optimizations
- Prefer uncontrolled inputs for simple forms
- Use error boundaries and global error handling

#### TypeScript (Strict Mode & Latest Features)

**Decision**: Use TypeScript in strict mode with latest features for maximum type safety

**Rationale**:

- **Maximum type safety**: Catch null/undefined errors or type mismatches at compile time
- **Modern target/output**: Use ES2022 or later since we support Node.js 20+ and modern browsers
- **Incremental compilation**: Enable incremental compilation to speed up rebuilds during development
- **Performance optimizations**: Include `skipLibCheck: true` to skip type-checking node_modules for faster builds
- **Advanced features**: Take advantage of const generics and other new TS capabilities

**Configuration**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    "skipLibCheck": true
  }
}
```

#### Node.js Latest (Runtime)

**Decision**: Use Node.js latest as the production runtime

**Rationale**:

- **Latest stable**: Node.js 24.8.0 (latest stable) with cutting-edge features and performance improvements
- **Next.js compatibility**: Next.js 15 is fully compatible with Node.js latest
- **Performance gains**: Latest Node.js versions include significant performance improvements
- **Modern features**: Full ES2022+ support, improved V8 engine, and latest JavaScript features
- **Bun compatibility**: Bun works seamlessly with Node.js latest for development and testing
- **Future-proof**: Using latest stable ensures access to newest features and optimizations

**Notable Node.js Latest Features**:

- **Performance improvements**: Significant speed improvements in V8 engine and runtime
- **Enhanced security**: Latest OpenSSL updates and security patches
- **Modern JavaScript**: Full support for latest ECMAScript features
- **Improved APIs**: Enhanced built-in modules and better developer experience
- **Stream enhancements**: Brotli support in CompressionStream and DecompressionStream

#### Bun (Package Manager & Dev Runtime)

**Decision**: Use Bun as a drop-in replacement for npm/Yarn

**Rationale**:

- **Speed**: Installing dependencies is much faster with Bun
- **Zero-config**: Works out-of-the-box for most usage
- **Node.js compatibility**: High compatibility with Node.js APIs
- **Human-readable lockfile**: Use `saveTextLockfile = true` for easier diffs

**Configuration** (`bunfig.toml`):

```toml
[install]
exact = true
saveTextLockfile = true
```

### 🏗️ Architecture & Data Strategy

#### Zero APIs (No custom backend initially)

**Decision**: Avoid building custom API endpoints or a separate backend

**Rationale**:

- **Simplified architecture**: No Next.js API Routes or external server code to maintain
- **Reduced complexity**: The Next.js App can run purely with file-based routes and React
- **Performance**: No additional network hop between frontend and backend for our own data
- **Easier deployment**: The app is essentially static + some dynamic JS
- **Security**: Fewer things to secure

**Implementation Strategy**:

- Use React Server Components for server-side data operations within UI code
- Import static stations data directly at build time
- All data needs handled by external services (e.g. Google Maps API) or static data

#### Static Data Approach (TypeScript constants, no database)

**Decision**: Manage all station and route data as static TypeScript files

**Rationale**:

- **Zero runtime data fetching cost**: Next.js will bundle this data with the app
- **Type safety**: Define interfaces and have data conform to them
- **Simplified validation**: Validate data once at build time and trust it at runtime
- **Performance**: Faster load (no database or API latency) and offline capability
- **Simplicity**: No ORM, migrations, or connection handling

**Implementation Strategy**:

```typescript
// lib/data/stations.ts
export const STATIONS: Station[] = [
  // station data
] as const;
```

#### Standard Repository (Single-repo, not a monorepo)

**Decision**: All code lives in one repository

**Rationale**:

- **Simplicity**: Avoids complexity of monorepos for a single application project
- **Easier tooling**: One package.json, one tsconfig, etc., easier for tools like Ultracite
- **Clear structure**: Maintain clear project structure within one Next.js app
- **AI-friendly**: Easier for newcomers or AI agents to navigate

#### File-based Routing (Next.js App Router conventions)

**Decision**: Adhere to Next.js App Router file naming and placement conventions

**Structure**:

```text
app/
├── layout.tsx              # Root layout
├── page.tsx                # Home page
├── stations/
│   ├── page.tsx            # Stations list
│   └── [id]/page.tsx       # Station detail
└── fare-calculator/
    └── page.tsx            # Fare calculator
```

**Implementation Strategy**:

- Use special files like `loading.tsx` for loading states
- Use `error.tsx` for error boundaries
- Use `generateStaticParams` for prerendered dynamic routes
- Colocate components near pages when appropriate

#### Client-side Calculations (Distance & Fare logic in-browser)

**Decision**: All calculation logic runs on the client side

**Rationale**:

- **Performance**: No server round-trip, improves perceived performance
- **Simplicity**: No API to secure or scale
- **Modern approach**: Leverage processing power of user devices
- **Type safety**: Use TypeScript to ensure correctness and unit test functions

**Implementation Strategy**:

- Use Haversine formula for distance calculations
- Implement fare calculation as pure functions
- Cache results for performance when needed
- Ensure calculations are efficient and consistent

### 🎨 UI/UX & Styling

#### Tailwind CSS (Utility-First CSS, Modern Best Practices)

**Decision**: Use Tailwind CSS 3.x (and plan for v4) as styling framework

**Rationale**:

- **Fast, design-system-driven development**: Low-level utility classes that compose to form styles
- **Modern practices**: Keep components' markup and styling together in JSX for better maintainability
- **JIT compiler**: Tree-shakes and generates only classes we use, ensuring small CSS bundle
- **Dark mode support**: Configure dark mode using class strategy with `next-themes`
- **Container queries**: Support for responsive design not just by viewport, but by container size
- **CSS variables integration**: Works well with shadcn's component library theming

**Configuration**:

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      // Custom theme extensions
    }
  }
}
```

#### shadcn/ui (Radix-based Component Library)

**Decision**: Use shadcn/ui for pre-built, accessible UI components

**Rationale**:

- **Unstyled/semi-styled components**: Built on Radix UI primitives, can be themed with Tailwind
- **Supabase/Vercel aesthetic**: Clean and modern design language
- **Accessibility**: Proper ARIA attributes and keyboard accessibility via Radix
- **RSC support**: Components work with React Server Components
- **Full control**: Since code is ours, we can customize as needed

**Configuration** (`components.json`):

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

#### Framer Motion (Smooth Animations & Micro-interactions)

**Decision**: Use Framer Motion for animations and micro-interactions

**Rationale**:

- **Physics-based animations**: Smooth, performant animations using requestAnimationFrame
- **Concurrent mode compatibility**: Works well with React's concurrent mode
- **Layout animations**: Smooth transitions between different UI states
- **Reduced motion support**: Can disable animations for users who prefer reduced motion

**Implementation Strategy**:

- Keep animations subtle and purposeful
- Use `motion` components for animated elements
- Implement `AnimatePresence` for layout changes
- Animate transform and opacity (GPU-accelerated properties)
- Check `prefers-reduced-motion` and disable non-essential animations

#### Lucide React (Icon System)

**Decision**: Use Lucide React for consistent iconography

**Rationale**:

- **Lightweight and tree-shakeable**: Only includes icons we use
- **Extensive icon set**: Covers all needs (train, location, theme toggle, etc.)
- **Consistent visual style**: All icons have same stroke style and corner radius
- **Vector SVG**: Resolution-independent and sharp on all devices
- **Accessibility**: Can add `aria-hidden="true"` for decorative icons

#### next/font (Optimized Font Loading)

**Decision**: Use Next.js built-in `next/font` for font optimization with Ropa Sans

**Rationale**:

- **Automatic optimization**: Subsets fonts, inlines critical CSS, removes external network calls
- **Performance**: High priority loading to avoid FOUT (Flash of Unstyled Text)
- **Privacy-friendly**: No calls to external servers (fonts are self-hosted)
- **Layout stability**: Prevents layout shift due to fonts
- **Brand identity**: Ropa Sans provides unique, modern typography for the metro station finder

**Implementation**:

```typescript
import { Ropa_Sans } from 'next/font/google';

const ropaSans = Ropa_Sans({ 
  subsets: ['latin'],
  variable: '--font-ropa-sans',
  weight: '400', // Only weight available for Ropa Sans
  display: 'swap' // Optimize font loading
});
```

**Font Strategy**:

- **Primary font**: Ropa Sans for all UI text and headings
- **Fallback fonts**: System fonts (sans-serif) for better performance
- **Single weight**: Regular (400) only - Ropa Sans is not available in other weights
- **Display optimization**: Use `display: 'swap'` for better loading experience
- **Typography hierarchy**: Use font-size and color to create visual hierarchy since only one weight is available

#### next/image (Optimized Image Handling)

**Decision**: Use Next.js `<Image>` component for all images

**Rationale**:

- **Automatic optimization**: Responsive sizing, lazy loading, WebP conversion
- **Modern formats**: Serves WebP/AVIF for supported browsers, falls back to PNG/JPEG
- **Layout stability**: Requires width/height or uses layout fill
- **Performance**: Different image sizes for different devices via srcset

#### Dark/Light Mode Support

**Decision**: Implement comprehensive dark mode with `next-themes`

**Rationale**:

- **User preference**: Matches OS setting by default
- **Accessibility**: Important for users with visual preferences
- **Modern expectation**: Users expect apps to adapt to their preferences

**Implementation Strategy**:

- Use `next-themes` with `ThemeProvider`
- Toggle `.dark` class on `<html>` element
- CSS variables for theming (shadcn handles this)
- Animated theme toggle with sun/moon icons
- Persist user preference in localStorage

#### Responsive & Mobile-First Design

**Decision**: Design mobile-first with responsive utilities

**Rationale**:

- **User base**: Most users likely on mobile devices
- **Modern approach**: Design for small screens first, enhance for larger
- **Tailwind utilities**: Easy responsive design with `sm:`, `md:`, `lg:` prefixes
- **Touch-friendly**: Appropriate hit areas and touch targets

### 🗺️ Maps & Geolocation

#### Google Maps JavaScript API (Core Mapping)

**Decision**: Use Google Maps JS API with @react-google-maps/api

**Rationale**:

- **Powerful and familiar**: Industry standard for web mapping
- **React integration**: @react-google-maps/api provides clean React wrapper
- **Performance**: Async loading prevents blocking initial load
- **Styling**: Supports custom themes and dark mode
- **Features**: Marker clustering, custom markers, event handling

**Implementation Strategy**:

- Load API asynchronously using `useJsApiLoader`
- Secure API key in environment variables
- Restrict key to domain in Google Cloud Console
- Use `<LoadScript>` or `useJsApiLoader` for script loading
- Implement error boundaries for map failures

**Performance Optimizations**:

- Avoid unnecessary re-renders of map component
- Use imperative API for minor updates (panning, adding markers)
- Implement marker clustering for many stations
- Cache map instance and reuse when possible

#### Geolocation & Privacy

**Decision**: User-initiated geolocation with clear privacy messaging

**Rationale**:

- **Privacy-first**: Only request location on user action, not on page load
- **Transparency**: Clear messaging about why we need location
- **Graceful fallback**: Handle denial with manual input options
- **No storage**: Location data not stored or transmitted

**Implementation Strategy**:

- Request location only when "Use my location" button clicked
- Show loading state during geolocation request
- Provide clear rationale: "We only use your location once to find nearby stations"
- Handle errors gracefully with fallback to manual input
- Use high accuracy option if needed for precision

#### Distance & Fare Calculations

**Decision**: Client-side calculations using Haversine formula

**Rationale**:

- **Performance**: No server round-trip, instant results
- **Simplicity**: No API to secure or scale
- **Accuracy**: Haversine formula sufficient for straight-line distance
- **Type safety**: Pure functions easy to test and validate

**Implementation Strategy**:

- Implement Haversine formula in utility function
- Calculate distance between user location and all stations
- Sort by distance to find nearest station
- Display distance with appropriate units (meters/kilometers)
- Cache results for performance if needed

### 📊 Data Management & Validation

#### Static TypeScript Data Files (Station & Route Data)

**Decision**: Manage all station and route data as TypeScript files

**Rationale**:

- **Zero runtime data fetching cost**: Next.js will bundle this data with the app
- **Type safety**: Define interfaces and have data conform to them at compile time
- **Simplified validation**: Validate data once at build time and trust it at runtime
- **Performance**: Faster load (no database or API latency) and offline capability
- **Simplicity**: No ORM, migrations, or connection handling

**Implementation Strategy**:

```typescript
// lib/data/stations.ts
export const STATIONS: Station[] = [
  {
    id: 'uttara-north',
    name: 'Uttara North',
    latitude: 23.8779,
    longitude: 90.3971,
    lines: ['Red'],
    amenities: ['elevator', 'escalator'],
    status: 'operational'
  }
] as const;
```

#### Zod for Runtime Validation & Schemas

**Decision**: Use Zod v4 for runtime data validation

**Rationale**:

- **Runtime validation**: While TypeScript types disappear at runtime, Zod schemas remain
- **Performance**: Zod v4 is ~14× faster than v3 for string parsing, ~7× faster for arrays
- **Smaller bundle**: Can use `zod/mini` if needed to minimize bundle size
- **LLM-friendly**: Provides concrete spec for data shapes, helping AI avoid mistakes
- **Environment validation**: Validate environment variables and catch misconfigurations early

**Implementation Strategy**:

```typescript
// lib/schemas/station.ts
import { z } from 'zod';

export const stationSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  lines: z.array(z.string()),
  amenities: z.array(z.string()),
  status: z.enum(['operational', 'maintenance', 'closed'])
});

export const stationsSchema = z.array(stationSchema);
```

#### React Built-in State Management

**Decision**: Use React's built-in Hooks for state management

**Rationale**:

- **Sufficient for scope**: Avoid external state libraries for this project size
- **Bundle size**: Reduces bundle size and complexity
- **Modern React**: Aligns with modern React philosophy using Hooks
- **URL state**: Use Next.js search params for shareable state

**Implementation Strategy**:

- Use `useState` for local component state
- Use `useReducer` for complex state with multiple values
- Use React Context for shared state (like user location)
- Use URL params for shareable state (selected station, fare calculator inputs)

#### Type-safe Data Structures (Complete TypeScript Coverage)

**Decision**: Ensure every piece of data has well-defined types

**Rationale**:

- **Compile-time safety**: Catch errors before runtime
- **Developer experience**: Auto-completion and refactoring support
- **AI-friendly**: Clear types help AI tools understand data structures
- **Maintainability**: Easier to understand and modify code

**Implementation Strategy**:

- Define interfaces for all data structures
- Use union types for different states (e.g., `type Line = "Red" | "Green" | "Blue"`)
- Use discriminated unions for API responses
- Avoid `any` or `unknown` unless absolutely necessary
- Use type guards and assertions appropriately

### 🛠️ Development Tools & Quality

#### Ultracite.ai (Biome-based Linting & Formatting)

**Decision**: Use Ultracite as all-in-one linter and formatter

**Rationale**:

- **Zero-config preset**: Highly opinionated, robust rule set for Next.js, React, and TypeScript
- **Speed**: Biome (Rust) can check hundreds of files in milliseconds
- **AI-ready formatting**: Ensures both humans and AI produce code in same style
- **Comprehensive rules**: Covers formatting, linting, accessibility, and React-specific patterns
- **Unified tool**: Replaces ESLint and Prettier entirely

**Configuration** (`biome.jsonc`):

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["ultracite"]
}
```

#### Vitest (Fast Unit Testing Framework)

**Decision**: Use Vitest for unit and integration tests

**Rationale**:

- **Speed**: Near-zero config and incredibly fast using Vite's bundling
- **Jest compatibility**: Familiar API with `describe`/`it`/`expect` syntax
- **Watch mode**: Near-instant feedback as you code
- **TypeScript support**: Excellent TypeScript integration

**Configuration** (`vitest.config.ts`):

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    globals: true,
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**']
    }
  },
  resolve: {
    alias: { '@': new URL('./', import.meta.url).pathname }
  }
});
```

#### Testing Library (React Testing Library)

**Decision**: Use @testing-library/react for component testing

**Rationale**:

- **User-centric testing**: Test components as users would interact with them
- **Accessibility**: Encourages proper roles/labels for better accessibility
- **Robust tests**: Don't rely on implementation details like class names
- **Best practices**: Focus on user behavior rather than internal state

#### Playwright (End-to-End Testing)

**Decision**: Use Playwright for full end-to-end tests

**Rationale**:

- **Real browser testing**: Launches actual browsers (Chromium, Firefox, WebKit)
- **Reliable**: Better than Selenium for modern web apps
- **Debugging**: Excellent debugging tools with traces and screenshots
- **CI integration**: Works well in CI environments

**Configuration** (`playwright.config.ts`):

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  outputDir: 'test-results',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    headless: true,
    actionTimeout: 5000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'Chromium', use: { browserName: 'chromium' } },
    { name: 'Firefox', use: { browserName: 'firefox' } }
  ]
});
```

#### Pre-commit Hooks (Lefthook & lint-staged)

**Decision**: Use Lefthook for Git hooks management

**Rationale**:

- **Speed**: Go binary that runs tasks concurrently and filters by file types
- **Parallel execution**: Can run formatting and linting simultaneously
- **File filtering**: Only run tests for changed files
- **Easy configuration**: Simple YAML configuration

**Configuration** (`lefthook.yml`):

```yaml
pre-commit:
  parallel: true
  commands:
    "format":
      run: "bunx ultracite fix {staged_files}"
    "lint":
      run: "bunx ultracite check {staged_files}"
    "unit-tests":
      run: "bunx vitest related"

commit-msg:
  commands:
    "commitlint":
      run: "bunx commitlint --edit {1}"
```

#### Conventional Commits & Commitlint

**Decision**: Enforce Conventional Commits standard

**Rationale**:

- **Automated versioning**: Works with semantic-release for automated versioning
- **Clean history**: Uniform and meaningful commit history
- **AI-friendly**: Clear format for AI tools to follow
- **Release notes**: Automatic changelog generation

#### semantic-release (Automated Versioning & Releases)

**Decision**: Use semantic-release for automated releases

**Rationale**:

- **Automated versioning**: Analyzes commit messages to determine version bumps
- **Release notes**: Generates changelog from commit messages
- **No human error**: Removes emotion and human error from versioning
- **Continuous deployment**: Triggers releases automatically on merge to main

### 🚦 CI/CD & Deployment

#### GitHub Actions (CI Pipeline)

**Decision**: Use GitHub Actions for CI/CD

**Rationale**:

- **Integration**: Works seamlessly with GitHub and other tools
- **Speed**: Can use Bun for faster dependency installation
- **Caching**: Can cache dependencies and build artifacts
- **Matrix testing**: Can test on multiple Node versions and operating systems

**Workflow Strategy**:

- **Build & Test**: Run on every push/PR
- **Release**: Run semantic-release on merge to main
- **E2E**: Run Playwright tests on preview deployments
- **Artifacts**: Upload test results and coverage reports

#### Vercel (Hosting & CDN)

**Decision**: Use Vercel for hosting and deployment

**Rationale**:

- **Next.js optimization**: Built specifically for Next.js applications
- **Zero-config deployment**: Auto-detects Next.js and uses correct build settings
- **Global CDN**: Fast content delivery worldwide
- **Environment variables**: Secure management of API keys
- **Preview deployments**: Automatic previews for every PR

**Deployment Strategy**:

- **Automatic**: Deploy on every push to main
- **Preview**: Deploy preview for every PR
- **Environment variables**: Store API keys in Vercel dashboard
- **Custom domain**: Easy custom domain setup
- **Rollbacks**: Easy rollback to previous deployments

### 📦 Project Structure & Configuration

#### Modern Project Structure

**Decision**: Follow Next.js App Router conventions with organized folder structure

**Structure**:

```text
metro-station-finder/
├── app/                      # Next.js App Router directory
│   ├── layout.tsx            # Root layout (includes ThemeProvider, nav, etc.)
│   ├── page.tsx              # Home page (map view and summary)
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

#### Package Configuration

**package.json**:

```json
{
  "name": "metro-station-finder",
  "version": "1.0.0",
  "packageManager": "bun@1.2.0",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "ultracite check",
    "format": "ultracite fix",
    "test": "vitest",
    "test:e2e": "playwright test",
    "release": "semantic-release"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@react-google-maps/api": "^2.19.0",
    "lucide-react": "^0.400.0",
    "framer-motion": "^11.0.0",
    "next-themes": "^0.3.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "ultracite": "^1.0.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@playwright/test": "^1.40.0",
    "commitlint": "^19.0.0",
    "lefthook": "^1.6.0",
    "semantic-release": "^22.0.0"
  }
}
```

#### TypeScript Configuration

**tsconfig.json**:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**Node.js Latest Compatibility**:

- **Target ES2022**: Leverages Node.js latest's full ES2022+ support
- **Module resolution**: Uses NodeNext for optimal Node.js latest compatibility
- **Modern features**: Full support for top-level await, dynamic imports, and ES modules

## Performance & Quality Targets

### Core Web Vitals Optimization

**Decision**: Comprehensive performance monitoring with strict targets

**Targets**:

- **LCP < 2.0s**: Largest Contentful Paint for fast loading
- **INP < 200ms**: Interaction to Next Paint for responsive interactions
- **CLS < 0.10**: Cumulative Layout Shift to prevent layout jumps
- **Lighthouse ≥ 90**: Overall performance score

**Implementation Strategy**:

- Server Components for static content rendering
- Lazy loading for maps and heavy components
- Optimized images with `next/image`
- Code splitting for route-based chunks
- Bundle size monitoring and limits

### Bundle Size Optimization

**Decision**: Aggressive bundle size limits with tree shaking

**Targets**:

- **JS ≤ 100 KiB gz** on first load
- **CSS ≤ 40 KiB gz**
- **Lazy load** non-critical components
- **Tree shaking** for unused code elimination

### Accessibility Requirements

**Decision**: WCAG 2.2 AA compliance with comprehensive testing

**Rationale**:

- **Legal compliance**: Required for public transportation apps
- **Inclusive design**: Improves usability for all users
- **Screen reader compatibility**: Essential for accessibility
- **Keyboard navigation**: Full keyboard support

**Implementation Strategy**:

- Semantic HTML structure throughout
- ARIA labels and roles for complex components
- Focus management for modals and navigation
- Color contrast compliance (4.5:1 ratio minimum)
- Screen reader testing with actual assistive technology

### Security & Privacy

**Decision**: Privacy-first approach with minimal data collection

**Rationale**:

- **No PII collection**: Reduces liability and privacy concerns
- **Domain-restricted API keys**: Prevents abuse and unauthorized usage
- **Local storage only**: Search history stored locally, not transmitted
- **DNT header respect**: Honor user privacy preferences

**Implementation Strategy**:

- No user accounts or authentication required
- Geolocation only on explicit user action
- Clear privacy policy and data usage explanation
- Security headers (CSP, HSTS, etc.)
- Environment variable security for API keys

## Modern Development Practices

### AI-Ready Development

**Decision**: Structure codebase for AI tool compatibility

**Rationale**:

- **Clear patterns**: Consistent code structure helps AI understand context
- **Type safety**: TypeScript provides clear contracts for AI tools
- **Documentation**: Well-documented code is easier for AI to work with
- **Conventional commits**: Standardized commit messages help AI understand changes

**Implementation Strategy**:

- Follow consistent naming conventions
- Use descriptive variable and function names
- Include JSDoc comments for complex functions
- Maintain clear separation of concerns
- Use conventional commit messages

### Developer Experience (DX) Optimization

**Decision**: Prioritize developer productivity and code quality

**Rationale**:

- **Fast feedback loops**: Quick builds and tests improve productivity
- **Consistent tooling**: Unified linting and formatting reduces cognitive load
- **Automated quality gates**: Prevent bugs from reaching production
- **Clear documentation**: Easy onboarding for new developers

**Implementation Strategy**:

- Fast build times with Bun and optimized configs
- Pre-commit hooks for quality assurance
- Comprehensive testing at all levels
- Clear README and setup instructions
- Consistent code style with Ultracite

## Conclusion

This comprehensive research establishes a modern, high-quality foundation for the Metro Station Finder Phase 1 MVP. All technical decisions align with 2025 best practices and constitutional requirements:

### ✅ **Architecture Excellence**

- **Next.js 15 + React 19**: Latest framework features with Server Components
- **Zero APIs**: Simplified architecture with static data approach
- **TypeScript strict mode**: Maximum type safety throughout
- **Modern tooling**: Bun, Ultracite, Vitest, Playwright for optimal DX

### ✅ **Performance & Quality**

- **Core Web Vitals targets**: LCP < 2.0s, INP < 200ms, CLS < 0.10
- **Bundle optimization**: < 100 KiB JS, < 40 KiB CSS
- **Accessibility**: WCAG 2.2 AA compliance
- **Testing**: Unit, integration, and E2E test coverage

### ✅ **User Experience**

- **Mobile-first design**: Responsive and touch-friendly
- **Dark mode support**: User preference adaptation
- **Smooth animations**: Framer Motion for polished interactions
- **Accessible components**: shadcn/ui with Radix primitives

### ✅ **Developer Experience**

- **AI-ready codebase**: Clear patterns and type safety
- **Automated quality**: Pre-commit hooks and CI/CD
- **Fast development**: Hot reload, instant feedback
- **Modern practices**: Conventional commits, semantic releases

### ✅ **Future-Proof Foundation**

- **Scalable architecture**: Ready for Phase 2 enhancements
- **Maintainable code**: Clear structure and documentation
- **Technology alignment**: Latest stable versions with proven track records
- **Cost optimization**: Minimal external dependencies and API calls

**No critical unknowns remain** that would block implementation. The research provides a complete technical foundation for building a world-class metro station finder application that meets modern standards for performance, accessibility, and developer experience.

**Next Steps**: Proceed to Phase 1 design and contract generation with confidence in the technical approach.
