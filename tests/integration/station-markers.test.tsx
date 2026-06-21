import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { STATIONS } from "@/data/stations";
import { StationMarkers } from "@/features/station-finder/components/station-markers";

vi.mock("@/components/ui/map", () => ({
  MapMarker: ({
    children,
    latitude,
    longitude,
  }: {
    children?: React.ReactNode;
    latitude: number;
    longitude: number;
  }) => (
    <div data-latitude={latitude} data-longitude={longitude} data-testid="map-marker">
      {children}
    </div>
  ),
  MarkerContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  MarkerPopup: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

describe("StationMarkers", () => {
  it("renders one marker per station with button test ids", () => {
    render(<StationMarkers />);

    expect(screen.getAllByTestId("map-marker")).toHaveLength(STATIONS.length);
    expect(screen.getByTestId("station-marker-uttara-north")).toBeInTheDocument();
    expect(screen.getByTestId("station-marker-kamalapur")).toBeInTheDocument();
  });

  it("renders station names and slugs in popup content", () => {
    render(<StationMarkers />);

    expect(screen.getByRole("button", { name: "Motijheel" })).toBeInTheDocument();
    expect(screen.getByText("Motijheel")).toBeInTheDocument();
    expect(screen.getByText("motijheel")).toBeInTheDocument();
    expect(screen.getByText("uttara-north")).toBeInTheDocument();
  });
});
