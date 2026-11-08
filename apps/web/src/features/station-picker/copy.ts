/** All user-visible copy of the station picker and its result (English only). Fixed text: never an error message. */
export const pickerCopy = {
  label: "Or pick a station",
  placeholder: "Station name",
  hint: (count: number): string => `Works offline. All ${count} stations.`,
  clear: "Clear station search",
  listLabel: "Stations",
  listGroup: "Stations",
  stop: (position: number, total: number): string => `Stop ${position} of ${total}`,
  noMatch: "No station matches that name.",
  noMatchHint: "Check the spelling, or browse the stations.",
  browse: (count: number): string => `Browse all ${count} stations`,
  // The result of a picked station. There is no user position, so it never says distance, walk or nearest.
  resultEyebrow: "Station",
  fareLabel: "Single fare from here",
  fareTo: " to ",
  fareUnavailable: "No fare is available from this station.",
  directions: "Directions in Google Maps",
  newTab: " (opens in a new tab)",
  showOnMap: "Show on map",
} as const;
