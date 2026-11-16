import type { Page } from "@playwright/test";

import { isRecord } from "../scripts/guards";
import { GOOGLE_HOSTS, expect } from "./fixtures";

/**
 * A fake of the Maps JavaScript API for the browser journeys (METRO-88). It is served by `page.route` at the
 * real `https://maps.googleapis.com/maps/api/js` URL, so the browser still checks that URL against the
 * enforced `script-src`. Every other Google host is aborted and recorded: a test run never reaches Google.
 * Since METRO-163 the app draws its own search field, so the stub serves `AutocompleteSuggestion` and
 * `AutocompleteSessionToken` and records every request (input, region, restriction box, token) and every
 * `fetchFields`; what Google itself answers is verified only by the owner-run `smoke:live`. Synthetic
 * coordinates only; the key the app sends is the fake `fake-key-for-tests`.
 */

export interface StubOptions {
  /** Abort the Maps script itself (a blocked or failed load). */
  readonly scriptFails?: boolean;
  /**
   * Hold the Maps script until the test calls `releaseScript` (METRO-114, METRO-129). The test, not a timer,
   * decides when the load completes, so a slow runner cannot make it miss a state it asserts. A held script
   * is also let go when the page closes, so no route outlives its test.
   */
  readonly holdScript?: boolean;
  /**
   * `computeRoutes` stays in flight until the test calls `releaseRoute` (METRO-131; a route in flight while the
   * result is replaced). The test, not a timer, decides when the answer arrives. The gate lives in the page, so
   * it ends with the page.
   */
  readonly holdRoute?: boolean;
  /** `fetchFields` rejects with an error whose message carries a coordinate. */
  readonly fetchFails?: boolean;
  /** `fetchAutocompleteSuggestions` rejects with an error whose message carries a key. */
  readonly suggestFails?: boolean;
  /** `fetchAutocompleteSuggestions` answers with no suggestion at all. */
  readonly emptySuggestions?: boolean;
  /** `computeRoutes` rejects with an error whose message carries a key. */
  readonly routeFails?: boolean;
}

/** One `fetchAutocompleteSuggestions` request as the stub saw it. */
export interface AutocompleteCall {
  readonly input: string;
  readonly includedRegionCodes: readonly string[];
  readonly locationRestriction: Readonly<Record<string, number>>;
  /** The session token's serial number: tokens are numbered in the order the page made them. */
  readonly token: number;
}

export interface StubCalls {
  readonly autocomplete: AutocompleteCall[];
  readonly fetchFields: unknown[];
  readonly routes: unknown[];
  readonly scriptUrls: string[];
  /** Names of the libraries whose `importLibrary` promise has resolved in the page, in order. */
  readonly librariesImported: string[];
  /** How many `computeRoutes` calls have reached their answer (or their failure). */
  readonly routesAnswered: number;
}

/** Where the two synthetic places are: near Motijheel and near Uttara North (the end stations of the line). */
const SPOTS = {
  motijheel: { lat: 23.728, lng: 90.419 },
  uttara: { lat: 23.87, lng: 90.367 },
} as const;
export type Spot = keyof typeof SPOTS;

/** The text that makes the stub list a place at that spot. Neither is a station name, so Places is asked. */
export const placeQuery = (spot: Spot): string =>
  `${spot === "uttara" ? "Uttara" : "Motijheel"} Area`;

/**
 * The stub's `places` library (METRO-163). A query that contains a spot's name lists one place there, named
 * "<Spot> Area", then "Second suggestion" (near Uttara) and "Third suggestion" (near Motijheel); any other query
 * lists the last two only. Token serial numbers let a test see which requests shared a session.
 */
