import type { Coordinate } from "@metro/core";

export type LocateResult =
  | {
      readonly kind: "position";
      readonly coordinate: Coordinate;
      /** The browser's accuracy radius in metres; undefined when missing, NaN or negative (unknown). */
      readonly accuracyMeters: number | undefined;
    }
  | { readonly kind: "denied" }
  | { readonly kind: "unavailable" };

type Locator = Pick<Geolocation, "getCurrentPosition">;

/**
 * ADR-0009: no high accuracy, no cached fix, a 10 s limit. Called only after an explicit button press.
 * High accuracy stays off (METRO-103): on a desktop without GPS it gave the same 25,000 m as the normal request.
 */
const OPTIONS: PositionOptions = { timeout: 10_000, maximumAge: 0, enableHighAccuracy: false };

function knownAccuracy(value: number): number | undefined {
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * The browser's device position as a plain result. It never rejects and carries no error object: a
 * denial, an unavailable fix, a timeout and a missing API are reduced to two outcomes. The position is
 * returned to the caller only; it is not logged, stored or sent anywhere here.
 */
export function locate(
  geo: Locator | undefined = globalThis.navigator?.geolocation,
): Promise<LocateResult> {
  if (geo === undefined) return Promise.resolve({ kind: "unavailable" });
  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) =>
        resolve({
          kind: "position",
          coordinate: { lat: position.coords.latitude, lng: position.coords.longitude },
          accuracyMeters: knownAccuracy(position.coords.accuracy),
        }),
      (error) =>
        resolve({ kind: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" }),
      OPTIONS,
    );
  });
}
