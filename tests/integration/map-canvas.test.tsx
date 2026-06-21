import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MapCanvas } from "@/components/common/map-canvas";

vi.mock("@/components/common/map-canvas-client", () => ({
  MapCanvasClient: () => <div data-testid="map-client">client map</div>,
}));

describe("MapCanvas", () => {
  it("renders a visible shell during lazy loading", () => {
    render(<MapCanvas className="h-96" />);
    expect(screen.getByText(/loading map/iu)).toBeInTheDocument();
  });

  it("renders the offline overlay when offline is forced", () => {
    render(<MapCanvas offline />);
    expect(screen.getByText(/offline/iu)).toBeInTheDocument();
  });
});
