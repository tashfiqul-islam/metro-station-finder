import type { Locator, Page, Request } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import {
  expectNoCoordinateInApi,
  installMapsStub,
  plainSearch,
  searchForPlace,
  stubGeolocation,
  trackApiRequests,
  widgetSearch,
} from "./maps-stub";
import type { StubOptions } from "./maps-stub";

/**
 * METRO-114: Google on top of the plain page. The place search is a plain input until its first focus; the
 * Maps script, the Places widget and the Routes call all wait for something to ask. Only fakes are involved:
 * `installMapsStub` answers the script and aborts every other Google host, so no test reaches Google.
 */
const NOTICE = "Place search is unavailable right now. Pick a station instead.";
const NO_CONNECTION =
  "You’re offline. Stations and fares still work. Place search returns when you reconnect.";
const HINT = "Suggestions favor places in Dhaka.";
const ROUTE_TEXT = "about 1.2 km, 15 min · est.";
const GOOD_FIX = { lat: 23.87, lng: 90.367, accuracy: 20 } as const;

async function open(page: Page, options: StubOptions = {}, theme?: "light" | "dark") {
  if (theme !== undefined) {
    await page.addInitScript((value) => localStorage.setItem("msf-theme", value), theme);
  }
  const stub = await installMapsStub(page, options);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeVisible();
  return stub;
}

const locate = (page: Page): Locator => page.getByRole("button", { name: "Use my location" });
const combo = (page: Page): Locator => page.getByRole("combobox", { name: "Or pick a station" });
const heading = (page: Page, name: string): Locator =>
  page.getByRole("heading", { level: 2, name });
const snap = (page: Page): Promise<string | null> => page.locator(".app").getAttribute("data-snap");
const smallNotice = (page: Page): Locator => page.locator(".notice[data-size='sm']");

async function settle(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => null)),
    ),
  );
}

/** Pretends the browser reports no connection, until `reconnect` runs. */
async function noConnection(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Reflect.set(window, "__connected", false);
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => Reflect.get(window, "__connected") !== false,
    });
  });
}

async function reconnect(page: Page): Promise<void> {
  await page.evaluate(() => {
    Reflect.set(window, "__connected", true);
    window.dispatchEvent(new Event("online"));
  });
}

