import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { expectTabReachesEveryControl } from "./keyboard";
import { installMapsStub, stubGeolocation } from "./maps-stub";
import type { StubOptions } from "./maps-stub";

/** The slice runs at /nearest against the real build, the real `_headers` and a fake Maps API. */
async function openSlice(page: Page, options: StubOptions = {}) {
  const stub = await installMapsStub(page, options);
  await page.goto("/nearest");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeVisible();
  return stub;
}

async function searchFor(page: Page, text: string) {
  const search = page.getByRole("textbox", { name: "Search for a place in Dhaka" });
  await search.fill(text);
  await search.press("Enter");
}

test.describe("nearest station from a searched place (METRO-88)", () => {
  test("METRO-88 A1 A2 A3 a searched place shows the station, distances, walking route and fare", async ({
    page,
  }) => {
    const stub = await openSlice(page);
    await expect(page.getByRole("group", { name: "Search for a place in Dhaka" })).toBeVisible();
    await searchFor(page, "motijheel");

    await expect(page.getByText("Motijheel", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Straight-line distance")).toBeVisible();
    await expect(page.getByText("1.23 km, 15 min")).toBeVisible();

    const destination = page.getByRole("combobox", { name: "Destination station" });
    const options = await destination.locator("option").allTextContents();
    expect(options).not.toContain("Motijheel");
    await destination.selectOption({ label: "Uttara North" });
    await expect(page.getByText("Motijheel to Uttara North: BDT 100")).toBeVisible();
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

  test("METRO-88 A9 no /api request carries a coordinate", async ({ page }) => {
    const stub = await openSlice(page);
    const apiRequests: { url: string; headers: string; body: string }[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) {
        apiRequests.push({
          url: request.url(),
          headers: JSON.stringify(request.headers()),
          body: request.postData() ?? "",
        });
      }
    });
    await searchFor(page, "uttara");
    await expect(page.getByText("1.23 km, 15 min")).toBeVisible();
    // Not vacuous: a request to /api is recorded by this listener.
    await page.evaluate(() => fetch("/api/scaffold/status").then((response) => response.status));
    expect(apiRequests).toHaveLength(1);
    const everything = apiRequests.map((r) => `${r.url} ${r.headers} ${r.body}`).join("\n");
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
    expect(stub.blocked).toEqual([]);
  });

  test("METRO-88 A7 denied location shows fixed copy and place search still works", async ({
    page,
  }) => {
    await stubGeolocation(page, "denied");
    await openSlice(page);
    await page.getByRole("button", { name: "Use my location" }).click();
    const alert = page.getByRole("alert");
    await expect(alert).toHaveText("Location is turned off. Search for a place instead.");
    await expect(alert).toBeFocused();
    await searchFor(page, "uttara");
    await expect(page.getByText("Uttara North", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("METRO-88 the device position finds the station without a place search", async ({
    page,
  }) => {
    await stubGeolocation(page, { lat: 23.87, lng: 90.367 });
    const stub = await openSlice(page);
    await page.getByRole("button", { name: "Use my location" }).click();
    await expect(page.getByText("Uttara North", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("1.23 km, 15 min")).toBeVisible();
    expect((await stub.calls()).fetchFields).toEqual([]);
  });

  test.describe("when the place fetch fails", () => {
    test("METRO-88 A8 fixed copy shows and the location path still gives station and fare", async ({
      page,
    }) => {
      await stubGeolocation(page, { lat: 23.728, lng: 90.419 });
      await openSlice(page, { fetchFails: true });
      await searchFor(page, "motijheel");
      const alert = page.getByRole("alert");
      await expect(alert).toHaveText(
        "Place search is unavailable. You can still use your location.",
      );
      await expect(page.locator("body")).not.toContainText("secret");
      await page.getByRole("button", { name: "Use my location" }).click();
      await expect(page.getByText("Motijheel", { exact: true }).first()).toBeVisible();
      await page
        .getByRole("combobox", { name: "Destination station" })
        .selectOption({ label: "Uttara North" });
      await expect(page.getByText("Motijheel to Uttara North: BDT 100")).toBeVisible();
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
      await expect(page.getByText("Motijheel", { exact: true }).first()).toBeVisible();
      await page
        .getByRole("combobox", { name: "Destination station" })
        .selectOption({ label: "Uttara North" });
      await expect(page.getByText("Motijheel to Uttara North: BDT 100")).toBeVisible();
    });
  });

  test.describe("when the Maps script cannot load", () => {
    test.use({ allowedConsoleError: /Failed to load resource|ERR_FAILED/u });

    test("METRO-88 fixed copy shows, and location still finds the station", async ({ page }) => {
      await stubGeolocation(page, { lat: 23.87, lng: 90.367 });
      await openSlice(page, { scriptFails: true });
      await expect(page.getByRole("alert")).toHaveText(
        "Place search is unavailable. You can still use your location.",
      );
      await page.getByRole("button", { name: "Use my location" }).click();
      await expect(page.getByText("Uttara North", { exact: true }).first()).toBeVisible();
      await expect(
        page.getByText("The walking route is unavailable. The station and fare are still correct."),
      ).toBeVisible();
    });
  });

  test("METRO-88 A6 the keyboard reaches every control with a visible focus indicator", async ({
    page,
  }) => {
    await openSlice(page);
    await expect(page.getByRole("textbox", { name: "Search for a place in Dhaka" })).toBeVisible();
    // Search input and the location button; the destination select appears with the first result.
    await expectTabReachesEveryControl(page, { expected: 2 });
    await searchFor(page, "motijheel");
    await expect(page.getByText("1.23 km, 15 min")).toBeVisible();
    // Clicking the heading moves the sequential focus starting point back above the controls.
    await page.getByRole("heading", { level: 1 }).click();
    await expectTabReachesEveryControl(page, { expected: 3 });
  });

  test("METRO-88 idle page: accessibility tree of main", async ({ page }) => {
    await openSlice(page);
    await expect(page.getByRole("main")).toMatchAriaSnapshot(`
      - main:
        - heading "Nearest Metro station" [level=1]
        - paragraph: Find the nearest Dhaka MRT Line 6 station, the walk to it and the fare.
        - region "Where are you?":
          - heading "Where are you?" [level=2]
          - paragraph: Search for a place in Dhaka
          - group "Search for a place in Dhaka":
            - textbox "Search for a place in Dhaka"
          - paragraph:
            - button "Use my location"
          - paragraph: /Your position and the place you choose are not sent to our server.*/
    `);
  });
});
