import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { expectTabReachesEveryControl, linksAreTabbable } from "./keyboard";
import {
  MEASURED_GOOGLE_NAME,
  expectNoCoordinateInApi,
  installMapsStub,
  plainSearch,
  searchForPlace,
  stubGeolocation,
  trackApiRequests,
  widgetSearch,
} from "./maps-stub";
import type { StubOptions } from "./maps-stub";

/** The slice runs at / against the real build, the real `_headers` and a fake Maps API. */
async function openSlice(page: Page, options: StubOptions = {}) {
  const stub = await installMapsStub(page, options);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeVisible();
  return stub;
}

/**
 * Controls the layout shell adds before the slice: the Home link (where this browser Tabs to links), the theme
 * button, and the sheet handle's three below 768 px.
 */
async function shellControls(page: Page): Promise<number> {
  const width = await page.evaluate(() => window.innerWidth);
  const home = (await linksAreTabbable(page)) ? 1 : 0;
  return home + (width < 768 ? 4 : 1);
}

// METRO-114: the field starts as a plain input; the first focus swaps Google's widget in (see place-search.e2e.ts).
const searchFor = searchForPlace;
const ROUTE_TEXT = "about 1.2 km, 15 min · est.";

const station = (page: Page, name: string) => page.getByRole("heading", { level: 2, name });

