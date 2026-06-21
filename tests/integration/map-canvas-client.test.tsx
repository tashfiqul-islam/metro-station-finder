import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MRT6_LINE from "@/data/mrt6-line";
import { MapCanvasClient } from "@/components/common/map-canvas-client";

const mockMap = vi.hoisted(() => ({
  fitBounds: vi.fn(),
  loaded: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
}));

vi.mock("@/components/ui/map", async () => {
  const React = await import("react");

  return {
    Map: React.forwardRef(
      (
        {
          children,
          className,
        }: {
          children?: React.ReactNode;
          className?: string;
        },
        ref: React.ForwardedRef<typeof mockMap>,
      ) => {
        React.useImperativeHandle(ref, () => mockMap);

        return (
          <div className={className} data-testid="map-component">
            {children}
          </div>
        );
      },
    ),
    MapControls: ({ position }: { position: string }) => (
      <div data-position={position} data-testid="map-controls" />
    ),
  };
});

describe("MapCanvasClient", () => {
  beforeEach(() => {
    mockMap.fitBounds.mockReset();
    mockMap.loaded.mockReset();
    mockMap.off.mockReset();
    mockMap.once.mockReset();
  });

  it("fits the map to the MRT-6 bounds after load", () => {
    mockMap.loaded.mockReturnValue(true);

    render(
      <MapCanvasClient className="h-96">
        <span>overlay</span>
      </MapCanvasClient>,
    );

    const { coordinates } = MRT6_LINE.geometry;
    const longitudes = coordinates.map(([lng]) => lng);
    const latitudes = coordinates.map(([, lat]) => lat);

    expect(screen.getByTestId("map-component").parentElement).toHaveClass(
      "relative",
      "h-96",
      "min-h-88",
      "overflow-hidden",
      "rounded-2xl",
      "w-full",
    );
    expect(screen.getByTestId("map-component")).toHaveClass("h-full", "min-h-88", "w-full");
    expect(screen.getByTestId("map-controls")).toHaveAttribute("data-position", "top-right");
    expect(screen.getByText("overlay")).toBeInTheDocument();
    expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);
    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      {
        duration: 0,
        padding: {
          bottom: 40,
          left: 40,
          right: 40,
          top: 40,
        },
      },
    );
  });

  it("waits for the map load event before fitting when the map is not ready", () => {
    mockMap.loaded.mockReturnValue(false);

    const { unmount } = render(<MapCanvasClient />);

    expect(mockMap.fitBounds).not.toHaveBeenCalled();
    expect(mockMap.once).toHaveBeenCalledTimes(1);

    const loadHandler = mockMap.once.mock.calls[0]?.[1];

    expect(loadHandler).toBeTypeOf("function");

    act(() => {
      loadHandler?.();
    });

    expect(mockMap.fitBounds).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockMap.off).toHaveBeenCalledWith("load", loadHandler);
  });
});
