/**
 * Google Places client adapters (stubbed for Phase 1).
 *
 * Provides typed stubs for autocomplete and quota visibility. In later
 * phases, wire to @vis.gl/react-google-maps PlacesService; keep the same
 * function contracts.
 */

import {
  APP_CONSTANTS,
  ERROR_CODES,
  GOOGLE_PLACES_CONSTANTS,
  ID_CONSTANTS,
} from "@/lib/constants";
import type { ApiResponse, Milliseconds } from "@/lib/types";
import type {
  AutocompleteResponse,
  GoogleMapsStatus,
  PlacePrediction,
  QuotaStatus,
} from "@/lib/types/places";
import { hashStringToEtag } from "@/lib/utils/hash";
import { createWindowLimiter } from "@/lib/utils/limiter";
import { failure, success } from "@/lib/utils/response";

type GooglePlacesErrorCode =
  (typeof ERROR_CODES.googlePlaces)[keyof typeof ERROR_CODES.googlePlaces];

const version = APP_CONSTANTS.version;

const limiter = createWindowLimiter(
  GOOGLE_PLACES_CONSTANTS.maxRequestsPerMinute,
  GOOGLE_PLACES_CONSTANTS.rateLimitWindowMs
);

/**
 * Return current client-side rate window status for autocomplete.
 */
export function getQuotaStatus(): ApiResponse<QuotaStatus, never> {
  const start = Date.now() as Milliseconds;
  const status = limiter.status();
  const etag = hashStringToEtag(
    `${version}|quota|${status.used}-${status.remaining}-${status.resetTime}`
  );
  return success(
    {
      places: {
        used: status.used,
        limit: status.limit,
        remaining: status.remaining,
        resetTime: status.resetTime,
        isExceeded: status.isExceeded,
      },
      maps: {
        used: 0,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() as Milliseconds,
        isExceeded: false,
      },
      geocoding: {
        used: 0,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() as Milliseconds,
        isExceeded: false,
      },
      isRateLimited: status.isExceeded,
      lastResetTime: (status.resetTime -
        GOOGLE_PLACES_CONSTANTS.rateLimitWindowMs) as Milliseconds,
    },
    (Date.now() - start) as Milliseconds,
    version,
    { etag, dataVersion: APP_CONSTANTS.dataVersion }
  );
}

/**
 * Whether client-side quota permits autocomplete at this moment.
 */
export function isAutocompleteAvailable(): boolean {
  return !limiter.status().isExceeded;
}

/**
 * Autocomplete search (client-stub). Replace later with real PlacesService.
 */
export function searchDestinations(
  query: string
): ApiResponse<readonly PlacePrediction[], GooglePlacesErrorCode> {
  const start = Date.now() as Milliseconds;
  const q = query.trim();
  if (q.length < GOOGLE_PLACES_CONSTANTS.minQueryLength) {
    return failure(
      ERROR_CODES.googlePlaces.invalidQuery,
      "Query must be at least 3 characters"
    );
  }
  if (!isAutocompleteAvailable()) {
    return failure(ERROR_CODES.googlePlaces.rateLimited, "Rate limited");
  }
  if (!limiter.tryConsume()) {
    return failure(ERROR_CODES.googlePlaces.rateLimited, "Rate limited");
  }

  // We deliberately avoid hitting the network in Phase 1 and return an empty result
  const response: AutocompleteResponse = {
    predictions: [],
    status: "OK" as GoogleMapsStatus,
    requestId:
      `req_${Date.now().toString(ID_CONSTANTS.base36)}` as unknown as string,
    sessionId:
      `sess_${Date.now().toString(ID_CONSTANTS.base36)}` as unknown as string,
    processingTime: (Date.now() - start) as Milliseconds,
    state: "success",
  } as AutocompleteResponse;

  const etag = hashStringToEtag(
    `${version}|places|${q}|${response.predictions.length}`
  );
  return success(
    response.predictions,
    (Date.now() - start) as Milliseconds,
    version,
    {
      etag,
      dataVersion: APP_CONSTANTS.dataVersion,
    }
  );
}
