import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MRT6_LINE from "@/data/mrt6-line";
import { MetroLineLayer } from "@/features/station-finder/components/metro-line-layer";

interface MapContextValue {
  isLoaded: boolean;
  map: ReturnType<typeof createMapStub> | null;
}

const mapContext = vi.hoisted(
  (): MapContextValue => ({
    isLoaded: false,
    map: null,
  }),
);

vi.mock("@/components/ui/map", () => ({
  useMap: () => mapContext,
}));

const createMapStub = () => {
  let hasLayer = false;
  let hasSource = false;

  return {
    addLayer: vi.fn((layer: unknown) => {
      hasLayer = true;
      return layer;
    }),
    addSource: vi.fn((sourceId: string, source: unknown) => {
      hasSource = true;
      return [sourceId, source];
    }),
    getLayer: vi.fn(() => (hasLayer ? {} : undefined)),
    getSource: vi.fn(() => (hasSource ? {} : undefined)),
    removeLayer: vi.fn(() => {
      hasLayer = false;
    }),
    removeSource: vi.fn(() => {
      hasSource = false;
    }),
  };
};

describe("MetroLineLayer", () => {
  beforeEach(() => {
    mapContext.isLoaded = false;
    mapContext.map = null;
  });

  it("does nothing until the map is loaded", () => {
    const map = createMapStub();
    mapContext.map = map;

    render(<MetroLineLayer />);

    expect(map.addSource).not.toHaveBeenCalled();
    expect(map.addLayer).not.toHaveBeenCalled();
  });

  it("adds the MRT-6 source and line layer when the map is ready", () => {
    const map = createMapStub();
    mapContext.isLoaded = true;
    mapContext.map = map;

    render(<MetroLineLayer />);

    expect(map.addSource).toHaveBeenCalledWith("mrt6-source", {
      data: MRT6_LINE,
      type: "geojson",
    });
    expect(map.addLayer).toHaveBeenCalledWith({
      id: "mrt6-line",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#00a96e",
        "line-opacity": 0.9,
        "line-width": 5,
      },
      source: "mrt6-source",
      type: "line",
    });
  });

  it("removes the MRT-6 layer and source on unmount", () => {
    const map = createMapStub();
    mapContext.isLoaded = true;
    mapContext.map = map;

    const { unmount } = render(<MetroLineLayer />);

    unmount();

    expect(map.removeLayer).toHaveBeenCalledWith("mrt6-line");
    expect(map.removeSource).toHaveBeenCalledWith("mrt6-source");
  });
});
