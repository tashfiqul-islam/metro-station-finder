# Sprint 6 Maps Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an SSR-safe `/station-finder` map preview with 17 MRT-6 station markers, a real MRT-6 alignment line, offline-safe fallback behavior, and proof that the map stack stays out of the main prerender path.

**Architecture:** Keep file-route registration in `src/routes/station-finder.tsx`, move page composition into `src/features/station-finder/route.tsx`, and isolate all browser-only map code behind a lazy client island. Before wiring the map UI, replace the sparse fallback MRT-6 geometry with a dense OSM/Overpass-first alignment so the corridor line follows the actual metro route. Use mapcn for the owned React map primitive, DOM markers for the 17 stations, and a raw GeoJSON source + line layer through `useMap` for the MRT-6 corridor.

---

## File Map

### New files

- `src/components/common/map-canvas.tsx`
  - Prerender-safe wrapper around the lazy client map module
  - Exports the shared `warmMapCanvas()` helper
- `src/components/common/map-canvas-client.tsx`
  - Browser-only map implementation using mapcn primitives
  - Owns fit-to-line behavior, controls, and offline shell decision
- `src/features/station-finder/route.tsx`
  - Feature-level screen for the `/station-finder` page
  - Hosts map layout, heading, and preview metadata row
- `src/features/station-finder/components/station-markers.tsx`
  - Renders 17 `MapMarker` nodes with popup content and `data-testid`
- `src/features/station-finder/components/metro-line-layer.tsx`
  - Adds/removes the MRT-6 GeoJSON source + line layer through `useMap`
- `tests/integration/map-canvas.test.tsx`
  - Verifies prerender shell, lazy fallback, and offline overlay behavior
- `tests/e2e/map-smoke.spec.ts`
  - Verifies live route behavior, marker popup interaction, and offline reload safety

### Modified files

- `src/data/mrt6-line.geojson`
  - replace sparse fallback coordinates with dense OSM/Overpass-first alignment geometry
- `src/data/mrt6-line.ts`
  - keep the typed wrapper in sync with the updated committed geometry
- `package.json`
  - map dependency changes from the shadcn/mapcn install if required
- `bun.lock`
  - lockfile updates from the dependency install
- `src/routes/station-finder.tsx`
  - keep file-route registration + `head()` only, import feature screen
- `src/pages/home/sections/hero-section.tsx`
  - attach `warmMapCanvas()` to the stable `/station-finder` entry path if that CTA still lives here
- `vite.config.ts`
  - only if natural lazy splitting or prerender behavior needs a narrow supporting adjustment

---

### Task 0: Refresh MRT-6 corridor geometry from OSM first

**Files:**

- Modify: `src/data/mrt6-line.geojson`
- Modify: `src/data/mrt6-line.ts`
- Test: `tests/unit/features/trip-planner/logic.test.ts`
- Test: `tests/integration/map-canvas-client.test.tsx`

- [ ] **Step 1: Fetch the best available MRT-6 alignment geometry from OSM / Overpass**

Use a read-only fetch path first. Do not hand-redraw first.

Expected outcome:

- one dense `LineString` following the MRT-6 alignment
- coordinates remain in `[lng, lat]` order
- route direction still matches station order from Uttara North to Kamalapur

- [ ] **Step 2: Replace the sparse fallback GeoJSON with the dense alignment**

Update `src/data/mrt6-line.geojson` so it contains the dense committed alignment geometry.

Rules:

- OSM / Overpass geometry is the primary source
- manual cleanup is allowed only if the OSM output is incomplete or noisy
- do not switch to road directions or any street-routing geometry
- keep the file as a single GeoJSON `Feature<LineString>`

- [ ] **Step 3: Keep the typed wrapper in sync**

Update `src/data/mrt6-line.ts` to reflect the refreshed geometry and replace the stale hand-trace comment.

Required comment change:

- remove language that says the file is hand-traced fallback
- replace it with wording that the geometry is sourced from committed static GeoJSON and refreshed from OSM / Overpass

- [ ] **Step 4: Run the geometry-sensitive tests**

Run:

```bash
bun run test:unit -- tests/unit/features/trip-planner/logic.test.ts
bun run test:integration -- tests/integration/map-canvas-client.test.tsx
```

Expected:

