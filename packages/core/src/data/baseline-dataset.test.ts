import { describe, expect, test } from "bun:test";

import { findFare, findNearestStation, resolveStation } from "../application/stations.ts";
import { stationId } from "../domain/index.ts";
import { baselineDataset } from "./baseline-dataset.ts";

const { stations, fares } = baselineDataset;

const legacyCoordinateLabels = [
  "Uttara North",
  "Uttara Center",
  "Uttara South",
  "Pallabi",
  "Mirpur 11",
  "Mirpur 10",
  "Kazipara",
  "Shewrapara",
  "Agaragaon",
  "Bijoy Sharani",
  "Farmagate",
  "Kawran Bazar",
  "Shahbagh",
  "Dhaka University",
  "Bangladesh Secretariat",
  "Motijheel",
];
const legacyFareLabels = [
  "Uttara North",
  "Uttara Center",
  "Uttara South",
  "Pallabi",
  "Mirpur - 11",
  "Mirpur - 10",
  "Kazipara",
  "Shewrapara",
  "Agargaon",
  "Bijoy Sharani",
  "Farmgate",
  "Karwan Bazar",
  "Shahbagh",
  "Dhaka University",
  "Bangladesh Secretariat",
  "Motijheel",
];

describe("baseline dataset v1 (legacy af903d7)", () => {
  test("is versioned and names its provenance", () => {
    expect(baselineDataset.version).toBe("baseline-v1");
    expect(baselineDataset.source).toContain("af903d7a2c1bf08165cfcf4a00ca0c0d73eedead");
  });

  test("has 16 stations with unique ids, and no label shared by two stations", () => {
    expect(stations).toHaveLength(16);
    expect(new Set(stations.map((s) => s.id)).size).toBe(16);
    const labels = stations.flatMap((s) => [s.name, ...s.aliases]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("fare table is 16x16 over the same station order, symmetric with a zero diagonal", () => {
    expect(fares.order).toEqual(stations.map((s) => s.id));
    expect(fares.amounts).toHaveLength(16);
    let cells = 0;
    fares.amounts.forEach((row, i) => {
      expect(row).toHaveLength(16);
      row.forEach((amount, j) => {
        cells += 1;
        expect(Number.isFinite(amount)).toBe(true);
        expect(fares.amounts[j]?.[i]).toBe(amount);
        expect(amount === 0).toBe(i === j);
      });
    });
    expect(cells).toBe(256);
  });

  test("every legacy label, from both legacy arrays, resolves to the station at its position", () => {
    stations.forEach((s, i) => {
      expect(resolveStation(stations, legacyCoordinateLabels[i] ?? "missing")).toBe(s);
      expect(resolveStation(stations, legacyFareLabels[i] ?? "missing")).toBe(s);
    });
  });

  test("keeps legacy ordering, endpoints and fares", () => {
    expect(stations[0]).toMatchObject({
      id: "uttara-north",
      coordinate: { lat: 23.869076247909604, lng: 90.36749888965423 },
    });
    expect(stations[15]).toMatchObject({
      id: "motijheel",
      coordinate: { lat: 23.728141228055236, lng: 90.41934126299398 },
    });
    const [uttara, motijheel] = [stationId("uttara-north"), stationId("motijheel")];
    expect(findFare(fares, uttara, motijheel)).toEqual({
      kind: "fare",
      fare: { amount: 100, currency: "BDT" },
    });
    expect(findFare(fares, uttara, uttara)).toEqual({
      kind: "fare",
      fare: { amount: 0, currency: "BDT" },
    });
  });

  test("every station is its own nearest station at distance zero", () => {
    for (const s of stations) {
      const result = findNearestStation(stations, s.coordinate);
      expect(result.kind === "nearest" && result.station.id).toBe(s.id);
      expect(result.kind === "nearest" ? Number(result.distance) : -1).toBe(0);
    }
  });
});
