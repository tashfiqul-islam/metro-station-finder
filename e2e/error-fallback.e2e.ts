import type { Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { expectTabReachesEveryControl } from "./keyboard";
import { MEASURED_GOOGLE_NAME, installMapsStub } from "./maps-stub";

/** Browser-side script (a string, so no type gymnastics around overloads). Armed from the test. */
const THROW_ON_DISTANCE_FORMAT = `
  const original = Number.prototype.toFixed;
  Number.prototype.toFixed = function (...rest) {
    if (globalThis.failDistanceFormat === true) {
      throw new TypeError("lat=23.81 lng=90.41 https://example.test/stations?lat=23.81");
    }
    return original.apply(this, rest);
  };
`;

/** Makes the real success render throw: the slice formats the straight-line distance with `toFixed` once a place is chosen. */
async function failTheSuccessRender(page: Page): Promise<void> {
  await installMapsStub(page);
  await page.addInitScript(THROW_ON_DISTANCE_FORMAT);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeVisible();
  await page.evaluate(() => Reflect.set(globalThis, "failDistanceFormat", true));
  const search = page.getByRole("textbox", { name: MEASURED_GOOGLE_NAME, exact: true });
  await search.fill("motijheel");
  await search.press("Enter");
}

test.describe("error fallback in the production build (METRO-58)", () => {
  test.use({ allowedConsoleError: /^Render error: TypeError$/u });

  test("METRO-58 shows a named alert that takes focus, shows a focus ring and has no axe violations", async ({
    page,
  }) => {
    const logged: string[] = [];
    page.on("console", (message) => logged.push(message.text()));
    await failTheSuccessRender(page);
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
    await expect(page.getByRole("alert", { name: "Something went wrong" })).toBeFocused();
    await expectTabReachesEveryControl(page, { expected: 1 });
    await page.getByRole("button", { name: "Try again" }).focus();
    await page.keyboard.press("Enter");
    // Retry remounts the slice from its idle state, which does not format a distance, so the page recovers.
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
    await expect(page.getByRole("alert", { name: "Something went wrong" })).toHaveCount(0);
  });
});