const STUB_SCRIPT = `
(() => {
  const state = window.__metroStub;
  const spots = ${JSON.stringify(SPOTS)};
  let tokens = 0;
  class FakeToken {
    constructor() {
      tokens += 1;
      this.serial = tokens;
    }
  }
  const text = (value) => ({ text: value, matches: [] });
  const prediction = (id, name, detail, location) => ({
    placePrediction: {
      placeId: id,
      text: text(name + ", " + detail),
      mainText: text(name),
      secondaryText: text(detail),
      // Like Google's Place: no location until fetchFields has resolved, so reading it early throws.
      toPlace: () => {
        let fetched = false;
        return {
          get location() {
            if (!fetched) throw new Error("location read before fetchFields resolved");
            return { lat: () => location.lat, lng: () => location.lng };
          },
          fetchFields: async (request) => {
            state.fetchFields.push(request.fields);
            if (state.options.fetchFails) throw new Error("secret lat=" + location.lat);
            fetched = true;
          },
        };
      },
    },
  });
  const libraries = {
    core: {},
    maps: {},
    places: {
      AutocompleteSessionToken: FakeToken,
      AutocompleteSuggestion: {
        fetchAutocompleteSuggestions: async (request) => {
          state.autocomplete.push({
            input: request.input,
            includedRegionCodes: request.includedRegionCodes,
            locationRestriction: request.locationRestriction,
            token: request.sessionToken.serial,
          });
          if (state.options.suggestFails) throw new Error("secret key=abc");
          if (state.options.emptySuggestions) return { suggestions: [] };
          const lower = request.input.toLowerCase();
          const spot = Object.keys(spots).find((name) => lower.includes(name));
          const list = [];
          if (spot) {
            const title = spot.charAt(0).toUpperCase() + spot.slice(1);
            list.push(prediction("stub-" + spot, title + " Area", "Dhaka", spots[spot]));
          }
          list.push(prediction("stub-second", "Second suggestion", "Dhaka", spots.uttara));
          list.push(prediction("stub-third", "Third suggestion", "Dhaka", spots.motijheel));
          return { suggestions: list };
        },
      },
    },
    routes: {
      Route: {
        computeRoutes: async (request) => {
          state.routes.push(request);
          if (state.options.holdRoute) await state.routeGate;
          state.routesAnswered += 1;
          if (state.options.routeFails) throw new Error("secret key=abc");
          return { routes: [{ distanceMeters: 1234, durationMillis: 900000 }] };
        },
      },
    },
  };
  google.maps.version = "3.66.stub";
  // The name is recorded when the promise resolves, before the caller's continuation runs: a test that sees it
  // knows the libraries are in the app's hands, not merely that the script ran.
  google.maps.importLibrary = (name) =>
    Promise.resolve(libraries[name]).then((library) => {
      state.librariesImported.push(name);
      return library;
    });
  google.maps.__ib__();
})();
`;

const keep = (item: unknown): unknown => item;

function toCall(item: unknown): AutocompleteCall {
  if (!isRecord(item)) throw new Error("the Maps stub recorded a malformed request");
  const { input, includedRegionCodes, locationRestriction, token } = item;
  if (
    typeof input !== "string" ||
    !Array.isArray(includedRegionCodes) ||
    !isRecord(locationRestriction) ||
    typeof token !== "number"
  ) {
    throw new Error("the Maps stub recorded a malformed request");
  }
  return {
    input,
    includedRegionCodes: includedRegionCodes.map(String),
    locationRestriction: Object.fromEntries(
      Object.entries(locationRestriction).map(([name, value]) => [name, Number(value)]),
    ),
    token,
  };
}

/**
 * Pages a service worker may control (METRO-106, ADR-0024). Playwright route stubs are not applied to such a page
 * in every browser (WebKit let the real Maps script through), so the helpers that touch the place search, whose
 * first query loads Google, refuse to run on one. A structural guard, not a convention.
 */
const withWorker = new WeakSet<Page>();
export function workerMayControl(page: Page): void {
  withWorker.add(page);
}
function noGoogleHere(page: Page): void {
  if (withWorker.has(page)) {
    throw new Error("The place search must not be touched on a page a service worker may control");
  }
}

