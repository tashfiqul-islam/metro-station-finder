/**
 * Geolocation adapters using the browser API.
 *
 * Exposes typed helpers for one-shot location requests and service area
 * validation. No persistence; privacy-first design.
 */

import {
  APP_CONSTANTS,
  DHAKA_SERVICE_AREA,
  ERROR_CODES,
  GEOLOCATION_CONSTANTS,
  ID_CONSTANTS,
} from "@/lib/config/constants";
import type {
  ApiResponse,
  Coordinates,
  GeolocationErrorCode,
  Meters,
  Milliseconds,
} from "@/lib/types";
import { createCoordinates, createSessionId, isCoordinates } from "@/lib/types";
import type {
  GeolocationOptions,
  GeolocationResult,
  ServiceAreaValidation,
} from "@/lib/types/geolocation";
import { calculateDistance, calculateDistanceKilometers } from "@/lib/utils/distance";
import { hashStringToEtag } from "@/lib/utils/hash";
import { failure, success } from "@/lib/utils/response";

const version = APP_CONSTANTS.version;

/**
 * Request current position via the Browser Geolocation API.
 */
export async function requestCurrentLocation(
  options?: Partial<GeolocationOptions>
): Promise<ApiResponse<GeolocationResult, GeolocationErrorCode>> {
  const start = Date.now() as Milliseconds;
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.geolocation.geoUnavailable,
        message: "Geolocation is unavailable",
      },
    };
  }
  const merged: PositionOptions = {
    enableHighAccuracy: true,
    timeout: GEOLOCATION_CONSTANTS.defaultTimeout,
    maximumAge: GEOLOCATION_CONSTANTS.defaultMaxAge,
    ...(options ?? {}),
  };

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, merged);
    });
    const coords = createCoordinates(pos.coords.latitude, pos.coords.longitude);
    const result: GeolocationResult = {
      id: `geo_${Date.now().toString(ID_CONSTANTS.base36)}`,
      coordinates: coords,
      accuracy: Math.round(pos.coords.accuracy) as unknown as Meters,
      timestamp: Date.now() as Milliseconds,
      source: "geolocation",
      sessionId: createSessionId(
        `geo_${Date.now().toString(ID_CONSTANTS.base36)}`
      ) as unknown as import("@/lib/types/geolocation").GeolocationSessionId,
      status: "success",
      processingTime: (Date.now() - start) as Milliseconds,
    };
    const etag = hashStringToEtag(`${version}|geolocation|${result.id}`);
    return success(result, (Date.now() - start) as Milliseconds, version, {
      etag,
      dataVersion: APP_CONSTANTS.dataVersion,
    });
  } catch (err) {
    const error = err as GeolocationPositionError;
    let code: GeolocationErrorCode;
    if (error.code === error.PERMISSION_DENIED) {
      code = ERROR_CODES.geolocation.geoDenied;
    } else if (error.code === error.TIMEOUT) {
      code = ERROR_CODES.geolocation.geoTimeout;
    } else {
      code = ERROR_CODES.geolocation.geoError;
    }
    return failure(code, error.message);
  }
}

/**
 * Validate whether given coordinates lie within the Dhaka service area.
 */
export function validateServiceArea(
  coordinates: Coordinates
): ApiResponse<ServiceAreaValidation, GeolocationErrorCode> {
  const start = Date.now() as Milliseconds;
  if (!isCoordinates(coordinates)) {
    return failure(ERROR_CODES.geolocation.validationError, "Invalid coordinates");
  }
  const distanceResult = calculateDistance(coordinates, DHAKA_SERVICE_AREA.centroid);
  const distanceKm = distanceResult.success
    ? distanceResult.distanceKilometers
    : calculateDistanceKilometers(coordinates, DHAKA_SERVICE_AREA.centroid);
  const isValid = (distanceKm as number) <= (DHAKA_SERVICE_AREA.radiusKm as number);
  const etag = hashStringToEtag(`${version}|serviceArea|${(distanceKm as number).toFixed(2)}`);
  return success(
    {
      isValid,
      distance: distanceKm,
      serviceArea: {
        radius: DHAKA_SERVICE_AREA.radiusKm,
        centroid: DHAKA_SERVICE_AREA.centroid,
      },
    },
    (Date.now() - start) as Milliseconds,
    version,
    { etag, dataVersion: APP_CONSTANTS.dataVersion }
  );
}
