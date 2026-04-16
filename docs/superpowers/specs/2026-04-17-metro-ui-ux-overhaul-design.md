# Metro Station Finder v1 — 2026 UI/UX Overhaul Design Spec

**Date:** 2026-04-17  
**Status:** Approved  
**Scope:** Complete top-to-bottom visual redesign of all pages — Home, About, Station Finder, Station Fares, Trip Planner

---

## 1. Context & Goal

The metro-station-finder-v1 app (Dhaka MRT Line-6 transit tool) received a design system overhaul in commit `4575cd7` that established Metro Green OKLCH tokens, glass-card utilities, and a segmented theme switcher. That pass fixed infrastructure but left all page layouts, component choices, and content presentation unchanged.

This spec defines the complete visual and structural redesign to bring every page to 2026 world-class standard.

**Research basis:** `frontend-design` skill (claude official), `ui-ux-designer` agent (NN Group-backed), `ui-ux-pro-max` MCP design system.

---

## 2. Aesthetic Direction: Editorial Urban

**Concept:** Bold editorial typography meets transit infrastructure. Think transit signage precision meets editorial magazine layout.

**Tone:** Helpful, precise, modern, slightly industrial/urban — reflects a real transit tool for Dhaka commuters.

**Anti-patterns to eliminate:**

- Equal 3-column feature grids
- Centered hero text
- Generic blob backgrounds
- Uniform card sizes everywhere
- Space Grotesk body font (becoming the new "Inter" — overused)

---

## 3. Typography System

| Role              | Current                | New                            | Reasoning                                  |
| ----------------- | ---------------------- | ------------------------------ | ------------------------------------------ |
| Display / Heading | Oxanium Variable       | **Keep Oxanium Variable**      | Distinctive, techy, on-brand for transit   |
| Body / UI         | Space Grotesk Variable | **Plus Jakarta Sans Variable** | More humanist, less saturated in 2026 SaaS |

**Scale principles:**

- Hero headings: `text-5xl` to `text-7xl`, weight `800`
- Section headings: `text-3xl` to `text-4xl`, weight `700`
- Body text: minimum `16px` (`text-base`), weight `400`
- Weight contrast: use `200` for decorative/eyebrow text, `800` for display — avoid the `400/600` midrange timidity
- Line height: `0.95` for display (tight), `1.7` for body prose

---

## 4. Color System Additions

Existing OKLCH token palette is retained. Adding:

```css
/* CTA warm accent — warm amber for call-to-action contrast */
--color-amber: oklch(0.72 0.15 65);

/* Surface hierarchy — 3 levels for dark mode depth */
--surface-1: oklch(0.145 0.015 250); /* cards — 1 level above bg */
--surface-2: oklch(0.18 0.015 250); /* elevated cards, modals */

/* Visible border for structural elements */
--border-strong: oklch(0.28 0.02 250);
```

Background treatment:

- Add SVG noise texture overlay to `body` (3% opacity) for tactile depth
- Add subtle dot-grid pattern option for hero sections
- Remove all `motion/react`-driven blob animations from `UnifiedBackground`

---

## 5. New Shared Components

| Component           | File                                           | Purpose                                                |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| `ViewportAnimation` | `src/components/common/viewport-animation.tsx` | Wraps any element, triggers stagger entrance on scroll |
| `StatCard`          | `src/components/common/stat-card.tsx`          | Large display number + label — for hero stats          |
| `BentoCard`         | `src/components/common/bento-card.tsx`         | Variable-size grid card with `size` prop               |
| `RouteMapSvg`       | `src/components/common/route-map-svg.tsx`      | Simplified SVG of MRT Line 6 with station dots         |

---

## 6. Home Page — Section Redesigns

### 6.1 Hero Section

**Layout:** Asymmetric 58/42 split (not centered)

- Left (58%): Oxanium 7xl heading, gradient-text accent word, DM Sans subtitle, dual CTA row
- Right (42%): `RouteMapSvg` component + 3 `StatCard` components (21 stations, 20.1 km, Line 6)

**Background:** Noise texture + single bottom radial gradient (Metro Green, low opacity). No animated blobs.

**Animation:** Staggered entrance via `ViewportAnimation` — heading (0.1s), subtitle (0.3s), CTAs (0.5s), map panel (0.6s delay)

**CTAs:**

- Primary: "Explore Stations" → `/station-finder` — green filled button `size="lg"`
- Secondary: "Plan Your Journey" → `/trip-planner` — ghost outline button `size="lg"`

### 6.2 Features Section

**Layout:** CSS Grid bento — NOT equal columns

Grid definition:

```
[large card: col 1-2, row 1] [medium card: col 3, row 1]
[medium card: col 1, row 2] [small card: col 2, row 2] [small card: col 3, row 2]
```

5 features mapped to cells:

1. **Station Search** (large) — primary feature, hero-sized card
2. **Fare Calculator** (medium)
3. **Trip Planning** (medium)
4. **Real-time Updates** (small)
5. **Accessibility Info** (small)

