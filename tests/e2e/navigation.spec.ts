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
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveTitle(/Metro Station Finder/);
  });

  test("no full-page reload when clicking nav links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.setViewportSize({ height: 800, width: 1280 });

    // Track full-page load events — SPA navigation should not trigger them
    let loadCount = 0;
    page.on("load", () => {
      loadCount += 1;
    });

    // Reset counter after initial load
    loadCount = 0;

    // Click the About nav link
    const aboutLinks = page.getByText("About");
    await aboutLinks.first().click();
    await page.waitForTimeout(500);

    // A proper SPA navigation should not fire a new page load
    expect(loadCount).toBe(0);
  });

  test("mobile hamburger menu opens and shows all nav items", async ({ page }) => {
    await page.setViewportSize({ height: 812, width: 375 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const hamburger = page.getByRole("button", { name: /toggle mobile menu/i });
    await hamburger.click();

    const mobileNav = page.getByRole("navigation", { name: "Mobile navigation" });
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByText("Home")).toBeVisible();
    await expect(mobileNav.getByText("Station Finder")).toBeVisible();
    await expect(mobileNav.getByText("Station Fares")).toBeVisible();
    await expect(mobileNav.getByText("Trip Planner")).toBeVisible();
    await expect(mobileNav.getByText("About")).toBeVisible();
  });
});
