import type { Locator, Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { linksAreTabbable } from "./keyboard";
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

  test("METRO-111 the map adds no request of its own and keeps working with the context offline", async ({
    page,
    context,
    baseURL,
  }) => {
    // The listener is attached before the page loads, so every request is seen, the chunk loads included.
    const requests: string[] = [];
    const settled = new Set<string>();
    page.on("request", (request) => requests.push(request.url()));
    page.on("requestfinished", (request) => settled.add(request.url()));
    page.on("requestfailed", (request) => settled.add(request.url()));
    // The app's own web-vitals beacon (ADR-0019) is not the map; answer it so going offline cannot log an error.
    await page.route("**/api/vitals", (route) => route.fulfill({ status: 204 }));
    await open(page);
    const map = page.getByRole("application", { name: MAP_NAME, exact: true });
    // Both lazy parts are loaded before the network goes away, so no chunk request can fail offline.
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
    // Everything the page asked for is a same-origin app file, the vitals beacon, or the Nearby slice's own
    // (stubbed) Maps API: the map and its chunk reach no other host.
    const origin = new URL(baseURL ?? "").origin;
    const allowed = (url: string): boolean =>
      (url.startsWith(`${origin}/`) && !url.startsWith(`${origin}/api/`)) ||
      url === `${origin}/api/vitals` ||
      url.startsWith("https://maps.googleapis.com/");
    expect(requests.filter((url) => !allowed(url))).toEqual([]);
    // The app loads its web-vitals chunk when the page is idle; wait for it, and for every request, to settle
    // before the network goes away, so no late load of the app's own can fail offline.
    await expect
      .poll(() => requests.some((url) => url.includes("web-vitals-")), { timeout: 10_000 })
      .toBe(true);
    await expect
      .poll(() => requests.filter((url) => !settled.has(url)).length, { timeout: 10_000 })
      .toBe(0);
    const loaded = requests.length;
    await context.setOffline(true);
    await map.focus();
    await page.keyboard.press("ArrowRight");
    await expect(map).toBeFocused();
    await expect(map).not.toHaveAttribute("viewBox", FIT);
    await page.getByRole("button", { name: "Show whole line" }).click();
    await expect(map).toHaveAttribute("viewBox", FIT);
    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.mouse.move(300, 300);
    await page.mouse.wheel(0, -200);
    await expect(map).toBeVisible();
    await expect(page.locator("svg.map circle.map__pin")).toHaveCount(16);
    // Using the map made no request at all (the vitals beacon is the app's, answered by the route above).
    expect(requests.slice(loaded).filter((url) => !url.endsWith("/api/vitals"))).toEqual([]);
  });

  test("METRO-111 Tab reaches the Home link first, the panel next, and the map and its buttons last", async ({
    page,
  }) => {
    await open(page);
    await expect(page.getByRole("button", { name: "Use my location" })).toBeVisible();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    const regions: string[] = [];
    let first = "";
    for (let press = 0; press < 25; press += 1) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof Element)) return { region: "none", name: "" };
        const region = element.closest(".app__map")
          ? "map"
          : element.closest("header")
            ? "header"
            : element.closest("main")
              ? "panel"
              : "other";
        return { region, name: element.getAttribute("aria-label") ?? element.textContent ?? "" };
      });
      if (press === 0) first = stop.name;
      regions.push(stop.region);
      if (stop.name === "Show whole line") break;
    }
    // The first stop is in the header (the Home link where this browser Tabs to links, else the theme button).
    expect(regions[0]).toBe("header");
    if (await linksAreTabbable(page)) expect(first).toMatch(/home/iu);
    const firstMap = regions.indexOf("map");
    const lastPanel = regions.lastIndexOf("panel");
    expect(lastPanel, "the panel has stops").toBeGreaterThanOrEqual(2);
    expect(firstMap, "the map comes after every panel control").toBeGreaterThan(lastPanel);
    expect(regions.slice(firstMap)).toEqual(["map", "map", "map", "map"]);
  });

  for (const size of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    test(`METRO-111 the controls sit where the handoff draws them, clear of the header, at ${size.width} px`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await open(page);
      const controls = await page.locator(".map-controls").boundingBox();
      const header = await page.locator(".app-header > *").first().boundingBox();
      if (controls === null || header === null) throw new Error("no layout");
      const phone = size.width < 768;
      // These are the offsets of the handoff (top 66 or 84 px, right space-3 or space-4). They depend on the
      // shell's map frame insets in shell.css, so a change there fails this test instead of moving the buttons.
      const gap = await page.evaluate(
        (name) =>
          Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)),
        phone ? "--space-3" : "--space-4",
      );
      expect(controls.y).toBeCloseTo(phone ? 66 : 84, 0);
      expect(size.width - (controls.x + controls.width)).toBeCloseTo(gap, 0);
      expect(controls.y, "below the header's first control").toBeGreaterThanOrEqual(
        header.y + header.height,
      );
    });
  }

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
    // React applies a drag at "continuous" priority, so the new box can land a moment after the pointer is up.
    await expect(map).not.toHaveAttribute("viewBox", before);
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
