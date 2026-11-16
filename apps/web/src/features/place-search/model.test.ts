import { baselineDataset } from "@metro/core";
import { expect, test } from "vitest";

import { buildRows, hasExactStation, listStations, placeQuery, placesView } from "./model";

const stations = baselineDataset.stations;
const place = (id: string) => ({ id, name: id, detail: "", range: null });

test("METRO-163 a request needs three characters: one or two ask nothing, three ask", () => {
  expect(placeQuery(stations, "")).toBeNull();
  expect(placeQuery(stations, "g")).toBeNull();
  expect(placeQuery(stations, "gu")).toBeNull();
  expect(placeQuery(stations, "sam")).toBe("sam");
});

test("METRO-163 the three characters are counted on the trimmed text, by code point", () => {
  expect(placeQuery(stations, "  gu  ")).toBeNull();
  expect(placeQuery(stations, " sam ")).toBe("sam");
  expect(placeQuery(stations, "\u{1F600}\u{1F600}")).toBeNull();
  // Three code points ask (one is a letter), though they are four UTF-16 units; three symbols alone do not.
  expect(placeQuery(stations, "a\u{1F600}\u{1F600}")).toBe("a\u{1F600}\u{1F600}");
  expect(placeQuery(stations, "\u{1F600}\u{1F600}\u{1F600}")).toBeNull();
});

test("METRO-163 a text with no letter and no number asks nothing, however long", () => {
  expect(placeQuery(stations, "---")).toBeNull();
  expect(placeQuery(stations, "   ...   ")).toBeNull();
  expect(placeQuery(stations, "+++-- ")).toBeNull();
  expect(placeQuery(stations, "--a")).toBe("--a");
  expect(placeQuery(stations, "1--")).toBe("1--");
  // Letters of any script count.
  expect(placeQuery(stations, "মিরপুর")).toBe("মিরপুর");
});

test("METRO-163 a whole station name asks nothing, whatever the case, spaces or hyphens", () => {
  expect(placeQuery(stations, "Motijheel")).toBeNull();
  expect(placeQuery(stations, "MOTIJHEEL")).toBeNull();
  expect(placeQuery(stations, "karwan bazar")).toBeNull();
  expect(placeQuery(stations, "Karwan-Bazar")).toBeNull();
  expect(placeQuery(stations, "mirpur11")).toBeNull();
  // A part of a name is not exact: places are still wanted.
  expect(placeQuery(stations, "Motijhee")).toBe("Motijhee");
  expect(placeQuery(stations, "mirpur 1")).toBe("mirpur 1");
});

test("METRO-163 an alias counts as a whole station name too", () => {
  expect(hasExactStation(stations, "Bijoy Sharani")).toBe(true);
  expect(hasExactStation(stations, "bijoy-sarawni")).toBe(true);
  expect(placeQuery(stations, "Farmagate")).toBeNull();
  expect(hasExactStation(stations, "Bijoy Shar")).toBe(false);
});

test("METRO-163 blank text is never an exact match", () => {
  expect(hasExactStation(stations, "")).toBe(false);
  expect(hasExactStation(stations, " - ")).toBe(false);
});

test("METRO-163 stations: nothing for empty text, at most five, all sixteen when browsing", () => {
  expect(listStations(stations, "", false)).toEqual([]);
  expect(listStations(stations, "   ", false)).toEqual([]);
  expect(listStations(stations, "a", false)).toHaveLength(5);
  expect(listStations(stations, "mir", false).map((match) => match.station.name)).toEqual([
    "Mirpur 11",
    "Mirpur 10",
  ]);
  expect(listStations(stations, "", true)).toHaveLength(16);
  expect(listStations(stations, "zzz", false)).toEqual([]);
});

test("METRO-163 rows put the stations first, then the places, with keys that never collide", () => {
  const matches = listStations(stations, "mir", false);
  const rows = buildRows(matches, [place("a"), place("b")]);
  expect(rows.map((row) => row.kind)).toEqual(["station", "station", "place", "place"]);
  expect(new Set(rows.map((row) => row.key)).size).toBe(4);
  expect(buildRows([], [])).toEqual([]);
});

test("METRO-163 the Places part: nothing unless asked for, the notice when unavailable, the list when it has rows", () => {
  expect(placesView(false, false, [place("a")])).toBe("none");
  expect(placesView(false, true, [])).toBe("none");
  expect(placesView(true, true, [place("a")])).toBe("unavailable");
  expect(placesView(true, false, [place("a")])).toBe("list");
  expect(placesView(true, false, [])).toBe("none");
});
