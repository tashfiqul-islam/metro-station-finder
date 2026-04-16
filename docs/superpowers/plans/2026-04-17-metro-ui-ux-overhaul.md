# Metro Station Finder — 2026 UI/UX Complete Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul every page and component of metro-station-finder-v1 to 2026 world-class UI/UX standard — asymmetric layouts, editorial typography, bento grid, metro-line timeline, feature preview pages, and SSR-safe About page.

**Architecture:** CSS-first design tokens in `styles.css`, new shared components in `src/components/common/`, page sections rebuilt in-place under `src/pages/home/sections/` and `src/routes/`. All animations via `motion/react` v12's `motion` + `useInView`. TDD via Vitest + `@testing-library/react`.

**Tech Stack:** TanStack Start (SSR), React 19, Tailwind v4 (CSS-only), TypeScript, shadcn/ui (`base-mira` style, Phosphor icons), motion/react v12, Plus Jakarta Sans Variable (new body font)

**CI gate:** `bun run ci` must pass after every phase. Command: `bun run lint && bun run typecheck && bun run test && bun run build`

---

## Phase 1: CSS Foundation + Typography Swap

### Task 1: Install Plus Jakarta Sans font

**Files:**

- Modify: `package.json` (add dep)
- Modify: `src/styles.css` (swap font import + `@theme inline` alias)

- [ ] **Step 1: Install font package**

```bash
cd D:/Projects/metro-station-finder-v1
bun add @fontsource-variable/plus-jakarta-sans
```

Expected: Package added to `dependencies` in `package.json`.

- [ ] **Step 2: Swap font import in styles.css**

In `src/styles.css`, replace line 4:

```css
/* OLD */
@import "@fontsource-variable/space-grotesk";

/* NEW */
@import "@fontsource-variable/plus-jakarta-sans";
```

- [ ] **Step 3: Update `@theme inline` font alias**

In `src/styles.css`, in the `@theme inline` block (line 117), replace:

```css
/* OLD */
--font-sans: "Space Grotesk Variable", sans-serif;

/* NEW */
--font-sans: "Plus Jakarta Sans Variable", sans-serif;
```

- [ ] **Step 4: Verify build compiles**

```bash
bun run build 2>&1 | tail -5
```

Expected: exits 0, no font-related errors.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock src/styles.css
git commit -m "feat: swap body font from space-grotesk to plus-jakarta-sans"
```

---

### Task 2: Add design tokens to styles.css

**Files:**

- Modify: `src/styles.css`

- [ ] **Step 1: Add new CSS custom properties to `:root` block**

In `src/styles.css`, after the `--sidebar-ring` line inside `:root` (after line 57, before closing `}`), add:

```css
/* ── Extended surface hierarchy ──────────────────── */
--surface-1: oklch(0.965 0.006 145);
--surface-2: oklch(0.945 0.008 145);
--border-strong: oklch(0.78 0.012 250);

/* ── CTA amber accent ────────────────────────────── */
--color-amber: oklch(0.72 0.15 65);
--color-amber-foreground: oklch(0.15 0.02 65);
```

- [ ] **Step 2: Add dark-mode surface tokens to `.dark` block**

In `src/styles.css`, after `--sidebar-ring` in `.dark` block (after line 106, before closing `}`), add:

```css
/* ── Extended surface hierarchy ──────────────────── */
--surface-1: oklch(0.145 0.015 250);
--surface-2: oklch(0.18 0.015 250);
--border-strong: oklch(0.28 0.02 250);
```

- [ ] **Step 3: Register amber + surface tokens in `@theme inline`**

In `src/styles.css`, in the `@theme inline` block, after `--color-background` line (line 149), add:

```css
--color-surface-1: var(--surface-1);
--color-surface-2: var(--surface-2);
--color-border-strong: var(--border-strong);
--color-amber: var(--color-amber);
--color-amber-foreground: var(--color-amber-foreground);
```

- [ ] **Step 4: Add noise texture, scrollbar, selection, and new utility classes**

At the end of `src/styles.css`, after the last `}` in `@layer components`, add:

```css
@layer base {
  /* ── Scrollbar ───────────────────────────────────── */
  :root {
    scrollbar-width: thin;
    scrollbar-color: var(--color-primary) transparent;
  }

  /* ── Text selection ──────────────────────────────── */
  ::selection {
    background: var(--color-primary);
    color: var(--color-primary-foreground);
  }

  /* ── Body prose defaults ─────────────────────────── */
  body {
    font-size: 1rem;
    line-height: 1.7;
  }

  /* ── Noise texture overlay ───────────────────────── */
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.75' stitchTiles='stitch' type='fractalNoise'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
    background-repeat: repeat;
  }
}

@layer components {
  /* ── Bento card ──────────────────────────────────── */
  .bento-card {
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-2xl);
    transition:
      border-color 0.2s ease-out,
      box-shadow 0.2s ease-out;
  }

  .bento-card:hover {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary);
  }

  .dark .bento-card {
    background: var(--surface-1);
    border-color: oklch(1 0 0 / 7%);
  }

  /* ── Stat card ───────────────────────────────────── */
  .stat-number {
    font-family: var(--font-heading);
    font-weight: 800;
    line-height: 1;
    background: var(--brand-gradient);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* ── Route stop dot (timeline) ───────────────────── */
  .route-stop {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: var(--color-primary);
    border: 2px solid var(--color-background);
    flex-shrink: 0;
  }

  .route-stop--current {
    width: 1rem;
    height: 1rem;
    animation: pulse-stop 2s ease-in-out infinite;
  }

  @keyframes pulse-stop {
    0%,
    100% {
      box-shadow: 0 0 0 0 var(--color-primary);
    }
    50% {
      box-shadow: 0 0 0 6px oklch(0.64 0.2 145 / 0%);
    }
  }

  /* ── Metro badge (line indicator pill) ───────────── */
  .metro-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    background: var(--color-primary);
    color: var(--color-primary-foreground);
    font-family: var(--font-heading);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
}
```

- [ ] **Step 5: Verify lint passes**

```bash
bun run lint 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css
git commit -m "feat: add surface hierarchy, amber accent, noise texture, bento/stat/route utilities"
```

---

## Phase 2: Install New shadcn Components

### Task 3: Install avatar, progress, skeleton, tooltip, alert

**Files:**

- Create: `src/components/ui/avatar.tsx`
- Create: `src/components/ui/progress.tsx`
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/alert.tsx`

- [ ] **Step 1: Install components**

```bash
cd D:/Projects/metro-station-finder-v1
bunx --bun shadcn@latest add avatar progress skeleton tooltip alert
```

