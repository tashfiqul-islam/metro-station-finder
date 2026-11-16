/** All user-visible copy of a picked station's result (English only). Fixed text: never an error message. */
export const pickerCopy = {
  stop: (position: number, total: number): string => `Stop ${position} of ${total}`,
  // The result of a picked station. There is no user position, so it never says distance, walk or nearest.
  resultEyebrow: "Station",
  fareLabel: "Single fare from here",
  fareTo: " to ",
  directions: "Directions in Google Maps",
  newTab: " (opens in a new tab)",
  showOnMap: "Show on map",
} as const;