/** The one search field of Nearby: stations and places (METRO-163). Guarded like every place-search helper. */
export const placeSearch = (page: Page) => {
  noGoogleHere(page);
  return page.getByRole("combobox", { name: "Search a place or station", exact: true });
};

/** The Places group's options of the open list: place suggestions, never stations. */
export const placeOptions = (page: Page) =>
  page.getByRole("group", { name: "Places", exact: true }).getByRole("option");

/**
 * Types a place query the way a user does and chooses the first suggestion with the keyboard: the field is
 * typed into (the first query that Places is asked for loads the stub), the Places group is waited for, then
 * ArrowDown to the first place and Enter. Waits on the list, never on time.
 */
export async function searchForPlace(page: Page, spot: Spot): Promise<void> {
  const field = placeSearch(page);
  await field.fill(placeQuery(spot));
  const first = placeOptions(page).first();
  await expect(first).toBeVisible();
  // No station matches these texts, so the first option is a place; ArrowDown makes it active.
  await field.press("ArrowDown");
  await expect(first).toHaveAttribute("aria-selected", "true");
  await field.press("Enter");
}

export interface MapsStub {
  /** Hosts of Google requests the stub aborted (host names only, never a URL or key). */
  readonly blocked: string[];
  calls(): Promise<StubCalls>;
  /** Lets a held script answer now (it then fails or succeeds as `scriptFails` says). A no-op when not held. */
  releaseScript(): void;
  /** Lets a held `computeRoutes` answer now. A no-op when not held. */
  releaseRoute(): Promise<void>;
}

export async function installMapsStub(page: Page, options: StubOptions = {}): Promise<MapsStub> {
  const blocked: string[] = [];
  const scriptUrls: string[] = [];
  const { promise: gate, resolve: releaseScript } = Promise.withResolvers<void>();
  const release = (): void => releaseScript();
  // A script still held when the page closes is let go, so the pending route handler ends with the test.
  page.once("close", release);
  await page.addInitScript((given) => {
    const { promise: routeGate, resolve: letGo } = Promise.withResolvers<void>();
    Reflect.set(window, "__metroStub", {
      options: given,
      autocomplete: [],
      fetchFields: [],
      routes: [],
      routesAnswered: 0,
      librariesImported: [],
      routeGate,
    });
    Reflect.set(window, "__metroReleaseRoute", letGo);
  }, options);
  // Later routes win in Playwright, so the catch-all is registered first.
  await page.route(GOOGLE_HOSTS, async (route) => {
    blocked.push(new URL(route.request().url()).host);
    await route.abort();
  });
  await page.route("https://maps.googleapis.com/maps/api/js*", async (route) => {
    scriptUrls.push(route.request().url());
    if (options.holdScript === true) {
      await gate;
      if (page.isClosed()) return;
    }
    if (options.scriptFails === true) {
      await route.abort();
      return;
    }
    await route.fulfill({ contentType: "text/javascript", body: STUB_SCRIPT });
  });
  return {
    blocked,
    releaseScript: release,
    releaseRoute: async () => {
      await page.evaluate(() => {
        const letGo: unknown = Reflect.get(window, "__metroReleaseRoute");
        if (typeof letGo === "function") Reflect.apply(letGo, undefined, []);
      });
    },
    calls: async () => {
      const raw = await page.evaluate(() => JSON.stringify(Reflect.get(window, "__metroStub")));
      const recorded: unknown = JSON.parse(raw);
      if (!isRecord(recorded)) throw new Error("the Maps stub recorded nothing");
      const { autocomplete, fetchFields, routes, librariesImported, routesAnswered } = recorded;
      if (
        !Array.isArray(autocomplete) ||
        !Array.isArray(fetchFields) ||
        !Array.isArray(routes) ||
        !Array.isArray(librariesImported)
      )
        throw new Error("the Maps stub recorded no call lists");
      if (typeof routesAnswered !== "number") throw new Error("the Maps stub recorded no progress");
      return {
        autocomplete: autocomplete.map(toCall),
        fetchFields: fetchFields.map(keep),
        routes: routes.map(keep),
        scriptUrls,
        librariesImported: librariesImported.map(String),
        routesAnswered,
      };
    },
  };
}

