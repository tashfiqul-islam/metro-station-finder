import type { Locator, Page, Request } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import {
  expectNoCoordinateInApi,
  installMapsStub,
  placeOptions,
  placeQuery,
  placeSearch,
  searchForPlace,
  stubGeolocation,
  trackApiRequests,
} from "./maps-stub";
import type { MapsStub, StubOptions } from "./maps-stub";

/**
 * METRO-163: the one search field over stations (local, offline) and places (Google, through our own combobox
 * and `AutocompleteSuggestion`). Only fakes are involved: `installMapsStub` answers the script and aborts every
 * other Google host, so no test reaches Google. Debounce and volume assertions run on Playwright's paused clock,
 * so "nothing was asked" is read after the time the request would have taken has passed, never after a sleep.
 */
const NOTICE = "Place search is unavailable right now. Station names still work.";
const NO_CONNECTION =
  "You’re offline. Stations and fares still work. Place search returns when you reconnect.";
const ROUTE_TEXT = "about 1.2 km, 15 min · est.";
const GOOD_FIX = { lat: 23.87, lng: 90.367, accuracy: 20 } as const;
const DEBOUNCE_MS = 180;
const START = new Date("2026-01-01T00:00:00Z");
const PAUSED_AT = new Date("2026-01-01T00:01:00Z");

async function open(page: Page, options: StubOptions = {}, theme?: "light" | "dark") {
  if (theme !== undefined) {
    await page.addInitScript((value) => localStorage.setItem("msf-theme", value), theme);
  }
  const stub = await installMapsStub(page, options);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeVisible();
  await expect(placeSearch(page)).toBeVisible();
  return stub;
}

/** The same, on a clock that only moves when the test says so (set up before the page loads). */
async function openOnPausedClock(page: Page, options: StubOptions = {}) {
  await page.clock.install({ time: START });
  const stub = await open(page, options);
  await page.clock.pauseAt(PAUSED_AT);
  return stub;
}

const heading = (page: Page, name: string): Locator =>
  page.getByRole("heading", { level: 2, name });
const listbox = (page: Page): Locator => page.getByRole("listbox", { name: "Suggestions" });
const stationOptions = (page: Page): Locator =>
  page.getByRole("group", { name: "Stations", exact: true }).getByRole("option");
const locateButton = (page: Page): Locator => page.locator("button.locate");
const inFieldLocate = (page: Page): Locator => page.locator("button.search__locate");
const snap = (page: Page): Promise<string | null> => page.locator(".app").getAttribute("data-snap");
const calls = async (stub: MapsStub) => (await stub.calls()).autocomplete;

async function settle(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => null)),
    ),
  );
}

/**
 * Two animation frames: every render and effect the last change caused has run by then (React commits and runs
 * its effects before the next frame; the stub records a request the moment it is made). It is a flush of the
 * page's own work, not a wait for time, and it is what makes a "nothing more happened" assertion read after
 * the thing that could have happened had its chance (METRO-131). Not on the paused clock: frames stop there.
 */
const afterRender = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

/** Pretends the browser reports no connection, until `reconnect` runs. */
async function noConnection(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Reflect.set(window, "__connected", false);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => Reflect.get(window, "__connected") !== false,
    });
  });
}

/**
 * Loads the stub's libraries with one real query and asks for its places once, on the paused clock: the load
 * runs in real time, so the pause is let pass only when the libraries are in the app's hands. Leaves exactly one
 * request recorded, which is what the volume tests then compare against.
 */
async function warmUp(page: Page, stub: MapsStub): Promise<void> {
  await placeSearch(page).fill(placeQuery("uttara"));
  await expect
    .poll(async () => (await stub.calls()).librariesImported.toSorted())
    .toEqual(["places", "routes"]);
  await page.clock.runFor(DEBOUNCE_MS);
  await expect.poll(async () => (await calls(stub)).length).toBe(1);
  await expect(placeOptions(page).first()).toBeVisible();
}

