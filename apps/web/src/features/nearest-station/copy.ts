/** All user-visible copy of the nearest-station feature (English only for now). Fixed text: never an error message. */
export const copy = {
  heading: "Nearest Metro station",
  intro: "Find the nearest Dhaka MRT Line 6 station, the walk to it and the fare.",
  whereHeading: "Where are you?",
  // The owner probe measured Google's input name as "Search For a Place" and no documented property sets it
  // (METRO-101). WCAG 2.5.3 needs that name to contain this visible text, so the label is exactly those words.
  // The hint is about bias only: results are also restricted to Bangladesh by includedRegionCodes ["bd"].
  searchLabel: "Search for a place",
  searchHint: "Suggestions favor places in Dhaka.",
  locateButton: "Use my location",
  consent:
    "Your position and the place you choose are not sent to our server. What you type in the search goes to Google to suggest places. Your position goes to Google only to work out the walking route.",
  // METRO-113: the handoff's locating status (nearby-locating.light.html): a title and one line under it.
  locating: "Finding your position",
  locatingSub: "This can take a few seconds indoors.",
  tryAgain: "Try again",
  denied: "Location is turned off. Search for a place instead.",
  unavailable: "Your position could not be found. Search for a place instead.",
  // METRO-103: shown instead of a station when the device located the user too roughly to name one.
  roughKnown: (size: string): string =>
    `Your device found your position only roughly, with an error of ${size}. The nearest station could be wrong, so none is shown. Search for a place instead.`,
  roughUnknown:
    "Your device could not say how precisely it found your position. The nearest station could be wrong, so none is shown. Search for a place instead.",
  // METRO-114: the handoff's fixed string, with its "ln." read as "right now". The no-connection string is the
  // handoff's own. It claims offline use, so it waited for the offline shell worker (METRO-106, ADR-0024); the
  // built-output test of METRO-112 now allows that claim in this one place, and only with the worker built.
  searchUnavailable: "Place search is unavailable right now. Pick a station instead.",
  searchNoConnection:
    "You’re offline. Stations and fares still work. Place search returns when you reconnect.",
  resultHeading: "Nearest station",
  empty: "No station could be found for that location.",
  // METRO-113: a location result. The distance is an estimate: the device position is a circle, not a point.
  distanceAbout: "about",
  distanceLabel: "straight-line distance · est.",
  walking: "Walking route",
  // METRO-114: the route is an estimate too ("about ... est."), like the straight-line distance above it.
  walkEstimate: (distance: string, minutes: string): string =>
    `about ${distance}, ${minutes} · est.`,
  routeLoading: "Finding the walking route…",
  routeUnavailable: "The walking route is unavailable. The station and fare are still correct.",
  alsoNearby: "Also nearby",
  alsoMeta: (size: string): string => `about ${size} · est.`,
  faresAsOf: (notice: string, checked: string): string =>
    `Fares as of: DTCA notice dated ${notice}; last checked ${checked}.`,
} as const;
