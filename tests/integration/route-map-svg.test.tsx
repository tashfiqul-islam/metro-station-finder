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
  "Karwan Bazar",
  "Shahbag",
  "Dhaka University",
  "Bangladesh Secretariat",
  "Motijheel",
  "Kamalapur",
];

const MRT_STATIONS_BN = [
  "উত্তরা উত্তর",
  "উত্তরা সেন্টার",
  "উত্তরা দক্ষিণ",
  "পল্লবী",
  "মিরপুর ১১",
  "মিরপুর ১০",
  "কাজীপাড়া",
  "শেওড়াপাড়া",
  "আগারগাঁও",
  "বিজয় সরণি",
  "ফার্মগেট",
  "কারওয়ান বাজার",
  "শাহবাগ",
  "ঢাকা বিশ্ববিদ্যালয়",
  "বাংলাদেশ সচিবালয়",
  "মতিঝিল",
  "কমলাপুর",
];

describe("RouteMapSvg", () => {
  it("renders without crashing", () => {
    render(<RouteMapSvg />);
    expect(screen.getByTestId("route-map-svg")).toBeDefined();
  });

  it("has an accessible aria-label on the SVG", () => {
    render(<RouteMapSvg />);
    const svg = screen.getByTestId("route-map-svg");
    expect(svg.getAttribute("aria-label")).toBe("MRT Line 6 route map");
  });

  it("applies a custom className to the SVG wrapper", () => {
    const { container } = render(<RouteMapSvg className="custom-svg" />);
    const el = container.firstElementChild;
    expect(el?.classList.contains("custom-svg")).toBe(true);
  });

  it("renders all 17 English station names", () => {
    render(<RouteMapSvg />);
    for (const station of MRT_STATIONS) {
      expect(screen.getByText(station)).toBeDefined();
    }
  });

  it("renders all 17 Bengali station names", () => {
    render(<RouteMapSvg />);
    for (const station of MRT_STATIONS_BN) {
      expect(screen.getByText(station)).toBeDefined();
    }
  });

  it("renders the correct number of station label groups (17)", () => {
    const { container } = render(<RouteMapSvg />);
    const stationLabels = container.querySelectorAll('[data-testid="route-map-station-label"]');
    expect(stationLabels.length).toBe(MRT_STATIONS.length);
  });
});
