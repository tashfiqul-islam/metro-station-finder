/** All user-visible copy of the station picker and its result (English only). Fixed text: never an error message. */
export const pickerCopy = {
  label: "Or pick a station",
  placeholder: "Station name",
  hint: (count: number): string => `Search all ${count} stations by name.`,
  clear: "Clear station search",
  listLabel: "Stations",
  stop: (position: number, total: number): string => `Stop ${position} of ${total}`,
  noMatch: "No station matches that name.",
  // The one polite status after typing: how many stations the text matches.
  count: (matches: number): string => (matches === 1 ? "1 station" : `${matches} stations`),
  noMatchHint: "Check the spelling, or browse the stations.",
  browse: (count: number): string => `Browse all ${count} stations`,
  // The result of a picked station. There is no user position, so it never says distance, walk or nearest.
  resultEyebrow: "Station",
  fareLabel: "Single fare from here",
  fareTo: " to ",
  directions: "Directions in Google Maps",
  newTab: " (opens in a new tab)",
  showOnMap: "Show on map",
} as const;
