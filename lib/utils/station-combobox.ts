/**
 * Station Combobox Utilities
 *
 * Utilities for transforming station data into kibo-ui Combobox format
 */

import type { Station } from "@/lib/types/station";

export type StationComboboxItem = {
  value: string;
  label: string;
  hint?: string;
  group?: string;
};

/**
 * Transform station data for kibo-ui Combobox
 */
export function transformStationsForCombobox(
  stations: readonly Station[]
): StationComboboxItem[] {
  return stations.map((station) => {
    const item: StationComboboxItem = {
      value: station.id,
      label: station.name,
      group: "MRT-6", // All stations are on MRT-6 line
    };

    if (station.aliases[0]) {
      item.hint = station.aliases[0];
    }

    return item;
  });
}

/**
 * Get station display name with fallback
 */
export function getStationDisplayName(station: Station): string {
  return station.name;
}

/**
 * Get station hint (first alias)
 */
export function getStationHint(station: Station): string {
  return station.aliases[0] || "";
}

/**
 * Filter stations by search query
 */
export function filterStationsByQuery(
  stations: readonly Station[],
  query: string
): readonly Station[] {
  if (!query.trim()) {
    return stations;
  }

  const normalizedQuery = query.toLowerCase().trim();

  return stations.filter((station) => {
    const searchableText = [station.name, ...station.aliases]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}
