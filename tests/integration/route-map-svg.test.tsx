import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RouteMapSvg } from "@/components/common/route-map-svg";

const MRT_STATIONS = [
  "Uttara North",
  "Uttara Center",
  "Uttara South",
  "Pallabi",
  "Mirpur 11",
  "Mirpur 10",
  "Kazipara",
  "Shewrapara",
  "Agargaon",
  "Bijoy Sarani",
  "Farmgate",
  "Kawran Bazar",
  "Shahbag",
  "Dhaka University",
  "Bangladesh Secretariat",
  "Motijheel",
  "Kamalapur",
];

describe("RouteMapSvg", () => {
  it("renders without crashing", () => {
    render(<RouteMapSvg />);
    expect(screen.getByTestId("route-map-svg")).toBeDefined();
  });

  it("has role=img for accessibility", () => {
    render(<RouteMapSvg />);
    const svg = screen.getByRole("img");
    expect(svg).toBeDefined();
  });

  it("has an aria-label describing the route map", () => {
    render(<RouteMapSvg />);
    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toBe("MRT Line 6 route map");
  });

  it("applies a custom className to the SVG wrapper", () => {
    const { container } = render(<RouteMapSvg className="custom-svg" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains("custom-svg")).toBe(true);
  });

  it("renders all 17 station names", () => {
    render(<RouteMapSvg />);
    for (const station of MRT_STATIONS) {
      expect(screen.getByText(station)).toBeDefined();
    }
  });

  it("renders the correct number of station labels (17)", () => {
    const { container } = render(<RouteMapSvg />);
    const textElements = container.querySelectorAll("text");
    expect(textElements.length).toBe(MRT_STATIONS.length);
  });
});
