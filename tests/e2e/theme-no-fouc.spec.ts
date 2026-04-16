import { expect, test } from "@playwright/test";

test.describe("Theme — no FOUC", () => {
  test("dark class is present immediately after domcontentloaded in dark system preference", async ({
    page,
  }) => {
    // Emulate dark system color scheme
    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Verify at domcontentloaded (no stored preference — defaults to system = dark)
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain("dark");
  });

  test("light class is present immediately when system preference is light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain("light");
  });

  test("stored theme overrides system preference", async ({ page }) => {
    // Pre-set localStorage to light before page loads
    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });

    // Emulate dark system preference
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Should be light (localStorage wins)
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain("light");
    expect(htmlClass).not.toContain("dark");
  });
});
