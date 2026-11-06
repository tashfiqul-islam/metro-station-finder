import type { Page } from "@playwright/test";

import { isRecord } from "../scripts/guards";
import { GOOGLE_HOSTS, expect } from "./fixtures";

/**
 * A fake of the Maps JavaScript API for the browser journeys (METRO-88). It is served by `page.route` at the
 * real `https://maps.googleapis.com/maps/api/js` URL, so the browser still checks that URL against the
 * enforced `script-src`. Every other Google host is aborted and recorded: a test run never reaches Google.
 * It does not reproduce Google's shadow DOM or ARIA, so the real widget needs the manual live check.
 * Synthetic coordinates only; the key the app sends is the fake `fake-key-for-tests`.
 */

export interface StubOptions {
  /** Abort the Maps script itself (a blocked or failed load). */
  readonly scriptFails?: boolean;
  /** `fetchFields` rejects with an error whose message carries a coordinate. */
  readonly fetchFails?: boolean;
  /** `computeRoutes` rejects with an error whose message carries a key. */
  readonly routeFails?: boolean;
}

export interface StubCalls {
  readonly fetchFields: unknown[];
  readonly routes: unknown[];
  readonly scriptUrls: string[];
}

/** Typing "motijheel" or "uttara" and pressing Enter selects a point near that station. */
const STUB_SCRIPT = `
(() => {
  const state = window.__metroStub;
  const spots = { motijheel: { lat: 23.728, lng: 90.419 }, uttara: { lat: 23.87, lng: 90.367 } };
  class FakeAutocomplete extends HTMLElement {
    constructor(options) {
      super();
      this.options = options;
    }
    connectedCallback() {
      if (this.querySelector("input")) return;
      const input = document.createElement("input");
      input.type = "text";
      input.setAttribute("aria-label", "Search for a place in Dhaka");
      input.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        const text = input.value.toLowerCase();
        const spot = Object.keys(spots).find((name) => text.includes(name));
        const location = spot ? spots[spot] : spots.motijheel;
        const place = {
          location: { lat: () => location.lat, lng: () => location.lng },
          fetchFields: async (request) => {
            state.fetchFields.push(request.fields);
            if (state.options.fetchFails) throw new Error("secret lat=" + location.lat);
          },
        };
        const selection = new Event("gmp-select");
        selection.placePrediction = { toPlace: () => place };
        this.dispatchEvent(selection);
      });
      this.append(input);
    }
  }
  customElements.define("fake-place-autocomplete", FakeAutocomplete);
  const libraries = {
    core: {},
    maps: {},
    places: { PlaceAutocompleteElement: FakeAutocomplete },
    routes: {
      Route: {
        computeRoutes: async (request) => {
          state.routes.push(request);
          if (state.options.routeFails) throw new Error("secret key=abc");
          return { routes: [{ distanceMeters: 1234, durationMillis: 900000 }] };
        },
      },
    },
  };
  google.maps.version = "3.66.stub";
  google.maps.importLibrary = (name) => Promise.resolve(libraries[name]);
  google.maps.__ib__();
})();
`;

const keep = (item: unknown): unknown => item;

export interface MapsStub {
  /** Hosts of Google requests the stub aborted (host names only, never a URL or key). */
  readonly blocked: string[];
  calls(): Promise<StubCalls>;
}

export async function installMapsStub(page: Page, options: StubOptions = {}): Promise<MapsStub> {
  const blocked: string[] = [];
  const scriptUrls: string[] = [];
  await page.addInitScript((given) => {
    Reflect.set(window, "__metroStub", { options: given, fetchFields: [], routes: [] });
  }, options);
  // Later routes win in Playwright, so the catch-all is registered first.
  await page.route(GOOGLE_HOSTS, async (route) => {
    blocked.push(new URL(route.request().url()).host);
    await route.abort();
  });
  await page.route("https://maps.googleapis.com/maps/api/js*", async (route) => {
    scriptUrls.push(route.request().url());
    if (options.scriptFails === true) {
      await route.abort();
      return;
    }
    await route.fulfill({ contentType: "text/javascript", body: STUB_SCRIPT });
  });
  return {
    blocked,
    calls: async () => {
      const raw = await page.evaluate(() => JSON.stringify(Reflect.get(window, "__metroStub")));
      const recorded: unknown = JSON.parse(raw);
      if (!isRecord(recorded)) throw new Error("the Maps stub recorded nothing");
      const { fetchFields, routes } = recorded;
      if (!Array.isArray(fetchFields) || !Array.isArray(routes))
        throw new Error("the Maps stub recorded no call lists");
      return { fetchFields: fetchFields.map(keep), routes: routes.map(keep), scriptUrls };
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
 * Asserts no recorded /api request carries a position. Not vacuous: it first makes one real request to
 * /api, which the listener must record, and then checks that request and any earlier one.
 */
export async function expectNoCoordinateInApi(
  page: Page,
  requests: readonly { url: string; headers: string; body: string }[],
): Promise<void> {
  const before = requests.length;
  await page.evaluate(() => fetch("/api/scaffold/status").then((response) => response.status));
  expect(requests.length, "the /api listener records requests").toBe(before + 1);
  const everything = requests.map((r) => `${r.url} ${r.headers} ${r.body}`).join("\n");
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
/** Replaces the browser geolocation with a deterministic answer (permission denied, or a fixed fix). */
export async function stubGeolocation(
  page: Page,
  answer: "denied" | { readonly lat: number; readonly lng: number },
): Promise<void> {
  await page.addInitScript((given) => {
    const geolocation = {
      getCurrentPosition: (
        success: (position: unknown) => void,
        failure: (error: unknown) => void,
      ) => {
        if (given === "denied") {
          failure({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
        } else {
          success({ coords: { latitude: given.lat, longitude: given.lng } });
        }
      },
    };
    Object.defineProperty(navigator, "geolocation", { value: geolocation, configurable: true });
  }, answer);
}
