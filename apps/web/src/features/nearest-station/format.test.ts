import { expect, test } from "vitest";

import {
  formatAccuracy,
  formatEstimate,
  formatIsoDate,
  formatKm,
  formatMinutes,
  formatWalkingDistance,
} from "./format";

test("METRO-88 straight-line distance is kilometres with two decimals", () => {
  expect(formatKm(2.3149)).toBe("2.31 km");
  expect(formatKm(0)).toBe("0.00 km");
});

test("METRO-88 walking distance is metres under 1 km and kilometres from 1 km", () => {
  expect(formatWalkingDistance(999.4)).toBe("999 m");
  expect(formatWalkingDistance(1000)).toBe("1.00 km");
  expect(formatWalkingDistance(1234)).toBe("1.23 km");
});

test("METRO-88 duration is whole minutes and never less than one", () => {
  expect(formatMinutes(900)).toBe("15 min");
  expect(formatMinutes(10)).toBe("1 min");
  expect(formatMinutes(0)).toBe("1 min");
});

test("METRO-88 ISO dates read as day month year without a time zone shift", () => {
  expect(formatIsoDate("2022-09-08")).toBe("8 September 2022");
  expect(formatIsoDate("2026-11-05")).toBe("5 November 2026");
  expect(formatIsoDate("2026-12-31")).toBe("31 December 2026");
});

test("METRO-88 a walking distance that rounds to 1000 m reads 1.00 km, never 1000 m", () => {
  expect(formatWalkingDistance(999.4)).toBe("999 m");
  expect(formatWalkingDistance(999.5)).toBe("1.00 km");
  expect(formatWalkingDistance(1000)).toBe("1.00 km");
});

test("METRO-103 formatAccuracy: approximate, metres below 1 km, else km, capped at 1000 km", () => {
  expect(formatAccuracy(0)).toBe("about 0 m");
  expect(formatAccuracy(19.6)).toBe("about 20 m");
  expect(formatAccuracy(999.4)).toBe("about 999 m");
  expect(formatAccuracy(999.6)).toBe("about 1 km");
  expect(formatAccuracy(1000)).toBe("about 1 km");
  expect(formatAccuracy(1540)).toBe("about 1.5 km");
  expect(formatAccuracy(25_000)).toBe("about 25 km");
  expect(formatAccuracy(999_999)).toBe("about 1000 km");
  expect(formatAccuracy(1_000_000)).toBe("more than 1000 km");
  expect(formatAccuracy(1e308)).toBe("more than 1000 km");
  expect(formatAccuracy(Number.MAX_VALUE)).toBe("more than 1000 km");
});

test("METRO-113 an estimated distance is rounded: tens of metres under 1 km, one decimal of km above", () => {
  expect(formatEstimate(0.5504)).toBe("550 m");
  expect(formatEstimate(0.0004)).toBe("10 m");
  expect(formatEstimate(0)).toBe("10 m");
  expect(formatEstimate(0.9949)).toBe("990 m");
  expect(formatEstimate(1.1)).toBe("1.1 km");
  expect(formatEstimate(1.234)).toBe("1.2 km");
  expect(formatEstimate(18.26)).toBe("18.3 km");
});

test("METRO-113 a distance that rounds up to 1 km reads as kilometres, never 1000 m", () => {
  expect(formatEstimate(0.996)).toBe("1.0 km");
});