test.describe("volume rules (METRO-163)", () => {
  test.afterEach(async ({ page }) => {
    // The clock is paused in some of these tests: let it run, so the end-of-test checks can use timers.
    await page.clock.resume();
    await settle(page);
  });

  test("METRO-163 AC1 under three characters and for a whole station name, Google is asked nothing", async ({
    page,
  }) => {
    const stub = await openOnPausedClock(page);
    const field = placeSearch(page);
    // Warm-up: one real query loads the library and proves requests are recorded, so what follows can only
    // add requests if the rules let one through.
    await warmUp(page, stub);
    for (const text of [
      "m",
      "mo",
      "  mo  ",
      "Motijheel",
      "karwan bazar",
      "mirpur-11",
      "Farmagate",
    ]) {
      await field.fill(text);
      await expect(stationOptions(page).first()).toBeVisible();
      await page.clock.runFor(DEBOUNCE_MS * 5);
    }
    expect((await calls(stub)).map((call) => call.input)).toEqual([placeQuery("uttara")]);
    // The control: a text the rules allow is asked, after the pause.
    await field.fill("Gulshan");
    await page.clock.runFor(DEBOUNCE_MS - 1);
    expect(await calls(stub)).toHaveLength(1);
    await page.clock.runFor(1);
    await expect.poll(async () => (await calls(stub)).length).toBe(2);
    expect((await calls(stub))[1]?.input).toBe("Gulshan");
  });

  test("METRO-163 AC1 nothing from Google loads until a text asks for places", async ({ page }) => {
    const hosts: string[] = [];
    page.on("request", (request: Request) => hosts.push(new URL(request.url()).host));
    const stub = await open(page);
    await expect
      .poll(() => hosts.length, { message: "the page loaded its assets" })
      .toBeGreaterThan(5);
    const field = placeSearch(page);
    await field.focus();
    await field.fill("mo");
    await expect(stationOptions(page).first()).toBeVisible();
    await field.fill("Karwan Bazar");
    await expect(stationOptions(page)).toHaveCount(1);
    await afterRender(page);
    expect(hosts.filter((host) => host !== new URL(page.url()).host)).toEqual([]);
    expect((await stub.calls()).scriptUrls).toEqual([]);
    // Control: a text that asks for places is what loads the script, once.
    await field.fill(placeQuery("uttara"));
    await expect(placeOptions(page).first()).toBeVisible();
    expect((await stub.calls()).scriptUrls).toHaveLength(1);
  });

  test("METRO-163 AC2 one request after 180 ms of no typing, with the final text", async ({
    page,
  }) => {
    const stub = await openOnPausedClock(page);
    const field = placeSearch(page);
    await warmUp(page, stub);
    await field.fill("");
    await field.pressSequentially("Dhaka Ar");
    await page.clock.runFor(DEBOUNCE_MS - 1);
    expect(await calls(stub)).toHaveLength(1);
    await page.clock.runFor(1);
    await expect.poll(async () => (await calls(stub)).length).toBe(2);
    expect((await calls(stub))[1]?.input).toBe("Dhaka Ar");
    await page.clock.runFor(DEBOUNCE_MS * 10);
    expect(await calls(stub)).toHaveLength(2);
  });

  test("METRO-163 AC2 each request carries the region, the box around the line and the session token", async ({
    page,
  }) => {
    const stub = await open(page);
    await placeSearch(page).fill(placeQuery("uttara"));
    await expect.poll(async () => (await calls(stub)).length).toBe(1);
    const [first] = await calls(stub);
    expect(first?.includedRegionCodes).toEqual(["bd"]);
    const box = first?.locationRestriction ?? {};
    expect(Object.keys(box).toSorted()).toEqual(["east", "north", "south", "west"]);
    const [north = 0, south = 0, east = 0, west = 0] = [
      box["north"],
      box["south"],
      box["east"],
      box["west"],
    ];
    // The line runs from Uttara North (23.869, 90.367) to Motijheel (23.728, 90.419): both are inside.
    expect(north).toBeGreaterThan(23.87);
    expect(south).toBeLessThan(23.72);
    expect(east).toBeGreaterThan(90.419);
    expect(west).toBeLessThan(90.36);
    // A restriction around the line, not the country: well under a degree of margin.
    expect(north - 23.87).toBeLessThan(0.2);
    expect(east - west).toBeLessThan(0.5);
  });

  test("METRO-163 AC2 one session: the same token while typing, one fetchFields on a choice, a new token after it", async ({
    page,
  }) => {
    const stub = await open(page);
    const field = placeSearch(page);
    await field.fill(placeQuery("uttara"));
    await expect.poll(async () => (await calls(stub)).length).toBe(1);
    await field.fill(`${placeQuery("uttara")} 7`);
    await expect.poll(async () => (await calls(stub)).length).toBe(2);
    const [a, b] = await calls(stub);
    expect(b?.token).toBe(a?.token);
    await expect(placeOptions(page).first()).toBeVisible();
    await field.press("ArrowDown");
    await field.press("Enter");
    await expect(heading(page, "Uttara North")).toBeFocused();
    expect((await stub.calls()).fetchFields).toEqual([["location"]]);
    await field.fill(placeQuery("motijheel"));
    await expect.poll(async () => (await calls(stub)).length).toBe(3);
    const third = (await calls(stub))[2];
    expect(third?.token).not.toBe(a?.token);
    // Still exactly one fetchFields: asking again for suggestions does not fetch a place.
    expect((await stub.calls()).fetchFields).toHaveLength(1);
  });

  test("METRO-163 AC2 an abandoned search starts a new session", async ({ page }) => {
    const stub = await open(page);
    const field = placeSearch(page);
    await field.fill(placeQuery("uttara"));
    await expect.poll(async () => (await calls(stub)).length).toBe(1);
    await expect(placeOptions(page).first()).toBeVisible();
    // Escape closes the list, a second Escape clears the text: the search is over.
    await field.press("Escape");
    await field.press("Escape");
    await expect(field).toHaveValue("");
    await field.fill(placeQuery("motijheel"));
    await expect.poll(async () => (await calls(stub)).length).toBe(2);
    const [a, b] = await calls(stub);
    expect(b?.token).not.toBe(a?.token);
    expect((await stub.calls()).fetchFields).toEqual([]);
  });
});

