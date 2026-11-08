import { stationId } from "@metro/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { LineMap } from "./LineMap";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

const karwan = stationId("karwan-bazar");
const farmgate = stationId("farmgate");

const svg = (container: HTMLElement): SVGSVGElement => {
  const found = container.querySelector("svg.map");
  if (!(found instanceof SVGSVGElement)) throw new Error("no map");
  return found;
};

test("METRO-111 the map is one named application with a description and the fit view", () => {
  const { container } = render(<LineMap />);
  // happy-dom does not compute a name from an svg <title>; the real name is asserted in e2e/line-map.e2e.ts.
  const map = screen.getByRole("application");
  expect(container.querySelector("title#map-title")?.textContent).toBe(
    "Schematic map of MRT Line 6",
  );
  expect(map.getAttribute("viewBox")).toBe("100 70 470 880");
  expect(map.getAttribute("tabindex")).toBe("0");
  expect(map.querySelector("desc")?.textContent).toBe(
    "All 16 stations from Uttara North to Motijheel. The station list after the map names every station as text.",
  );
  expect(map.getAttribute("aria-labelledby")).toBe("map-title");
  expect(map.getAttribute("aria-describedby")).toBe("map-desc");
  expect(svg(container).querySelectorAll("circle.map__pin")).toHaveLength(16);
});

test("METRO-111 the map is the only tab stop and the station list names all 16 stations", () => {
  const { container } = render(<LineMap />);
  expect(container.querySelectorAll("[tabindex]")).toHaveLength(1);
  expect(container.querySelectorAll("a[href], input, select")).toHaveLength(0);
  // The only other controls are the three zoom buttons (LineMap.interact.test.tsx).
  expect(container.querySelectorAll("button")).toHaveLength(3);
  const list = screen.getByRole("list", { name: "Stations on MRT Line 6, north to south" });
  const items = within(list).getAllByRole("listitem");
  expect(items).toHaveLength(16);
  expect(items[0]?.textContent).toBe("Uttara North");
  expect(items[15]?.textContent).toBe("Motijheel");
});

test("METRO-111 at rest only the two termini get pills and no station is highlighted", () => {
  const { container } = render(<LineMap />);
  const pills = [...container.querySelectorAll("text.map__pill-text")].map((n) => n.textContent);
  expect(pills).toEqual(["Uttara North", "Motijheel"]);
  expect(container.querySelectorAll("text.map__label")).toHaveLength(14);
  expect(container.querySelector(".map__pin--hl")).toBeNull();
  expect(container.querySelector(".map__me")).toBeNull();
  expect(container.querySelector(".map__walk")).toBeNull();
  expect(container.querySelectorAll(".map__line--dim")).toHaveLength(0);
});

test("METRO-111 a highlighted station gets a halo, a larger pin, a pill and a list mark", () => {
  const { container } = render(<LineMap highlighted={[karwan, stationId("nowhere")]} />);
  expect(container.querySelectorAll(".map__pin--hl")).toHaveLength(1);
  expect(container.querySelector(".map__pin--hl")?.getAttribute("r")).toBe("7.5");
  expect(container.querySelector(".map__pin-halo")?.getAttribute("r")).toBe("15");
  expect([...container.querySelectorAll("text.map__pill-text")].map((n) => n.textContent)).toEqual([
    "Uttara North",
    "Karwan Bazar",
    "Motijheel",
  ]);
  expect(container.querySelector("desc")?.textContent).toContain("Highlighted: Karwan Bazar.");
  expect(screen.getByText("Karwan Bazar, highlighted").tagName).toBe("LI");
});

test("METRO-111 pill labels at the south end move left and below so they stay on the canvas", () => {
  const { container } = render(
    <LineMap highlighted={[stationId("dhaka-university"), stationId("bangladesh-secretariat")]} />,
  );
  const rects = [...container.querySelectorAll("rect.map__pill")].map((r) => ({
    x: Number(r.getAttribute("x")),
    width: Number(r.getAttribute("width")),
  }));
  for (const { x, width } of rects) {
    expect(x).toBeGreaterThan(100);
    expect(x + width).toBeLessThan(570);
  }
  const labels = [...container.querySelectorAll("text.map__label")];
  expect(labels.every((label) => label.getAttribute("text-anchor") === "start")).toBe(true);
});

test("METRO-111 halo labels follow their placement (right, left, below)", () => {
  const { container } = render(<LineMap />);
  const anchors = Object.fromEntries(
    [...container.querySelectorAll("text.map__label")].map((n) => [
      n.textContent,
      n.getAttribute("text-anchor"),
    ]),
  );
  expect(anchors["Pallabi"]).toBe("start");
  expect(anchors["Dhaka University"]).toBe("end");
  expect(anchors["Bangladesh Secretariat"]).toBe("middle");
});

test("METRO-111 a user position and a walk path are drawn and described, from props only", () => {
  const { container } = render(
    <LineMap
      highlighted={[karwan]}
      position={{ lat: 23.75, lng: 90.39 }}
      walk={[
        { lat: 23.75, lng: 90.39 },
        { lat: 23.751353, lng: 90.392977 },
      ]}
    />,
  );
  expect(container.querySelector(".map__me")?.getAttribute("r")).toBe("8");
  expect(container.querySelector(".map__me-pulse")).not.toBeNull();
  expect(container.querySelector("polyline.map__walk")?.getAttribute("stroke-width")).toBe("2.5");
  const description = container.querySelector("desc")?.textContent ?? "";
  expect(description).toContain("Your position is shown.");
  expect(description).toContain("A dashed walking path is drawn.");
});

test("METRO-111 a walk of fewer than two points draws no path", () => {
  const { container } = render(<LineMap walk={[{ lat: 23.75, lng: 90.39 }]} />);
  expect(container.querySelector(".map__walk")).toBeNull();
});

test("METRO-111 a trip dims the line and draws the stretch between two stations, either way round", () => {
  const forward = render(<LineMap trip={{ from: farmgate, to: karwan }} />);
  const first = forward.container.querySelectorAll("polyline.map__line:not(.map__line--dim)");
  expect(forward.container.querySelectorAll(".map__line--dim")).toHaveLength(1);
  expect(first).toHaveLength(1);
  expect(first[0]?.getAttribute("stroke-width")).toBe("8");
  expect(first[0]?.getAttribute("points")?.split(" ")).toHaveLength(2);
  expect(forward.container.querySelector("desc")?.textContent).toContain(
    "Trip from Farmgate to Karwan Bazar.",
  );
  forward.unmount();
  const back = render(<LineMap trip={{ from: karwan, to: farmgate }} />);
  expect(back.container.querySelector("desc")?.textContent).toContain(
    "Trip from Karwan Bazar to Farmgate.",
  );
});

test("METRO-111 a trip with an unknown station is ignored", () => {
  const { container } = render(<LineMap trip={{ from: farmgate, to: stationId("nowhere") }} />);
  expect(container.querySelectorAll(".map__line--dim")).toHaveLength(0);
  expect(container.querySelector("desc")?.textContent).not.toContain("Trip");
});

test("METRO-111 the map carries no style attribute and makes no network request", () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const { container } = render(
    <LineMap
      highlighted={[karwan]}
      position={{ lat: 23.75, lng: 90.39 }}
      trip={{ from: farmgate, to: karwan }}
    />,
  );
  expect(container.querySelectorAll("[style]")).toHaveLength(0);
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});
