import { describe, expect, it } from "vitest";

import mrt6Line from "@/data/mrt6-line";
import { STATIONS } from "@/data/stations";
import { InvalidStationError } from "@/features/fare-calculator/logic";
import { clipLineToSegment, planTrip } from "@/features/trip-planner/logic";

describe("clipLineToSegment", () => {
  it("returns the station coordinate for a zero-length segment", () => {
    const coords = clipLineToSegment(mrt6Line, 0, 0);
    expect(coords).toHaveLength(1);
    expect(coords[0]).toEqual([STATIONS[0]?.lng, STATIONS[0]?.lat]);
  });

  it("anchors the clipped segment to the requested station coordinates", () => {
    const coords = clipLineToSegment(mrt6Line, 0, 1);
    expect(coords[0]).toEqual([STATIONS[0]?.lng, STATIONS[0]?.lat]);
    expect(coords.at(-1)).toEqual([STATIONS[1]?.lng, STATIONS[1]?.lat]);
  });

  it("returns dense geometry rather than one coordinate per station", () => {
    const coords = clipLineToSegment(mrt6Line, 3, 8);
    expect(coords.length).toBeGreaterThan(6);
  });

  it("returns the reverse path when direction is reversed", () => {
    const forward = clipLineToSegment(mrt6Line, 2, 8);
    const reverse = clipLineToSegment(mrt6Line, 8, 2);
    expect(reverse).toEqual([...forward].toReversed());
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
    expect(trip.segmentCoords[0]).toEqual([trip.stops[0]?.lng, trip.stops[0]?.lat]);
  });

  it("forward and reverse trips have the same fare and distance", () => {
    const forward = planTrip("uttara-north", "motijheel");
    const reverse = planTrip("motijheel", "uttara-north");
    expect(forward.fare).toBe(reverse.fare);
    expect(forward.distanceKm).toBeCloseTo(reverse.distanceKm, 6);
    expect(reverse.segmentCoords).toEqual([...forward.segmentCoords].toReversed());
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

  it("segmentCoords are anchored to the trip endpoints", () => {
    const trip = planTrip("uttara-north", "karwan-bazar");
    expect(trip.segmentCoords[0]).toEqual([trip.stops[0]?.lng, trip.stops[0]?.lat]);
    expect(trip.segmentCoords.at(-1)).toEqual([trip.stops.at(-1)?.lng, trip.stops.at(-1)?.lat]);
  });

  it("segmentCoords use dense geometry for multi-stop trips", () => {
    const trip = planTrip("uttara-north", "karwan-bazar");
    expect(trip.segmentCoords.length).toBeGreaterThan(trip.stops.length);
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
