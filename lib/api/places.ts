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

// Simple local daily quota tracker (resets every 24h from first usage)
let dailyWindowStart = Date.now() as Milliseconds;
let dailyUsed = 0;
const HOURS_PER_DAY = 24;
const SECONDS_PER_HOUR = 60 * 60;
const MILLISECONDS_PER_SECOND = 1000;
const DAILY_WINDOW_MS = (HOURS_PER_DAY *
  SECONDS_PER_HOUR *
  MILLISECONDS_PER_SECOND) as Milliseconds;
const PER_SECOND_LIMIT = 10;

function resetDailyIfNeeded(): void {
  const now = Date.now() as Milliseconds;
  if (now - dailyWindowStart >= DAILY_WINDOW_MS) {
    dailyWindowStart = now;
    dailyUsed = 0;
  }
}

function isDailyExceeded(): boolean {
  resetDailyIfNeeded();
  return dailyUsed >= (GOOGLE_PLACES_CONSTANTS.maxRequestsPerDay as number);
}

/**
 * Return current client-side rate window status for autocomplete.
 */
export function getQuotaStatus(): ApiResponse<QuotaStatus, never> {
  const start = Date.now() as Milliseconds;
  const status = limiter.status();
  resetDailyIfNeeded();
  const etag = hashStringToEtag(
    `${version}|quota|${status.used}-${status.remaining}-${status.resetTime}|${dailyUsed}`
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
      isRateLimited: status.isExceeded || isDailyExceeded(),
      lastResetTime: (status.resetTime -
        GOOGLE_PLACES_CONSTANTS.rateLimitWindowMs) as Milliseconds,
      dailyLimit: GOOGLE_PLACES_CONSTANTS.maxRequestsPerDay as number,
      hourlyLimit: 0,
      perSecondLimit: PER_SECOND_LIMIT,
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
  query: string,
  sessionToken?: string
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
  if (isDailyExceeded()) {
    return failure(
      ERROR_CODES.googlePlaces.quotaExceeded,
      "Daily quota exceeded"
    );
  }

  // We deliberately avoid hitting the network in Phase 1 and return an empty result
  const response: AutocompleteResponse = {
    predictions: [],
    status: "OK" as GoogleMapsStatus,
    requestId:
      `req_${Date.now().toString(ID_CONSTANTS.base36)}` as unknown as string,
    sessionId: (sessionToken ??
      `sess_${Date.now().toString(ID_CONSTANTS.base36)}`) as unknown as string,
    processingTime: (Date.now() - start) as Milliseconds,
    state: "success",
  } as AutocompleteResponse;

  const etag = hashStringToEtag(
    `${version}|places|${q}|${response.predictions.length}`
  );
  // Count towards daily usage for accepted request
  dailyUsed += 1;
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
