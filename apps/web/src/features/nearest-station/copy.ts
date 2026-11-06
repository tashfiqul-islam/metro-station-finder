/** All user-visible copy of the nearest-station feature (English only for now). Fixed text: never an error message. */
export const copy = {
  heading: "Nearest Metro station",
  intro: "Find the nearest Dhaka MRT Line 6 station, the walk to it and the fare.",
  whereHeading: "Where are you?",
  searchLabel: "Search for a place in Dhaka",
  locateButton: "Use my location",
  consent:
    "Your position and the place you choose are not sent to our server. What you type in the search goes to Google to suggest places. Your position goes to Google only to work out the walking route.",
  loadingSearch: "Loading place search…",
  locating: "Finding your position…",
  denied: "Location is turned off. Search for a place instead.",
  unavailable: "Your position could not be found. Search for a place instead.",
  searchUnavailable: "Place search is unavailable. You can still use your location.",
  resultHeading: "Nearest station",
  empty: "No station could be found for that location.",
  straightLine: "Straight-line distance",
  walking: "Walking route",
  routeLoading: "Finding the walking route…",
  routeUnavailable: "The walking route is unavailable. The station and fare are still correct.",
  fareHeading: "Fare",
  destinationLabel: "Destination station",
  destinationPlaceholder: "Choose a destination",
  fareUnknown: "No fare is available for that trip.",
  fareChoose: "Choose a destination to see the fare.",
  fareLine: (from: string, to: string, currency: string, amount: number): string =>
    `${from} to ${to}: ${currency} ${amount}`,
  faresAsOf: (notice: string, checked: string): string =>
    `Fares as of: DTCA notice dated ${notice}; last checked ${checked}.`,
} as const;
