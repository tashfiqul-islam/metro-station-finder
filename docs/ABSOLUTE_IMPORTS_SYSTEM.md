# Absolute Imports System - Industry Standard

## Overview

The project now uses **absolute imports** instead of relative imports (`../../`), following Next.js 15/16 industry best practices. This eliminates the need for complex relative path navigation and provides a cleaner, more maintainable codebase.

## Configuration

### TypeScript Path Mapping (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/app/*": ["./app/*"],
      "@/components/*": ["./app/_components/*"],
      "@/components/shared/*": ["./app/_components/shared/*"],
      "@/components/shared/cards/*": ["./app/_components/shared/cards/*"],
      "@/components/shared/buttons/*": ["./app/_components/shared/buttons/*"],
      "@/components/shared/effects/*": ["./app/_components/shared/effects/*"],
      "@/components/shared/ui/*": ["./app/_components/shared/ui/*"],
      "@/components/home/*": ["./app/_components/home/*"],
      "@/lib/*": ["./lib/*"],
      "@/hooks/*": ["./lib/hooks/*"],
      "@/types/*": ["./lib/types/*"],
      "@/utils/*": ["./lib/utils/*"],
      "@/styles/*": ["./styles/*"]
    }
  }
}
```

## Import Patterns

### **Before (Relative Imports)**

```typescript
// ❌ Complex relative paths
import { CTAButton } from "../../shared/buttons/cta-button";
import { StatCard } from "../../shared/cards/stat-card";
import { ANIMATION_CONFIG } from "../data/animation-config";
import { HERO_DATA } from "../data/hero-data";
```

### **After (Absolute Imports)**

```typescript
// ✅ Clean absolute paths
import { CTAButton } from "@/components/shared/buttons/cta-button";
import { StatCard } from "@/components/shared/cards/stat-card";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";
import { HERO_DATA } from "@/components/home/data/hero-data";
```

## Import Categories

### **1. Shared Components**

```typescript
// Card components
import { StatCard } from "@/components/shared/cards/stat-card";
import { FeatureCard } from "@/components/shared/cards/feature-card";
import { BenefitCard } from "@/components/shared/cards/benefit-card";
import { TestimonialCard } from "@/components/shared/cards/testimonial-card";

// Button components
import { CTAButton } from "@/components/shared/buttons/cta-button";

// Effect components
import { BackgroundGradients } from "@/components/shared/effects/background-gradients";

// UI primitives
import { Button } from "@/components/shared/ui/button";
import { Card } from "@/components/shared/ui/card";
```

### **2. Feature-Specific Components**

```typescript
// Home page sections
import { HeroSection } from "@/components/home/sections/hero-section";
import { FeaturesSection } from "@/components/home/sections/features-section";
import { BenefitsSection } from "@/components/home/sections/benefits-section";
import { TestimonialsSection } from "@/components/home/sections/testimonials-section";
import { CTASection } from "@/components/home/sections/cta-section";
```

### **3. Data and Types**

```typescript
// Home page data
import { HERO_DATA } from "@/components/home/data/hero-data";
import { STATS_DATA } from "@/components/home/data/stats-data";
import { FEATURES_DATA } from "@/components/home/data/features-data";
import { BENEFITS_DATA } from "@/components/home/data/benefits-data";
import { TESTIMONIALS_DATA } from "@/components/home/data/testimonials-data";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";

// Home page types
import type { StatData } from "@/components/home/types";
import type { FeatureData } from "@/components/home/types";
import type { BenefitData } from "@/components/home/types";
import type { TestimonialData } from "@/components/home/types";
import type { CTAVariant } from "@/components/home/types";
```

### **4. Library Imports**

```typescript
// Utilities
import { cn } from "@/lib/utils";
import { calculateDistance } from "@/lib/utils/distance";

// Hooks
import { useStationSearch } from "@/hooks/search/use-station-search";
import { useFareCalculator } from "@/hooks/fare/use-fare-calculator";

// Types
import type { Station } from "@/types/station";
import type { Fare } from "@/types/fare";
```

## Benefits of Absolute Imports

### **1. Improved Readability**

- **Clear Location**: Immediately know where components are located
- **No Path Confusion**: No need to count `../` levels
- **Intuitive Navigation**: Easy to understand project structure

### **2. Enhanced Maintainability**

- **Easy Refactoring**: Moving files doesn't break imports
- **Consistent Structure**: All imports follow the same pattern
- **Reduced Errors**: Less chance of incorrect relative paths

### **3. Better Developer Experience**

- **IDE Support**: Better autocomplete and navigation
- **Quick Imports**: IDE can suggest correct paths
- **Easy Search**: Find all usages of a component quickly

### **4. Scalability**

- **Team Collaboration**: New developers understand imports immediately
- **Large Codebases**: Easier to navigate in complex projects
- **Future-Proof**: Structure remains consistent as project grows

## Industry Standards Applied

### **1. Next.js Best Practices**

- ✅ Uses `@/` prefix for absolute imports
- ✅ Follows App Router conventions
- ✅ Optimized for TypeScript support

### **2. React Community Standards**

- ✅ Clear component organization
- ✅ Logical import grouping
- ✅ Consistent naming conventions

### **3. TypeScript Integration**

- ✅ Full type safety with path mapping
- ✅ IntelliSense support
- ✅ Compile-time error checking

## Import Organization Rules

### **1. Import Order**

```typescript
// 1. React and Next.js
import { memo, useState } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { motion } from "motion/react";
import { MapPin } from "lucide-react";

// 3. Internal components (shared first, then feature-specific)
import { Button } from "@/components/shared/ui/button";
import { HeroSection } from "@/components/home/sections/hero-section";

// 4. Data and types
import { HERO_DATA } from "@/components/home/data/hero-data";
import type { HeroData } from "@/components/home/types";

// 5. Utilities and hooks
import { cn } from "@/lib/utils";
import { useStationSearch } from "@/hooks/search/use-station-search";
```

### **2. Path Aliases**

- `@/components/shared/*` - Reusable components
- `@/components/home/*` - Home page specific components
- `@/lib/*` - Library utilities and functions
- `@/hooks/*` - Custom React hooks
- `@/types/*` - TypeScript type definitions

## Migration Results

### **Before Migration**

```typescript
// ❌ Complex relative imports
import { CTAButton } from "../../shared/buttons/cta-button";
import { StatCard } from "../../shared/cards/stat-card";
import { ANIMATION_CONFIG } from "../data/animation-config";
import { HERO_DATA } from "../data/hero-data";
```

### **After Migration**

```typescript
// ✅ Clean absolute imports
import { CTAButton } from "@/components/shared/buttons/cta-button";
import { StatCard } from "@/components/shared/cards/stat-card";
import { ANIMATION_CONFIG } from "@/components/home/data/animation-config";
import { HERO_DATA } from "@/components/home/data/hero-data";
```

## Verification

✅ **TypeScript**: All imports resolve correctly
✅ **Linting**: All files pass Biome rules
✅ **IDE Support**: Full autocomplete and navigation
✅ **Build**: No compilation errors
✅ **Industry Standards**: Follows Next.js best practices

## Future Benefits

This absolute import system provides:

1. **Easier Onboarding**: New developers understand imports immediately
2. **Better Refactoring**: Moving files doesn't break imports
3. **Improved Navigation**: IDE can jump to definitions easily
4. **Consistent Codebase**: All imports follow the same pattern
5. **Scalable Architecture**: Structure remains clear as project grows

The absolute import system now follows industry best practices and provides an excellent developer experience with clean, maintainable, and scalable code! 🚀
