import type { Page } from "@playwright/test";

import { isRecord } from "../scripts/guards";
import { GOOGLE_HOSTS, expect } from "./fixtures";

/**
 * A fake of the Maps JavaScript API for the browser journeys (METRO-88). It is served by `page.route` at the
 * real `https://maps.googleapis.com/maps/api/js` URL, so the browser still checks that URL against the
 * enforced `script-src`. Every other Google host is aborted and recorded: a test run never reaches Google.
 * It does not reproduce Google's shadow DOM or ARIA, so the real widget needs the manual live check. It
 * copies the one name Google was measured to expose (owner probe 2026-11-08, METRO-101) and the documented
 * `description` option, so the wiring we control is asserted; the real tree is verified only by smoke:live.
 * Synthetic coordinates only; the key the app sends is the fake `fake-key-for-tests`.
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
  /** `computeRoutes` answers only after this long (a route in flight while the result is replaced). */
  readonly routeDelayMs?: number;
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

/**
 * The accessible name the real widget was measured to expose: owner probe 2026-11-08 (METRO-101), relayed and
 * not re-run by an agent. It is not a Google guarantee. The stub and the e2e tests share this one constant;
 * the unit test in `NearestStation.test.tsx` keeps its own copy (vitest does not import from `e2e/`).
 */
export const MEASURED_GOOGLE_NAME = "Search For a Place";

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
    // The fake assumes the best case for the real widget: the host forwards focus to its inner input. Whether
    // Google's host does is Unverified (the live check prints whether typing reached it).
    focus() {
      const input = this.querySelector("input");
      if (input) input.focus();
    }
    get value() {
      const input = this.querySelector("input");
      return input ? input.value : "";
    }
    set value(text) {
      const input = this.querySelector("input");
      if (input) input.value = text ?? "";
    }
    connectedCallback() {
      if (this.querySelector("input")) return;
      const input = document.createElement("input");
      input.type = "text";
      input.setAttribute("aria-label", ${JSON.stringify(MEASURED_GOOGLE_NAME)});
      if (this.options.description) {
        const hint = document.createElement("span");
        hint.id = "fake-autocomplete-description";
        hint.hidden = true;
        hint.textContent = this.options.description;
        input.setAttribute("aria-describedby", hint.id);
        this.append(hint);
      }
      const choose = () => {
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
      };
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") choose();
      });
      // A stand-in for the suggestion popup: a listbox as wide as the host, under the input, drawn with
      // CSSOM (a style attribute would break the enforced CSP). Real Google draws its own popup in its shadow
      // root, so this proves our containers do not clip or cover a popup, not what Google's looks like.
      const popup = document.createElement("ul");
      popup.setAttribute("role", "listbox");
      popup.setAttribute("aria-label", "Suggestions");
      popup.hidden = true;
      for (const label of ["First suggestion", "Second suggestion", "Third suggestion"]) {
        const option = document.createElement("li");
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        option.textContent = label;
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          choose();
        });
        popup.append(option);
      }
      popup.className = "fake-ac-popup";
      input.addEventListener("input", () => {
        popup.hidden = input.value === "";
      });
      this.classList.add("fake-ac");
      this.append(input, popup);
    }
  }
  // Styles come from a constructable stylesheet: no <style> element and no style attribute, so the app's own
  // "no inline style" assertions stay meaningful with the stub present.
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(
    ".fake-ac{position:relative;display:block;width:100%}" +
      ".fake-ac-popup{position:absolute;top:100%;left:0;right:0;z-index:5;margin:0;padding:4px;list-style:none;" +
      "background:#fff;color:#000;border:1px solid #767676;box-sizing:border-box}" +
      ".fake-ac-popup[hidden]{display:none}",
  );
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  customElements.define("fake-place-autocomplete", FakeAutocomplete);
  const libraries = {
    core: {},
    maps: {},
    places: { PlaceAutocompleteElement: FakeAutocomplete },
    routes: {
      Route: {
        computeRoutes: async (request) => {
          state.routes.push(request);
          if (state.options.routeDelayMs) {
            await new Promise((resolve) => setTimeout(resolve, state.options.routeDelayMs));
          }
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

/**
 * Pages a service worker may control (METRO-106, ADR-0024). Playwright route stubs are not applied to such a page
 * in every browser (WebKit let the real Maps script through), so the helpers that touch the place search, whose
 * first focus loads Google, refuse to run on one. A structural guard, not a convention.
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

/** The plain input before the first focus: named by the visible label (exact, case-sensitive). */
export const plainSearch = (page: Page) => {
  noGoogleHere(page);
  return page.getByRole("textbox", { name: "Search for a place", exact: true });
};

/** Google's widget input once swapped in, under the name the owner probe measured (the stub copies it). */
export const widgetSearch = (page: Page) => {
  noGoogleHere(page);
  return page.getByRole("textbox", { name: MEASURED_GOOGLE_NAME, exact: true });
};

/**
 * Types a query the way a user does: into the plain input (the first focus loads the stub, which swaps the
 * widget in and carries the text over), then Enter in the widget selects. Waits for the swap, so the
 * keypress goes to the widget and never to the plain input.
 */
export async function searchForPlace(page: Page, text: string): Promise<void> {
  const widget = widgetSearch(page);
  // The widget is already in place when the libraries were loaded earlier (a good fix needs them for its route):
  // then there is no plain input to type into.
  if (await widget.isVisible()) {
    await widget.fill(text);
  } else {
    await plainSearch(page).fill(text);
    await expect(widget).toBeVisible();
    await expect(widget).toHaveValue(text);
  }
  await widget.press("Enter");
}

export interface MapsStub {
  /** Hosts of Google requests the stub aborted (host names only, never a URL or key). */
  readonly blocked: string[];
  calls(): Promise<StubCalls>;
  /** Lets a held script answer now (it then fails or succeeds as `scriptFails` says). A no-op when not held. */
  releaseScript(): void;
}

export async function installMapsStub(page: Page, options: StubOptions = {}): Promise<MapsStub> {
  const blocked: string[] = [];
  const scriptUrls: string[] = [];
  const { promise: gate, resolve: releaseScript } = Promise.withResolvers<void>();
  const release = (): void => releaseScript();
  // A script still held when the page closes is let go, so the pending route handler ends with the test.
  page.once("close", release);
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