- clipping logic still passes with the denser line
- fit-bounds map client test still passes after updating any geometry-derived expectations

- [ ] **Step 5: Commit**

```bash
git add src/data/mrt6-line.geojson src/data/mrt6-line.ts tests/unit/features/trip-planner/logic.test.ts tests/integration/map-canvas-client.test.tsx
git commit -m "fix: refresh mrt6 alignment geometry"
```

---

### Task 1: Install mapcn and capture the owned map primitive

**Files:**

- Modify: `package.json`
- Modify: `bun.lock`
- Create: `src/components/ui/map.tsx`

- [ ] **Step 1: Install the registry component**

Run:

```bash
bunx --bun shadcn@latest add @mapcn/map
```

Expected:

- `src/components/ui/map.tsx` is created
- `maplibre-gl` and any mapcn-required runtime packages are added to the manifest/lockfile

- [ ] **Step 2: Read the generated component and note the exported primitives**

Read:

```text
src/components/ui/map.tsx
```

Confirm the file exports these names before continuing:

```ts
Map;
MapControls;
MapMarker;
MarkerContent;
MarkerPopup;
MapRoute;
useMap;
```

If the generated API differs, adapt later tasks to the actual export names before implementing anything.

- [ ] **Step 3: Run a narrow typecheck to verify the install did not break the repo**

Run:

```bash
bun run typecheck
```

Expected: pass with zero type errors introduced by the install.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock src/components/ui/map.tsx
git commit -m "feat: add mapcn map primitive"
```

---

### Task 2: Add the prerender-safe map shell and warm helper

**Files:**

- Create: `src/components/common/map-canvas.tsx`
- Test: `tests/integration/map-canvas.test.tsx`

- [ ] **Step 1: Write the failing integration test for the wrapper shell**

Create `tests/integration/map-canvas.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/common/map-canvas-client", () => ({
  MapCanvasClient: () => <div data-testid="map-client">client map</div>,
}));

import { MapCanvas } from "@/components/common/map-canvas";

