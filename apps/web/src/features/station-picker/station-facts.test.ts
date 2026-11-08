import { baselineDataset, stationId } from "@metro/core";
import type { FareTable, Station } from "@metro/core";
import { expect, test } from "vitest";

import { directionsUrl, fareRange, stopLabel } from "./station-facts";

const { stations, fares } = baselineDataset;
const named = (name: string): Station => {
  const found = stations.find((station) => station.name === name);
  if (found === undefined) throw new Error(`no station ${name}`);
  return found;
};

test("METRO-112 the fare range runs from the cheapest to the dearest trip from the station", () => {
  expect(fareRange(fares, stations, named("Uttara North"))).toEqual({
    cheapest: 20,
    dearest: 100,
  });
  expect(fareRange(fares, stations, named("Karwan Bazar"))).toEqual({
    cheapest: 20,
    dearest: 80,
  });
  expect(fareRange(fares, stations, named("Motijheel"))).toEqual({ cheapest: 20, dearest: 100 });
});

test("METRO-112 a station with no known fare has no range, and an unknown cell is left out", () => {
  const a = stationId("a");
  const b = stationId("b");
  const c = stationId("c");
  const mk = (id: typeof a, name: string): Station => ({
    id,
    name,
    coordinate: { lat: 1, lng: 2 },
    aliases: [],
  });
  const three = [mk(a, "A"), mk(b, "B"), mk(c, "C")];
  const gaps: FareTable = {
    order: [a, b, c],
    amounts: [
      [0, 30, Number.NaN],
      [30, 0, 40],
      [Number.NaN, 40, 0],
    ],
  };
  const first = three[0];
  if (first === undefined) throw new Error("fixture");
  expect(fareRange(gaps, three, first)).toEqual({ cheapest: 30, dearest: 30 });
  expect(fareRange({ order: [], amounts: [] }, three, first)).toBeNull();
});

test("METRO-112 the directions link carries the station's coordinate and no other parameter", () => {
  for (const station of stations) {
    const url = new URL(directionsUrl(station));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(new Set(url.searchParams.keys())).toEqual(new Set(["api", "destination"]));
    const [lat, lng] = (url.searchParams.get("destination") ?? "").split(",").map(Number);
    expect(lat).toBeCloseTo(station.coordinate.lat, 6);
    expect(lng).toBeCloseTo(station.coordinate.lng, 6);
  }
  expect(directionsUrl(named("Karwan Bazar"))).toBe(
    "https://www.google.com/maps/dir/?api=1&destination=23.751353,90.392977",
  );
});

test("METRO-112 the stop label has two digits", () => {
  expect(stopLabel(5)).toBe("05");
  expect(stopLabel(12)).toBe("12");
});
