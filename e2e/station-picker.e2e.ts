import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { linksAreTabbable } from "./keyboard";
import { installMapsStub } from "./maps-stub";

/**
 * METRO-112: the station picker and the station result (local data, no network), in the real build with the enforced CSP. A pick
 * has no user position, so it must show no distance or walk and make no request of any kind.
 */
const MAP_NAME = "Schematic map of MRT Line 6";

async function open(page: Page, saved?: "light" | "dark"): Promise<void> {
  if (saved !== undefined) {
    await page.addInitScript((value) => localStorage.setItem("msf-theme", value), saved);
  }
  await installMapsStub(page);
  await page.goto("/");
  await expect(page.getByRole("application", { name: MAP_NAME, exact: true })).toBeVisible();
  await expect(combo(page)).toBeVisible();
}

const combo = (page: Page): Locator => page.getByRole("combobox", { name: "Or pick a station" });
const popup = (page: Page): Locator => page.getByRole("listbox", { name: "Stations" });
const snap = (page: Page): Promise<string | null> => page.locator(".app").getAttribute("data-snap");

async function pick(page: Page, text: string): Promise<void> {
  await combo(page).fill(text);
  await combo(page).press("Enter");
}

/**
 * Waits for the finite animations to end. The popup rises in (opacity and a few pixels of offset), so a colour or
 * a box measured at once is measured halfway through it (Firefox did both in METRO-113's runs). The primary
 * button's ping loops forever, so an endless animation is not awaited.
 */
const animationsEnded = (page: Page): Promise<unknown> =>
  page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => null)),
    ),
  );