describe("MapCanvas", () => {
  it("renders a visible shell during lazy loading", () => {
    render(<MapCanvas className="h-96" />);
    expect(screen.getByText(/loading map/i)).toBeInTheDocument();
  });

  it("renders the offline overlay when offline is forced", () => {
    render(<MapCanvas offline />);
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
bun run test:integration -- tests/integration/map-canvas.test.tsx
```

Expected: fail because `@/components/common/map-canvas` does not exist.

- [ ] **Step 3: Implement the prerender-safe wrapper**

Create `src/components/common/map-canvas.tsx`:

```tsx
import { lazy, Suspense } from "react";

import { cn } from "@/lib/utils";

const loadMapCanvasClient = () => import("./map-canvas-client");

const LazyMapCanvasClient = lazy(async () => {
  const module = await loadMapCanvasClient();
  return { default: module.MapCanvasClient };
});

export const warmMapCanvas = async (): Promise<void> => {
  await loadMapCanvasClient();
};

interface MapCanvasProps {
  children?: React.ReactNode;
  className?: string;
  offline?: boolean;
}

const MapCanvasFallback = ({ className, offline = false }: Omit<MapCanvasProps, "children">) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-2xl border border-border bg-card/70",
      "min-h-88 w-full",
      className,
    )}
  >
    <div className="absolute inset-0 animate-pulse bg-linear-to-br from-primary/6 via-transparent to-primary/10" />
    <div className="relative flex h-full min-h-88 items-center justify-center px-6 text-center">
      <div className="space-y-2">
        <p className="font-heading text-base font-semibold text-foreground">
          {offline ? "Offline - map unavailable" : "Loading map"}
        </p>
        <p className="text-sm text-muted-foreground">
          {offline
            ? "Reconnect to load the live corridor map."
            : "Preparing the MRT-6 corridor preview."}
        </p>
      </div>
    </div>
  </div>
);

export const MapCanvas = ({
  children,
  className,
  offline = false,
}: MapCanvasProps): React.ReactElement => {
  const isOffline = offline || (typeof navigator !== "undefined" && !navigator.onLine);

  if (isOffline) {
    return <MapCanvasFallback className={className} offline />;
  }

  return (
    <Suspense fallback={<MapCanvasFallback className={className} />}>
      <LazyMapCanvasClient className={className}>{children}</LazyMapCanvasClient>
    </Suspense>
  );
};
```

- [ ] **Step 4: Run the new integration test to verify it passes**

Run:

```bash
bun run test:integration -- tests/integration/map-canvas.test.tsx
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/map-canvas.tsx tests/integration/map-canvas.test.tsx
git commit -m "feat: add prerender-safe map canvas shell"
```

---

### Task 3: Build the browser-only map implementation with fit-to-line behavior

**Files:**

- Create: `src/components/common/map-canvas-client.tsx`
- Modify: `src/components/common/map-canvas.tsx`

- [ ] **Step 1: Add the client implementation file**

Create `src/components/common/map-canvas-client.tsx`:

```tsx
import { useEffect, useMemo, useRef } from "react";

import { MRT6_LINE } from "@/data/mrt6-line";
import { Map, MapControls, type MapRef } from "@/components/ui/map";
import { cn } from "@/lib/utils";

interface MapCanvasClientProps {
  children?: React.ReactNode;
  className?: string;
}

const fitPadding = {
  bottom: 40,
  left: 40,
  right: 40,
  top: 40,
};

export const MapCanvasClient = ({
  children,
  className,
}: MapCanvasClientProps): React.ReactElement => {
  const mapRef = useRef<MapRef>(null);
  const hasFittedRef = useRef(false);

  const bounds = useMemo(() => {
    const coordinates = MRT6_LINE.geometry.coordinates;
    const [firstLng, firstLat] = coordinates[0];
    let minLng = firstLng;
    let maxLng = firstLng;
    let minLat = firstLat;
    let maxLat = firstLat;

    for (const [lng, lat] of coordinates) {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ] as [[number, number], [number, number]];
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || hasFittedRef.current) {
      return;
    }

    const fit = () => {
      if (hasFittedRef.current) return;
      map.fitBounds(bounds, {
        duration: 0,
        padding: fitPadding,
      });
      hasFittedRef.current = true;
    };

    if (map.loaded()) {
      fit();
      return;
    }

    map.once("load", fit);
    return () => {
      map.off("load", fit);
    };
  }, [bounds]);

  return (
    <div className={cn("relative min-h-88 w-full overflow-hidden rounded-2xl", className)}>
      <Map
        ref={mapRef}
        className="h-full min-h-88 w-full"
        viewport={{
          bearing: 0,
          center: [90.4125, 23.8103],
          pitch: 0,
          zoom: 10,
        }}
      >
        <MapControls position="top-right" showCompass showZoom />
        {children}
      </Map>
    </div>
  );
};
```

- [ ] **Step 2: Update the wrapper test if the prop surface changed**

If the lazy wrapper test needs the named export stub adjusted, keep this shape:

```tsx
vi.mock("@/components/common/map-canvas-client", () => ({
  MapCanvasClient: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-client">{children}</div>
  ),
}));
```

- [ ] **Step 3: Run the wrapper integration test and typecheck**

Run:

```bash
bun run test:integration -- tests/integration/map-canvas.test.tsx
bun run typecheck
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/map-canvas-client.tsx src/components/common/map-canvas.tsx tests/integration/map-canvas.test.tsx
git commit -m "feat: add client map implementation"
```

---

### Task 4: Add the MRT-6 corridor layer

**Files:**

- Create: `src/features/station-finder/components/metro-line-layer.tsx`

- [ ] **Step 1: Implement the layer component with explicit source/layer cleanup**

Create `src/features/station-finder/components/metro-line-layer.tsx`:

```tsx
import { useEffect, useId } from "react";

import { MRT6_LINE } from "@/data/mrt6-line";
import { useMap } from "@/components/ui/map";

export const MetroLineLayer = (): null => {
  const { isLoaded, map } = useMap();
  const id = useId().replace(/:/gu, "-");
  const sourceId = `mrt6-source-${id}`;
  const layerId = `mrt6-line-${id}`;

  useEffect(() => {
    if (!map || !isLoaded) {
      return;
    }

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        data: MRT6_LINE,
        type: "geojson",
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#00a96e",
          "line-opacity": 0.9,
          "line-width": 5,
        },
        source: sourceId,
        type: "line",
      });
    }

    return () => {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [isLoaded, layerId, map, sourceId]);

  return null;
};
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/station-finder/components/metro-line-layer.tsx
git commit -m "feat: add mrt6 corridor map layer"
```

---

### Task 5: Add the 17 station markers

**Files:**

- Create: `src/features/station-finder/components/station-markers.tsx`

- [ ] **Step 1: Implement the marker renderer**

Create `src/features/station-finder/components/station-markers.tsx`:

```tsx
import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { STATIONS } from "@/data/stations";

