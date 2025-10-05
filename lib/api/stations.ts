/**
 * Station adapters over static data.
 *
 * Exposes pure, typed functions for station discovery without network calls.
 * All responses use ApiResponse with strict branded types.
 */

import {
  APP_CONSTANTS,
  ERROR_CODES,
  ID_CONSTANTS,
  SEARCH_CONSTANTS,
} from "@/lib/constants";
import MRT6_STATIONS, {
  getStationById as getStationByIdFromData,
} from "@/lib/data/stations";
import type {
  ApiResponse,
  Coordinates,
  Milliseconds,
  StationId,
} from "@/lib/types";
import { createRequestId, isCoordinates } from "@/lib/types";
import type { Station, StationSearchResult } from "@/lib/types/station";
import { BoundedTtlCache } from "@/lib/utils/cache";
import { calculateDistance } from "@/lib/utils/distance";
import { hashStringToEtag } from "@/lib/utils/hash";
import { buildStationIndexes } from "@/lib/utils/indexes";
import { normalizeQuery } from "@/lib/utils/query";
import { failure, success } from "@/lib/utils/response";
import "@/lib/utils/validation";

type StationErrorCode =
  (typeof ERROR_CODES.station)[keyof typeof ERROR_CODES.station];

const version = APP_CONSTANTS.version;

// Prebuilt indexes for efficient lookups
const STATION_INDEXES = buildStationIndexes(MRT6_STATIONS);

// Simple bounded TTL cache for station search
const stationSearchCache = new BoundedTtlCache<
  string,
  { readonly results: readonly StationSearchResult[] }
>(APP_CONSTANTS.maxCacheEntries, SEARCH_CONSTANTS.cacheDurationMs);

export function getAllStations(): ApiResponse<readonly Station[], never> {
  const start = Date.now() as Milliseconds;
  const etag = hashStringToEtag(`${version}|stations|${MRT6_STATIONS.length}`);
  return success(MRT6_STATIONS, (Date.now() - start) as Milliseconds, version, {
    etag,
    dataVersion: APP_CONSTANTS.dataVersion,
  });
}

export function getStationById(
  id: StationId
): ApiResponse<Station, "STATION_NOT_FOUND"> {
  const start = Date.now() as Milliseconds;
  const station = getStationByIdFromData(id);
  if (!station) {
    return failure(ERROR_CODES.station.stationNotFound, "Station not found");
  }
  const etag = hashStringToEtag(`${version}|station|${station.id}`);
  return success(station, (Date.now() - start) as Milliseconds, version, {
    etag,
    dataVersion: APP_CONSTANTS.dataVersion,
  });
}

