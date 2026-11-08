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
 * ADR-0009: no high accuracy, no cached fix, an 8 s limit (METRO-113, the handoff's timeout). Called only after an explicit button press.
 * High accuracy stays off (METRO-103): on a desktop without GPS it gave the same 25,000 m as the normal request.
 */
const OPTIONS: PositionOptions = { timeout: 8_000, maximumAge: 0, enableHighAccuracy: false };

function knownAccuracy(value: number): number | undefined {
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * The browser's device position as a plain result. It never rejects and carries no error object: a
 * denial, an unavailable fix, a timeout and a missing API are reduced to two outcomes. The position is
 * returned to the caller only; it is not logged, stored or sent anywhere here.
 */
export function locate(geo: Locator | undefined = readGeolocation()): Promise<LocateResult> {
  if (geo === undefined) return Promise.resolve({ kind: "unavailable" });
  return new Promise((resolve) => {
    try {
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
    } catch {
      // Some embedded or policy-restricted contexts throw instead of calling the error callback. The cause is
      // dropped on purpose: it is not shown or logged.
      resolve({ kind: "unavailable" });
    }
  });
}

/** `navigator.geolocation` can throw in a restricted context; that reads as no API. */
function readGeolocation(): Locator | undefined {
  try {
    return globalThis.navigator?.geolocation;
  } catch {
    return undefined;
  }
}