export const StationMarkers = (): React.ReactElement => (
  <>
    {STATIONS.map((station) => (
      <MapMarker key={station.slug} latitude={station.lat} longitude={station.lng}>
        <MarkerContent>
          <button
            className="size-4 rounded-full border-2 border-white bg-primary shadow-md"
            data-testid={`station-marker-${station.slug}`}
            type="button"
          />
        </MarkerContent>
        <MarkerPopup>
          <div className="space-y-1">
            <p className="font-medium text-foreground">{station.nameEn}</p>
            <p className="text-xs text-muted-foreground">{station.slug}</p>
          </div>
        </MarkerPopup>
      </MapMarker>
    ))}
  </>
);
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
bun run typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/station-finder/components/station-markers.tsx
git commit -m "feat: add station markers for map preview"
```

---

### Task 6: Replace the route preview with the real feature screen

**Files:**

- Create: `src/features/station-finder/route.tsx`
- Modify: `src/routes/station-finder.tsx`

- [ ] **Step 1: Create the feature-level screen**

Create `src/features/station-finder/route.tsx`:

```tsx
import { MapCanvas } from "@/components/common/map-canvas";
import { STATIONS } from "@/data/stations";
import { MetroLineLayer } from "./components/metro-line-layer";
import { StationMarkers } from "./components/station-markers";

export const StationFinderRoute = (): React.ReactElement => {
  const stationCount = STATIONS.length;

  return (
    <section className="container mx-auto px-4 py-12 lg:py-16">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-3">
          <p className="section-kicker">MRT-6 map preview</p>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
            Explore the full Dhaka metro corridor
          </h1>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
            Preview all current MRT-6 stations on the live line map before station search, route
            guidance, and geolocation tools land in the next sprint.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="section-card px-4 py-2">{stationCount} stations</div>
          <div className="section-card px-4 py-2">Uttara North to Kamalapur</div>
          <div className="section-card px-4 py-2">Static MRT-6 corridor preview</div>
        </div>

        <MapCanvas className="h-104 md:h-136">
          <MetroLineLayer />
          <StationMarkers />
        </MapCanvas>
      </div>
    </section>
  );
};
```

- [ ] **Step 2: Reduce the file route to registration + metadata only**

Replace `src/routes/station-finder.tsx` with:

```tsx
import { createFileRoute } from "@tanstack/react-router";

import { StationFinderRoute } from "@/features/station-finder/route";
import { generateHeadConfig } from "@/lib/head-meta";

export const Route = createFileRoute("/station-finder")({
  component: StationFinderRoute,
  head: () =>
    generateHeadConfig({
      description:
        "Preview all MRT-6 stations and the live Dhaka metro corridor on an interactive map.",
      path: "/station-finder",
      title: "Station Finder",
    }),
});
```

- [ ] **Step 3: Run route and type checks**

Run:

```bash
bun run typecheck
bun run test:integration -- tests/integration/route-pages.test.tsx
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/station-finder/route.tsx src/routes/station-finder.tsx
git commit -m "feat: wire station finder map preview route"
```

---

### Task 7: Warm the lazy map chunk from the stable route-entry CTA

**Files:**

- Modify: `src/pages/home/sections/hero-section.tsx`

- [ ] **Step 1: Attach the warm helper to the station-finder CTA path**

In `src/pages/home/sections/hero-section.tsx`, import the helper:

```tsx
import { warmMapCanvas } from "@/components/common/map-canvas";
```

Update the station-finder CTA so it warms on pointer/focus before navigation:

```tsx
<Link
  onFocus={() => {
    void warmMapCanvas();
  }}
  onMouseEnter={() => {
    void warmMapCanvas();
  }}
  to="/station-finder"
