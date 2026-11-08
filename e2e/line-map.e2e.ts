import type { Locator, Page, Request } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

/**
 * METRO-111: the schematic line map in the real build with the enforced CSP. The map is pure SVG: it needs no
 * network, so it is also checked with the browser context offline. The maps stub keeps every Google request off
 * the network for the Nearby slice that sits beside it.
 */
const MAP_NAME = "Schematic map of MRT Line 6";
const FIT = "100 70 470 880";

async function open(page: Page, saved?: "light" | "dark"): Promise<void> {
  if (saved !== undefined) {
    await page.addInitScript((value) => localStorage.setItem("msf-theme", value), saved);
  }
  await installMapsStub(page);
  await page.goto("/");
  await expect(page.getByRole("application", { name: MAP_NAME, exact: true })).toBeVisible();
}

async function viewWidth(map: Locator): Promise<number> {
  const box = (await map.getAttribute("viewBox")) ?? "";
  return Number(box.split(" ")[2]);
}

test.describe("line map", () => {
  test("METRO-111 the map is an application named for the line, with a description and the full station list", async ({
    page,
  }) => {
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    await expect(map).toHaveAttribute("viewBox", FIT);
    await expect(map).toHaveAccessibleDescription(
      /^All 16 stations from Uttara North to Motijheel\./u,
    );
    const list = page.getByRole("list", { name: "Stations on MRT Line 6, north to south" });
    await expect(list.getByRole("listitem")).toHaveCount(16);
    await expect(list.getByRole("listitem").first()).toHaveText("Uttara North");
    await expect(list.getByRole("listitem").last()).toHaveText("Motijheel");
  });

  test("METRO-111 the map is one tab stop with a visible focus indicator and no inline style", async ({
    page,
  }) => {
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    await map.focus();
    await expect(map).toBeFocused();
    expect(await map.evaluate((node) => node.matches(":focus-visible")), "focus-visible").toBe(
      true,
    );
    // The map itself is the one [tabindex] stop; the only other controls are the three buttons.
    expect(await page.locator(".app__map [tabindex]").count()).toBe(1);
    expect(await page.locator(".app__map a, .app__map input, .app__map select").count()).toBe(0);
    expect(await page.locator(".app__map button").count()).toBe(3);
    expect(await page.locator(".app__map [style]").count()).toBe(0);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`METRO-111 the map passes axe in ${theme}`, async ({ page }) => {
      await open(page, theme);
      expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe(theme);
      const results = await axeBuilder(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }

  test("METRO-111 the map makes no network request and keeps working with the context offline", async ({
    page,
    context,
  }) => {
    // The app's own web-vitals beacon (ADR-0019) is not the map; answer it so going offline cannot log an error.
    await page.route("**/api/vitals", (route) => route.fulfill({ status: 204 }));
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    // Both lazy parts are loaded before the network goes away, so no chunk request can fail offline.
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
    await context.setOffline(true);
    const requests: Request[] = [];
    page.on("request", (request) => {
      if (!request.url().endsWith("/api/vitals")) requests.push(request);
    });
    await map.focus();
    await page.keyboard.press("ArrowRight");
    await expect(map).toBeFocused();
    await expect(map).not.toHaveAttribute("viewBox", FIT);
    await page.getByRole("button", { name: "Show whole line" }).click();
    await expect(map).toHaveAttribute("viewBox", FIT);
    await expect(map).toBeVisible();
    await expect(page.locator("svg.map circle.map__pin")).toHaveCount(16);
    expect(requests.map((request) => request.url())).toEqual([]);
  });

  test("METRO-111 the three controls are named 44 px buttons that zoom and fit at once", async ({
    page,
  }) => {
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    const group = page.getByRole("group", { name: "Map controls" });
    for (const name of ["Zoom in", "Zoom out", "Show whole line"]) {
      const box = await group.getByRole("button", { name, exact: true }).boundingBox();
      expect(box?.width, `${name} width`).toBeGreaterThanOrEqual(44);
      expect(box?.height, `${name} height`).toBeGreaterThanOrEqual(44);
    }
    await group.getByRole("button", { name: "Zoom in", exact: true }).click();
    const zoomed = await viewWidth(map);
    expect(zoomed).toBeLessThan(470);
    await group.getByRole("button", { name: "Zoom out", exact: true }).click();
    expect(await viewWidth(map)).toBeCloseTo(470, 1);
    await group.getByRole("button", { name: "Zoom in", exact: true }).click();
    await group.getByRole("button", { name: "Show whole line", exact: true }).click();
    await expect(map).toHaveAttribute("viewBox", FIT);
  });

  test("METRO-111 keys: arrows pan 60 px, plus and minus zoom, zero shows the whole line", async ({
    page,
  }) => {
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    await map.focus();
    const scale = await map.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return Math.min(rect.width / 470, rect.height / 880);
    });
    await page.keyboard.press("ArrowRight");
    const [x = 0, y = 0] = (await map.getAttribute("viewBox"))?.split(" ").map(Number) ?? [];
    expect(x - 100).toBeCloseTo(60 / scale, 1);
    expect(y).toBeCloseTo(70, 1);
    await page.keyboard.press("ArrowDown");
    const [, y2 = 0] = (await map.getAttribute("viewBox"))?.split(" ").map(Number) ?? [];
    expect(y2 - 70).toBeCloseTo(60 / scale, 1);
    await page.keyboard.press("0");
    await expect(map).toHaveAttribute("viewBox", FIT);
    await page.keyboard.press("+");
    expect(await viewWidth(map)).toBeCloseTo(470 / 1.5, 1);
    await page.keyboard.press("-");
    await page.keyboard.press("-");
    expect(await viewWidth(map)).toBeCloseTo(705, 0);
    await page.keyboard.press("0");
    await expect(map).toHaveAttribute("viewBox", FIT);
  });

  test("METRO-111 the wheel zooms and a pointer drag pans, within 0.5x and 8x", async ({
    page,
  }) => {
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    const box = await map.boundingBox();
    const cx = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    const cy = (box?.y ?? 0) + (box?.height ?? 0) / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -400);
    await expect.poll(() => viewWidth(map)).toBeLessThan(470);
    for (let i = 0; i < 40; i += 1) await page.mouse.wheel(0, -400);
    await expect.poll(() => viewWidth(map)).toBeCloseTo(470 / 8, 1);
    for (let i = 0; i < 80; i += 1) await page.mouse.wheel(0, 400);
    await expect.poll(() => viewWidth(map)).toBeCloseTo(940, 0);
    await page.getByRole("button", { name: "Show whole line" }).click();
    await page.getByRole("button", { name: "Zoom in" }).click();
    const before = (await map.getAttribute("viewBox")) ?? "";
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 80, cy - 40, { steps: 4 });
    await page.mouse.up();
    expect(await map.getAttribute("viewBox")).not.toBe(before);
  });

  test("METRO-111 under reduced motion the view changes at once, with no transition", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    await page.getByRole("button", { name: "Zoom in" }).click();
    // Read in the same turn as the click: nothing is animating towards the new box.
    expect(await viewWidth(map)).toBeCloseTo(470 / 1.5, 1);
    const motion = await map.evaluate((node) => {
      const style = getComputedStyle(node);
      return { transition: style.transitionDuration, animation: style.animationName };
    });
    // base.css clamps every transition under reduced motion to 0.00001s; the map has none of its own.
    expect(Number.parseFloat(motion.transition)).toBeLessThanOrEqual(0.001);
    expect(motion.animation).toBe("none");
  });
});
