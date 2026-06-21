import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import mrt6Line from "@/data/mrt6-line";
import { STATIONS } from "@/data/stations";
import { StationMarkers } from "@/features/station-finder/components/station-markers";
import { getStationLineAnchorIndexes } from "@/features/trip-planner/logic";

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

  it("uses dense-line anchor coordinates for marker placement", () => {
    render(<StationMarkers />);

    const markers = screen.getAllByTestId("map-marker");
    const anchorIndexes = getStationLineAnchorIndexes(mrt6Line, STATIONS);

    const mirpur10Index = STATIONS.findIndex((station) => station.slug === "mirpur-10");
    const mirpur10Marker = markers[mirpur10Index];
    const mirpur10AnchorIndex = anchorIndexes[mirpur10Index];
    const mirpur10Anchor =
      mirpur10AnchorIndex === undefined
        ? undefined
        : mrt6Line.geometry.coordinates[mirpur10AnchorIndex];

    expect(mirpur10Marker).toHaveAttribute("data-longitude", String(mirpur10Anchor?.[0]));
    expect(mirpur10Marker).toHaveAttribute("data-latitude", String(mirpur10Anchor?.[1]));
  });
});