>
```

Do not add any other preload behavior in this sprint.

- [ ] **Step 2: Run integration coverage for the home route CTA area**

Run:

```bash
bun run test:integration -- tests/integration/hero-section.test.tsx tests/integration/home-page.test.tsx
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/home/sections/hero-section.tsx
git commit -m "perf: warm map chunk from station finder entry"
```

---

### Task 8: Add targeted Playwright smoke coverage for the map route

**Files:**

- Create: `tests/e2e/map-smoke.spec.ts`

- [ ] **Step 1: Write the failing E2E smoke test**

Create `tests/e2e/map-smoke.spec.ts`:

```tsx
import { expect, test } from "@playwright/test";

test.describe("station finder map preview", () => {
  test("shows all station markers and opens a popup", async ({ page }) => {
    await page.goto("/station-finder");

    await expect(
      page.getByRole("heading", { name: /explore the full dhaka metro corridor/i }),
    ).toBeVisible();

    const markers = page.locator('[data-testid^="station-marker-"]');
    await expect(markers).toHaveCount(17);

    await page.getByTestId("station-marker-motijheel").click();
    await expect(page.getByText("Motijheel")).toBeVisible();
    await expect(page.getByText("motijheel")).toBeVisible();
  });

  test("shows offline overlay without crashing", async ({ context, page }) => {
    await context.setOffline(true);
    await page.goto("/station-finder");
    await expect(page.getByText(/offline - map unavailable/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
bun run test:e2e -- tests/e2e/map-smoke.spec.ts
```

Expected: fail until the live map route is fully working.

- [ ] **Step 3: Re-run the test after previous tasks and fix only map-route-specific failures**

Run:

```bash
bun run test:e2e -- tests/e2e/map-smoke.spec.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/map-smoke.spec.ts
git commit -m "test: add station finder map smoke coverage"
```

---

### Task 9: Verify chunk separation and full Sprint 6 gates

**Files:**

- Modify only if needed: `vite.config.ts`

- [ ] **Step 1: Run the full local Sprint 6 verification sequence**

Run:

```bash
bun run ci
bun run test:coverage
bun run test:e2e -- tests/e2e/map-smoke.spec.ts
```

Expected:

- `bun run ci` passes
- coverage thresholds stay green
- targeted map smoke passes

- [ ] **Step 2: Inspect build output for lazy chunk separation**

Run:

```bash
bun run build
```

Then inspect the emitted client assets in `.output/public/assets/` and confirm there is a separate map-related async chunk rather than `maplibre-gl` being folded into the main entry.

If natural chunking already separates the map stack, stop here.

- [ ] **Step 3: Only if chunking failed, add a narrow Vite code splitting group**

If required, add a minimal `codeSplitting.groups` rule in `vite.config.ts` under `build.rolldownOptions.output` shaped like:

```ts
build: {
  rolldownOptions: {
    output: {
      codeSplitting: {
        groups: [{ name: "map-stack", test: /maplibre|src[\\/]components[\\/]ui[\\/]map/ }],
      },
    },
  },
},
```

Do **not** add this unless verification proves it is needed.

- [ ] **Step 4: Confirm prerender-safe station finder output exists**

Verify the station-finder HTML exists under the prerendered output and contains the shell/fallback markup rather than an error page.

- [ ] **Step 5: Commit any final narrow build-config adjustment if one was needed**

```bash
git add vite.config.ts
git commit -m "build: isolate map stack chunk"
```

If `vite.config.ts` was unchanged, skip this commit.

---

## Spec Coverage Check

- OSM / Overpass-first dense geometry refresh: Task 0
- `@mapcn/map` owned code install: Task 1
- SSR-safe wrapper: Tasks 2 and 3
- 17 DOM markers with popup metadata: Task 5
- MRT-6 static GeoJSON line layer: Task 4
- feature route seam and real route preview: Task 6
- route-entry warm helper: Task 7
- integration + E2E coverage: Tasks 2 and 8
- chunk split and prerender verification: Task 9
- offline-safe route behavior: Tasks 2, 3, 6, 8

## Self-Review

- Placeholder scan: no `TBD`, `TODO`, or cross-task hand-waving left in the plan
- Type consistency: `MapCanvas`, `MapCanvasClient`, `warmMapCanvas`, `StationFinderRoute`, `MetroLineLayer`, and `StationMarkers` are named consistently throughout
- Scope check: plan stays within Sprint 6 plus narrow enabling fixes only

---

Plan complete and saved to `docs/superpowers/plans/2026-06-21-sprint-6-maps-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