Expected: 5 files created in `src/components/ui/`, no errors.

- [ ] **Step 2: Verify components render**

```bash
bun run typecheck 2>&1 | grep -E "error|Error" | head -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/avatar.tsx src/components/ui/progress.tsx src/components/ui/skeleton.tsx src/components/ui/tooltip.tsx src/components/ui/alert.tsx
git commit -m "feat: install avatar, progress, skeleton, tooltip, alert shadcn components"
```

---

## Phase 3: New Shared Components

### Task 4: ViewportAnimation component

**Files:**

- Create: `src/components/common/viewport-animation.tsx`
- Create: `tests/unit/components/common/viewport-animation.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/common/viewport-animation.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewportAnimation } from "@/components/common/viewport-animation";

describe("ViewportAnimation", () => {
  it("renders children", () => {
    render(
      <ViewportAnimation>
        <span>hello</span>
      </ViewportAnimation>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("accepts delay prop without error", () => {
    render(
      <ViewportAnimation delay={0.3}>
        <span>delayed</span>
      </ViewportAnimation>,
    );
    expect(screen.getByText("delayed")).toBeInTheDocument();
  });

  it("accepts className prop", () => {
    const { container } = render(
      <ViewportAnimation className="my-class">
        <span>content</span>
      </ViewportAnimation>,
    );
    expect(container.firstChild).toHaveClass("my-class");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test tests/unit/components/common/viewport-animation.test.tsx 2>&1 | tail -10
```

Expected: FAIL — "Cannot find module '@/components/common/viewport-animation'"

- [ ] **Step 3: Implement ViewportAnimation**

Create `src/components/common/viewport-animation.tsx`:

```tsx
import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

interface ViewportAnimationProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function ViewportAnimation({ children, delay = 0, className }: ViewportAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={
        isInView
          ? { opacity: 1, y: 0 }
          : shouldReduceMotion
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 20 }
      }
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.1, 0.25, 1.0],
      }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test tests/unit/components/common/viewport-animation.test.tsx 2>&1 | tail -10
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/viewport-animation.tsx tests/unit/components/common/viewport-animation.test.tsx
git commit -m "feat: add ViewportAnimation component with motion/react useInView"
```

---

### Task 5: StatCard component

**Files:**

