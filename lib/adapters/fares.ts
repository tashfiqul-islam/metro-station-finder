/**
 * Fare adapters over static fare matrix.
 *
 * Provides pure, typed helpers for fare rules, calculation, and simple route
 * assembly using the station order. No network calls; static data is the
 * single source of truth.
 */

import { APP_CONSTANTS, ERROR_CODES } from "@/lib/config/constants";
import { calculateFare as calcFare, getFareRules as faresRules } from "@/lib/services/data/fares";
import MRT6_STATIONS from "@/lib/services/data/stations";
import type { ApiResponse, Milliseconds, StationId } from "@/lib/types";
import type { DiscountType, Fare, FareRules, Route } from "@/lib/types/fare";
import type { Station } from "@/lib/types/station";
import { hashStringToEtag } from "@/lib/utils/hash";
import { failure, success } from "@/lib/utils/response";

type FareErrorCode = (typeof ERROR_CODES.fare)[keyof typeof ERROR_CODES.fare];

const version = APP_CONSTANTS.version;

/** Build an immutable id → station index for O(1) lookups. */
const STATION_BY_ID: ReadonlyMap<StationId, Station> = (() => {
  const m = new Map<StationId, Station>();
  for (const s of MRT6_STATIONS) {
    m.set(s.id, s);
  }
  return m;
})();

/**
 * Return fare rules (version, bounds, discounts, base fares map).
 */
export function getFareRules(): ApiResponse<FareRules, never> {
  const start = Date.now() as Milliseconds;
  const rules = faresRules();
  const etag = hashStringToEtag(`${version}|fareRules|${APP_CONSTANTS.dataVersion}`);
  return success(rules as unknown as FareRules, (Date.now() - start) as Milliseconds, version, {
    etag,
    dataVersion: APP_CONSTANTS.dataVersion,
  });
}

/**
 * Calculate a fare between two stations with an optional discount type.
 */
export function calculateFare(
  origin: StationId,
  destination: StationId,
  discount?: { readonly type: DiscountType }
): ApiResponse<Fare, FareErrorCode> {
  const start = Date.now() as Milliseconds;
  const from = STATION_BY_ID.get(origin);
  const to = STATION_BY_ID.get(destination);

  if (!(from && to)) {
    return failure(ERROR_CODES.fare.invalidStations, "Invalid origin or destination");
  }
  try {
    const fare = calcFare(from.name, to.name, discount?.type ?? "single-journey");
    const etag = hashStringToEtag(
      `${version}|fare|${origin}-${destination}|${discount?.type ?? "single-journey"}`
    );
    return success(fare, (Date.now() - start) as Milliseconds, version, {
      etag,
      dataVersion: APP_CONSTANTS.dataVersion,
    });
  } catch {
    return failure(ERROR_CODES.fare.calculationError, "Calculation error");
  }
}

/**
 * Build a simple route path (inclusive) between origin and destination based
 * on station order; includes an accompanying fare.
 */
export function getRoute(
  origin: StationId,
  destination: StationId
): ApiResponse<Route, FareErrorCode> {
  const start = Date.now() as Milliseconds;
  const from = STATION_BY_ID.get(origin);
  const to = STATION_BY_ID.get(destination);
  if (!(from && to)) {
    return failure(ERROR_CODES.fare.invalidStations, "Invalid stations");
  }
  try {
    const fare = calcFare(from.name, to.name, "single-journey");
    const stationsInRoute = MRT6_STATIONS.filter((s) => {
      const min = Math.min(from.order, to.order);
      const max = Math.max(from.order, to.order);
      return s.order >= min && s.order <= max;
    });
    const route: Route = {
      origin: from,
      destination: to,
      stations: stationsInRoute,
      fare,
      travelTime: fare.travelTime,
      distance: fare.distance,
      transfers: 0,
      line: "mrt-6",
      instructions: [],
    };
    const etag = hashStringToEtag(`${version}|route|${origin}-${destination}`);
    return success(route, (Date.now() - start) as Milliseconds, version, {
      etag,
      dataVersion: APP_CONSTANTS.dataVersion,
    });
  } catch {
    return failure(ERROR_CODES.fare.routeError, "Route error");
  }
}