export function searchStations(
  query: string,
  limit = SEARCH_CONSTANTS.maxResultsDefault
): ApiResponse<readonly StationSearchResult[], StationErrorCode> {
  const start = Date.now() as Milliseconds;
  const normalized = normalizeQuery(query);
  if (normalized.length < SEARCH_CONSTANTS.minQueryLength) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.station.invalidQuery,
        message: "Query must be at least 3 characters",
      },
    };
  }

  // Cache key considers normalized query and limit
  const cacheKey = `${normalized}:${Math.min(
    limit,
    SEARCH_CONSTANTS.maxResultsLimit
  )}`;
  const cached = stationSearchCache.get(cacheKey);
  if (cached !== undefined) {
    const etag = hashStringToEtag(`${version}|search|${cacheKey}`);
    return success(
      cached.results,
      (Date.now() - start) as Milliseconds,
      version,
      {
        etag,
        dataVersion: APP_CONSTANTS.dataVersion,
      }
    );
  }

  const results: StationSearchResult[] = [];
  const requestId = createRequestId(
    `req_${Date.now().toString(ID_CONSTANTS.base36)}`
  );

  // Fast path: exact name match
  const exact = STATION_INDEXES.byName.get(normalized);
  const usedIds = new Set<string>();
  if (exact) {
    results.push({
      station: exact,
      searchId:
        requestId as unknown as import("@/lib/types/station").StationRequestId,
      searchTimestamp: Date.now() as Milliseconds,
      searchQuery: query,
      matchType: "exact",
      relevanceScore: 1,
      isNearest: false,
      rank: 0,
      state: "active",
      confidence: 1,
    });
    usedIds.add(exact.id as unknown as string);
  }

  // Fast path: alias match
  const alias = STATION_INDEXES.byAlias.get(normalized);
  if (alias && !usedIds.has(alias.id as unknown as string)) {
    results.push({
      station: alias,
      searchId:
        requestId as unknown as import("@/lib/types/station").StationRequestId,
      searchTimestamp: Date.now() as Milliseconds,
      searchQuery: query,
      matchType: "exact",
      relevanceScore: 0.99,
      isNearest: false,
      rank: 0,
      state: "active",
      confidence: 1,
    });
    usedIds.add(alias.id as unknown as string);
  }

  // Substring search over remaining
  for (const station of MRT6_STATIONS) {
    if (usedIds.has(station.id as unknown as string)) {
      continue;
    }
    const haystack = [station.name, ...station.aliases].join(" ").toLowerCase();
    const match = haystack.includes(normalized);
    if (!match) {
      continue;
    }
    results.push({
      station,
      searchId:
        requestId as unknown as import("@/lib/types/station").StationRequestId,
      searchTimestamp: Date.now() as Milliseconds,
      searchQuery: query,
      matchType: "substring",
      relevanceScore: 1,
      isNearest: false,
      rank: 0,
      state: "active",
      confidence: 1,
    });
    if (results.length >= Math.min(limit, SEARCH_CONSTANTS.maxResultsLimit)) {
      break;
    }
  }

  // Assign ranks
  const ranked = results.map((r, i) => ({
    ...r,
    rank: (i + 1) as number,
  })) as StationSearchResult[];

  // Store cache
  stationSearchCache.set(cacheKey, { results: ranked });
  const etag = hashStringToEtag(
    `${version}|search|${cacheKey}|${ranked.length}`
  );
  return success(ranked, (Date.now() - start) as Milliseconds, version, {
    etag,
    dataVersion: APP_CONSTANTS.dataVersion,
  });
}

export function findNearestStation(
  coordinates: Coordinates,
  radiusMeters = APP_CONSTANTS.defaultSearchRadius
): ApiResponse<StationSearchResult | null, StationErrorCode> {
  const start = Date.now() as Milliseconds;
  if (!isCoordinates(coordinates)) {
    return failure(
      ERROR_CODES.station.invalidCoordinates,
      "Invalid coordinates"
    );
  }

  let best: { station: Station; distance: number } | undefined;
  for (const station of MRT6_STATIONS) {
    const dist = calculateDistance(coordinates, station.coordinates);
    const meters = dist.success
      ? (dist.distanceMeters as unknown as number)
      : 0;
    if (meters > radiusMeters) {
      continue;
    }
    if (!best || meters < best.distance) {
      best = { station, distance: meters };
    }
  }

  if (!best) {
    const etag = hashStringToEtag(`${version}|nearest|null`);
    return success(null, (Date.now() - start) as Milliseconds, version, {
      etag,
      dataVersion: APP_CONSTANTS.dataVersion,
    });
  }

  const requestId = createRequestId(
    `req_${Date.now().toString(ID_CONSTANTS.base36)}`
  );
  // Note: sessionId reserved for future analytics; omitted to satisfy noUnusedLocals
  const result: StationSearchResult = {
    station: best.station,
    searchId:
      requestId as unknown as import("@/lib/types/station").StationRequestId,
    searchTimestamp: Date.now() as Milliseconds,
    searchQuery: "",
    distance: Math.round(
      best.distance
    ) as unknown as import("@/lib/types").Meters,
    matchType: "exact",
    relevanceScore: 1,
    isNearest: true,
    rank: 1,
    state: "active",
    confidence: 1,
  };

  const etag = hashStringToEtag(`${version}|nearest|${best.station.id}`);
  return success(result, (Date.now() - start) as Milliseconds, version, {
    etag,
    dataVersion: APP_CONSTANTS.dataVersion,
  });
}
