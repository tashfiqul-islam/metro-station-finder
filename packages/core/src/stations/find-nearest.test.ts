import type { Coordinate } from "../geo/coordinate.ts";
import { findNearestStation, resolveStation } from "./find-nearest.ts";
import { stationId } from "./station.ts";
import type { Station } from "./station.ts";

function station(id: string, lat: number, lng: number, aliases: string[] = []): Station {
  return { id: stationId(id), name: id, coordinate: { lat, lng }, aliases };
}

const west = station("west", 0, -1);
const east = station("east", 0, 1);
const far = station("far", 10, 10);

describe("findNearestStation", () => {
  test("returns the closest station and its geographic distance", () => {
    const result = findNearestStation([far, west, east], { lat: 0, lng: 0.9 });
    expect(result.kind).toBe("nearest");
    if (result.kind !== "nearest") return;
    expect(result.station.id).toBe(east.id);
    expect(result.distance).toBeCloseTo(11.119, 2);
  });

  test("an exact-point origin selects that station at distance zero", () => {
    const result = findNearestStation([west, east], east.coordinate);
    expect(result).toMatchObject({ kind: "nearest", distance: 0 });
    expect(result.kind === "nearest" && result.station.id).toBe(east.id);
  });

  test("an exact tie keeps the first station in dataset order", () => {
    const origin: Coordinate = { lat: 0, lng: 0 };
    const forward = findNearestStation([west, east], origin);
    const reversed = findNearestStation([east, west], origin);
    expect(forward.kind === "nearest" && forward.station.id).toBe(west.id);
    expect(reversed.kind === "nearest" && reversed.station.id).toBe(east.id);
    const twin = { ...east, id: stationId("east-twin") };
    const same = findNearestStation([east, twin], { lat: 3, lng: 3 });
    expect(same.kind === "nearest" && same.station.id).toBe(east.id);
  });

  test("an empty dataset is an explicit no-result, not a throw or a default", () => {
    expect(findNearestStation([], { lat: 0, lng: 0 })).toEqual({
      kind: "no-result",
      reason: "empty-dataset",
    });
  });

  test("invalid origins are rejected with the reason, before any ranking", () => {
    const stations = [west, east];
    expect(findNearestStation(stations, { lat: Number.NaN, lng: 0 })).toEqual({
      kind: "no-result",
      reason: "invalid-coordinate",
      detail: "not-finite-number",
    });
    expect(findNearestStation(stations, { lat: 91, lng: 0 })).toEqual({
      kind: "no-result",
      reason: "invalid-coordinate",
      detail: "latitude-out-of-range",
    });
    expect(findNearestStation(stations, { lat: 0, lng: -181 })).toEqual({
      kind: "no-result",
      reason: "invalid-coordinate",
      detail: "longitude-out-of-range",
    });
  });

  test("a station whose distance is not finite is skipped, never selected", () => {
    const broken = station("broken", Number.NaN, 0);
    const result = findNearestStation([broken, far], { lat: 0, lng: 0 });
    expect(result.kind === "nearest" && result.station.id).toBe(far.id);
    expect(findNearestStation([broken], { lat: 0, lng: 0 })).toEqual({
      kind: "no-result",
      reason: "empty-dataset",
    });
  });

  test("an invalid origin is reported even when the dataset is empty", () => {
    expect(findNearestStation([], { lat: 200, lng: 0 })).toMatchObject({
      reason: "invalid-coordinate",
    });
  });
});

describe("resolveStation", () => {
  const stations = [station("mirpur-11", 1, 1, ["Mirpur - 11"]), station("pallabi", 2, 2)];

  test("matches the exact name or an exact alias, case-sensitively", () => {
    expect(resolveStation(stations, "mirpur-11")?.id).toBe(stationId("mirpur-11"));
    expect(resolveStation(stations, "Mirpur - 11")?.id).toBe(stationId("mirpur-11"));
    expect(resolveStation(stations, "pallabi")?.id).toBe(stationId("pallabi"));
  });

  test("an unknown or differently cased label is undefined, never a guess", () => {
    expect(resolveStation(stations, "Pallabi")).toBeUndefined();
    expect(resolveStation(stations, "Nowhere")).toBeUndefined();
    expect(resolveStation([], "pallabi")).toBeUndefined();
    expect(resolveStation(stations, "")).toBeUndefined();
  });
});
