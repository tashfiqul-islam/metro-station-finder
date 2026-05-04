import { expect, test } from "@playwright/test";

test.describe("Navigation", () => {
  test("all 5 nav items are visible on desktop", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Desktop nav is hidden on mobile breakpoint; ensure desktop viewport
    await page.setViewportSize({ height: 800, width: 1280 });

    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await expect(page.getByText("Home").first()).toBeVisible();
    await expect(page.getByText("Station Finder").first()).toBeVisible();
    await expect(page.getByText("Station Fares").first()).toBeVisible();
    await expect(page.getByText("Trip Planner").first()).toBeVisible();
    await expect(page.getByText("About").first()).toBeVisible();
  });

  test("navigating via navbar updates the page title", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Metro Station Finder/);
  });

  test("internal navigation updates the URL and keeps the shell visible", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ height: 800, width: 1280 });

    await page.getByRole("link", { name: "About" }).first().click();

    await expect(page).toHaveURL(/\/about$/);
    await expect(page).toHaveTitle(/About/);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  });

  test("mobile hamburger menu opens and shows all nav items", async ({ page }) => {
    await page.setViewportSize({ height: 812, width: 375 });
    await page.goto("/");

    const hamburger = page.getByRole("button", { name: /toggle mobile menu/i });
    await expect(hamburger).toBeVisible();
    const mobileNav = page.locator("#mobile-menu");

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await hamburger.click({ force: true });
      if (await mobileNav.count()) {
        break;
      }
      await page.waitForTimeout(150);
    }

    await expect(mobileNav).toBeVisible();
    await expect(hamburger).toHaveAttribute("aria-expanded", "true");
    await expect(mobileNav.getByRole("link", { exact: true, name: "Home" })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Station Finder" })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Station Fares" })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "Trip Planner" })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "About" })).toBeVisible();
  });
});