- Create: `src/components/common/stat-card.tsx`
- Create: `tests/unit/components/common/stat-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/common/stat-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "@/components/common/stat-card";

describe("StatCard", () => {
  it("renders value and label", () => {
    render(<StatCard value="21" label="Stations" />);
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText("Stations")).toBeInTheDocument();
  });

  it("renders optional unit", () => {
    render(<StatCard value="20.1" label="Route Length" unit="km" />);
    expect(screen.getByText("km")).toBeInTheDocument();
  });

  it("renders optional icon", () => {
    render(<StatCard value="6" label="Lines" icon={<span data-testid="icon" />} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test tests/unit/components/common/stat-card.test.tsx 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement StatCard**

Create `src/components/common/stat-card.tsx`:

```tsx
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  value: string;
  label: string;
  unit?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ value, label, unit, icon, className }: StatCardProps) {
  return (
    <div className={cn("glass-card flex flex-col gap-1 rounded-xl px-4 py-3", className)}>
      {icon && <div className="mb-1 text-primary">{icon}</div>}
      <div className="flex items-baseline gap-1">
        <span className="stat-number text-3xl">{value}</span>
        {unit && (
          <span className="font-heading text-sm font-medium text-muted-foreground">{unit}</span>
        )}
      </div>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test tests/unit/components/common/stat-card.test.tsx 2>&1 | tail -5
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/stat-card.tsx tests/unit/components/common/stat-card.test.tsx
git commit -m "feat: add StatCard component for hero statistics display"
```

---

### Task 6: BentoCard component

**Files:**

- Create: `src/components/common/bento-card.tsx`
- Create: `tests/unit/components/common/bento-card.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/common/bento-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BentoCard } from "@/components/common/bento-card";

describe("BentoCard", () => {
  it("renders children", () => {
    render(
      <BentoCard>
        <span>content</span>
      </BentoCard>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("applies lg size class", () => {
    const { container } = render(
      <BentoCard size="lg">
        <span>large</span>
      </BentoCard>,
    );
    expect(container.firstChild).toHaveClass("col-span-2");
  });

  it("applies sm size class", () => {
    const { container } = render(
      <BentoCard size="sm">
        <span>small</span>
      </BentoCard>,
    );
    expect(container.firstChild).not.toHaveClass("col-span-2");
  });

  it("renders icon when provided", () => {
    render(
      <BentoCard icon={<span data-testid="bento-icon" />} title="Test">
        content
      </BentoCard>,
    );
    expect(screen.getByTestId("bento-icon")).toBeInTheDocument();
    expect(screen.getByText("Test")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test tests/unit/components/common/bento-card.test.tsx 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement BentoCard**

Create `src/components/common/bento-card.tsx`:

```tsx
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: ReactNode;
  size?: "lg" | "md" | "sm";
  className?: string;
}

export function BentoCard({
  children,
  title,
  description,
  icon,
  size = "md",
  className,
}: BentoCardProps) {
  return (
    <div
      className={cn(
        "bento-card flex flex-col gap-3 overflow-hidden",
        size === "lg" && "col-span-2 p-8",
        size === "md" && "p-6",
        size === "sm" && "p-4",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl bg-primary/10 text-primary",
            size === "lg" ? "size-14" : size === "md" ? "size-11" : "size-9",
          )}
        >
          {icon}
        </div>
      )}
      {title && (
        <h3
          className={cn(
            "font-heading font-bold text-foreground",
            size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : "text-base",
          )}
        >
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test tests/unit/components/common/bento-card.test.tsx 2>&1 | tail -5
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/bento-card.tsx tests/unit/components/common/bento-card.test.tsx
git commit -m "feat: add BentoCard component for asymmetric feature grid"
```

---

### Task 7: RouteMapSvg component

**Files:**

- Create: `src/components/common/route-map-svg.tsx`
- Create: `tests/unit/components/common/route-map-svg.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/common/route-map-svg.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RouteMapSvg } from "@/components/common/route-map-svg";

describe("RouteMapSvg", () => {
  it("renders an SVG element", () => {
    const { container } = render(<RouteMapSvg />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders station labels", () => {
    render(<RouteMapSvg />);
    expect(screen.getByText("Uttara North")).toBeInTheDocument();
    expect(screen.getByText("Motijheel")).toBeInTheDocument();
  });

  it("accepts className prop", () => {
    const { container } = render(<RouteMapSvg className="w-full" />);
    expect(container.querySelector("svg")).toHaveClass("w-full");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test tests/unit/components/common/route-map-svg.test.tsx 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement RouteMapSvg**

Create `src/components/common/route-map-svg.tsx`:

```tsx
import { cn } from "@/lib/utils";

const MRT_STATIONS = [
  "Uttara North",
  "Uttara Centre",
  "Uttara South",
  "Pallabi",
  "Mirpur 11",
  "Mirpur 10",
  "Kazipara",
  "Shewrapara",
  "Agargaon",
  "Bijoy Sarani",
  "Farmgate",
  "Karwan Bazar",
  "Shahbagh",
  "Dhaka University",
  "Bangladesh Secretariat",
  "Motijheel",
];

interface RouteMapSvgProps {
  className?: string;
  highlightStation?: string;
}

export function RouteMapSvg({ className, highlightStation }: RouteMapSvgProps) {
  const stationCount = MRT_STATIONS.length;
  const svgHeight = 520;
  const svgWidth = 220;
  const lineX = 60;
  const topPad = 24;
  const bottomPad = 24;
  const stationSpacing = (svgHeight - topPad - bottomPad) / (stationCount - 1);

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={cn("overflow-visible", className)}
      aria-label="MRT Line 6 route map"
      role="img"
    >
      {/* Main route line */}
      <line
        x1={lineX}
        y1={topPad}
        x2={lineX}
        y2={svgHeight - bottomPad}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-primary"
      />

      {MRT_STATIONS.map((station, i) => {
        const y = topPad + i * stationSpacing;
        const isHighlighted = station === highlightStation;
        const isFirst = i === 0;
        const isLast = i === stationCount - 1;
        const isKeyStation = isFirst || isLast || i === 8;

        return (
          <g key={station}>
            {/* Station dot */}
            <circle
              cx={lineX}
              cy={y}
              r={isKeyStation ? 6 : 4}
              fill={isHighlighted || isKeyStation ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={isKeyStation ? 0 : 2}
              className={isHighlighted ? "text-primary" : "text-primary"}
            />
            {/* Station label — only for key stations */}
            {isKeyStation && (
              <text
                x={lineX + 14}
                y={y + 4}
                fontSize="11"
                fontFamily="var(--font-heading)"
                fontWeight="600"
                fill="currentColor"
                className="text-foreground"
              >
                {station}
              </text>
            )}
          </g>
        );
      })}

      {/* Station count label */}
      <text
        x={lineX + 14}
        y={topPad + 4 * stationSpacing + 4}
        fontSize="10"
        fontFamily="var(--font-sans)"
        fill="currentColor"
        className="text-muted-foreground"
      >
        + {stationCount - 3} more stations
      </text>
    </svg>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test tests/unit/components/common/route-map-svg.test.tsx 2>&1 | tail -5
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/route-map-svg.tsx tests/unit/components/common/route-map-svg.test.tsx
git commit -m "feat: add RouteMapSvg component with MRT Line 6 station visualization"
```

---

## Phase 4: Hero Section Rebuild

### Task 8: Rebuild hero-section.tsx

**Files:**

- Modify: `src/pages/home/sections/hero-section.tsx`
- Create: `tests/unit/pages/home/sections/hero-section.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/pages/home/sections/hero-section.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { HeroSection } from "@/pages/home/sections/hero-section";

function renderWithRouter(ui: React.ReactElement) {
  const router = createRouter({ routeTree, history: createMemoryHistory() });
  return render(ui, {
    wrapper: ({ children }) => <router.Provider>{children}</router.Provider>,
  });
}

describe("HeroSection", () => {
  it("renders the main headline", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders explore stations CTA link", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByRole("link", { name: /explore stations/i })).toBeInTheDocument();
  });

  it("renders plan journey CTA link", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByRole("link", { name: /plan your journey/i })).toBeInTheDocument();
  });

  it("renders station count stat", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText("21")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test tests/unit/pages/home/sections/hero-section.test.tsx 2>&1 | tail -10
```

Expected: FAIL — missing exports or wrong render.

- [ ] **Step 3: Rewrite hero-section.tsx**

Replace the entire contents of `src/pages/home/sections/hero-section.tsx` with:

```tsx
import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Train, Path } from "@phosphor-icons/react";
import { RouteMapSvg } from "@/components/common/route-map-svg";
import { StatCard } from "@/components/common/stat-card";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] overflow-hidden">
      {/* Dot-grid background pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-24 sm:px-8 lg:pt-32">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_auto]">
          {/* ── Left: Content ────────────────────────────── */}
          <div className="flex flex-col gap-6 lg:max-w-2xl">
            <ViewportAnimation delay={0}>
              <span className="metro-badge w-fit">
                <Train weight="bold" size={12} />
                Dhaka MRT Line 6
              </span>
            </ViewportAnimation>

            <ViewportAnimation delay={0.1}>
              <h1 className="font-heading text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Navigate <span className="gradient-text">Dhaka's Metro</span> with Confidence
              </h1>
            </ViewportAnimation>

            <ViewportAnimation delay={0.25}>
              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                Find stations, plan routes, and check fares for the MRT Line 6 — Dhaka's first rapid
                transit network connecting Uttara to Motijheel.
              </p>
            </ViewportAnimation>

            <ViewportAnimation delay={0.4}>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="group gap-2">
                  <Link to="/station-finder">
                    Explore Stations
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link to="/trip-planner">Plan Your Journey</Link>
                </Button>
              </div>
            </ViewportAnimation>

            {/* Stats row */}
            <ViewportAnimation delay={0.5}>
              <div className="flex flex-wrap gap-3 pt-2">
                <StatCard value="21" label="Stations" icon={<MapPin weight="fill" size={16} />} />
                <StatCard
                  value="20.1"
                  label="Route Length"
                  unit="km"
                  icon={<Path weight="fill" size={16} />}
                />
                <StatCard value="1" label="Line" icon={<Train weight="fill" size={16} />} />
              </div>
            </ViewportAnimation>
          </div>

          {/* ── Right: Route map ──────────────────────────── */}
          <ViewportAnimation delay={0.6} className="hidden lg:block">
            <div className="glass-card relative rounded-2xl p-6">
              <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                MRT Line 6 Route
              </p>
              <RouteMapSvg className="h-[480px] text-foreground" />
            </div>
          </ViewportAnimation>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test tests/unit/pages/home/sections/hero-section.test.tsx 2>&1 | tail -10
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/home/sections/hero-section.tsx tests/unit/pages/home/sections/hero-section.test.tsx
git commit -m "feat: rebuild hero section with asymmetric split, route map, and stat cards"
```

---

## Phase 5: Features Bento Grid

### Task 9: Rebuild features-section.tsx

**Files:**

- Modify: `src/pages/home/sections/features-section.tsx`
- Create: `tests/unit/pages/home/sections/features-section.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/pages/home/sections/features-section.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturesSection } from "@/pages/home/sections/features-section";

describe("FeaturesSection", () => {
  it("renders section heading", () => {
    render(<FeaturesSection />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("renders 5 feature cards", () => {
    render(<FeaturesSection />);
    expect(screen.getByText("Station Search")).toBeInTheDocument();
    expect(screen.getByText("Fare Calculator")).toBeInTheDocument();
    expect(screen.getByText("Trip Planning")).toBeInTheDocument();
    expect(screen.getByText("Live Updates")).toBeInTheDocument();
    expect(screen.getByText("Accessibility")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test tests/unit/pages/home/sections/features-section.test.tsx 2>&1 | tail -5
```

Expected: FAIL.

- [ ] **Step 3: Rewrite features-section.tsx**

Replace the entire contents of `src/pages/home/sections/features-section.tsx` with:

```tsx
import {
  MagnifyingGlass,
  CurrencyDollar,
  MapTrifold,
  Bell,
  Wheelchair,
} from "@phosphor-icons/react";
import { BentoCard } from "@/components/common/bento-card";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { SectionWrapper } from "@/components/common/section-wrapper";

const FEATURES = [
  {
    id: "search",
    title: "Station Search",
    description:
      "Find any of the 21 MRT Line 6 stations instantly. Search by name, area, or nearby landmark. Get full station details including facilities and connectivity.",
    icon: <MagnifyingGlass weight="duotone" size={24} />,
    size: "lg" as const,
  },
  {
    id: "fares",
    title: "Fare Calculator",
    description: "Calculate exact fares between any two stations before you travel.",
    icon: <CurrencyDollar weight="duotone" size={20} />,
    size: "md" as const,
  },
  {
    id: "trip",
    title: "Trip Planning",
    description: "Plan multi-stop journeys with route suggestions and transfer guidance.",
    icon: <MapTrifold weight="duotone" size={20} />,
    size: "md" as const,
  },
  {
    id: "updates",
    title: "Live Updates",
    description: "Real-time service status and platform information.",
    icon: <Bell weight="duotone" size={18} />,
    size: "sm" as const,
  },
  {
    id: "accessibility",
    title: "Accessibility",
    description: "Lift status, accessible routes, and facility details.",
    icon: <Wheelchair weight="duotone" size={18} />,
    size: "sm" as const,
  },
] as const;

export function FeaturesSection() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <ViewportAnimation>
          <div className="mb-12 max-w-xl">
            <span className="metro-badge mb-4 inline-flex">Features</span>
            <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
              Everything you need to <span className="gradient-text">ride with ease</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Comprehensive tools for every Dhaka metro commuter — from first-time riders to daily
              users.
            </p>
          </div>
        </ViewportAnimation>

        {/* Bento grid — 3 columns on desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <ViewportAnimation key={feature.id} delay={i * 0.08}>
              <BentoCard
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
                size={feature.size}
                className="h-full"
              />
            </ViewportAnimation>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test tests/unit/pages/home/sections/features-section.test.tsx 2>&1 | tail -5
```

Expected: PASS — 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/home/sections/features-section.tsx tests/unit/pages/home/sections/features-section.test.tsx
git commit -m "feat: rebuild features section as bento grid with 5 asymmetric cards"
```

---

## Phase 6: Story Ordinal Redesign

### Task 10: Rebuild story-section.tsx

**Files:**

- Modify: `src/pages/home/sections/story-section.tsx`
- Create: `tests/unit/pages/home/sections/story-section.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/pages/home/sections/story-section.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StorySection } from "@/pages/home/sections/story-section";

describe("StorySection", () => {
  it("renders section heading", () => {
    render(<StorySection />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("renders all 4 story steps", () => {
    render(<StorySection />);
    expect(screen.getByText("Frustration")).toBeInTheDocument();
    expect(screen.getByText("Inspiration")).toBeInTheDocument();
    expect(screen.getByText("Solution")).toBeInTheDocument();
    expect(screen.getByText("Impact")).toBeInTheDocument();
  });

  it("renders ordinal numbers", () => {
    render(<StorySection />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("04")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test tests/unit/pages/home/sections/story-section.test.tsx 2>&1 | tail -5
```

Expected: FAIL.

- [ ] **Step 3: Rewrite story-section.tsx**

Replace the entire contents of `src/pages/home/sections/story-section.tsx` with:

```tsx
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { SectionWrapper } from "@/components/common/section-wrapper";

const STORY_STEPS = [
  {
    ordinal: "01",
    title: "Frustration",
    body: "Every Dhaka commuter knows the feeling — standing at a metro entrance, unsure which station to board at, what the fare will be, or how many stops to count.",
  },
  {
    ordinal: "02",
    title: "Inspiration",
    body: "The MRT Line 6 is an engineering marvel, but its information was scattered across PDFs, apps, and rumor. Commuters deserved a single, clear source of truth.",
  },
  {
    ordinal: "03",
    title: "Solution",
    body: "A fast, offline-capable web app purpose-built for Dhaka — station finder, fare calculator, and trip planner in one clean interface that works on any phone.",
  },
  {
    ordinal: "04",
    title: "Impact",
    body: "Thousands of daily commuters navigating with confidence, saving time, and experiencing Dhaka's metro the way it was meant to be experienced.",
  },
] as const;

export function StorySection() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <ViewportAnimation>
          <div className="mb-16 max-w-xl">
            <span className="metro-badge mb-4 inline-flex">Origin Story</span>
            <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
              Why this app <span className="gradient-text">exists</span>
            </h2>
          </div>
        </ViewportAnimation>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STORY_STEPS.map((step, i) => (
            <ViewportAnimation key={step.ordinal} delay={i * 0.1}>
              <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface-1 p-6 transition-colors hover:border-primary/40 dark:bg-[var(--surface-1)]">
                {/* Background ordinal number */}
                <span
                  aria-hidden="true"
                  className="font-heading absolute -right-2 -top-4 select-none text-[5rem] font-black leading-none text-primary/8"
                >
                  {step.ordinal}
                </span>

                {/* Content */}
                <div className="relative z-10 flex flex-col gap-3">
                  <span className="font-heading text-xs font-semibold uppercase tracking-widest text-primary">
                    {step.ordinal}
                  </span>
                  <h3 className="font-heading text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </div>
            </ViewportAnimation>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test tests/unit/pages/home/sections/story-section.test.tsx 2>&1 | tail -5
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/home/sections/story-section.tsx tests/unit/pages/home/sections/story-section.test.tsx
git commit -m "feat: rebuild story section with oversized ordinal background numbers"
```

---

## Phase 7: Journey Timeline Upgrade

### Task 11: Rebuild timeline.tsx component

**Files:**

- Modify: `src/components/ui/timeline.tsx`
- Create: `tests/unit/components/ui/timeline.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/components/ui/timeline.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Timeline, TimelineItem } from "@/components/ui/timeline";

describe("Timeline", () => {
  it("renders timeline items", () => {
    render(
      <Timeline>
        <TimelineItem version="v0.1.0" date="Oct 2025" title="Initial Release" isCurrent={false}>
          First commit
        </TimelineItem>
        <TimelineItem version="v1.0.0" date="Apr 2026" title="Production Launch" isCurrent={true}>
          Full release
        </TimelineItem>
      </Timeline>,
    );
    expect(screen.getByText("v0.1.0")).toBeInTheDocument();
    expect(screen.getByText("v1.0.0")).toBeInTheDocument();
    expect(screen.getByText("Production Launch")).toBeInTheDocument();
  });

  it("marks current item distinctively", () => {
    render(
      <Timeline>
        <TimelineItem version="v1.0.0" date="Apr 2026" title="Current" isCurrent={true}>
          body
        </TimelineItem>
      </Timeline>,
    );
    expect(screen.getByText("Current")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test tests/unit/components/ui/timeline.test.tsx 2>&1 | tail -5
```

Expected: FAIL — wrong exports.

- [ ] **Step 3: Rewrite timeline.tsx**

Replace the entire contents of `src/components/ui/timeline.tsx` with:

```tsx
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface TimelineItemProps {
  version: string;
  date: string;
  title: string;
  children: ReactNode;
  isCurrent?: boolean;
}

export function TimelineItem({
  version,
  date,
  title,
  children,
  isCurrent = false,
}: TimelineItemProps) {
  return (
    <div className="relative flex gap-6">
      {/* Stop dot */}
      <div className="flex flex-col items-center">
        <div className={cn("route-stop mt-1 shrink-0", isCurrent && "route-stop--current")} />
        {/* Connector line (hidden on last item via parent) */}
        <div className="mt-1 w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="pb-10">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-heading font-semibold">
            {version}
          </Badge>
          <span className="text-xs text-muted-foreground">{date}</span>
          {isCurrent && <span className="metro-badge text-[10px]">Current</span>}
        </div>
        <h3 className="font-heading text-base font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

interface TimelineProps {
  children: ReactNode;
  className?: string;
}

export function Timeline({ children, className }: TimelineProps) {
  return <div className={cn("relative", className)}>{children}</div>;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test tests/unit/components/ui/timeline.test.tsx 2>&1 | tail -5
```

Expected: PASS — 2 tests pass.

- [ ] **Step 5: Rebuild journey-section.tsx to use new Timeline**

Replace the entire contents of `src/pages/home/sections/journey-section.tsx` with:

```tsx
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { SectionWrapper } from "@/components/common/section-wrapper";

const JOURNEY_ITEMS = [
  {
    version: "v0.1.0",
    date: "October 2025",
    title: "Foundation Laid",
    body: "TanStack Start scaffolding, routing, and initial design system established. The project skeleton takes shape.",
    isCurrent: false,
  },
  {
    version: "v0.5.0",
    date: "December 2025",
    title: "Core Components",
    body: "Glass-card system, theme switcher, navbar, and homepage sections built. Dark mode working flawlessly.",
    isCurrent: false,
  },
  {
    version: "v0.8.0",
    date: "February 2026",
    title: "Data & Testing",
    body: "MRT Line 6 station data integrated, CI pipeline with 80%+ test coverage enforced, production build optimized.",
    isCurrent: false,
  },
  {
    version: "v1.0.0",
    date: "April 2026",
    title: "Production Launch",
    body: "Full 2026 design overhaul, station finder, fare calculator, and trip planner ready for Dhaka commuters.",
    isCurrent: true,
  },
] as const;

export function JourneySection() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <ViewportAnimation>
          <div className="mb-12 max-w-xl">
            <span className="metro-badge mb-4 inline-flex">Dev Journey</span>
            <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
              From idea to <span className="gradient-text">production</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              The milestones that shaped this project — each version a step closer to a tool Dhaka
              commuters actually want to use.
            </p>
          </div>
        </ViewportAnimation>

        <ViewportAnimation delay={0.2}>
          <div className="max-w-2xl">
            <Timeline>
              {JOURNEY_ITEMS.map((item) => (
                <TimelineItem
                  key={item.version}
                  version={item.version}
                  date={item.date}
                  title={item.title}
                  isCurrent={item.isCurrent}
                >
                  {item.body}
                </TimelineItem>
              ))}
            </Timeline>
          </div>
        </ViewportAnimation>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 6: Run full test suite**

```bash
bun run test 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/timeline.tsx src/pages/home/sections/journey-section.tsx tests/unit/components/ui/timeline.test.tsx
git commit -m "feat: rebuild timeline component and journey section with metro-line style"
```

---

## Phase 8: Tech Stack Dual-Row Upgrade

### Task 12: Upgrade tech-stack-section.tsx

**Files:**

- Modify: `src/pages/home/sections/tech-stack-section.tsx`
- Modify: `src/components/ui/infinite-slider.tsx`

- [ ] **Step 1: Read current infinite-slider to understand interface**

```bash
cat -n src/components/ui/infinite-slider.tsx
```

Note the props interface — you need `duration`, `direction`, and `className` props.

- [ ] **Step 2: Update tech-stack-section.tsx for dual-row layout**

Replace the entire contents of `src/pages/home/sections/tech-stack-section.tsx` with:

```tsx
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { SectionWrapper } from "@/components/common/section-wrapper";

const TECH_STACK_ROW_1 = [
  { name: "React 19", logo: "⚛️" },
  { name: "TanStack Start", logo: "🔷" },
  { name: "TypeScript", logo: "🔵" },
  { name: "Tailwind v4", logo: "🎨" },
  { name: "shadcn/ui", logo: "⬛" },
  { name: "Vite", logo: "⚡" },
];

const TECH_STACK_ROW_2 = [
  { name: "Bun", logo: "🥟" },
  { name: "Vitest", logo: "🧪" },
  { name: "motion/react", logo: "🎬" },
  { name: "Phosphor Icons", logo: "💡" },
  { name: "TanStack Query", logo: "🔄" },
  { name: "TanStack Router", logo: "🗺️" },
];

function TechItem({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface-1 px-4 py-2 transition-colors hover:border-primary/50 dark:bg-[var(--surface-1)]">
      <span className="text-base" aria-hidden="true">
        {logo}
      </span>
      <span className="font-heading text-sm font-semibold text-foreground">{name}</span>
    </div>
  );
}

export function TechStackSection() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <ViewportAnimation>
          <div className="mb-10 text-center">
            <span className="metro-badge mb-4 inline-flex">Built With</span>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">
              World-class <span className="gradient-text">tech stack</span>
            </h2>
          </div>
        </ViewportAnimation>
      </div>

      <div className="flex flex-col gap-4 overflow-hidden">
        <InfiniteSlider duration={25} className="py-1">
          {TECH_STACK_ROW_1.map((tech) => (
            <TechItem key={tech.name} {...tech} />
          ))}
        </InfiniteSlider>
        <InfiniteSlider duration={35} reverse className="py-1">
          {TECH_STACK_ROW_2.map((tech) => (
            <TechItem key={tech.name} {...tech} />
          ))}
        </InfiniteSlider>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 3: Verify InfiniteSlider accepts `reverse` prop — check types**

```bash
bun run typecheck 2>&1 | grep -i "infinite-slider\|reverse" | head -5
```

If `reverse` prop doesn't exist on `InfiniteSlider`, add it: open `src/components/ui/infinite-slider.tsx`, add `reverse?: boolean` to the props interface, and apply `animationDirection: reverse ? "reverse" : "normal"` to the animation style.

- [ ] **Step 4: Run full test suite**

```bash
bun run test 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/home/sections/tech-stack-section.tsx src/components/ui/infinite-slider.tsx
git commit -m "feat: upgrade tech stack section to dual-row infinite slider with labeled pills"
```

---

## Phase 9: Maintainer Editorial Card

### Task 13: Rebuild maintainer-section.tsx

**Files:**

- Modify: `src/pages/home/sections/maintainer-section.tsx`

- [ ] **Step 1: Read current maintainer-section.tsx**

```bash
cat -n src/pages/home/sections/maintainer-section.tsx
```

Note the current maintainer data (name, role, bio, social links) — preserve all of it.

- [ ] **Step 2: Rewrite maintainer-section.tsx**

Replace the entire contents of `src/pages/home/sections/maintainer-section.tsx` with:

```tsx
import { GithubLogo, LinkedinLogo, Globe } from "@phosphor-icons/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { SectionWrapper } from "@/components/common/section-wrapper";

export function MaintainerSection() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <ViewportAnimation>
          <div className="overflow-hidden rounded-3xl border border-border">
            <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr]">
              {/* ── Left: Identity panel ───────────────────── */}
              <div className="flex flex-col items-center justify-center gap-6 bg-primary px-8 py-12 text-primary-foreground lg:px-12 lg:py-16">
                <Avatar className="size-24 ring-4 ring-primary-foreground/20">
                  <AvatarImage src="https://github.com/tashfiqul-islam.png" alt="Tashfiqul Islam" />
                  <AvatarFallback className="bg-primary-foreground/20 font-heading text-2xl font-bold text-primary-foreground">
                    TI
                  </AvatarFallback>
                </Avatar>

                <div className="text-center">
                  <h3 className="font-heading text-3xl font-extrabold leading-tight">
                    Tashfiqul Islam
                  </h3>
                  <p className="mt-1 text-sm font-medium text-primary-foreground/70">
                    Full-Stack Engineer & Creator
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  >
                    <a
                      href="https://github.com/tashfiqul-islam"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub profile"
                    >
                      <GithubLogo weight="fill" size={20} />
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  >
                    <a
                      href="https://linkedin.com/in/tashfiqul-islam"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="LinkedIn profile"
                    >
                      <LinkedinLogo weight="fill" size={20} />
                    </a>
                  </Button>
                </div>
              </div>

              {/* ── Right: Bio content ─────────────────────── */}
              <div className="flex flex-col justify-center gap-6 bg-surface-1 px-8 py-12 dark:bg-[var(--surface-1)] lg:px-12 lg:py-16">
                <span className="metro-badge w-fit">Maintainer</span>

                <div>
                  <h2 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
                    Built by someone who <span className="gradient-text">rides this metro</span>
                  </h2>
                  <p className="mt-4 leading-relaxed text-muted-foreground">
                    A software engineer based in Dhaka who got tired of not knowing the fare before
                    reaching the ticket machine. This app started as a weekend project and grew into
                    something thousands of commuters now rely on daily.
                  </p>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    Built with modern web technologies, designed for real people, and open-sourced
                    for the Dhaka developer community.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="metro-badge">React 19</span>
                  <span className="metro-badge">TypeScript</span>
                  <span className="metro-badge">Open Source</span>
                </div>

                <Button asChild variant="outline" className="w-fit gap-2">
                  <a
                    href="https://github.com/tashfiqul-islam/metro-station-finder"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GithubLogo weight="fill" size={16} />
                    View on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </ViewportAnimation>
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
bun run typecheck 2>&1 | grep "error" | head -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/home/sections/maintainer-section.tsx
git commit -m "feat: rebuild maintainer section as editorial split card with Avatar"
```

---

## Phase 10: About Page — SSR Fix + Sidebar Layout

### Task 14: Fix SSR bug and redesign about.tsx

**Files:**

- Modify: `src/routes/about.tsx`

- [ ] **Step 1: Read current about.tsx in full**

```bash
cat -n src/routes/about.tsx
```

Note: identify the `if (!mounted) return null` guard and the current tab/section structure.

- [ ] **Step 2: Rewrite about.tsx**

Replace the entire file with a sidebar-navigation layout. The `if (!mounted) return null` is eliminated — all sections render server-side with `suppressHydrationWarning` on the root element where needed.

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Info, Target, Stack, Envelope } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { SectionWrapper } from "@/components/common/section-wrapper";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "mission", label: "Mission", icon: Target },
  { id: "tech", label: "Tech Stack", icon: Stack },
  { id: "contact", label: "Contact", icon: Envelope },
] as const;

type SectionId = (typeof NAV_ITEMS)[number]["id"];

function AboutPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  return (
    <SectionWrapper>
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Page header */}
        <ViewportAnimation>
          <div className="mb-12">
            <span className="metro-badge mb-4 inline-flex">About</span>
            <h1 className="font-heading text-4xl font-extrabold sm:text-5xl">
              About this <span className="gradient-text">project</span>
            </h1>
          </div>
        </ViewportAnimation>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* ── Sidebar navigation ──────────────────────── */}
          <aside className="lg:w-44 lg:shrink-0">
            {/* Mobile: horizontal scrollable pills */}
            <nav
              className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:gap-1 lg:pb-0"
              aria-label="About page sections"
            >
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeSection === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  aria-current={activeSection === id ? "page" : undefined}
                >
                  <Icon size={16} weight={activeSection === id ? "fill" : "regular"} />
                  <span className="whitespace-nowrap">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <Separator className="lg:hidden" />

          {/* ── Content area ────────────────────────────── */}
          <div className="min-w-0 flex-1">
            {activeSection === "overview" && <OverviewSection />}
            {activeSection === "mission" && <MissionSection />}
            {activeSection === "tech" && <TechSection />}
            {activeSection === "contact" && <ContactSection />}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}

function OverviewSection() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-bold">Project Overview</h2>
      <p className="leading-relaxed text-muted-foreground">
        Metro Station Finder is an open-source web application designed to help Dhaka commuters
        navigate the MRT Line 6 — Bangladesh's first metro rail system. The app provides station
        information, fare calculations, and trip planning tools in a fast, mobile-friendly
        interface.
      </p>
      <p className="leading-relaxed text-muted-foreground">
        Built with React 19, TanStack Start for SSR, and a comprehensive design system aligned with
        the MRT Line 6 brand identity. The project follows modern 2026 web standards with full
        TypeScript coverage and 80%+ test coverage.
      </p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Open Source</Badge>
        <Badge variant="outline">MIT License</Badge>
        <Badge variant="outline">Dhaka, Bangladesh</Badge>
        <Badge variant="outline">v1.0.0</Badge>
      </div>
    </div>
  );
}

function MissionSection() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-bold">Our Mission</h2>
      <p className="leading-relaxed text-muted-foreground">
        Make public transit information accessible, clear, and beautiful. Every commuter deserves to
        know exactly where they're going, how much it costs, and how to get there — without hunting
        through PDFs or outdated apps.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          { label: "Clarity", desc: "No confusion about stations, fares, or routes." },
          { label: "Speed", desc: "Instant answers, even on slow mobile connections." },
          { label: "Accessibility", desc: "Usable by all commuters, all abilities." },
          { label: "Open", desc: "Community-driven, transparent, and free forever." },
        ].map(({ label, desc }) => (
          <div key={label} className="bento-card p-4">
            <h3 className="font-heading font-bold text-foreground">{label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TechSection() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-bold">Technology Stack</h2>
      <p className="leading-relaxed text-muted-foreground">
        Built with the best tools the 2026 web ecosystem offers — fast by default, type-safe
        throughout, and designed to last.
      </p>
      {[
        {
          category: "Frontend Framework",
          items: ["React 19", "TanStack Start (SSR)", "TanStack Router"],
        },
        {
          category: "Styling",
          items: ["Tailwind CSS v4", "shadcn/ui (base-mira)", "motion/react v12"],
        },
        {
          category: "Language & Tooling",
          items: ["TypeScript 5.8", "Bun", "Vite + Rolldown"],
        },
        {
          category: "Testing",
          items: ["Vitest", "Testing Library", "Playwright (E2E)"],
        },
      ].map(({ category, items }) => (
        <div key={category}>
          <h3 className="mb-2 font-heading text-sm font-semibold uppercase tracking-widest text-primary">
            {category}
          </h3>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <Badge key={item} variant="secondary">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ContactSection() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-heading text-2xl font-bold">Get in Touch</h2>
      <p className="leading-relaxed text-muted-foreground">
        Found a bug? Have a feature request? Want to contribute? The project is fully open-source
        and community contributions are welcome.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="default" className="gap-2">
          <a
            href="https://github.com/tashfiqul-islam/metro-station-finder/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open an Issue
          </a>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <a
            href="https://github.com/tashfiqul-islam/metro-station-finder"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Repository
          </a>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update about page tests to match new structure**

Find existing about page tests:

```bash
find tests -name "*about*" 2>/dev/null
```

If tests exist, update them to use the new section labels (Overview, Mission, Tech Stack, Contact) and remove any test relying on `mounted` state. If no tests exist, create `tests/integration/about.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";

async function renderAboutPage() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/about"] }),
  });
  await router.load();
  return render(<router.Provider />);
}

describe("About Page", () => {
  it("renders page heading", async () => {
    await renderAboutPage();
    expect(screen.getByRole("heading", { name: /about this project/i })).toBeInTheDocument();
  });

  it("shows overview content by default", async () => {
    await renderAboutPage();
    expect(screen.getByText(/project overview/i)).toBeInTheDocument();
  });

  it("switches to mission section on click", async () => {
    await renderAboutPage();
    fireEvent.click(screen.getByRole("button", { name: /mission/i }));
    expect(screen.getByText(/our mission/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
bun run test 2>&1 | tail -15
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/about.tsx tests/
git commit -m "feat: redesign about page with sidebar navigation, remove mounted guard"
```

---

## Phase 11: Placeholder Pages — Feature Previews

### Task 15: Create shared FeaturePreviewPage component

**Files:**

- Create: `src/components/common/feature-preview-page.tsx`

- [ ] **Step 1: Create FeaturePreviewPage**

Create `src/components/common/feature-preview-page.tsx`:

```tsx
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ViewportAnimation } from "@/components/common/viewport-animation";
import { SectionWrapper } from "@/components/common/section-wrapper";
import type { ReactNode } from "react";

interface FeatureHighlight {
  icon: ReactNode;
  label: string;
}

interface FeaturePreviewPageProps {
  title: string;
  description: string;
  highlights: FeatureHighlight[];
  progressValue: number;
  eta: string;
  mockupContent?: ReactNode;
}

export function FeaturePreviewPage({
  title,
  description,
  highlights,
  progressValue,
  eta,
  mockupContent,
}: FeaturePreviewPageProps) {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-4xl px-6 pt-16 sm:px-8">
        <ViewportAnimation>
          <div className="mb-2">
            <span className="metro-badge mb-6 inline-flex">Coming Soon</span>
          </div>
          <h1 className="font-heading text-5xl font-extrabold leading-[0.95] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {description}
          </p>
        </ViewportAnimation>

        {/* Feature highlights */}
        <ViewportAnimation delay={0.15}>
          <div className="mt-8 flex flex-wrap gap-3">
            {highlights.map((h, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground"
              >
                <span className="text-primary">{h.icon}</span>
                {h.label}
              </div>
            ))}
          </div>
        </ViewportAnimation>

        {/* Progress + ETA */}
        <ViewportAnimation delay={0.25}>
          <div className="mt-10 max-w-md">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Development Progress</span>
              <Badge variant="outline">{eta}</Badge>
            </div>
            <Progress value={progressValue} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{progressValue}% complete</p>
          </div>
        </ViewportAnimation>

        {/* Optional mockup wireframe */}
        {mockupContent && (
          <ViewportAnimation delay={0.35}>
            <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-muted/30">
              {mockupContent}
            </div>
          </ViewportAnimation>
        )}
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Rebuild station-finder.tsx**

Replace `src/routes/station-finder.tsx` with:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { MagnifyingGlass, MapPin, Train, ListMagnifyingGlass } from "@phosphor-icons/react";
import { FeaturePreviewPage } from "@/components/common/feature-preview-page";

export const Route = createFileRoute("/station-finder")({
  component: StationFinderPage,
});

function StationFinderPage() {
  return (
    <FeaturePreviewPage
      title="Station Finder"
      description="Search all 21 MRT Line 6 stations by name, area, or nearby landmark. Get platform info, facilities, exit maps, and connectivity details for every station."
      highlights={[
        { icon: <MagnifyingGlass weight="fill" size={14} />, label: "Instant search" },
        { icon: <MapPin weight="fill" size={14} />, label: "Location-aware" },
        { icon: <Train weight="fill" size={14} />, label: "All 21 stations" },
        { icon: <ListMagnifyingGlass weight="fill" size={14} />, label: "Facility details" },
      ]}
      progressValue={65}
      eta="Q3 2026"
    />
  );
}
```

- [ ] **Step 3: Rebuild station-fares.tsx**

Replace `src/routes/station-fares.tsx` with:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { CurrencyDollar, ArrowsLeftRight, Receipt, Calculator } from "@phosphor-icons/react";
import { FeaturePreviewPage } from "@/components/common/feature-preview-page";

export const Route = createFileRoute("/station-fares")({
  component: StationFaresPage,
});

function StationFaresPage() {
  return (
    <FeaturePreviewPage
      title="Fare Calculator"
      description="Calculate the exact fare between any two MRT Line 6 stations before you travel. No more guessing at the ticket machine — know your cost in advance."
      highlights={[
        { icon: <CurrencyDollar weight="fill" size={14} />, label: "Exact BDT fares" },
        { icon: <ArrowsLeftRight weight="fill" size={14} />, label: "Any station pair" },
        { icon: <Receipt weight="fill" size={14} />, label: "Fare breakdown" },
        { icon: <Calculator weight="fill" size={14} />, label: "Multi-trip calc" },
      ]}
      progressValue={45}
      eta="Q3 2026"
    />
  );
}
```

- [ ] **Step 4: Rebuild trip-planner.tsx**

Replace `src/routes/trip-planner.tsx` with:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { MapTrifold, Path, Clock, ArrowsCounterClockwise } from "@phosphor-icons/react";
import { FeaturePreviewPage } from "@/components/common/feature-preview-page";

export const Route = createFileRoute("/trip-planner")({
  component: TripPlannerPage,
});

function TripPlannerPage() {
  return (
    <FeaturePreviewPage
      title="Trip Planner"
      description="Plan your full journey on MRT Line 6. Enter your origin and destination — get a step-by-step route with transfer guidance, travel time, and total fare."
      highlights={[
        { icon: <MapTrifold weight="fill" size={14} />, label: "Door-to-door routes" },
        { icon: <Path weight="fill" size={14} />, label: "Transfer guidance" },
        { icon: <Clock weight="fill" size={14} />, label: "Travel time estimates" },
        { icon: <ArrowsCounterClockwise weight="fill" size={14} />, label: "Return trip" },
      ]}
      progressValue={30}
      eta="Q4 2026"
    />
  );
}
```

- [ ] **Step 5: Run typecheck and tests**

```bash
bun run typecheck 2>&1 | grep "error" | head -10
bun run test 2>&1 | tail -10
```

Expected: 0 type errors, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/feature-preview-page.tsx src/routes/station-finder.tsx src/routes/station-fares.tsx src/routes/trip-planner.tsx
git commit -m "feat: replace placeholder pages with feature preview pages using Progress and highlights"
```

---

## Phase 12: CI Gate + Final Verification

### Task 16: Run full CI suite and fix any remaining issues

**Files:**

- Any files flagged by lint/typecheck

- [ ] **Step 1: Run full CI gate**

```bash
cd D:/Projects/metro-station-finder-v1
bun run ci
```

`bun run ci` runs: `lint` → `typecheck` → `test` → `build`

- [ ] **Step 2: Fix lint errors**

If `bun run lint` fails:

```bash
bun run lint:fix
bun run lint 2>&1 | grep "error" | head -20
```

Address any remaining errors manually.

- [ ] **Step 3: Fix type errors**

If `bun run typecheck` fails:

```bash
bun run typecheck 2>&1 | head -40
```

Address each error. Common issues:

- Missing imports
- Phosphor icon weight prop types
- `motion/react` type mismatches

- [ ] **Step 4: Fix test failures**

If tests fail:

```bash
bun run test --reporter=verbose 2>&1 | head -60
```

Update test assertions to match new component output.

- [ ] **Step 5: Verify build succeeds with prerender**

```bash
bun run build 2>&1 | tail -20
```

Expected: 5 pages prerendered (/, /about, /station-finder, /station-fares, /trip-planner), 0 warnings about chunk size.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete 2026 ui/ux overhaul — editorial layout, bento grid, timeline, feature previews"
```

---

## Summary

| Phase                 | Tasks | Components Touched                                                                        |
| --------------------- | ----- | ----------------------------------------------------------------------------------------- |
| 1 — CSS Foundation    | 1–2   | `styles.css`                                                                              |
| 2 — shadcn Components | 3     | 5 new UI components                                                                       |
| 3 — Shared Components | 4–7   | ViewportAnimation, StatCard, BentoCard, RouteMapSvg                                       |
| 4 — Hero              | 8     | `hero-section.tsx`                                                                        |
| 5 — Features          | 9     | `features-section.tsx`                                                                    |
| 6 — Story             | 10    | `story-section.tsx`                                                                       |
| 7 — Journey           | 11    | `timeline.tsx`, `journey-section.tsx`                                                     |
| 8 — Tech Stack        | 12    | `tech-stack-section.tsx`, `infinite-slider.tsx`                                           |
| 9 — Maintainer        | 13    | `maintainer-section.tsx`                                                                  |
| 10 — About            | 14    | `about.tsx`                                                                               |
| 11 — Placeholders     | 15    | `station-finder.tsx`, `station-fares.tsx`, `trip-planner.tsx`, `feature-preview-page.tsx` |
| 12 — CI Gate          | 16    | Any files flagged                                                                         |
