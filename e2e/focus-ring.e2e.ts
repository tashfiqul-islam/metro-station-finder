import type { Locator, Page, TestInfo } from "@playwright/test";

import { expect, test } from "./fixtures";
import { installMapsStub, stubGeolocation } from "./maps-stub";

/**
 * METRO-118: script-moved focus (the result heading) draws a ring only when the last input was the keyboard
 * (`:focus-visible`); a tap or click leaves no ring. The error fallback keeps its forced ring after any input.
 * Computed style is asserted, not screenshots. Synthetic coordinates only; no real Google call.
 */
const NEAR_UTTARA_NORTH = { lat: 23.87, lng: 90.367 } as const;
const MAP_NAME = "Schematic map of MRT Line 6";

const locate = (page: Page): Locator => page.getByRole("button", { name: "Use my location" });
const combo = (page: Page): Locator => page.getByRole("combobox", { name: "Or pick a station" });
const resultName = (page: Page): Locator => page.locator("h2.result__name");

async function open(page: Page): Promise<void> {
  await installMapsStub(page);
  await page.goto("/");
  await expect(page.getByRole("application", { name: MAP_NAME, exact: true })).toBeVisible();
  await expect(locate(page)).toBeVisible();
}

/** A tap on a touch-emulated project (mobile-chrome), a click elsewhere. */
async function press(target: Locator, info: TestInfo): Promise<void> {
  if (info.project.use.hasTouch === true) await target.tap();
  else await target.click();
}

/** Whether the element draws an outline or a box-shadow ring right now. */
async function ring(target: Locator): Promise<{ outline: boolean; shadow: boolean }> {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outline: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0,
      shadow: style.boxShadow !== "none",
    };
  });
}

async function animationsEnded(page: Page): Promise<unknown> {
  return page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => null)),
    ),
  );
}

test.describe("focus ring after script-moved focus (METRO-118)", () => {
  test("METRO-118 a tap or click on Use my location moves focus to the heading and draws no ring", async ({
    page,
  }, info) => {
    await stubGeolocation(page, NEAR_UTTARA_NORTH);
    await open(page);
    await press(locate(page), info);
    await expect(resultName(page)).toBeFocused();
    await animationsEnded(page);
    expect(await ring(resultName(page))).toEqual({ outline: false, shadow: false });
  });

  test("METRO-118 picking a station with the pointer moves focus to the heading and draws no ring", async ({
    page,
  }, info) => {
    await open(page);
    await press(combo(page), info);
    // `fill` types no key, so the last input stays the pointer.
    await combo(page).fill("motijheel");
    await press(page.getByRole("listbox", { name: "Stations" }).getByRole("option").first(), info);
    await expect(resultName(page)).toBeFocused();
    await animationsEnded(page);
    expect(await ring(resultName(page))).toEqual({ outline: false, shadow: false });
  });

  test("METRO-118 Use my location from the keyboard moves focus to the heading and draws a ring", async ({
    page,
  }) => {
    await stubGeolocation(page, NEAR_UTTARA_NORTH);
    await open(page);
    await locate(page).focus();
    await page.keyboard.press("Enter");
    await expect(resultName(page)).toBeFocused();
    await animationsEnded(page);
    expect((await ring(resultName(page))).outline).toBe(true);
    await expect(resultName(page)).toHaveCSS("outline-style", "solid");
  });

  test("METRO-118 picking a station from the keyboard moves focus to the heading and draws a ring", async ({
    page,
  }) => {
    await open(page);
    await combo(page).focus();
    await combo(page).fill("motijheel");
    await page.keyboard.press("Enter");
    await expect(resultName(page)).toBeFocused();
    await animationsEnded(page);
    expect((await ring(resultName(page))).outline).toBe(true);
  });

  test.describe("error fallback", () => {
    test.use({ allowedConsoleError: /^Render error: TypeError$/u });

    test("METRO-118 the error fallback keeps its ring after a pointer action", async ({
      page,
    }, info) => {
      await stubGeolocation(page, NEAR_UTTARA_NORTH);
      await page.addInitScript(`
        const original = Number.prototype.toFixed;
        Number.prototype.toFixed = function (...rest) {
          if (globalThis.failDistanceFormat === true) throw new TypeError("synthetic");
          return original.apply(this, rest);
        };
      `);
      await open(page);
      await page.evaluate(() => Reflect.set(globalThis, "failDistanceFormat", true));
      await press(locate(page), info);
      const alert = page.getByRole("alert", { name: "Something went wrong" });
      await expect(alert).toBeFocused();
      expect((await ring(alert)).outline).toBe(true);
      await expect(alert).toHaveCSS("outline-width", "3px");
    });
  });
});
