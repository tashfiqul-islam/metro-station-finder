import { describe, expect, it } from "vitest";

import mrt6Line from "@/data/mrt6-line";
import { STATIONS } from "@/data/stations";
import { InvalidStationError } from "@/features/fare-calculator/logic";
import { clipLineToSegment, planTrip } from "@/features/trip-planner/logic";

describe("clipLineToSegment", () => {
  it("returns a single point for a zero-length segment (same index)", () => {
    const coords = clipLineToSegment(mrt6Line, 0, 0);
    expect(coords).toHaveLength(1);
  });

  it("returns 2 coordinates for adjacent stations (indices 0 and 1)", () => {
    const coords = clipLineToSegment(mrt6Line, 0, 1);
    expect(coords).toHaveLength(2);
  });

  it("returns 17 coordinates for the full line (indices 0 to 16)", () => {
    const coords = clipLineToSegment(mrt6Line, 0, 16);
    expect(coords).toHaveLength(17);
  });

  it("returns the same number of coords for forward and reverse direction", () => {
    const forward = clipLineToSegment(mrt6Line, 2, 8);
    const reverse = clipLineToSegment(mrt6Line, 8, 2);
    expect(forward).toHaveLength(reverse.length);
  });

  it("coordinates are [lng, lat] pairs (numbers)", () => {
    const coords = clipLineToSegment(mrt6Line, 0, 2);
    for (const coord of coords) {
      expect(coord).toHaveLength(2);
      expect(typeof coord[0]).toBe("number");
      expect(typeof coord[1]).toBe("number");
    }
  });
});

describe("planTrip", () => {
  it("returns zero-length trip for same origin and destination", () => {
    const trip = planTrip("shahbagh", "shahbagh");
    expect(trip.fare).toBe(0);
    expect(trip.distanceKm).toBe(0);
    expect(trip.estimatedMinutes).toBe(0);
    expect(trip.stops).toHaveLength(1);
    expect(trip.segmentCoords).toHaveLength(1);
  });

  it("forward and reverse trips have the same fare and distance", () => {
    const forward = planTrip("uttara-north", "motijheel");
    const reverse = planTrip("motijheel", "uttara-north");
    expect(forward.fare).toBe(reverse.fare);
    expect(forward.distanceKm).toBeCloseTo(reverse.distanceKm, 6);
  });

  it("includes all intermediate stops in correct order (forward)", () => {
    const trip = planTrip("pallabi", "agargaon");
    const slugs = trip.stops.map((s) => s.slug);
    expect(slugs).toEqual([
      "pallabi",
      "mirpur-11",
      "mirpur-10",
      "kazipara",
      "shewrapara",
      "agargaon",
    ]);
  });

  it("includes all intermediate stops in correct order (reverse)", () => {
    const trip = planTrip("agargaon", "pallabi");
    const slugs = trip.stops.map((s) => s.slug);
    expect(slugs).toEqual([
      "agargaon",
      "shewrapara",
      "kazipara",
      "mirpur-10",
      "mirpur-11",
      "pallabi",
    ]);
  });

  it("fare matches calculateFare", () => {
    const trip = planTrip("mirpur-10", "shahbagh");
    expect(trip.fare).toBe(50);
  });

  it("distanceKm is positive for different stations", () => {
    const trip = planTrip("uttara-north", "motijheel");
    expect(trip.distanceKm).toBeGreaterThan(0);
  });

  it("estimatedMinutes is positive for different stations", () => {
    const trip = planTrip("uttara-north", "motijheel");
    expect(trip.estimatedMinutes).toBeGreaterThan(0);
  });

  it("segmentCoords match the clipped line segment", () => {
    const trip = planTrip("uttara-north", "karwan-bazar");
    // Uttara North = orderIndex 1 (idx 0), Karwan Bazar = orderIndex 12 (idx 11)
    // Segment should cover 12 points (indices 0..11)
    expect(trip.segmentCoords).toHaveLength(12);
  });

  it("throws InvalidStationError for unknown origin", () => {
    expect(() => planTrip("ghost", "shahbagh")).toThrow(InvalidStationError);
  });

  it("all stops are valid Station objects", () => {
    const trip = planTrip("agargaon", "motijheel");
    const allSlugs = STATIONS.map((s) => s.slug);
    for (const stop of trip.stops) {
      expect(allSlugs).toContain(stop.slug);
    }
  });
});
