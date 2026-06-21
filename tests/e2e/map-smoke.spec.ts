import { expect, test } from "@playwright/test";

test.describe("station finder map preview", () => {
  test("shows all station markers and opens a popup", async ({ browserName, page }) => {
    test.skip(browserName === "webkit", "Windows WebKit does not render the map markers reliably.");

    await page.goto("/station-finder");

    await expect(page.getByRole("heading", { name: /station finder/iu })).toBeVisible();

    const markers = page.locator('[data-testid^="station-marker-"]');
    await expect(markers).toHaveCount(17, { timeout: 15_000 });

    await page.getByTestId("station-marker-motijheel").click();
    await expect(page.getByText("Motijheel", { exact: true })).toBeVisible();
    await expect(page.getByText("motijheel", { exact: true })).toBeVisible();
  });

  test("shows offline overlay without crashing", async ({ context, page }) => {
    await context.addInitScript(() => {
      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        get: () => false,
      });
    });

    await page.goto("/station-finder");

    await expect(page).toHaveURL(/\/station-finder$/u);
    await expect(page.getByText(/offline - map unavailable/iu)).toBeVisible();
  });
});
