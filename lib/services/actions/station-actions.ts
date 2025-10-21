import { MRT6_STATIONS } from "@/lib/services/data/stations";
import type { Station } from "@/lib/types/station";

/**
 * Client-side station search function
 * Compatible with static export
 */
export function searchStations(query: string): {
  results: Station[];
  error?: string;
} {
  try {
    if (!query || query.trim().length < 2) {
      return { results: [], error: "Query must be at least 2 characters" };
    }

    const searchTerm = query.toLowerCase().trim();
    const results = MRT6_STATIONS.filter(
      (station) =>
        station.name.toLowerCase().includes(searchTerm) ||
        station.aliases.some((alias) => alias.toLowerCase().includes(searchTerm))
    );

    return { results };
  } catch (_error) {
    return {
      results: [],
      error: "Failed to search stations. Please try again.",
    };
  }
}

/**
 * Client-side fare calculation function
 * Compatible with static export
 */
export function calculateFare(
  fromStationId: string,
  toStationId: string
): { fare?: number; error?: string } {
  try {
    if (!(fromStationId && toStationId)) {
      return { error: "Please select both stations" };
    }

    const fromStation = MRT6_STATIONS.find((s) => s.id === fromStationId);
    const toStation = MRT6_STATIONS.find((s) => s.id === toStationId);

    if (!(fromStation && toStation)) {
      return { error: "Invalid station selection" };
    }

    // Simple fare calculation logic
    const baseFare = 20; // Base fare in Taka
    const distanceMultiplier = 1.5; // Per station
    const stationsBetween = Math.abs(
      MRT6_STATIONS.findIndex((s) => s.id === fromStationId) -
        MRT6_STATIONS.findIndex((s) => s.id === toStationId)
    );

    const calculatedFare = Math.round(baseFare + stationsBetween * distanceMultiplier);

    return { fare: calculatedFare };
  } catch (_error) {
    return {
      error: "Failed to calculate fare. Please try again.",
    };
  }
}