test.describe("nearest station from a searched place (METRO-88)", () => {
  test("METRO-88 A1 A2 A3 a searched place shows the station, the estimate, the walking route and the fare range", async ({
    page,
  }) => {
    const stub = await openSlice(page);
    await expect(plainSearch(page)).toBeVisible();
    await searchFor(page, "motijheel");

    await expect(station(page, "Motijheel")).toBeFocused();
    await expect(page.getByText("straight-line distance · est.")).toBeVisible();
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    // METRO-113: the destination picker is gone; the result shows the fare range and its footnote.
    const fare = page.locator(".result__fare");
    await expect(fare).toContainText("Single fare from here");
    await expect(fare).toContainText("20 taka");
    await expect(fare).toContainText("100 taka");
    await expect(
      page.getByText(
        "Fares as of: DTCA notice dated 8 September 2022; last checked 5 November 2026.",
      ),
    ).toBeVisible();

    const calls = await stub.calls();
    // One Essentials-only fetch and one walking route for the selection; nothing reached Google.
    expect(calls.fetchFields).toEqual([["location"]]);
    expect(calls.routes).toEqual([
      expect.objectContaining({
        travelMode: "WALKING",
        fields: ["distanceMeters", "durationMillis"],
      }),
    ]);
    expect(calls.scriptUrls).toHaveLength(1);
    expect(calls.scriptUrls[0]).toContain("v=3.66");
    expect(stub.blocked).toEqual([]);
  });

  test("METRO-88 A5 the slice applies no inline style and only same-origin linked stylesheets", async ({
    page,
  }) => {
    await openSlice(page);
    await searchFor(page, "motijheel");
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    const styling = await page.evaluate(() => ({
      stylesheets: document.styleSheets.length,
      linked: document.querySelectorAll('link[rel="stylesheet"]').length,
      foreign: [...document.styleSheets].filter(
        (sheet) => sheet.href !== null && new URL(sheet.href).origin !== location.origin,
      ).length,
      styleElements: document.querySelectorAll("style").length,
      styleAttributes: document.querySelectorAll("[style]").length,
    }));
    // Only same-origin stylesheets, as linked files (exactly two: the entry's and the Nearby screen chunk's, which holds the page, the line map and the picker, METRO-112), allowed by
    // `style-src 'self'`; nothing inline (METRO-58, METRO-105).
    expect(styling).toEqual({
      stylesheets: 2,
      linked: 2,
      foreign: 0,
      styleElements: 0,
      styleAttributes: 0,
    });
  });

  test("METRO-88 A9 no /api request carries a coordinate", async ({ page }) => {
    const stub = await openSlice(page);
    const apiRequests = trackApiRequests(page);
    await searchFor(page, "uttara");
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    await expectNoCoordinateInApi(page, apiRequests);
    expect(stub.blocked).toEqual([]);
  });

  test("METRO-88 A7 denied location shows fixed copy and place search still works", async ({
    page,
  }) => {
    await stubGeolocation(page, "denied");
    await openSlice(page);
    await page.getByRole("button", { name: "Use my location" }).click();
    // METRO-113: focus moves to the notice's first action, so the notice is a labelled group, not also an alert.
    const notice = page.getByRole("group", {
      name: "Location is turned off. Search for a place instead.",
    });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("button", { name: "Search for a place" })).toBeFocused();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await searchFor(page, "uttara");
    await expect(station(page, "Uttara North")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(notice).toHaveCount(0);
  });

  test("METRO-114 the device position finds the station and asks Google for one walking route, never our /api", async ({
    page,
  }) => {
    await stubGeolocation(page, { lat: 23.87, lng: 90.367 });
    const stub = await openSlice(page);
    const apiRequests = trackApiRequests(page);
    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(station(page, "Uttara North")).toBeFocused();
    await expect(page.getByText("straight-line distance · est.")).toBeVisible();
    // A good fix asks for exactly one route, shown as an estimate; no place search was needed.
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    await expect(page.getByText("The walking route is unavailable.", { exact: false })).toHaveCount(
      0,
    );
    await expectNoCoordinateInApi(page, apiRequests);
    const calls = await stub.calls();
    expect(calls.fetchFields).toEqual([]);
    expect(calls.routes).toHaveLength(1);
    expect(calls.scriptUrls).toHaveLength(1);
  });

  test.describe("a rough device location (METRO-103)", () => {
    test("METRO-103 a coarse fix shows fixed copy, no station and no walking-route request", async ({
      page,
    }) => {
      await stubGeolocation(page, { lat: 23.87, lng: 90.367, accuracy: 25_000 });
      const stub = await openSlice(page);
      const apiRequests = trackApiRequests(page);
      await page.getByRole("button", { name: "Use my location" }).click();
      const notice = page.getByRole("group", { name: /found your position only roughly/u });
      await expect(notice).toHaveText(
        /Your device found your position only roughly, with an error of about 25 km\. The nearest station could be wrong, so none is shown\. Search for a place instead\./u,
      );
      await expect(notice.getByRole("button", { name: "Try again" })).toBeFocused();
      await expect(page.locator(".result")).toHaveCount(0);
      await expect(page.getByText("straight-line distance · est.")).toHaveCount(0);
      await expectNoCoordinateInApi(page, apiRequests);
      // A rough fix asks for no route, and so nothing was loaded from Google at all.
      expect((await stub.calls()).routes).toEqual([]);
      expect((await stub.calls()).scriptUrls).toEqual([]);
      // The place search keeps working and replaces the warning with a result.
      await searchFor(page, "motijheel");
      await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expect(notice).toHaveCount(0);
    });

    test("METRO-103 a precise fix of about 20 m gives the station and, since METRO-114, one route", async ({
      page,
    }) => {
      await stubGeolocation(page, { lat: 23.87, lng: 90.367, accuracy: 20 });
      const stub = await openSlice(page);
      await page.getByRole("button", { name: "Use my location" }).click();
      await expect(station(page, "Uttara North")).toBeVisible();
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
      expect((await stub.calls()).routes).toHaveLength(1);
    });
  });

  test.describe("when the place fetch fails", () => {
    test("METRO-88 A8 fixed copy shows and the location path still gives station and fare", async ({
      page,
    }) => {
      await stubGeolocation(page, { lat: 23.728, lng: 90.419 });
      await openSlice(page, { fetchFails: true });
      await searchFor(page, "motijheel");
      // The field stays (a failed selection is not an unavailable library); the fixed copy is an alert.
      const alert = page.getByRole("alert");
      await expect(alert).toHaveText(
        "Place search is unavailable right now. Pick a station instead.",
      );
      await expect(page.locator("body")).not.toContainText("secret");
      await page.getByRole("button", { name: "Use my location" }).click();
      await expect(station(page, "Motijheel")).toBeVisible();
      await expect(page.locator(".result__fare")).toContainText("Single fare from here");
    });
  });

  test.describe("when the walking route fails", () => {
    test("METRO-88 A8 fixed copy shows for the route while the station and fare stay", async ({
      page,
    }) => {
      await openSlice(page, { routeFails: true });
      await searchFor(page, "motijheel");
      await expect(page.getByRole("alert")).toHaveText(
        "The walking route is unavailable. The station and fare are still correct.",
      );
      await expect(page.locator("body")).not.toContainText("secret");
      await expect(station(page, "Motijheel")).toBeVisible();
      await expect(page.locator(".result__fare")).toContainText("Single fare from here");
    });
  });

  test.describe("when the Maps script cannot load", () => {
    test.use({ allowedConsoleError: /Failed to load resource|ERR_FAILED/u });

    test("METRO-114 a good fix keeps its station and fare, the route fails visibly, and the place search is replaced by its notice", async ({
      page,
    }) => {
      await stubGeolocation(page, { lat: 23.87, lng: 90.367 });
      await openSlice(page, { scriptFails: true });
      // Nothing was asked of Google yet, so the plain field is still there.
      await expect(plainSearch(page)).toBeVisible();
      await page.getByRole("button", { name: "Use my location" }).click();
      await expect(station(page, "Uttara North")).toBeVisible();
      // The route needed the script, the script failed: the result stays with the fixed copy.
      await expect(page.getByRole("alert")).toHaveText(
        "The walking route is unavailable. The station and fare are still correct.",
      );
      await expect(page.locator(".result__fare")).toContainText("Single fare from here");
      // The same failure makes place search unavailable: the field, label and hint are gone, the notice stays.
      await expect(
        page.getByText("Place search is unavailable right now. Pick a station instead."),
      ).toBeVisible();
      await expect(plainSearch(page)).toHaveCount(0);
      await expect(page.getByText("Suggestions favor places in Dhaka.")).toHaveCount(0);
    });
  });

  test("METRO-88 A6 the keyboard reaches every control with a visible focus indicator", async ({
    page,
  }) => {
    await openSlice(page);
    // The first focus swaps the widget in, which would change the control list in the middle of the walk, so
    // the swap happens first (the plain phase has its own walk below).
    await plainSearch(page).focus();
    await expect(widgetSearch(page)).toBeVisible();
    // Leave the field, so its unfocused look is what the walk records.
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    // The location button, the search input and the picker's combobox (METRO-112), after the shell's controls:
    // the Home link, the theme button, plus the three sheet-handle controls where the sheet is drawn.
    // The line map adds four tab stops (METRO-111): the map and its three zoom buttons, after the panel's content.
    const shell = (await shellControls(page)) + 4;
    await expectTabReachesEveryControl(page, { expected: shell + 3 });
    await searchFor(page, "motijheel");
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    // METRO-113: the result adds only its Directions link (counted where this browser Tabs to links); the
    // destination select of METRO-88 is gone.
    const link = (await linksAreTabbable(page)) ? 1 : 0;
    await expectTabReachesEveryControl(page, { expected: shell + 3 + link });
  });

  test("METRO-114 A6 in the plain phase the keyboard reaches the plain input, which draws a focus indicator", async ({
    page,
  }) => {
    // The script is held for the whole walk (never released here; closing the page lets it go), so the plain
    // input stays in place while Tab passes it.
    await openSlice(page, { holdScript: true });
    await expect(plainSearch(page)).toBeVisible();
    const shell = (await shellControls(page)) + 4;
    await expectTabReachesEveryControl(page, { expected: shell + 3 });
    await expect(plainSearch(page)).toBeVisible();
  });

  test("METRO-101 stub wiring: the hint, the description option and aria-describedby we control", async ({
    page,
  }) => {
    await openSlice(page);
    // Before the first focus the plain input is named by the visible label and described by the visible hint.
    const plain = plainSearch(page);
    await expect(plain).toHaveAccessibleDescription("Suggestions favor places in Dhaka.");
    await expect(page.locator("#place-hint")).toHaveText("Suggestions favor places in Dhaka.");
    const visible = (await page.locator("#place-label").innerText()).toLowerCase();
    await plain.focus();
    const search = widgetSearch(page);
    await expect(search).toBeVisible();
    // The stub sets the measured name itself, so this proves our visible text is contained in that name,
    // not that the real widget exposes it (only the owner-run smoke:live does).
    const name = ((await search.getAttribute("aria-label")) ?? "").toLowerCase();
    expect(name).toBe(MEASURED_GOOGLE_NAME.toLowerCase());
    expect(name).toContain(visible);
    // The visible hint is handed to the widget as its description (stub of the documented option).
    await expect(search).toHaveAccessibleDescription("Suggestions favor places in Dhaka.");
    // The group around the widget carries the visible label.
    await expect(
      page.getByRole("group", { name: "Search for a place", exact: true }),
    ).toBeVisible();
  });

  test("METRO-88 idle page: accessibility tree of main", async ({ page }) => {
    await openSlice(page);
    // METRO-113: the primary action comes first, then the consent line, then the place search (the handoff's
    // order); before, the search came first.
    await expect(page.getByRole("main")).toMatchAriaSnapshot(`
      - main:
        - heading "Nearest Metro station" [level=1]
        - paragraph: Find the nearest Dhaka MRT Line 6 station, the walk to it and the fare.
        - region "Where are you?":
          - heading "Where are you?" [level=2]
          - button "Use my location"
          - paragraph: /Your position and the place you choose are not sent to our server.*/
          - text: Search for a place
          - paragraph: Suggestions favor places in Dhaka.
          - textbox "Search for a place"
    `);
  });
});
