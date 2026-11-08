import type { Page, Request } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

/**
 * METRO-111: the schematic line map in the real build with the enforced CSP. The map is pure SVG: it needs no
 * network, so it is also checked with the browser context offline. The maps stub keeps every Google request off
 * the network for the Nearby slice that sits beside it.
 */
const MAP_NAME = "Schematic map of MRT Line 6";

async function open(page: Page, saved?: "light" | "dark"): Promise<void> {
  if (saved !== undefined) {
    await page.addInitScript((value) => localStorage.setItem("msf-theme", value), saved);
  }
  await installMapsStub(page);
  await page.goto("/");
  await expect(page.getByRole("application", { name: MAP_NAME, exact: true })).toBeVisible();
}

test.describe("line map", () => {
  test("METRO-111 the map is an application named for the line, with a description and the full station list", async ({
    page,
  }) => {
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    await expect(map).toHaveAttribute("viewBox", "100 70 470 880");
    await expect(map).toHaveAccessibleDescription(
      /^All 16 stations from Uttara North to Motijheel\./u,
    );
    const list = page.getByRole("list", { name: "Stations on MRT Line 6, north to south" });
    await expect(list.getByRole("listitem")).toHaveCount(16);
    await expect(list.getByRole("listitem").first()).toHaveText("Uttara North");
    await expect(list.getByRole("listitem").last()).toHaveText("Motijheel");
  });

  test("METRO-111 the map is one tab stop with a visible focus indicator and no inline style", async ({
    page,
  }) => {
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    await map.focus();
    await expect(map).toBeFocused();
    expect(await map.evaluate((node) => node.matches(":focus-visible")), "focus-visible").toBe(
      true,
    );
    expect(await page.locator(".app__map [tabindex], .app__map a, .app__map button").count()).toBe(
      1,
    );
    expect(await page.locator(".app__map [style]").count()).toBe(0);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`METRO-111 the map passes axe in ${theme}`, async ({ page }) => {
      await open(page, theme);
      expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe(theme);
      const results = await axeBuilder(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }

  test("METRO-111 the map makes no network request and keeps working with the context offline", async ({
    page,
    context,
  }) => {
    // The app's own web-vitals beacon (ADR-0019) is not the map; answer it so going offline cannot log an error.
    await page.route("**/api/vitals", (route) => route.fulfill({ status: 204 }));
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    // Both lazy parts are loaded before the network goes away, so no chunk request can fail offline.
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
    await context.setOffline(true);
    const requests: Request[] = [];
    page.on("request", (request) => {
      if (!request.url().endsWith("/api/vitals")) requests.push(request);
    });
    await map.focus();
    await page.keyboard.press("ArrowRight");
    await expect(map).toBeFocused();
    await expect(map).toBeVisible();
    await expect(page.locator("svg.map circle.map__pin")).toHaveCount(16);
    expect(requests.map((request) => request.url())).toEqual([]);
  });
});