test.describe("station picker", () => {
  // The fixture runs axe when each test ends, and several tests end just after the popup rose in.
  test.afterEach(async ({ page }) => {
    await animationsEnded(page);
  });

  test("METRO-112 the combobox has its role, name, description and a closed popup at rest", async ({
    page,
  }) => {
    await open(page);
    const box = combo(page);
    await expect(box).toHaveAttribute("aria-expanded", "false");
    await expect(box).toHaveAttribute("aria-autocomplete", "list");
    await expect(box).toHaveAccessibleDescription("Search all 16 stations by name.");
    const controls = await box.getAttribute("aria-controls");
    expect(await page.locator(`#${controls}`).getAttribute("role")).toBe("listbox");
    await expect(page.getByRole("option")).toHaveCount(0);
  });

  test("METRO-112 keys: ArrowDown and ArrowUp wrap, Enter picks, Escape twice clears, and the result heading takes focus", async ({
    page,
  }) => {
    await open(page);
    const box = combo(page);
    await box.fill("mir");
    await expect(box).toHaveAttribute("aria-expanded", "true");
    await expect(popup(page).getByRole("option")).toHaveCount(2);
    const first = popup(page).getByRole("option").first();
    await expect(box).toHaveAttribute(
      "aria-activedescendant",
      (await first.getAttribute("id")) ?? "",
    );
    await box.press("ArrowDown");
    await expect(popup(page).getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
    await box.press("ArrowDown");
    await expect(first).toHaveAttribute("aria-selected", "true");
    await box.press("ArrowUp");
    await expect(popup(page).getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
    await box.press("Escape");
    await expect(box).toHaveAttribute("aria-expanded", "false");
    await expect(box).toHaveValue("mir");
    await box.press("Escape");
    await expect(box).toHaveValue("");
    await box.press("ArrowDown");
    await expect(box).toHaveAttribute("aria-expanded", "true");
    await expect(popup(page).getByRole("option")).toHaveCount(16);
    await box.press("End");
    await expect(box).not.toHaveAttribute("aria-activedescendant", /.+/u);
    await box.press("ArrowDown");
    await box.press("Enter");
    const heading = page.getByRole("heading", { level: 2, name: "Uttara North" });
    await expect(heading).toBeFocused();
    await expect(heading).toHaveAttribute("tabindex", "-1");
  });

  test("METRO-112 a pick shows the station, the fare range, the footnote and the highlight on the map, and nothing about a walk", async ({
    page,
  }) => {
    await open(page);
    await pick(page, "karwan");
    const result = page.getByRole("article");
    await expect(result.getByRole("heading", { level: 2, name: "Karwan Bazar" })).toBeFocused();
    await expect(result).toContainText("Stop 12 of 16");
    await expect(result).toContainText("Single fare from here");
    await expect(result).toContainText("৳20");
    await expect(result).toContainText("৳80");
    await expect(result.getByText("20 taka", { exact: true })).toBeAttached();
    await expect(result.getByText("80 taka", { exact: true })).toBeAttached();
    await expect(result).toContainText(
      "Fares as of: DTCA notice dated 8 September 2022; last checked 5 November 2026.",
    );
    const text = (await page.getByRole("main").innerText()).split("Station\n").slice(1).join("");
    for (const word of [
      /\bkm\b/iu,
      /\bmin\b/iu,
      /walk/iu,
      /distance/iu,
      /also nearby/iu,
      /pass/iu,
    ]) {
      expect(text).not.toMatch(word);
    }
    // The map highlights the station.
    await expect(page.locator("svg.map .map__pin--hl")).toHaveCount(1);
    await expect(
      page.getByRole("application", { name: MAP_NAME, exact: true }),
    ).toHaveAccessibleDescription(/Highlighted: Karwan Bazar\./u);
    // The sheet settles at half.
    expect(await snap(page)).toBe("half");
  });

  test("METRO-112 the Directions link carries only the station's public coordinates", async ({
    page,
  }) => {
    await open(page);
    await pick(page, "motijheel");
    const link = page.getByRole("link", { name: /^Directions in Google Maps/u });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toContainText("(opens in a new tab)");
    const href = (await link.getAttribute("href")) ?? "";
    const url = new URL(href);
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(new Set(url.searchParams.keys())).toEqual(new Set(["api", "destination"]));
    // Motijheel's coordinate in the dataset; any other pair of numbers in the URL fails.
    expect(url.searchParams.get("destination")).toBe("23.728141,90.419341");
    expect(href.match(/-?\d+\.\d+/gu)).toHaveLength(2);
  });

  test("METRO-112 the one polite status announces the count and the no-match text, never the button", async ({
    page,
  }) => {
    await open(page);
    const status = page.locator(".pick__combo output");
    await expect(status).toHaveText("");
    await combo(page).fill("mir");
    await expect(status).toHaveText("2 stations");
    await combo(page).fill("mirpur 11");
    await expect(status).toHaveText("1 station");
    await combo(page).fill("Sadarghat");
    await expect(status).toHaveText("No station matches that name.");
    await expect(status.getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Browse all 16 stations" })).toBeVisible();
    await combo(page).fill("");
    await expect(status).toHaveText("");
  });

  test("METRO-112 no match: the message and Browse all stay reachable after the input loses focus", async ({
    page,
  }) => {
    await open(page);
    const box = combo(page);
    await box.fill("Sadarghat");
    await expect(page.getByText("No station matches that name.")).toBeVisible();
    await expect(box).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Clear station search" })).toBeFocused();
    await page.keyboard.press("Tab");
    const browse = page.getByRole("button", { name: "Browse all 16 stations" });
    await expect(browse).toBeFocused();
    await expect(page.getByText("No station matches that name.")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(box).toBeFocused();
    await expect(popup(page).getByRole("option")).toHaveCount(16);
  });

  test("METRO-112 typing opens the sheet to full and the suggestions are visible, on top and scroll within the list", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    expect(await snap(page)).toBe("half");
    await combo(page).fill("a");
    expect(await snap(page)).toBe("full");
    const list = popup(page);
    await expect(list.getByRole("option")).not.toHaveCount(0);
    await animationsEnded(page);
    const viewport = page.viewportSize();
    const header = await page.locator(".app-header").boundingBox();
    const box = await list.boundingBox();
    if (box === null || header === null || viewport === null) throw new Error("no layout");
    expect(box.y, "below the header").toBeGreaterThanOrEqual(header.y + header.height);
    expect(box.y + box.height, "inside the viewport").toBeLessThanOrEqual(viewport.height);
    // The list is the topmost thing at its own first option (nothing covers it), and it scrolls inside itself.
    const covered = await list.evaluate((node) => {
      const option = node.querySelector("[role=option]");
      const rect = option?.getBoundingClientRect();
      if (option === null || option === undefined || rect === undefined) return true;
      const top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return !(top !== null && option.contains(top));
    });
    expect(covered).toBe(false);
    const scroll = await list.evaluate((node) => ({
      overflowY: getComputedStyle(node).overflowY,
      scrolls: node.scrollHeight > node.clientHeight,
    }));
    expect(scroll.overflowY).toBe("auto");
    expect(scroll.scrolls, "16 options do not fit the list").toBe(true);
    // ArrowUp wraps to the last option and brings it into the list.
    await combo(page).press("ArrowUp");
    const inside = await list.evaluate((node) => {
      const option = node.querySelector("[aria-selected=true]")?.getBoundingClientRect();
      const frame = node.getBoundingClientRect();
      return (
        option !== undefined && option.top >= frame.top - 1 && option.bottom <= frame.bottom + 1
      );
    });
    expect(inside).toBe(true);
    expect(await list.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  });

  test("METRO-112 Show on map drops the sheet to peek and moves focus to the map", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await pick(page, "farmgate");
    await page.getByRole("button", { name: "Show on map" }).click();
    expect(await snap(page)).toBe("peek");
    await expect(page.getByRole("application", { name: MAP_NAME, exact: true })).toBeFocused();
  });

  test("METRO-112 Tab reaches the Home link first, the picker after the location controls, and the map last", async ({
    page,
  }) => {
    await open(page);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    const stops: { region: string; name: string }[] = [];
    for (let press = 0; press < 30; press += 1) {
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
        return {
          region,
          name:
            element.getAttribute("aria-label") ||
            document.querySelector(`label[for="${element.id}"]`)?.textContent ||
            element.textContent ||
            "",
        };
      });
      stops.push(stop);
      if (stop.name === "Show whole line") break;
    }
    expect(stops[0]?.region).toBe("header");
    if (await linksAreTabbable(page)) expect(stops[0]?.name).toMatch(/home/iu);
    const names = stops.map((stop) => stop.name);
    const locate = names.indexOf("Use my location");
    const picker = names.indexOf("Or pick a station");
    expect(locate, "location button").toBeGreaterThan(-1);
    expect(picker, "picker").toBeGreaterThan(locate);
    const firstMap = stops.findIndex((stop) => stop.region === "map");
    expect(firstMap).toBeGreaterThan(picker);
    expect(stops.slice(firstMap).map((stop) => stop.region)).toEqual(["map", "map", "map", "map"]);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`METRO-112 the open list, the no-match state and the result pass axe in ${theme}`, async ({
      page,
    }) => {
      await open(page, theme);
      expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe(theme);
      await combo(page).fill("mir");
      await expect(popup(page).getByRole("option")).toHaveCount(2);
      // The popup rises in (opacity); axe must not measure colours halfway through it.
      await animationsEnded(page);
      expect((await axeBuilder(page).analyze()).violations.map((v) => v.id)).toEqual([]);
      await combo(page).fill("Sadarghat");
      await expect(page.getByText("No station matches that name.")).toBeVisible();
      expect((await axeBuilder(page).analyze()).violations.map((v) => v.id)).toEqual([]);
      await pick(page, "shahbagh");
      await expect(page.getByRole("heading", { level: 2, name: "Shahbag" })).toBeFocused();
      expect((await axeBuilder(page).analyze()).violations.map((v) => v.id)).toEqual([]);
    });
  }

  test("METRO-112 reduced motion: the popup does not animate", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    await combo(page).fill("mir");
    const name = await popup(page).evaluate((node) => getComputedStyle(node).animationName);
    expect(name).toBe("none");
  });

  test("METRO-112 motion allowed: the popup animation exists (the control for the reduced-motion test)", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open(page);
    await combo(page).fill("mir");
    const name = await popup(page).evaluate((node) => getComputedStyle(node).animationName);
    expect(name).not.toBe("none");
  });

  test("METRO-112 the picker and its result use no inline style", async ({ page }) => {
    await open(page);
    await pick(page, "karwan");
    expect(await page.locator(".pick [style], .pick[style]").count()).toBe(0);
    expect(await page.locator("[style]").count()).toBe(0);
  });

  test("METRO-112 picking works with the context offline and makes no request of any kind", async ({
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
    page.on("websocket", (socket) => requests.push(socket.url()));
    await page.route("**/api/vitals", (route) => route.fulfill({ status: 204 }));
    await open(page);
    await expect
      .poll(() => requests.some((url) => url.includes("web-vitals-")), { timeout: 10_000 })
      .toBe(true);
    await expect
      .poll(() => requests.filter((url) => !settled.has(url)).length, { timeout: 10_000 })
      .toBe(0);
    // The result's eyebrow uses the mono font, which the browser fetches the first time
    // it is drawn. Draw them online first (a first-ever offline use shows the system mono font until the
    // offline cache of METRO-106 holds the file; recorded in docs/evidence/metro-112.md), then go offline.
    await pick(page, "motijheel");
    await expect(page.getByRole("article")).toBeVisible();
    await expect
      .poll(() => requests.some((url) => url.includes("jetbrains-mono")), { timeout: 10_000 })
      .toBe(true);
    await expect
      .poll(() => requests.filter((url) => !settled.has(url)).length, { timeout: 10_000 })
      .toBe(0);
    const loaded = requests.length;
    await context.setOffline(true);
    await pick(page, "karwan");
    await expect(page.getByRole("heading", { level: 2, name: "Karwan Bazar" })).toBeFocused();
    await expect(page.locator("svg.map .map__pin--hl")).toHaveCount(1);
    await combo(page).fill("Sadarghat");
    await expect(page.getByText("No station matches that name.")).toBeVisible();
    await page.getByRole("button", { name: "Browse all 16 stations" }).click();
    await expect(popup(page).getByRole("option")).toHaveCount(16);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("article")).toBeVisible();
    // Not one request after the network went away: no fetch, no beacon, no image, no stylesheet, no socket.
    expect(requests.slice(loaded).filter((url) => !url.endsWith("/api/vitals"))).toEqual([]);
    const origin = new URL(baseURL ?? "").origin;
    expect(
      requests.filter(
        (url) => !(url.startsWith(`${origin}/`) || url.startsWith("https://maps.googleapis.com/")),
      ),
    ).toEqual([]);
  });

  test("METRO-112 the built files carry no Sample data tag and no mock-only class", () => {
    const dist = "apps/web/dist";
    const names = readdirSync(dist, { recursive: true, withFileTypes: true }).filter(
      (entry) => entry.isFile() && /\.(css|html|js|json|svg|txt|webmanifest)$/u.test(entry.name),
    );
    expect(names.length).toBeGreaterThan(8);
    const marker = /sample data|mock-only|tag--sample/iu;
    const found = names
      .filter((entry) => marker.test(readFileSync(join(entry.parentPath, entry.name), "utf8")))
      .map((entry) => entry.name);
    expect(found).toEqual([]);
    // METRO-112 forbade the word in every built script until the offline shell worker of METRO-106 existed
    // (owner ruling). It exists now, so the claim may appear, but exactly in one place and only with the
    // worker in the build: comments are stripped, so any "offline" in a built script is a user-visible string.
    // This still fails on any other claim: a second file, a second sentence, or the sentence without the worker.
    const claims = names.filter(
      (entry) =>
        /\.(js|html)$/u.test(entry.name) &&
        /offline/iu.test(readFileSync(join(entry.parentPath, entry.name), "utf8")),
    );
    expect(claims.map((entry) => entry.name)).toHaveLength(1);
    const [claimFile] = claims;
    const claimText = readFileSync(
      join(claimFile?.parentPath ?? "", claimFile?.name ?? ""),
      "utf8",
    );
    expect(claimFile?.name).toMatch(/^Nearby-.*\.js$/u);
    expect(claimText.match(/offline/giu)).toHaveLength(1);
    expect(claimText).toContain(
      "You’re offline. Stations and fares still work. Place search returns when you reconnect.",
    );
    // Backed by the worker: sw.js is built beside index.html, precaches the shell, and the app registers it.
    const worker = readFileSync(join(dist, "client", "sw.js"), "utf8");
    expect(worker).toContain("metro-shell-");
    expect(worker).toContain("precache");
    const registration = names.find((entry) => /^register-.*\.js$/u.test(entry.name));
    expect(registration).toBeDefined();
    expect(
      readFileSync(join(registration?.parentPath ?? "", registration?.name ?? ""), "utf8"),
    ).toContain("/sw.js");
    // Control: the check reads real files (the lazy screen's chunk is among them) and its pattern can match.
    expect(names.some((entry) => /^Nearby-.*\.js$/u.test(entry.name))).toBe(true);
    expect(marker.test('<span class="tag--sample mock-only">Sample data</span>')).toBe(true);
  });
});
