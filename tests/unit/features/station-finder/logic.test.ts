import { describe, expect, it } from "vitest";

import { STATIONS, STATIONS_BY_SLUG } from "@/data/stations";
import { findNearest, haversineKm } from "@/features/station-finder/logic";

// Uttara North: { lat: 23.8734, lng: 90.3695 }
// Motijheel:   { lat: 23.7281, lng: 90.4225 }
const UTTARA_NORTH = { lat: 23.8734, lng: 90.3695 };
const MOTIJHEEL = { lat: 23.7281, lng: 90.4225 };

describe("haversineKm", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineKm(UTTARA_NORTH, UTTARA_NORTH)).toBe(0);
  });

  it("is symmetric — a→b equals b→a", () => {
    const ab = haversineKm(UTTARA_NORTH, MOTIJHEEL);
    const ba = haversineKm(MOTIJHEEL, UTTARA_NORTH);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it("Uttara North → Motijheel is approximately 16–18 km", () => {
    const dist = haversineKm(UTTARA_NORTH, MOTIJHEEL);
    expect(dist).toBeGreaterThan(15);
    expect(dist).toBeLessThan(19);
  });

  it("returns positive value for different coordinates", () => {
    const dist = haversineKm({ lat: 23.8, lng: 90.4 }, { lat: 23.75, lng: 90.42 });
    expect(dist).toBeGreaterThan(0);
  });

  it("adjacent stations are < 5 km apart", () => {
    const pallabi = { lat: 23.8264, lng: 90.3649 };
    const mirpur11 = { lat: 23.8166, lng: 90.3682 };
    expect(haversineKm(pallabi, mirpur11)).toBeLessThan(5);
  });
});

describe("findNearest", () => {
  it("returns the exact station when at its coordinates", () => {
    const result = findNearest({ lat: 23.8734, lng: 90.3695 }, STATIONS);
    expect(result.slug).toBe("uttara-north");
  });

  it("returns the nearest station to a point close to Shahbagh", () => {
    // Slightly offset from Shahbagh station
    const result = findNearest({ lat: 23.739, lng: 90.396 }, STATIONS);
    expect(result.slug).toBe("shahbagh");
  });

  it("returns the nearest station to Motijheel coordinates", () => {
    const result = findNearest(MOTIJHEEL, STATIONS);
    expect(result.slug).toBe("motijheel");
  });

  it("breaks ties by orderIndex (lower wins)", () => {
    // If two stations are equidistant, the one with the lower orderIndex wins.
    // We test by placing a point exactly at the midpoint of two adjacent stations
    // and verifying the lower-orderIndex station is returned.
    const farmgate = STATIONS_BY_SLUG.get("farmgate");
    const karwanBazar = STATIONS_BY_SLUG.get("karwan-bazar");
    if (!farmgate || !karwanBazar) {
      throw new Error("Test data missing required stations");
    }
    const midpoint = {
      lat: (farmgate.lat + karwanBazar.lat) / 2,
      lng: (farmgate.lng + karwanBazar.lng) / 2,
    };
    const result = findNearest(midpoint, STATIONS);
    // Both are equidistant; Farmgate has lower orderIndex (11 < 12)
    expect(result.orderIndex).toBe(farmgate.orderIndex);
    expect(result.slug).toBe("farmgate");
  });

  it("throws on an empty station list", () => {
    expect(() => findNearest({ lat: 0, lng: 0 }, [])).toThrow(
      "findNearest requires a non-empty stations array",
    );
  });
});