Each card uses `BentoCard` with `size="lg"|"md"|"sm"` prop controlling padding and font scale.

### 6.3 Story Section

**Layout:** 4-column ordinal layout — oversized background numbers as visual anchors

Each column:

- Background text: `01`/`02`/`03`/`04` in `text-8xl font-black` Oxanium, `text-primary/8` (very low opacity)
- Foreground content: icon + title + 2-3 sentence description, overlaying the number
- Column titles: Frustration → Inspiration → Solution → Impact

Removes the equal-height card boxes. Content floats over the ordinal numbers with a 2/3-height placement.

### 6.4 Journey Section (Version Timeline)

**Layout:** Metro-line inspired vertical timeline

- Left edge: dashed vertical line with colored `route-stop` dots for each version
- Right side: version cards with varied widths (v0.x = narrower, v1.0 = wide)
- Final stop: pulsing green dot = "You are here (v1.0.0)"
- Each card: shadcn `Badge variant="outline"` for version number + date + description

Redesigns `timeline.tsx` component entirely.

### 6.5 Tech Stack Section

**Keep infinite slider** — it's already distinctive.

Upgrades:

- Each item: logo + tech name (text below logo)
- Two rows at slightly different speeds (top row 25s, bottom row 35s, opposite direction)
- Monochrome logos that gain color on `group-hover`

### 6.6 Maintainer Section

**Layout:** Full-width editorial profile card

- Left 40%: solid Metro Green background, large initials or `Avatar` component, name in 4xl Oxanium
- Right 60%: Role label, bio prose, social links as ghost buttons with Phosphor icons
- Card spans container full width, `rounded-2xl`, no nested sub-cards

Installs: `Avatar` shadcn component.

---

## 7. About Page

### 7.1 SSR Fix

Remove `if (!mounted) return null` hydration guard — replace with `suppressHydrationWarning` on the root element. Follows same pattern as `theme.tsx`.

### 7.2 Layout Change: Tabs → Sidebar Navigation

- Replace `Tabs` component with sticky left sidebar nav (`w-44`, `top-24` sticky)
- Content area fills remaining width (`flex-1 min-w-0`)
- Mobile: sidebar collapses to horizontal scrollable pill row at top
- Sections: Overview, Mission, Tech Stack, Contact

### 7.3 Accordion Polish

Existing accordion sections keep their content. Visual changes:

- Remove default borders from accordion items
- Add custom open/close animation with `motion/react`
- Use Phosphor `CaretRight` icon (rotating 90° when open) instead of default chevron

---

## 8. Placeholder Pages

All three pages (Station Finder, Fares, Trip Planner) replace generic "Coming Soon" with **Feature Preview Pages**.

Each page structure:

1. Hero: Feature name (Oxanium 5xl) + one-line description
2. Feature highlights: 3–4 horizontal pill chips (Phosphor icon + label)
3. Mock wireframe: SVG skeleton preview of the feature UI
4. `Progress` component showing development stage (0–100%)
5. ETA badge: `Badge variant="outline"` with "Coming Q3 2026"

---

## 9. New shadcn Components to Install

```bash
bunx --bun shadcn@latest add avatar progress skeleton tooltip alert
```

| Component  | Primary usage                         |
| ---------- | ------------------------------------- |
| `Avatar`   | Maintainer section profile            |
| `Progress` | Placeholder page feature progress bar |
| `Skeleton` | Loading states for dynamic content    |
| `Tooltip`  | Station info on future map components |
| `Alert`    | System-level announcements            |

---

## 10. Animation Philosophy

Per `ui-ux-designer` and `ui-ux-pro-max` research:

- **Max 1–2 elements** animated per viewport at once
- **Page load:** `ViewportAnimation` wrapper — `opacity: 0→1`, `translateY: 20px→0`, `duration: 0.5s`, `ease: [0.25, 0.1, 0.25, 1.0]`
- **Stagger:** `0.1s` increments between children
- **Hover states:** CSS-only `transition: transform 0.2s ease-out` — no JS
- **No parallax**, no scroll-driven complex transforms
- **Respect** `prefers-reduced-motion` via existing `ANIMATION_CONFIG` pattern

---

## 11. Global CSS Additions

```css
/* Scrollbar */
:root {
  scrollbar-width: thin;
  scrollbar-color: var(--color-primary) transparent;
}

/* Text selection */
::selection {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

/* Body text minimum */
body {
  font-size: 1rem;
  line-height: 1.7;
}
```

---

## 12. Implementation Order

1. CSS foundation (tokens, font swap, noise texture, new utilities)
2. Install new shadcn components (avatar, progress, skeleton, tooltip, alert)
3. New shared components (ViewportAnimation, StatCard, BentoCard, RouteMapSvg)
4. Hero section full rebuild
5. Features bento grid
6. Story ordinal redesign
7. Journey timeline upgrade
8. Tech stack dual-row upgrade
9. Maintainer editorial card
10. About page SSR fix + sidebar
11. Placeholder pages (all 3)
12. `bun run ci` gate
