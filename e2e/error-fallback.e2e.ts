import type { Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { expectTabReachesEveryControl } from "./keyboard";

/** Browser-side script (a string, so no type gymnastics around `JSON.stringify` overloads). */
const THROW_ON_STATUS_STRINGIFY = `
  const original = JSON.stringify;
  JSON.stringify = function (value, ...rest) {
    if (typeof value === "object" && value !== null && "kind" in value) {
      throw new TypeError("lat=23.81 lng=90.41 https://example.test/stations?lat=23.81");
    }
    return original.call(this, value, ...rest);
  };
`;

/** Makes the real success render throw: App renders `JSON.stringify(status)` once the status loads. */
async function failTheSuccessRender(page: Page): Promise<void> {
  await page.addInitScript(THROW_ON_STATUS_STRINGIFY);
}

test.describe("error fallback in the production build (METRO-58)", () => {
  test.use({ allowedConsoleError: /^Render error: TypeError$/u });

  test("METRO-58 shows a named alert that takes focus, shows a focus ring and has no axe violations", async ({
    page,
  }) => {
    const logged: string[] = [];
    page.on("console", (message) => logged.push(message.text()));
    await failTheSuccessRender(page);
    await page.goto("/");
    const alert = page.getByRole("alert", { name: "Something went wrong" });
    await expect(alert).toBeFocused();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    const outline = await alert.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe("none");
    expect(outline.width).toBeGreaterThanOrEqual(2);
    expect((await axeBuilder(page).analyze()).violations).toEqual([]);
    // No coordinates or URL in the page or in what the app logged.
    const text = (await page.locator("body").textContent()) ?? "";
    expect(`${text}\n${logged.join("\n")}`).not.toMatch(/23\.81|90\.41|example\.test/u);
    expect(logged).toContain("Render error: TypeError");
  });

  test("METRO-58 Tab reaches the retry button and Enter retries", async ({ page }) => {
    await failTheSuccessRender(page);
    await page.goto("/");
    await expect(page.getByRole("alert", { name: "Something went wrong" })).toBeFocused();
    await expectTabReachesEveryControl(page, { expected: 1 });
    await page.getByRole("button", { name: "Try again" }).focus();
    await page.keyboard.press("Enter");
    // The child still throws, so the fallback comes back and takes focus again.
    await expect(page.getByRole("alert", { name: "Something went wrong" })).toBeFocused();
  });
});
