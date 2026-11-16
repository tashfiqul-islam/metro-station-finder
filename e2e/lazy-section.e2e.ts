import type { Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

const SCREEN_CHUNK = "**/assets/Nearby-*.js";
const FAILED = "This part of the page could not be loaded. Reload the page to try again.";

/** A failed chunk load logs its fixed class name from the root callback, and the browser logs the failed request. */
const EXPECTED_ERRORS =
  /^(Render error: TypeError|Failed to load resource.*|.*(net::ERR|Importing a module script failed|error loading dynamically imported module).*)$/u;

async function open(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.addInitScript((value) => localStorage.setItem("msf-theme", value), theme);
  await installMapsStub(page);
}

test.describe("lazy section states (METRO-159)", () => {
  test.use({ allowedConsoleError: EXPECTED_ERRORS });

  for (const theme of ["light", "dark"] as const) {
    test(`METRO-159 while the screen chunk is pending the status shows "Loading", then the screen replaces it in ${theme}`, async ({
      page,
    }) => {
      await open(page, theme);
      const gate = Promise.withResolvers<void>();
      await page.route(SCREEN_CHUNK, async (route) => {
        await gate.promise;
        await route.continue();
      });
      await page.goto("/");
      const pending = page.locator("output.lazy");
      await expect(pending).toHaveText("Loading");
      await expect(pending).toHaveRole("status");
      await expect(pending.locator(".lazy__bars")).toHaveAttribute("aria-hidden", "true");
      expect((await axeBuilder(page).analyze()).violations.map((v) => v.id)).toEqual([]);
      gate.resolve();
      await expect(
        page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
      ).toBeVisible();
      await expect(pending).toBeHidden();
    });

    test(`METRO-159 when the screen chunk cannot load the failure takes focus, is not an alert and passes axe in ${theme}`, async ({
      page,
    }) => {
      await open(page, theme);
      await page.route(SCREEN_CHUNK, (route) => route.abort());
      await page.goto("/");
      const region = page.getByRole("region", { name: FAILED });
      await expect(region).toBeFocused();
      await expect(region).toHaveAttribute("tabindex", "-1");
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expect(region.getByText(FAILED)).toBeVisible();
      // Tab from the focused container reaches its one button.
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Reload the page" })).toBeFocused();
      expect((await axeBuilder(page).analyze()).violations.map((v) => v.id)).toEqual([]);
    });
  }

  test("METRO-159 the Reload button reloads the document", async ({ page }) => {
    await open(page, "light");
    await page.route(SCREEN_CHUNK, (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("region", { name: FAILED })).toBeFocused();
    // While the page reloads the old execution context goes away: a failed read counts as "not yet".
    const navigationType = (): Promise<string | null> =>
      page
        .evaluate(
          () =>
            performance
              .getEntriesByType("navigation")
              .map((entry) => (entry instanceof PerformanceNavigationTiming ? entry.type : null))
              .at(0) ?? null,
        )
        .catch(() => null);
    expect(await navigationType()).toBe("navigate");
    await page.getByRole("button", { name: "Reload the page" }).click();
    // The same document does not retry the import: only a reload does. Whether the reloaded page then gets the
    // chunk is the browser's cache (WebKit reuses the failed load, Unverified), so only the reload is asserted.
    await expect.poll(navigationType).toBe("reload");
    // The reloaded page (the chunk is still blocked) shows the failure again: end on a settled page, not mid-load.
    await expect(page.getByRole("region", { name: FAILED })).toBeVisible();
  });
});
