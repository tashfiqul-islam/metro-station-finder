import { expect, test } from "@playwright/test";

test.describe("station finder map preview", () => {
  test("shows all station markers and opens a popup", async ({ page }, testInfo) => {
    test.skip(
      ["mobile-safari", "webkit"].includes(testInfo.project.name),
      "WebKit projects intermittently boot this route into the offline shell under the Playwright dev server, so the live marker/popup map never mounts.",
    );

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
      "Offline overlay behavior is covered in Chromium-family projects here; Firefox and WebKit do not consistently replay this dev-server flow once offline.",
    );

    await page.goto("/");
    await page.getByRole("link", { name: "Explore Stations" }).click();
    await expect(page.getByRole("heading", { name: /station finder/iu })).toBeVisible();
    await expect(page.locator('[data-testid^="station-marker-"]')).toHaveCount(17, {
      timeout: 30_000,
    });
    await expect(page.getByText(/loading map/iu)).toHaveCount(0);

    await context.setOffline(true);
    await expect(page.getByText(/offline - map unavailable/iu)).toBeVisible();
  });
});
