import { baselineDataset, stationId } from "@metro/core";
import type { Station } from "@metro/core";
import { expect, test } from "vitest";

import { matchStations, normalizeName, splitName } from "./match";

const stations = baselineDataset.stations;
const names = (query: string): string[] =>
  matchStations(stations, query).map((match) => match.station.name);

test("METRO-112 empty and blank text match all 16 stations without a range", () => {
  expect(matchStations(stations, "")).toHaveLength(16);
  expect(matchStations(stations, " - ")).toHaveLength(16);
  expect(matchStations(stations, "").every((match) => match.range === null)).toBe(true);
});

test("METRO-112 matching is a case-insensitive substring match in dataset order", () => {
  expect(names("MIR")).toEqual(["Mirpur 11", "Mirpur 10"]);
  expect(names("pur")).toEqual(["Mirpur 11", "Mirpur 10"]);
  expect(names("zz")).toEqual([]);
});

test("METRO-112 spaces and hyphens are ignored on both sides", () => {
  expect(names("mirpur11")).toEqual(["Mirpur 11"]);
  expect(names("Mirpur - 10")).toEqual(["Mirpur 10"]);
  expect(names("karwanbazar")).toEqual(["Karwan Bazar"]);
  expect(names("karwan-bazar")).toEqual(["Karwan Bazar"]);
  expect(normalizeName("Mirpur - 11")).toBe("mirpur11");
});

test("METRO-112 the matched part of the name maps back through the ignored characters", () => {
  const match = matchStations(stations, "wanba")[0];
  expect(match?.station.name).toBe("Karwan Bazar");
  expect(splitName("Karwan Bazar", match?.range ?? null)).toEqual(["Kar", "wan Ba", "zar"]);
  const mirpur = matchStations(stations, "mir")[0];
  expect(splitName("Mirpur 11", mirpur?.range ?? null)).toEqual(["", "Mir", "pur 11"]);
});

test("METRO-112 an alias match lists the station without wrapping any part of the name", () => {
  const found = matchStations(stations, "Shahbagh");
  expect(found.map((match) => match.station.name)).toEqual(["Shahbag"]);
  expect(found[0]?.range).toBeNull();
  expect(splitName("Shahbag", null)).toEqual(["Shahbag", "", ""]);
});

test("METRO-112 a name that matches only after the first characters keeps the right range", () => {
  const odd: Station = {
    id: stationId("x"),
    name: "A - B C",
    coordinate: { lat: 0, lng: 0 },
    aliases: [],
  };
  const match = matchStations([odd], "bc")[0];
  expect(splitName(odd.name, match?.range ?? null)).toEqual(["A - ", "B C", ""]);
});
