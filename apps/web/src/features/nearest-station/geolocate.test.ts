import { expect, test, vi } from "vitest";

import { locate } from "./geolocate";
import { fakePosition, fakePositionError } from "./geolocation-fakes";

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

function fakeGeo(run: (success: Success, failure: Failure, options?: PositionOptions) => void) {
  return { getCurrentPosition: vi.fn(run) };
}

test("METRO-88 a fix becomes a plain coordinate and the request uses the ADR-0009 options", async () => {
  const geo = fakeGeo((success) => success(fakePosition(23.8, 90.4)));
  expect(await locate(geo)).toEqual({
    kind: "position",
    coordinate: { lat: 23.8, lng: 90.4 },
    accuracyMeters: 10,
  });
  expect(geo.getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(geo.getCurrentPosition.mock.calls[0]?.[2]).toEqual({
    timeout: 8_000,
    maximumAge: 0,
    enableHighAccuracy: false,
  });
});

test("METRO-88 permission denied is its own outcome", async () => {
  expect(await locate(fakeGeo((_s, failure) => failure(fakePositionError(1))))).toEqual({
    kind: "denied",
  });
});

test("METRO-88 an unavailable fix and a timeout are one unavailable outcome without a cause", async () => {
  for (const code of [2, 3] as const) {
    const result = await locate(fakeGeo((_s, failure) => failure(fakePositionError(code))));
    expect(result).toEqual({ kind: "unavailable" });
  }
});

test("METRO-88 a missing geolocation API is unavailable and nothing is requested", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator, "geolocation");
  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: undefined,
    configurable: true,
  });
  expect(await locate()).toEqual({ kind: "unavailable" });
  if (original) Object.defineProperty(globalThis.navigator, "geolocation", original);
});

async function read(accuracy: number) {
  const result = await locate(fakeGeo((success) => success(fakePosition(23.8, 90.4, accuracy))));
  return result.kind === "position" ? result.accuracyMeters : "not a position";
}

test("METRO-103 the accuracy radius is carried; NaN, infinite and negative are unknown", async () => {
  expect(await read(25_000)).toBe(25_000);
  expect(await read(0)).toBe(0);
  for (const bad of [Number.NaN, Infinity, -1]) {
    expect(await read(bad)).toBeUndefined();
  }
});

test("METRO-113 a getCurrentPosition that throws is the unavailable outcome, with no error carried", async () => {
  const geo = fakeGeo(() => {
    throw new Error("synthetic: lat 23.0 lng 90.0");
  });
  expect(await locate(geo)).toEqual({ kind: "unavailable" });
});

test("METRO-113 a navigator.geolocation getter that throws is the unavailable outcome", async () => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    get: () => {
      throw new Error("synthetic");
    },
  });
  try {
    expect(await locate()).toEqual({ kind: "unavailable" });
  } finally {
    Reflect.deleteProperty(navigator, "geolocation");
  }
});
