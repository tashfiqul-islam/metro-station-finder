/** All user-visible copy of the one search field (English only). Fixed text: never an error message. */
export const searchCopy = {
  // The visible label is visually hidden and the placeholder says the same words, so the accessible name and the
  // visible text match (WCAG 2.5.3; handoff revision 10, Product decisions).
  label: "Search a place or station",
  placeholder: "Search a place or station",
  clear: "Clear search",
  locate: "Use my location",
  listLabel: "Suggestions",
  stationsGroup: "Stations",
  placesGroup: "Places",
  // Google's attribution row under the Places group (ADR-0009 amendment 6). A name, so never translated.
  attribution: "Google Maps",
  stop: (position: number, total: number): string => `Stop ${position} of ${total}`,
  noMatch: "No station matches that name.",
  noMatchHint: "Check the spelling, or browse the stations.",
  browse: (count: number): string => `Browse all ${count} stations`,
  // The one polite status after typing: how many stations and places the text matches.
  count: (stations: number, places: number): string => {
    const stationText = stations === 1 ? "1 station" : `${stations} stations`;
    if (places === 0) return stationText;
    return `${stationText}, ${places === 1 ? "1 place" : `${places} places`}`;
  },
} as const;