/** The /api requests a page makes, to prove none of them carries a position. */
export function trackApiRequests(page: Page): { url: string; headers: string; body: string }[] {
  const requests: { url: string; headers: string; body: string }[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      requests.push({
        url: request.url(),
        headers: JSON.stringify(request.headers()),
        body: request.postData() ?? "",
      });
    }
  });
  return requests;
}

/**
 * A web-vitals report holds one legitimate number, `value` (for example an LCP of 1023.8712), which could
 * contain a coordinate fragment by chance. Only that number is masked, and only in /api/vitals bodies; the
 * URL, the headers and every other byte of every request are still scanned (the vitals e2e checks the keys).
 */
const maskVitalValue = (r: { url: string; body: string }) =>
  new URL(r.url).pathname === "/api/vitals"
    ? r.body.replace(/("value":)-?[\d.eE+-]+/u, "$1MASKED")
    : r.body;

/**
 * Asserts no recorded /api request carries a position. Not vacuous: it first makes one real request to
 * /api, which the listener must record, and then checks that request and any earlier one.
 */
export async function expectNoCoordinateInApi(
  page: Page,
  requests: readonly { url: string; headers: string; body: string }[],
): Promise<void> {
  // The page also sends its own web-vitals reports to /api/vitals at any moment (METRO-44); they stay in
  // `requests`, so the coordinate check below covers them, but only the probe is counted here.
  const probes = () =>
    requests.filter((request) => new URL(request.url).pathname === "/api/probe").length;
  const before = probes();
  // /api/probe is not a real route, so answer this probe in the browser: the request event still fires.
  await page.route("**/api/probe", (route) => route.fulfill({ status: 200, body: "{}" }));
  await page.evaluate(() => fetch("/api/probe").then((response) => response.status));
  expect(probes(), "the /api listener records requests").toBe(before + 1);
  const everything = requests.map((r) => `${r.url} ${r.headers} ${maskVitalValue(r)}`).join("\n");
  for (const fragment of [
    "23.87",
    "90.367",
    "23.728",
    "90.419",
    "lat=",
    "lng=",
    "latitude",
    '"lat"',
    '"lng"',
  ]) {
    expect(everything).not.toContain(fragment);
  }
}
/**
 * Replaces the browser geolocation with a deterministic answer: permission denied, a position that is
 * unavailable (also what a timeout reads as), a request that never answers (the locating state), or a fixed fix.
 * `accuracy: -1` is a fix with no usable accuracy value (JSON cannot carry NaN into the page). Synthetic coordinates only.
 */
export async function stubGeolocation(
  page: Page,
  answer:
    | "denied"
    | "unavailable"
    | "pending"
    | { readonly lat: number; readonly lng: number; readonly accuracy?: number },
): Promise<void> {
  await page.addInitScript((given) => {
    const geolocation = {
      getCurrentPosition: (
        success: (position: unknown) => void,
        failure: (error: unknown) => void,
      ) => {
        if (given === "pending") {
          // Never answers by itself; a test can answer later with `window.__answerLater()` (a precise fix).
          Reflect.set(window, "__answerLater", () =>
            success({ coords: { latitude: 23.87, longitude: 90.367, accuracy: 20 } }),
          );
          return;
        }
        if (given === "denied" || given === "unavailable") {
          failure({
            code: given === "denied" ? 1 : 2,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        } else {
          // Default 20 m: a precise fix. Pass accuracy: 25_000 for the coarse desktop case (METRO-103).
          success({
            coords: { latitude: given.lat, longitude: given.lng, accuracy: given.accuracy ?? 20 },
          });
        }
      },
    };
    Object.defineProperty(navigator, "geolocation", { value: geolocation, configurable: true });
  }, answer);
}
