# Metro Station Finder - Project Structure

## 🏗️ **Optimized Next.js 16 & React 19 Structure**

This document outlines the modern, industry-standard project structure following Next.js 16 App Router best practices and React 19 patterns.

## 📁 **Directory Overview**

```text
metro-station-finder/
├── app/                          # Next.js 16 App Router
│   ├── _components/              # Co-located components
│   │   ├── home-page.tsx        # Main homepage component
│   │   └── shared/              # Shared components across routes
│   │       ├── ui/              # Reusable UI components
│   │       ├── forms/           # Form components
│   │       ├── navigation/      # Navigation components
│   │       ├── providers/       # Context providers
│   │       ├── seo/             # SEO components
│   │       ├── error/           # Error boundary components
│   │       ├── suspense/        # Suspense fallback components
│   │       ├── metrics/         # Analytics components
│   │       ├── hero/            # Hero section components
│   │       └── kibo-ui/         # Custom UI library components
│   ├── about/                   # About page route
│   │   ├── _components/         # Page-specific components
│   │   ├── layout.tsx           # Page layout
│   │   └── page.tsx             # Page component
│   ├── fare-calculator/         # Fare calculator route
│   │   ├── _components/         # Page-specific components
│   │   ├── layout.tsx           # Page layout
│   │   └── page.tsx             # Page component
│   ├── station-finder/          # Station finder route
│   │   ├── _components/         # Page-specific components
│   │   ├── layout.tsx           # Page layout
│   │   └── page.tsx             # Page component
│   ├── station/                 # Dynamic station routes
│   │   ├── _components/         # Shared station components
│   │   ├── [slug]/              # Individual station pages
│   │   └── [...slug]/           # Nested station routes
│   ├── api/                     # API routes
│   │   ├── generate-icons/      # Icon generation API
│   │   └── github-glimpse/      # GitHub integration API
│   ├── icons/                   # Dynamic icon generation
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Homepage
│   ├── globals.css              # Global styles
│   ├── robots.ts                # Robots.txt generation
│   ├── sitemap.ts               # Sitemap generation
│   ├── icon.tsx                 # Favicon generation
│   ├── apple-icon.tsx           # Apple touch icon
│   ├── opengraph-image.tsx      # Open Graph image
│   └── twitter-image.tsx        # Twitter card image
├── lib/                         # Shared utilities and logic
│   ├── actions/                 # Server actions
│   ├── api/                     # API client functions
│   ├── constants.ts             # Application constants
│   ├── data/                    # Static data
│   ├── env.ts                   # Environment configuration
│   ├── hooks/                   # Custom React hooks
│   ├── map/                     # Map-related utilities
│   ├── metrics/                 # Analytics utilities
│   ├── schemas/                 # Zod validation schemas
│   ├── seo/                     # SEO utilities
│   ├── types/                   # TypeScript type definitions
│   ├── utils/                   # Utility functions
│   └── utils.ts                 # Main utilities export
├── public/                      # Static assets
│   ├── *.svg                    # Metro Station Finder icons
│   ├── manifest.json            # PWA manifest
│   ├── offline.html             # Offline page
│   └── sw.js                    # Service worker
├── scripts/                     # Build and development scripts
├── docs/                        # Project documentation
├── specs/                       # Project specifications
├── test/                        # Test files
├── e2e/                         # End-to-end tests
└── Configuration files          # Various config files
```

## 🎯 **Key Structural Principles**

### **1. Co-location Pattern**

- Components are placed close to where they're used
- `_components/` folders contain page-specific components
- `shared/` components are reusable across routes

### **2. App Router Structure**

- Uses Next.js 16 App Router exclusively
- Route-based file organization
- Proper layout hierarchy

### **3. TypeScript Organization**

- All types consolidated in `lib/types/`
- Proper type exports and imports
- Strict TypeScript configuration

### **4. Component Architecture**

- Shared components in `app/_components/shared/`
- Page-specific components in route `_components/`
- Clear separation of concerns

### **5. Utility Organization**

- Business logic in `lib/`
- Hooks in `lib/hooks/`
- API clients in `lib/api/`
- Utilities in `lib/utils/`

## 🚀 **Benefits of This Structure**

### **Performance**

- Co-location reduces bundle size
- Lazy loading where appropriate
- Optimized imports

### **Maintainability**

- Clear component hierarchy
- Easy to find related files
- Consistent naming conventions

### **Scalability**

- Easy to add new routes
- Reusable component patterns
- Modular architecture

### **Developer Experience**

- IntelliSense works better
- Clear file organization
- Easy refactoring

## 📋 **File Naming Conventions**

- **Components**: PascalCase (e.g., `StationCard.tsx`)
- **Hooks**: camelCase with `use-` prefix (e.g., `use-station-search.ts`)
- **Utilities**: camelCase (e.g., `station-combobox.ts`)
- **Types**: camelCase (e.g., `station.ts`)
- **Routes**: kebab-case (e.g., `station-finder/`)

## 🔧 **Import Path Structure**

```typescript
// Shared components
import { Button } from "@/app/_components/shared/ui/button";

// Page-specific components
import { StationCard } from "./_components/station-card";

// Utilities
import { calculateDistance } from "@/lib/utils/distance";

// Types
import type { Station } from "@/lib/types/station";

// Hooks
import { useStationSearch } from "@/lib/hooks/use-station-search";
```

## ✅ **Industry Standards Compliance**

- ✅ Next.js 16 App Router best practices
- ✅ React 19 component patterns
- ✅ TypeScript strict mode
- ✅ Co-location principle
- ✅ Clear separation of concerns
- ✅ Consistent naming conventions
- ✅ Optimized import paths
- ✅ Proper file organization

This structure follows the latest industry standards and provides a solid foundation for scalable, maintainable React applications.
