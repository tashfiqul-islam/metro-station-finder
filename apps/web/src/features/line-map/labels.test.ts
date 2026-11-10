import { stationId } from "@metro/core";
import { expect, test } from "vitest";

import { layoutLabels } from "./labels";
import type { Label } from "./labels";
import { lineStops } from "./projection";
import type { LineStop } from "./projection";

const STOPS = lineStops();
const at = (id: string): LineStop => {
  const found = STOPS.find((stop) => stop.id === id);
  if (found === undefined) throw new Error(`no stop ${id}`);
  return found;
};

/** A label's box in screen pixels, for a map of `unit` map units per pixel. */
const rect = (stop: LineStop, label: Label, unit: number) => ({
  left: stop.x / unit + label.x,
  top: stop.y / unit + label.y,
  right: stop.x / unit + label.x + label.width,
  bottom: stop.y / unit + label.y + label.height,
});

function overlapping(unit: number, marked: readonly string[], all: boolean): string[] {
  const labels = layoutLabels(STOPS, marked.map(stationId), all, unit);
  const boxes = [...labels].map(([id, label]) => ({ id, box: rect(at(id), label, unit) }));
  const clashes: string[] = [];
  for (const [index, a] of boxes.entries()) {
    for (const b of boxes.slice(index + 1)) {
      if (
        a.box.left < b.box.right &&
        b.box.left < a.box.right &&
        a.box.top < b.box.bottom &&
        b.box.top < a.box.bottom
      )
        clashes.push(`${a.id} ${b.id}`);
    }
  }
  return clashes;
}

test("METRO-115 with room, the termini and marked stations get pills on their own side, the rest nothing", () => {
  const labels = layoutLabels(STOPS, [stationId("karwan-bazar")], false, 1);
  // Placed in priority order: the marked station first, then the termini.
  expect([...labels.keys()]).toEqual(["karwan-bazar", "uttara-north", "motijheel"].map(stationId));
  expect([...labels.values()].every((label) => label.kind === "pill")).toBe(true);
  expect(labels.get(stationId("karwan-bazar"))?.x).toBe(14);
});

test("METRO-115 from the zoom threshold every other station gets a halo label on its own side", () => {
  const labels = layoutLabels(STOPS, [], true, 1);
  expect(labels.size).toBe(16);
  expect(labels.get(stationId("pallabi"))?.anchor).toBe("start");
  expect(labels.get(stationId("dhaka-university"))?.anchor).toBe("end");
  expect(labels.get(stationId("bangladesh-secretariat"))?.anchor).toBe("middle");
});

test("METRO-115 pills never overlap on a short frame, where the stops are a few pixels apart", () => {
  // 320 x 640 at half: the frame is about 190 px high, so one pixel covers about 4.6 units.
  for (const unit of [3, 4, 4.6, 6, 12]) {
    for (const marked of [
      [],
      ["bangladesh-secretariat"],
      ["pallabi"],
      ["bangladesh-secretariat", "dhaka-university"],
      ["karwan-bazar", "farmgate", "bijoy-sharani"],
    ]) {
      expect(overlapping(unit, marked, false), `unit ${unit} marked ${marked.join()}`).toEqual([]);
    }
  }
});

test("METRO-115 halo labels never overlap either when every station is named", () => {
  for (const unit of [0.8, 1, 1.5, 2, 3]) {
    expect(overlapping(unit, ["karwan-bazar"], true), `unit ${unit}`).toEqual([]);
  }
});

test("METRO-115 a marked station beats a terminus beats the rest: the lower priority moves or is dropped", () => {
  // Secretariat is next to Motijheel. At 12 units a pixel the two are about 4 px apart.
  const labels = layoutLabels(STOPS, [stationId("bangladesh-secretariat")], false, 12);
  const secretariat = labels.get(stationId("bangladesh-secretariat"));
  expect(secretariat?.kind).toBe("pill");
  // The marked station keeps its own side (below); the terminus is on another side or not drawn.
  expect(secretariat?.y).toBe(20);
  expect(labels.get(stationId("motijheel"))?.y).not.toBe(20);
});

test("METRO-115 a label that fits on no side is not drawn: marked stations are kept before the termini", () => {
  // At 400 units a pixel every stop is on the same pixel and a pill has four sides: five pills, four places.
  const marked = ["farmgate", "karwan-bazar", "bijoy-sharani"].map(stationId);
  const labels = layoutLabels(STOPS, marked, false, 400);
  expect(labels.size).toBe(4);
  for (const id of marked) expect(labels.has(id)).toBe(true);
  expect(labels.has(stationId("uttara-north")) && labels.has(stationId("motijheel"))).toBe(false);
});
test("METRO-115 the layout is deterministic: the same input gives the same labels", () => {
  const first = layoutLabels(STOPS, [stationId("farmgate")], false, 4.6);
  const second = layoutLabels(STOPS, [stationId("farmgate")], false, 4.6);
  expect([...second]).toEqual([...first]);
});

test("METRO-115 above is the last side tried for a pill, and a halo label never goes above", () => {
  const marked = ["farmgate", "karwan-bazar", "bijoy-sharani"].map(stationId);
  const pills = [...layoutLabels(STOPS, marked, false, 400).values()];
  expect(Math.min(...pills.map((label) => label.y))).toBe(-44);
  for (const unit of [0.8, 3, 8, 20]) {
    const halos = [...layoutLabels(STOPS, [], true, unit).values()].filter(
      (label) => label.kind === "halo",
    );
    expect(Math.min(...halos.map((label) => label.y))).toBeGreaterThanOrEqual(-10);
  }
});
