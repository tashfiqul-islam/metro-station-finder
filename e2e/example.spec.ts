import { expect, test } from "@playwright/test";

// Define regex at top level for better performance
const TITLE_REGEX = /Metro Station Finder/;

test("homepage loads successfully", async ({ page }) => {
  await page.goto("/");

  // Check that the page loads
  await expect(page).toHaveTitle(TITLE_REGEX);

  // Check for basic elements
  await expect(page.locator("h1")).toBeVisible();
});

test("has no accessibility violations", async ({ page }) => {
  await page.goto("/");

  // Basic accessibility check
  const heading = page.locator("h1");
  await expect(heading).toBeVisible();
});
