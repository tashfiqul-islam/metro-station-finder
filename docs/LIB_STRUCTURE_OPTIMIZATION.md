# Lib/ Folder Structure Optimization

## Overview

The `lib/` folder has been completely reorganized following Next.js 16 best practices and modern architectural patterns. This optimization improves maintainability, scalability, and developer experience.

## New Structure

```text
lib/
├── adapters/           # External API adapters and data sources
│   ├── fares.ts
│   ├── geolocation.ts
│   ├── places.ts
│   └── stations.ts
├── config/             # Configuration and environment setup
│   ├── constants.ts
│   ├── env.ts
│   └── schemas/
│       └── index.ts
├── hooks/              # React hooks organized by functionality
│   ├── accessibility/  # A11y-related hooks
│   │   └── use-live-region.ts
│   ├── analytics/      # Analytics and tracking hooks
│   ├── animations/     # Animation and transition hooks
│   ├── async/          # Async operation hooks
│   ├── clipboard/      # Clipboard API hooks
│   ├── context/        # Context-related hooks
│   ├── dom/            # DOM manipulation hooks
│   ├── effects/        # Side effect hooks
│   ├── error/          # Error handling hooks
│   ├── events/         # Event handling hooks
│   ├── fare/           # Fare calculation hooks
│   │   ├── use-fare-calculator-actions.ts
│   │   ├── use-fare-calculator-state.ts
│   │   └── use-fare-calculator.ts
│   ├── focus/          # Focus management hooks
│   ├── geolocation/    # Location and mapping hooks
│   │   ├── use-geolocation-permission.ts
│   │   ├── use-geolocation.ts
│   │   └── use-nearest-station.ts
│   ├── gestures/       # Touch and gesture hooks
│   ├── intersection/   # Intersection Observer hooks
│   ├── interval/       # Timer and interval hooks
│   ├── measurement/    # Element measurement hooks
│   ├── media/          # Media query hooks
│   ├── network/        # Network status hooks
│   │   ├── use-map-availability.ts
│   │   └── use-online-status.ts
│   ├── optimization/   # Performance optimization hooks
│   │   └── use-optimistic-search.ts
│   ├── performance/    # Performance monitoring hooks
│   │   └── use-debounced-value.ts
│   ├── places/         # Google Places API hooks
│   │   └── use-google-places.ts
│   ├── query/          # URL query parameter hooks
│   │   └── use-query-params-state.ts
│   ├── refs/           # Ref management hooks
│   ├── resize/         # Resize observer hooks
│   ├── retry/          # Retry logic hooks
│   ├── scroll/         # Scroll-related hooks
│   ├── search/         # Search functionality hooks
│   │   └── use-station-search.ts
│   ├── selection/      # Text selection hooks
│   ├── state/          # State management hooks
│   ├── storage/        # Local/session storage hooks
│   ├── timeout/        # Timeout management hooks
│   ├── transitions/    # View transition hooks
│   ├── validation/     # Form validation hooks
│   ├── visibility/     # Page visibility hooks
│   ├── websocket/      # WebSocket hooks
│   └── worker/         # Web Worker hooks
├── services/           # Business logic and services
│   ├── actions/        # Server actions
│   │   └── station-actions.ts
│   ├── data/           # Static data and datasets
│   │   ├── fares.ts
│   │   └── stations.ts
│   ├── map/            # Map-related services
│   │   └── styles.ts
│   ├── metrics/        # Analytics and monitoring
│   │   └── web-vitals.ts
│   └── seo/            # SEO and metadata services
│       └── metadata.ts
├── types/              # TypeScript type definitions
│   ├── css.d.ts
│   ├── env.d.ts
│   ├── fare.ts
│   ├── geolocation.ts
│   ├── google-maps.d.ts
│   ├── hooks.ts
│   ├── index.ts
│   ├── places.ts
│   ├── search.ts
│   └── station.ts
└── utils/              # Utility functions
    ├── cache.ts
    ├── distance.ts
    ├── hash.ts
    ├── indexes.ts
    ├── limiter.ts
    ├── query.ts
    ├── response.ts
    ├── station-combobox.ts
    ├── validation.ts
    └── utils.ts
```

## Key Improvements

### 1. **Separation of Concerns**

- **Adapters**: External API integrations and data sources
- **Config**: Environment variables, constants, and schemas
- **Hooks**: React hooks organized by functionality
- **Services**: Business logic and server-side operations
- **Types**: TypeScript type definitions
- **Utils**: Pure utility functions

### 2. **Hook Organization**

Hooks are now organized by functionality rather than being in a flat structure:

- **Performance**: Debouncing, throttling, optimization
- **Network**: Online status, API availability
- **Geolocation**: Location services and mapping
- **Search**: Search functionality and filtering
- **Fare**: Fare calculation and pricing
- **Accessibility**: Screen reader and a11y features
- **And many more categories...**

### 3. **Modern Architecture Patterns**

- **Adapter Pattern**: Clean separation between external APIs and internal logic
- **Service Layer**: Centralized business logic
- **Configuration Management**: Centralized config with validation
- **Type Safety**: Comprehensive TypeScript coverage

### 4. **Scalability**

- Easy to add new hooks in appropriate categories
- Clear separation makes it easy to find and maintain code
- Consistent patterns across all modules
- Future-proof structure for growth

### 5. **Developer Experience**

- Intuitive folder structure
- Clear naming conventions
- Easy to locate specific functionality
- Consistent import patterns

## Migration Benefits

1. **Maintainability**: Easier to find and modify specific functionality
2. **Scalability**: Simple to add new features in appropriate locations
3. **Team Collaboration**: Clear structure reduces confusion
4. **Code Reusability**: Better organization promotes reuse
5. **Type Safety**: Comprehensive TypeScript coverage
6. **Performance**: Optimized import paths and tree-shaking

## Import Path Updates

All import paths have been automatically updated throughout the codebase:

- `@/lib/hooks/use-*` → `@/lib/hooks/{category}/use-*`
- `@/lib/api/*` → `@/lib/adapters/*`
- `@/lib/actions/*` → `@/lib/services/actions/*`
- `@/lib/metrics/*` → `@/lib/services/metrics/*`
- `@/lib/seo/*` → `@/lib/services/seo/*`
- `@/lib/schemas` → `@/lib/config/schemas`
- `@/lib/env` → `@/lib/config/env`
- `@/lib/constants` → `@/lib/config/constants`
- `@/lib/data/*` → `@/lib/services/data/*`
- `@/lib/map/*` → `@/lib/services/map/*`

## Verification

✅ **Linting**: All files pass Biome linting rules
✅ **Type Checking**: All TypeScript types are valid
✅ **Import Resolution**: All imports resolve correctly
✅ **Functionality**: All features work as expected

This optimization brings the codebase in line with modern Next.js 16 best practices and provides a solid foundation for future development.
