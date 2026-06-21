import { expect, test } from "@playwright/test";

test.describe("station finder map preview", () => {
  test("shows all station markers and opens a popup", async ({ page }) => {
    await page.goto("/station-finder");

    await expect(page.getByRole("heading", { name: /station finder/iu })).toBeVisible();

    const markers = page.locator('[data-testid^="station-marker-"]');
    await expect(markers).toHaveCount(17, { timeout: 30_000 });
    await expect(page.getByText(/loading map/iu)).toHaveCount(0);

    await page.getByTestId("station-marker-motijheel").click();
    await expect(page.getByText("Motijheel", { exact: true })).toBeVisible();
    await expect(page.getByText("motijheel", { exact: true })).toBeVisible();
  });

  test("shows offline overlay without crashing", async ({ context, page }, testInfo) => {
    test.skip(
      !["chromium", "mobile-chrome"].includes(testInfo.project.name),
      "Real offline back/forward remount is reproducible in Chromium-family projects here; Firefox and WebKit do not consistently replay the cached route entry against the Vite dev server once offline.",
    );

    await page.goto("/");
    await page.getByRole("link", { name: "Explore Stations" }).click();
    await expect(page.getByRole("heading", { name: /station finder/iu })).toBeVisible();

    await context.setOffline(true);

    await page.evaluate(() => {
      window.history.back();
    });
    await expect(page).toHaveURL(/\/$/u, { timeout: 15_000 });

    await page.evaluate(() => {
      window.history.forward();
    });

    await expect(page).toHaveURL(/\/station-finder$/u, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /station finder/iu })).toBeVisible();
    await expect(page.getByText(/offline - map unavailable/iu)).toBeVisible();
  });
});
