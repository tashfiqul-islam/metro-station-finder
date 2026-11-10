import { stationId } from "@metro/core";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import * as labels from "./labels";
import { LineMap } from "./LineMap";

// Every render of the map calls the layout once: the spy counts renders.
vi.mock("./labels", async (importOriginal) => {
  const original = await importOriginal<typeof labels>();
  return { ...original, layoutLabels: vi.fn(original.layoutLabels) };
});
const renders = vi.mocked(labels.layoutLabels);

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

type Report = (entries: readonly { readonly contentRect: DOMRect }[]) => void;

/** A ResizeObserver the test drives: `resize(w, h)` reports a size the way the browser does when the sheet moves. */
function stubResize(): (width: number, height: number) => void {
  const reports: Report[] = [];
  class Stub {
    constructor(callback: Report) {
      reports.push(callback);
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  vi.stubGlobal("ResizeObserver", Stub);
  return (width, height) => {
    act(() => {
      for (const report of reports) report([{ contentRect: new DOMRect(0, 0, width, height) }]);
    });
  };
}
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

test("METRO-115 at the fit view only the two termini are named; one zoom step names every station", () => {
  const { container } = render(<LineMap />);
  const pills = [...container.querySelectorAll("text.map__pill-text")].map((n) => n.textContent);
  expect(pills).toEqual(["Uttara North", "Motijheel"]);
  expect(container.querySelectorAll("text.map__label")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(container.querySelectorAll("text.map__label")).toHaveLength(14);
  fireEvent.click(screen.getByRole("button", { name: "Show whole line" }));
  expect(container.querySelectorAll("text.map__label")).toHaveLength(0);
});

test("METRO-111 at rest no station is highlighted and nothing else is drawn", () => {
  const { container } = render(<LineMap />);
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

test("METRO-115 four grey planes are gone: the background and the dot grid are all that sits behind the line", () => {
  const { container } = render(<LineMap />);
  expect(container.querySelectorAll("rect[class*=plane]")).toHaveLength(0);
  expect(
    [...container.querySelectorAll("svg.map > rect")].map((r) => r.getAttribute("class")),
  ).toEqual(["map__bg", null]);
});

test("METRO-115 pins, labels and the position keep a fixed size on screen: the group scale is map units per pixel", () => {
  const resize = stubResize();
  const { container } = render(
    <LineMap highlighted={[karwan]} position={{ lat: 23.75, lng: 90.39 }} />,
  );
  const scaleOfGroup = (selector: string): number => {
    const transform =
      container.querySelector(selector)?.parentElement?.getAttribute("transform") ?? "";
    return Number(/scale\(([\d.]+)\)/u.exec(transform)?.[1]);
  };
  // Before layout nothing is known: one unit per pixel.
  expect(scaleOfGroup(".map__pin")).toBe(1);
  // 390 px wide, 234 px high (the area above a half sheet on a phone): the 880-unit line is 0.266 px per unit.
  resize(390, 234);
  expect(scaleOfGroup(".map__pin")).toBeCloseTo(880 / 234, 3);
  expect(scaleOfGroup(".map__me")).toBeCloseTo(880 / 234, 3);
  expect(scaleOfGroup(".map__pill-text")).toBeCloseTo(880 / 234, 3);
  // The sheet moves to peek: the area grows and the group scale follows.
  resize(390, 530);
  expect(scaleOfGroup(".map__pin")).toBeCloseTo(880 / 530, 3);
  // Width limits a wide, short box the other way round.
  resize(200, 900);
  expect(scaleOfGroup(".map__pin")).toBeCloseTo(470 / 200, 3);
  // Zooming in keeps the pixel size: twice the zoom, half the units per pixel.
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(scaleOfGroup(".map__pin")).toBeCloseTo(470 / 200 / 1.5, 3);
});

test("METRO-111 pill labels at the south end move left and below so they stay on the canvas", () => {
  const { container } = render(
    <LineMap highlighted={[stationId("dhaka-university"), stationId("bangladesh-secretariat")]} />,
  );
  // Each pill is in pixels from its stop (the group translate, at one unit per pixel before layout).
  const rects = [...container.querySelectorAll("rect.map__pill")].map((r) => {
    const origin = /translate\(([\d.-]+) /u.exec(r.parentElement?.getAttribute("transform") ?? "");
    return {
      x: Number(origin?.[1]) + Number(r.getAttribute("x")),
      width: Number(r.getAttribute("width")),
    };
  });
  expect(rects).toHaveLength(4);
  for (const { x, width } of rects) {
    expect(x).toBeGreaterThan(100);
    expect(x + width).toBeLessThan(570);
  }
});

test("METRO-111 halo labels follow their placement (right, left, below)", () => {
  const { container } = render(<LineMap />);
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
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

test("METRO-115 a size that rounds to the same pixels does not render the map again", () => {
  const resize = stubResize();
  render(<LineMap />);
  resize(390, 234);
  const settled = renders.mock.calls.length;
  // A sheet drag reports a size on every frame: the same whole pixels are the same state, so no render.
  resize(390.2, 233.8);
  resize(390, 234);
  expect(renders.mock.calls.length).toBe(settled);
  resize(390, 235);
  expect(renders.mock.calls.length).toBe(settled + 1);
});
test("METRO-115 pills near the south end stay apart on a short frame (the layout reads the reported size)", () => {
  const resize = stubResize();
  const { container } = render(<LineMap highlighted={[stationId("bangladesh-secretariat")]} />);
  resize(320, 190);
  const boxes = [...container.querySelectorAll("rect.map__pill")].map((r) =>
    r.getBoundingClientRect(),
  );
  expect(boxes.length).toBeGreaterThanOrEqual(2);
  const names = [...container.querySelectorAll("text.map__pill-text")].map((n) => n.textContent);
  expect(names).toContain("Bangladesh Secretariat");
});
