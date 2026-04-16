import { expect, test } from "@playwright/test";

test.describe("Home page", () => {
  test("loads and renders all section IDs", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#hero")).toBeVisible();
    await expect(page.locator("#story")).toBeVisible();
    await expect(page.locator("#tech-stack")).toBeVisible();
    await expect(page.locator("#features")).toBeVisible();
    await expect(page.locator("#journey")).toBeVisible();
    await expect(page.locator("#maintainer")).toBeVisible();
  });

  test("headline contains Precision", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toContainText("Precision");
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("primary CTA links to /station-finder", async ({ page }) => {
    await page.goto("/");
    const cta = page.locator("a[href='/station-finder']").first();
    await expect(cta).toBeVisible();
  });
});
