import { baselineDataset, stationId } from "@metro/core";
import type { Coordinate, Station } from "@metro/core";
import { expect, test } from "vitest";

import { alsoNearby } from "./also-nearby";

const { stations } = baselineDataset;
/** A synthetic point between the last two stations, nearer to the last. */
const NEAR_MOTIJHEEL: Coordinate = { lat: 23.728, lng: 90.419 };
function stationAt(index: number): Station {
  const found = stations[index];
  if (found === undefined) throw new Error("no such station");
  return found;
}
const last = stationAt(stations.length - 1);
const previous = stationAt(stations.length - 2);
const beforePrevious = stationAt(stations.length - 3);

test("METRO-113 the two next-nearest stations come back nearest first, without the result's own", () => {
  const found = alsoNearby(stations, NEAR_MOTIJHEEL, last.id);
  expect(found.map((entry) => entry.station.id)).toEqual([previous.id, beforePrevious.id]);
  expect(found[0]?.km).toBeLessThan(found[1]?.km ?? 0);
  expect(found.every((entry) => entry.station.id !== last.id)).toBe(true);
});

test("METRO-113 the count limits the list, and an empty or single-station dataset gives fewer", () => {
  expect(alsoNearby(stations, NEAR_MOTIJHEEL, last.id, 1)).toHaveLength(1);
  expect(alsoNearby([last], NEAR_MOTIJHEEL, last.id)).toEqual([]);
  expect(alsoNearby([], NEAR_MOTIJHEEL, stationId("none"))).toEqual([]);
});

test("METRO-113 equal distances keep dataset order", () => {
  const twin: Station = { ...previous, id: stationId("twin"), name: "Twin" };
  const found = alsoNearby([previous, twin, beforePrevious], NEAR_MOTIJHEEL, last.id, 1);
  expect(found.map((entry) => entry.station.id)).toEqual([previous.id]);
});

test("METRO-113 a station with a non-finite distance is left out", () => {
  const broken: Station = { ...previous, coordinate: { lat: Number.NaN, lng: 0 } };
  const found = alsoNearby([broken, beforePrevious, last], NEAR_MOTIJHEEL, last.id);
  expect(found.map((entry) => entry.station.id)).toEqual([beforePrevious.id]);
});