test.describe("the list and the keys (METRO-163)", () => {
  test.afterEach(async ({ page }) => {
    await settle(page);
  });

  test("METRO-163 AC3 Stations first (the match marked), then Places, ending with the Google Maps row", async ({
    page,
  }) => {
    await open(page);
    const field = placeSearch(page);
    await field.fill("mir");
    await expect(placeOptions(page)).toHaveCount(2);
    await expect(stationOptions(page)).toHaveCount(2);
    await expect(field).toHaveAttribute("aria-expanded", "true");
    const stations = stationOptions(page);
    await expect(stations.first().locator(".option__match")).toHaveText("Mir");
    await expect(stations.first()).toContainText("Mirpur 11");
    await expect(stations.first()).toContainText("Stop 5 of 16");
    // The order in the page: the Stations group, then the Places group, then its attribution.
    const order = await listbox(page).evaluate((list) =>
      [...list.querySelectorAll("fieldset, .search__attr")].map((node) =>
        node.tagName === "FIELDSET" ? "group" : node.className,
      ),
    );
    expect(order).toEqual(["group", "group", "search__attr"]);
    const labels = await page
      .getByRole("group")
      .evaluateAll((groups) => groups.map((group) => group.textContent.slice(0, 8)));
    expect(labels[0]).toContain("Stations");
    expect(labels[1]).toContain("Places");
    const attribution = listbox(page).getByText("Google Maps", { exact: true });
    await expect(attribution).toHaveAttribute("translate", "no");
    const facts = await attribution.evaluate((node) => ({
      role: node.getAttribute("role"),
      focusable: node.tabIndex >= 0,
      inOption: node.closest("[role=option]") !== null,
      last: node.parentElement?.lastElementChild === node,
    }));
    expect(facts).toEqual({ role: null, focusable: false, inOption: false, last: true });
    await expect(page.getByRole("option")).toHaveCount(4);
  });

  test("METRO-163 AC3 at most five stations", async ({ page }) => {
    await open(page);
    await placeSearch(page).fill("a");
    await expect(stationOptions(page)).toHaveCount(5);
    await expect(page.getByRole("group", { name: "Places", exact: true })).toHaveCount(0);
  });

  test("METRO-163 AC3 with no match and no places, the empty state offers every station", async ({
    page,
  }) => {
    await open(page, { emptySuggestions: true });
    const field = placeSearch(page);
    await field.fill("Sadarghat");
    const empty = page.locator(".empty");
    await expect(empty).toContainText("No station matches that name.");
    await expect(field).toHaveAttribute("aria-expanded", "false");
    // Still there after the field loses focus, so its button can be reached with Tab.
    await page.getByRole("heading", { level: 1 }).click();
    const browse = page.getByRole("button", { name: "Browse all 16 stations" });
    await expect(browse).toBeVisible();
    await browse.click();
    await expect(stationOptions(page)).toHaveCount(16);
    await expect(field).toBeFocused();
    await expect(page.getByText("Google Maps")).toHaveCount(0);
  });

  test("METRO-163 AC5 the arrows move across both groups and skip the attribution row", async ({
    page,
  }) => {
    await open(page);
    const field = placeSearch(page);
    await field.fill("mir");
    await expect(placeOptions(page)).toHaveCount(2);
    const options = page.getByRole("option");
    await expect(options.nth(0)).toHaveAttribute("aria-selected", "true");
    const activeIndex = async (): Promise<number> => {
      const id = (await field.getAttribute("aria-activedescendant")) ?? "";
      const ids = await options.evaluateAll((nodes) => nodes.map((node) => node.id));
      return ids.indexOf(id);
    };
    const seen: number[] = [0];
    for (let step = 0; step < 4; step += 1) {
      await field.press("ArrowDown");
      await expect.poll(activeIndex).toBe((step + 1) % 4);
      seen.push((step + 1) % 4);
    }
    expect(seen).toEqual([0, 1, 2, 3, 0]);
    await field.press("ArrowUp");
    await expect.poll(activeIndex).toBe(3);
  });

  test("METRO-163 AC5 Enter on a station shows its result and settles the sheet at half", async ({
    page,
  }) => {
    const stub = await open(page);
    const field = placeSearch(page);
    await field.fill("karwan");
    await expect.poll(() => snap(page)).toBe("full");
    await field.press("Enter");
    await expect(heading(page, "Karwan Bazar")).toBeFocused();
    await expect(field).toHaveValue("Karwan Bazar");
    await expect(field).toHaveAttribute("aria-expanded", "false");
    expect(await snap(page)).toBe("half");
    await expect(page.getByRole("article")).toContainText("Single fare from here");
    // A station pick fetches no place and plans no route.
    await afterRender(page);
    const seen = await stub.calls();
    expect(seen.fetchFields).toEqual([]);
    expect(seen.routes).toEqual([]);
  });

  test("METRO-163 AC5 Enter on a place fetches its location once and plans the walking route", async ({
    page,
  }) => {
    const stub = await open(page);
    await searchForPlace(page, "uttara");
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    expect((await stub.calls()).fetchFields).toEqual([["location"]]);
    expect((await stub.calls()).routes).toHaveLength(1);
    expect(await snap(page)).toBe("half");
    await expect(placeSearch(page)).toHaveValue("Uttara Area");
    await expect(page.locator("svg.map .map__me")).toHaveCount(0);
    // The place used the production footnote, not a sample marker.
    await expect(page.getByText(/^Fares as of: DTCA notice dated/u)).toBeVisible();
  });

  test("METRO-163 AC5 a place is never chosen by Enter alone: it needs an arrow first", async ({
    page,
  }) => {
    const stub = await open(page);
    const field = placeSearch(page);
    await field.fill(placeQuery("uttara"));
    await expect(placeOptions(page).first()).toBeVisible();
    await expect(field).not.toHaveAttribute("aria-activedescendant", /.+/u);
    await field.press("Enter");
    await afterRender(page);
    expect((await stub.calls()).fetchFields).toEqual([]);
  });

  test("METRO-163 AC5 Escape closes the list, then clears the text; Home and End move the caret", async ({
    page,
  }) => {
    await open(page);
    const field = placeSearch(page);
    await field.fill("mir");
    await expect(field).toHaveAttribute("aria-expanded", "true");
    await field.press("End");
    expect(await field.evaluate((node: HTMLInputElement) => node.selectionStart)).toBe(3);
    await field.press("Home");
    expect(await field.evaluate((node: HTMLInputElement) => node.selectionStart)).toBe(0);
    await expect(field).not.toHaveAttribute("aria-activedescendant", /.+/u);
    await field.press("Escape");
    await expect(field).toHaveAttribute("aria-expanded", "false");
    await expect(field).toHaveValue("mir");
    await field.press("Escape");
    await expect(field).toHaveValue("");
  });

  test('METRO-163 AC5 "/" focuses the field from outside a text field, and is not typed', async ({
    page,
  }) => {
    await open(page);
    const field = placeSearch(page);
    await expect(field).not.toBeFocused();
    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("/");
    await expect(field).toBeFocused();
    await expect(field).toHaveValue("");
    // Inside the field "/" is a character.
    await page.keyboard.press("/");
    await expect(field).toHaveValue("/");
  });

  test("METRO-163 AC5 the clear button and the locate button inside the field", async ({
    page,
  }) => {
    await stubGeolocation(page, GOOD_FIX);
    await open(page);
    const field = placeSearch(page);
    await field.fill("mir");
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(field).toHaveValue("");
    await expect(field).toBeFocused();
    await expect(page.getByRole("button", { name: "Clear search" })).toHaveCount(0);
    await inFieldLocate(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
  });

  test("METRO-163 AC5 targets are at least 44 px and the focus order follows the field, its buttons, then the page's own", async ({
    page,
  }) => {
    await open(page);
    const field = placeSearch(page);
    await field.fill("mir");
    await expect(page.getByRole("option").first()).toBeVisible();
    await settle(page);
    const sizes = await page.evaluate(() =>
      [".search__input", ".search__clear", ".search__locate", "[role=option]", "button.locate"].map(
        (selector) => {
          const box = document.querySelector(selector)?.getBoundingClientRect();
          return { selector, width: box?.width ?? 0, height: box?.height ?? 0 };
        },
      ),
    );
    for (const { selector, width, height } of sizes) {
      expect(width, `${selector} width`).toBeGreaterThanOrEqual(44);
      expect(height, `${selector} height`).toBeGreaterThanOrEqual(44);
    }
    // Tab from the field: the clear button, the locate button inside the field, then the page's own button.
    await field.press("Tab");
    await expect(page.getByRole("button", { name: "Clear search" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(inFieldLocate(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(locateButton(page)).toBeFocused();
  });

  test("METRO-163 AC5 typing opens the sheet to full; a pick settles it at half", async ({
    page,
  }) => {
    await open(page);
    expect(await snap(page)).not.toBe("full");
    await placeSearch(page).focus();
    expect(await snap(page)).not.toBe("full");
    await placeSearch(page).fill("mir");
    await expect.poll(() => snap(page)).toBe("full");
    await stationOptions(page).first().click();
    await expect(heading(page, "Mirpur 11")).toBeFocused();
    expect(await snap(page)).toBe("half");
  });

  test("METRO-163 AC6 no Google widget exists any more", async ({ page }) => {
    await open(page);
    await searchForPlace(page, "uttara");
    await expect(heading(page, "Uttara North")).toBeFocused();
    expect(
      await page.locator("gmp-place-autocomplete, [class*=place-slot], #place-input").count(),
    ).toBe(0);
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(1);
  });
});

test.describe("places and routes together (METRO-163)", () => {
  test.afterEach(async ({ page }) => {
    await settle(page);
  });

  test("METRO-163 a place replaces a picked station and a pick replaces a place; each place asks for one route", async ({
    page,
  }) => {
    const stub = await open(page);
    const field = placeSearch(page);
    await field.fill("farm");
    await field.press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await expect(page.locator(".ticket")).toHaveCount(1);
    expect((await stub.calls()).routes).toEqual([]);
    await searchForPlace(page, "uttara");
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    await expect(page.locator(".ticket")).toHaveCount(0);
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.locator("body")).not.toContainText(/sample data/iu);
    expect((await stub.calls()).routes).toHaveLength(1);
    await field.fill("farm");
    await field.press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await expect(page.locator(".result")).toHaveCount(0);
    expect((await stub.calls()).routes).toHaveLength(1);
  });

  test("METRO-163 Routes: a good fix 1, a theme change 0 more, a pick 0 more", async ({ page }) => {
    await stubGeolocation(page, GOOD_FIX);
    const stub = await open(page);
    await locateButton(page).click();
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    expect((await stub.calls()).routes).toHaveLength(1);
    const theme = page.getByRole("button", { name: /theme/iu });
    const before = (await theme.getAttribute("aria-label")) ?? "";
    await theme.click();
    await expect(theme).not.toHaveAttribute("aria-label", before);
    await afterRender(page);
    expect((await stub.calls()).routes).toHaveLength(1);
    await placeSearch(page).fill("farm");
    await placeSearch(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await afterRender(page);
    expect((await stub.calls()).routes).toHaveLength(1);
  });

  test("METRO-163 a rough fix asks Google for nothing: no script, no route", async ({ page }) => {
    await stubGeolocation(page, { lat: 23.87, lng: 90.367, accuracy: 25_000 });
    const stub = await open(page);
    await locateButton(page).click();
    await expect(
      page.getByRole("group", { name: /found your position only roughly/u }),
    ).toBeVisible();
    await afterRender(page);
    const seen = await stub.calls();
    expect(seen.scriptUrls).toEqual([]);
    expect(seen.routes).toEqual([]);
  });

  test("METRO-163 a result replaced before the script arrives never makes its route request", async ({
    page,
  }) => {
    await stubGeolocation(page, GOOD_FIX);
    const stub = await open(page, { holdScript: true });
    await locateButton(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(page.getByText("Finding the walking route…")).toBeVisible();
    await placeSearch(page).fill("farm");
    await placeSearch(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await expect.poll(async () => (await stub.calls()).scriptUrls.length).toBe(1);
    stub.releaseScript();
    await expect
      .poll(async () => (await stub.calls()).librariesImported.toSorted())
      .toEqual(["places", "routes"]);
    await afterRender(page);
    expect((await stub.calls()).routes).toEqual([]);
    await expect(page.locator(".result")).toHaveCount(0);
  });

  test("METRO-163 a route answering after its result was replaced is not shown", async ({
    page,
  }) => {
    await stubGeolocation(page, GOOD_FIX);
    const stub = await open(page, { holdRoute: true });
    await locateButton(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect.poll(async () => (await stub.calls()).routes.length).toBe(1);
    await placeSearch(page).fill("farm");
    await placeSearch(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await stub.releaseRoute();
    await expect.poll(async () => (await stub.calls()).routesAnswered).toBe(1);
    await afterRender(page);
    await expect(page.getByText(ROUTE_TEXT)).toHaveCount(0);
    await expect(page.locator(".result")).toHaveCount(0);
    await expect(heading(page, "Farmgate")).toBeFocused();
  });

  test("METRO-163 typing while the script loads is kept; the places arrive after it", async ({
    page,
  }) => {
    const stub = await open(page, { holdScript: true });
    const field = placeSearch(page);
    await field.fill(placeQuery("uttara"));
    await expect.poll(async () => (await stub.calls()).scriptUrls.length).toBe(1);
    await expect(field).toHaveValue(placeQuery("uttara"));
    // Waiting for places: no places, no notice, and not an empty state either.
    await expect(placeOptions(page)).toHaveCount(0);
    await expect(page.locator(".empty")).toHaveCount(0);
    stub.releaseScript();
    await expect(placeOptions(page).first()).toBeVisible({ timeout: 10_000 });
    await expect(field).toBeFocused();
  });

  test("METRO-163 no position reaches our /api on the place or the route path", async ({
    page,
  }) => {
    await stubGeolocation(page, GOOD_FIX);
    await open(page);
    const apiRequests = trackApiRequests(page);
    await locateButton(page).click();
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    await searchForPlace(page, "motijheel");
    await expect(heading(page, "Motijheel")).toBeFocused();
    await expectNoCoordinateInApi(page, apiRequests);
  });

  test.describe("when the place's location cannot be fetched", () => {
    test("METRO-163 a failed fetchFields shows the fixed copy and keeps the field, with no cause shown", async ({
      page,
    }) => {
      const stub = await open(page, { fetchFails: true });
      const field = placeSearch(page);
      await field.fill(placeQuery("uttara"));
      await expect(placeOptions(page).first()).toBeVisible();
      await field.press("ArrowDown");
      await field.press("Enter");
      await expect(page.getByRole("alert")).toHaveText(NOTICE);
      await expect(page.locator("body")).not.toContainText("secret");
      expect((await stub.calls()).fetchFields).toHaveLength(1);
      await expect(page.getByRole("article")).toHaveCount(0);
      // Stations still work, and a later pick clears nothing it should keep.
      await field.fill("farm");
      await field.press("Enter");
      await expect(heading(page, "Farmgate")).toBeFocused();
    });
  });
});

test.describe("places that cannot be asked for (METRO-163)", () => {
  test.afterEach(async ({ page }) => {
    await settle(page);
  });

  test("METRO-163 AC4 offline: the offline notice, station search still works, and no request is made", async ({
    page,
  }) => {
    await noConnection(page);
    const stub = await open(page);
    const field = placeSearch(page);
    const status = page.getByRole("status").filter({ hasText: NO_CONNECTION });
    await expect(status).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await field.fill("karwan");
    await expect(stationOptions(page)).toHaveCount(1);
    // The notice takes the Places group's place in the list; there is no attribution row without that group.
    const group = page.getByRole("group", { name: "Places", exact: true });
    await expect(group).toContainText(NOTICE);
    await expect(page.getByText("Google Maps")).toHaveCount(0);
    await expect(placeOptions(page)).toHaveCount(0);
    await field.press("Enter");
    await expect(heading(page, "Karwan Bazar")).toBeFocused();
    expect((await stub.calls()).scriptUrls).toEqual([]);
    // When the connection returns the notice goes and places are offered again.
    await page.evaluate(() => {
      Reflect.set(window, "__connected", true);
      window.dispatchEvent(new Event("online"));
    });
    await expect(page.getByText(NO_CONNECTION)).toHaveCount(0);
    await field.fill(placeQuery("uttara"));
    await expect(placeOptions(page).first()).toBeVisible();
  });

  test.describe("when the Maps script cannot load", () => {
    test.use({ allowedConsoleError: /Failed to load resource|ERR_FAILED/u });

    test("METRO-163 AC4 a failed load replaces the Places group with the notice, keeps the stations and shows no attribution", async ({
      page,
    }) => {
      await open(page, { scriptFails: true });
      const field = placeSearch(page);
      await field.fill("mir");
      await expect(stationOptions(page)).toHaveCount(2);
      const group = page.getByRole("group", { name: "Places", exact: true });
      await expect(group).toContainText(NOTICE);
      await expect(page.getByText("Google Maps")).toHaveCount(0);
      // Not an interruption: a status region, not an alert.
      await expect(page.getByRole("alert")).toHaveCount(0);
      await field.press("Enter");
      await expect(heading(page, "Mirpur 11")).toBeFocused();
    });

    test("METRO-163 AC4 with no match and no places the empty state shows, and the notice stays under the field", async ({
      page,
    }) => {
      await open(page, { scriptFails: true });
      await placeSearch(page).fill("Sadarghat");
      await expect(page.locator(".empty")).toContainText("No station matches that name.");
      await expect(page.locator("output .notice")).toContainText(NOTICE);
    });

    test("METRO-163 the failure with the location notice open: the search action is left out", async ({
      page,
    }) => {
      await stubGeolocation(page, "unavailable");
      await open(page, { scriptFails: true });
      await placeSearch(page).fill("mir");
      await expect(page.getByRole("group", { name: "Places", exact: true })).toContainText(NOTICE);
      await locateButton(page).click();
      const group = page.getByRole("group", {
        name: "Your position could not be found. Pick a station instead.",
      });
      await expect(group.getByRole("button", { name: "Try again" })).toBeFocused();
      await expect(group.getByRole("button", { name: "Search for a place" })).toHaveCount(0);
    });
  });

  test("METRO-163 AC4 a failed request replaces the group for that text, and typing again asks again", async ({
    page,
  }) => {
    const stub = await open(page, { suggestFails: true });
    const field = placeSearch(page);
    await field.fill("mir");
    await expect(page.getByRole("group", { name: "Places", exact: true })).toContainText(NOTICE);
    await expect(page.getByText("Google Maps")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("secret");
    await field.fill("mirp");
    await expect.poll(async () => (await calls(stub)).length).toBe(2);
    await expect(stationOptions(page)).toHaveCount(2);
  });
});

test.describe("the list above the sheet (METRO-163)", () => {
  for (const size of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    test(`METRO-163 at ${size.width} px the open list sits under the field, is not clipped or covered, and is as wide as the field`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await open(page);
      await placeSearch(page).fill("mir");
      await expect(placeOptions(page)).toHaveCount(2);
      await expect.poll(() => snap(page)).toBe("full");
      await settle(page);
      const geometry = await page.evaluate(() => {
        const list = document.querySelector<HTMLElement>("[role=listbox]");
        const field = document.querySelector<HTMLElement>(".search");
        const scroll = document.querySelector<HTMLElement>(".panel__scroll");
        if (list === null || field === null || scroll === null) return null;
        const rect = list.getBoundingClientRect();
        const fieldRect = field.getBoundingClientRect();
        const clipped: string[] = [];
        for (let node = list.parentElement; node !== null; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.overflowX === "visible" && style.overflowY === "visible") continue;
          const box = node.getBoundingClientRect();
          if (
            rect.left < box.left - 0.5 ||
            rect.right > box.right + 0.5 ||
            rect.top < box.top - 0.5 ||
            rect.bottom > box.bottom + 0.5
          ) {
            clipped.push(node.className || node.tagName);
          }
        }
        const options = [...list.querySelectorAll<HTMLElement>("[role=option]")];
        const covered = options.filter((option) => {
          const box = option.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return hit === null || !option.contains(hit);
        }).length;
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          fieldLeft: fieldRect.left,
          fieldRight: fieldRect.right,
          fieldBottom: fieldRect.bottom,
          optionCount: options.length,
          covered,
          clipped,
          viewport: { width: innerWidth, height: innerHeight },
        };
      });
      expect(geometry, "the list and its containers exist").not.toBeNull();
      if (geometry === null) return;
      expect(geometry.optionCount).toBe(4);
      expect(geometry.covered, "no option is covered by the sheet, the tab bar or the map").toBe(0);
      expect(geometry.clipped, "no ancestor clips the list").toEqual([]);
      expect(geometry.top).toBeGreaterThanOrEqual(geometry.fieldBottom - 1);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport.width);
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport.height);
      expect(Math.abs(geometry.left - geometry.fieldLeft)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(geometry.right - geometry.fieldRight)).toBeLessThanOrEqual(1.5);
      // Choosing an option with the pointer selects it.
      await placeOptions(page).first().click();
      await expect(heading(page, "Uttara North")).toBeFocused();
      expect(await snap(page)).toBe("half");
    });
  }
});

test.describe("axe on the new field (METRO-163)", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const size of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
    ]) {
      test(`METRO-163 AC5 idle field, open list, empty state, notice and offline pass axe in ${theme} at ${size.width} px`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        await open(page, {}, theme);
        expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe(theme);
        const scan = async (name: string): Promise<void> => {
          await settle(page);
          const violations = (await axeBuilder(page).analyze()).violations.map((v) => v.id);
          expect(violations, `${name} in ${theme} at ${size.width}`).toEqual([]);
        };
        const field = placeSearch(page);
        await scan("idle field");
        await field.fill("mir");
        await expect(placeOptions(page)).toHaveCount(2);
        await scan("open list with places and the attribution row");
        await field.fill("Sadarghat");
        await expect(placeOptions(page).first()).toBeVisible();
        await field.press("ArrowDown");
        await scan("a place active");
        await field.press("Escape");
        await field.press("Escape");
        // No connection, and a failed load, each on a fresh page. A reload aborts a font download still in
        // flight, and Firefox logs that as a console error (METRO-125): let the page's fonts finish first.
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        await page.unrouteAll({ behavior: "ignoreErrors" });
        await noConnection(page);
        await installMapsStub(page, { emptySuggestions: true });
        await page.reload();
        await expect(page.getByText(NO_CONNECTION)).toBeVisible();
        await scan("offline notice");
        await placeSearch(page).fill("Sadarghat");
        await expect(page.locator(".empty")).toBeVisible();
        await scan("empty state with the notice");
        await placeSearch(page).fill("mir");
        await expect(page.getByRole("group", { name: "Places", exact: true })).toContainText(
          NOTICE,
        );
        await scan("the notice in the list");
      });
    }
  }
});