test.describe("place search on first focus (METRO-114)", () => {
  test.afterEach(async ({ page }) => {
    await settle(page);
  });

  test("METRO-114 before the first focus there is no Google script and no Google request, and the field is plain", async ({
    page,
  }) => {
    const hosts: string[] = [];
    page.on("request", (request: Request) => hosts.push(new URL(request.url()).host));
    const stub = await open(page);
    // Let the page's own lazy chunks and its web-vitals chunk load, so "nothing yet" is not just "too early".
    await expect
      .poll(() => hosts.length, { message: "the page loaded its assets" })
      .toBeGreaterThan(5);
    await expect(page.getByText("Search for a place", { exact: true })).toBeVisible();
    await expect(page.getByText(HINT)).toBeVisible();
    const plain = plainSearch(page);
    await expect(plain).toBeVisible();
    await expect(plain).toHaveAccessibleDescription(HINT);
    // The visible label is a real label for the input.
    await expect(page.locator("label[for='place-input']")).toHaveText("Search for a place");
    expect(await page.locator("gmp-place-autocomplete, fake-place-autocomplete").count()).toBe(0);
    // Pressing and releasing other controls does not ask either (a Tab through the page is not a focus on it).
    await combo(page).focus();
    expect(hosts.filter((host) => host !== new URL(page.url()).host)).toEqual([]);
    const calls = await stub.calls();
    expect(calls.scriptUrls).toEqual([]);
    expect(calls.fetchFields).toEqual([]);
    expect(stub.blocked).toEqual([]);
    // Control: the first focus is what asks, once.
    await plain.focus();
    await expect(widgetSearch(page)).toBeVisible();
    expect((await stub.calls()).scriptUrls).toHaveLength(1);
  });

  test("METRO-114 the first focus swaps the widget in, keeping focus and the text, with the caret at the end", async ({
    page,
  }) => {
    await open(page);
    await plainSearch(page).fill("moti");
    const widget = widgetSearch(page);
    await expect(widget).toBeVisible();
    await expect(widget).toHaveValue("moti");
    await expect(widget).toBeFocused();
    expect(await widget.evaluate((node: HTMLInputElement) => node.selectionStart)).toBe(4);
    // The plain input is gone from the tab order and the page, not just covered.
    await expect(plainSearch(page)).toBeHidden();
    // Typing continues in the widget without a click.
    await page.keyboard.type("jheel");
    await expect(widget).toHaveValue("motijheel");
  });

  test("METRO-114 typing before the load completes is kept, and typing goes on after the swap", async ({
    page,
  }) => {
    const stub = await open(page, { scriptDelayMs: 1500 });
    const plain = plainSearch(page);
    await plain.focus();
    await page.keyboard.type("moti");
    // Still waiting for the script: the plain input is on screen and holds what was typed.
    await expect(plain).toBeVisible();
    await expect(plain).toHaveValue("moti");
    expect((await stub.calls()).scriptUrls).toHaveLength(1);
    const widget = widgetSearch(page);
    await expect(widget).toBeVisible({ timeout: 10_000 });
    await expect(widget).toHaveValue("moti");
    await expect(widget).toBeFocused();
    await page.keyboard.type("jheel");
    await widget.press("Enter");
    await expect(heading(page, "Motijheel")).toBeFocused();
  });

  test("METRO-114 a user who moved on before the swap does not get focus pulled back", async ({
    page,
  }) => {
    await open(page, { scriptDelayMs: 1000 });
    await plainSearch(page).focus();
    await combo(page).focus();
    await expect(widgetSearch(page)).toBeVisible({ timeout: 10_000 });
    await expect(combo(page)).toBeFocused();
  });

  test("METRO-114 a place replaces a picked station and a pick replaces a place; each place asks for one route", async ({
    page,
  }) => {
    const stub = await open(page);
    await combo(page).fill("farm");
    await combo(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await expect(page.locator(".ticket")).toHaveCount(1);
    expect((await stub.calls()).routes).toEqual([]);
    await searchForPlace(page, "uttara");
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    await expect(page.locator(".ticket")).toHaveCount(0);
    await expect(page.getByRole("article")).toHaveCount(1);
    // The place used the production footnote, not a sample marker.
    await expect(page.getByText(/^Fares as of: DTCA notice dated/u)).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/sample data/iu);
    await expect(page.locator("svg.map .map__me")).toHaveCount(0);
    expect((await stub.calls()).routes).toHaveLength(1);
    await combo(page).fill("farm");
    await combo(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await expect(page.locator(".result")).toHaveCount(0);
    expect((await stub.calls()).routes).toHaveLength(1);
  });

  test("METRO-114 Routes: a good fix 1, a theme change 0 more, a pick 0 more, a rough fix 0", async ({
    page,
  }) => {
    await stubGeolocation(page, GOOD_FIX);
    const stub = await open(page);
    await locate(page).click();
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    expect((await stub.calls()).routes).toHaveLength(1);
    // A re-render caused by the theme toggle asks for nothing more.
    await page.getByRole("button", { name: /theme/iu }).click();
    await page.waitForTimeout(500);
    expect((await stub.calls()).routes).toHaveLength(1);
    await combo(page).fill("farm");
    await combo(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await page.waitForTimeout(300);
    expect((await stub.calls()).routes).toHaveLength(1);
  });

  test("METRO-114 a rough fix asks Google for nothing: no script, no route", async ({ page }) => {
    await stubGeolocation(page, { lat: 23.87, lng: 90.367, accuracy: 25_000 });
    const stub = await open(page);
    await locate(page).click();
    await expect(
      page.getByRole("group", { name: /found your position only roughly/u }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    const calls = await stub.calls();
    expect(calls.scriptUrls).toEqual([]);
    expect(calls.routes).toEqual([]);
  });

  test("METRO-114 a result replaced before the script arrives never makes its route request", async ({
    page,
  }) => {
    await stubGeolocation(page, GOOD_FIX);
    const stub = await open(page, { scriptDelayMs: 1200 });
    await locate(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(page.getByText("Finding the walking route…")).toBeVisible();
    await combo(page).fill("farm");
    await combo(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    // Wait past the script delay: it arrives, and the replaced result must not ask for its route.
    await expect.poll(async () => (await stub.calls()).scriptUrls.length).toBe(1);
    await page.waitForTimeout(2000);
    expect((await stub.calls()).routes).toEqual([]);
    await expect(page.locator(".result")).toHaveCount(0);
  });

  test("METRO-114 a route answering after its result was replaced is not shown", async ({
    page,
  }) => {
    await stubGeolocation(page, GOOD_FIX);
    const stub = await open(page, { routeDelayMs: 1200 });
    await locate(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect.poll(async () => (await stub.calls()).routes.length).toBe(1);
    await combo(page).fill("farm");
    await combo(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await page.waitForTimeout(2000);
    await expect(page.getByText(ROUTE_TEXT)).toHaveCount(0);
    await expect(page.locator(".result")).toHaveCount(0);
    await expect(heading(page, "Farmgate")).toBeFocused();
  });

  test("METRO-114 no position reaches our /api on the place or the route path", async ({
    page,
  }) => {
    await stubGeolocation(page, GOOD_FIX);
    await open(page);
    const apiRequests = trackApiRequests(page);
    await locate(page).click();
    await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
    await searchForPlace(page, "motijheel");
    await expect(heading(page, "Motijheel")).toBeFocused();
    await expectNoCoordinateInApi(page, apiRequests);
  });
});

test.describe("place search that cannot start (METRO-114)", () => {
  test.afterEach(async ({ page }) => {
    await settle(page);
  });

  test("METRO-114 no connection at render: only the notice, from the start, and the field returns when the connection does", async ({
    page,
  }) => {
    await noConnection(page);
    const stub = await open(page);
    const notice = smallNotice(page);
    await expect(notice).toContainText(NO_CONNECTION);
    // Label, hint and field are gone, and no disabled field stands in for them.
    await expect(page.getByText("Search for a place", { exact: true })).toHaveCount(0);
    await expect(page.getByText(HINT)).toHaveCount(0);
    await expect(page.locator("#place-input")).toHaveCount(0);
    await expect(page.getByRole("textbox")).toHaveCount(0);
    // A status region mounted from the start (not an alert that interrupts).
    await expect(page.getByRole("status").filter({ hasText: NO_CONNECTION })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect((await stub.calls()).scriptUrls).toEqual([]);
    await reconnect(page);
    await expect(plainSearch(page)).toBeVisible();
    await expect(page.getByText(HINT)).toBeVisible();
    await expect(smallNotice(page)).toHaveCount(0);
    // Back to normal: the first focus loads the stub.
    await plainSearch(page).focus();
    await expect(widgetSearch(page)).toBeVisible();
    // The notice is the handoff's own sentence; its claim is backed by the offline shell worker (METRO-106).
    expect(NO_CONNECTION).toContain("Stations and fares still work");
  });

  test.describe("when the Maps script cannot load", () => {
    test.use({ allowedConsoleError: /Failed to load resource|ERR_FAILED/u });

    test("METRO-114 a failed load after the first focus replaces the field with the notice and puts focus there", async ({
      page,
    }) => {
      await open(page, { scriptFails: true });
      await plainSearch(page).focus();
      const notice = smallNotice(page);
      await expect(notice).toContainText(NOTICE);
      await expect(notice).toBeFocused();
      await expect(page.getByText("Search for a place", { exact: true })).toHaveCount(0);
      await expect(page.getByText(HINT)).toHaveCount(0);
      await expect(page.getByRole("textbox")).toHaveCount(0);
      // The notice is part of the page, not an interruption.
      await expect(page.getByRole("alert")).toHaveCount(0);
      // The picker still works.
      await combo(page).fill("farm");
      await combo(page).press("Enter");
      await expect(heading(page, "Farmgate")).toBeFocused();
    });

    test("METRO-114 the failure with the location notice open: the search action is left out", async ({
      page,
    }) => {
      await stubGeolocation(page, "unavailable");
      await open(page, { scriptFails: true });
      await plainSearch(page).focus();
      await expect(smallNotice(page)).toContainText(NOTICE);
      await locate(page).click();
      const group = page.getByRole("group", {
        // METRO-120: with place search gone the notice's step is the available one.
        name: "Your position could not be found. Pick a station instead.",
      });
      await expect(group.getByRole("button", { name: "Try again" })).toBeFocused();
      await expect(group.getByRole("button", { name: "Search for a place" })).toHaveCount(0);
    });
  });
});

test.describe("the suggestion list above the sheet (METRO-114)", () => {
  for (const size of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    test(`METRO-114 at ${size.width} px the open list sits above the sheet, is not clipped or covered, and is as wide as the field`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await open(page);
      await plainSearch(page).focus();
      const widget = widgetSearch(page);
      await expect(widget).toBeVisible();
      // Focus alone leaves the sheet where it was; typing opens it to full (like the station picker).
      expect(await snap(page)).not.toBe("full");
      await page.keyboard.type("mot");
      await expect.poll(() => snap(page)).toBe("full");
      const popup = page.getByRole("listbox", { name: "Suggestions" });
      await expect(popup).toBeVisible();
      const geometry = await page.evaluate(() => {
        const list = document.querySelector<HTMLElement>("[role=listbox][aria-label=Suggestions]");
        const slot = document.querySelector<HTMLElement>(".place-slot");
        const scroll = document.querySelector<HTMLElement>(".panel__scroll");
        if (list === null || slot === null || scroll === null) return null;
        const rect = list.getBoundingClientRect();
        const slotRect = slot.getBoundingClientRect();
        const clipped: string[] = [];
        for (let node = list.parentElement; node !== null; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (style.overflowX === "visible" && style.overflowY === "visible") continue;
          const box = node.getBoundingClientRect();
          if (
            rect.left < box.left - 0.5 ||
            rect.right > box.right + 0.5 ||
            rect.top < box.top - 0.5 ||
            rect.bottom > box.bottom + 0.5
          ) {
            clipped.push(node.className || node.tagName);
          }
        }
        const options = [...list.querySelectorAll<HTMLElement>("[role=option]")];
        const covered = options.filter((option) => {
          const box = option.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return hit === null || !option.contains(hit);
        }).length;
        const handle = document.querySelector<HTMLElement>(".panel__handle");
        const input = document.querySelector<HTMLElement>(".place-slot__widget input");
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          slotLeft: slotRect.left,
          slotRight: slotRect.right,
          slotBottom: slotRect.bottom,
          inputBottom: input?.getBoundingClientRect().bottom ?? 0,
          optionCount: options.length,
          covered,
          clipped,
          viewport: { width: innerWidth, height: innerHeight },
          handleTop: handle?.getBoundingClientRect().top ?? null,
          scrollWidth: scroll.getBoundingClientRect().width,
        };
      });
      expect(geometry, "the list and its containers exist").not.toBeNull();
      if (geometry === null) return;
      expect(geometry.optionCount).toBe(3);
      expect(geometry.covered, "no option is covered by the sheet, the tab bar or the map").toBe(0);
      expect(geometry.clipped, "no ancestor clips the list").toEqual([]);
      // Under the field, inside the viewport, and as wide as the field's slot (the panel's content width).
      expect(geometry.top).toBeGreaterThanOrEqual(geometry.inputBottom - 1);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(geometry.viewport.width);
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport.height);
      expect(Math.abs(geometry.left - geometry.slotLeft - 6)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(geometry.slotRight - 6 - geometry.right)).toBeLessThanOrEqual(1.5);
      expect(geometry.scrollWidth).toBeGreaterThan(geometry.right - geometry.left);
      // Choosing an option with the pointer selects (the first suggestion in the stub is the Motijheel point).
      await popup.getByRole("option", { name: "First suggestion" }).click();
      await expect(heading(page, "Motijheel")).toBeFocused();
      expect(await snap(page)).toBe("half");
    });
  }
});

test.describe("axe on the new states (METRO-114)", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const size of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
    ]) {
      test(`METRO-114 plain field, open list, notice and no-connection pass axe in ${theme} at ${size.width} px`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        await stubGeolocation(page, GOOD_FIX);
        await open(page, {}, theme);
        expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe(theme);
        const scan = async (name: string): Promise<void> => {
          await settle(page);
          const violations = (await axeBuilder(page).analyze()).violations.map((v) => v.id);
          expect(violations, `${name} in ${theme} at ${size.width}`).toEqual([]);
        };
        await scan("plain field");
        await plainSearch(page).focus();
        await expect(widgetSearch(page)).toBeVisible();
        await page.keyboard.type("mot");
        await expect(page.getByRole("listbox", { name: "Suggestions" })).toBeVisible();
        await scan("open list");
        await page.keyboard.press("Enter");
        await expect(page.getByText(ROUTE_TEXT)).toBeVisible();
        await scan("place result with its route");
        // No connection and a failed load, each on a fresh page.
        await page.unrouteAll({ behavior: "ignoreErrors" });
        await noConnection(page);
        await installMapsStub(page);
        await page.reload();
        await expect(smallNotice(page)).toContainText(NO_CONNECTION);
        await scan("no connection");
      });
    }
  }
});
