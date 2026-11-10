import type { Locator, Page } from "@playwright/test";

import { isRecord } from "../scripts/guards";
import { axeBuilder, expect, test } from "./fixtures";
import { linksAreTabbable } from "./keyboard";
import { installMapsStub, stubGeolocation, widgetSearch } from "./maps-stub";

/**
 * METRO-113: "Use my location" and every location state, in the real build with the enforced CSP and the
 * fake geolocation seam. Synthetic coordinates near the public station coordinates only (23.87, 90.367 is near
 * Uttara North, the first station); no real device position and no real Google call.
 */
const NEAR_UTTARA_NORTH = { lat: 23.87, lng: 90.367 } as const;
const MAP_NAME = "Schematic map of MRT Line 6";

async function open(page: Page, saved?: "light" | "dark"): Promise<void> {
  if (saved !== undefined) {
    await page.addInitScript((value) => localStorage.setItem("msf-theme", value), saved);
  }
  await installMapsStub(page);
  await page.goto("/");
  await expect(page.getByRole("application", { name: MAP_NAME, exact: true })).toBeVisible();
  await expect(locate(page)).toBeVisible();
}

const locate = (page: Page): Locator => page.getByRole("button", { name: "Use my location" });
const combo = (page: Page): Locator => page.getByRole("combobox", { name: "Or pick a station" });
const heading = (page: Page, name: string): Locator =>
  page.getByRole("heading", { level: 2, name });
const snap = (page: Page): Promise<string | null> => page.locator(".app").getAttribute("data-snap");
const rough = (page: Page): Locator =>
  page.getByRole("group", { name: /found your position only roughly/u });
const unavailable = (page: Page): Locator =>
  page.getByRole("group", {
    name: "Your position could not be found. Search for a place instead.",
  });

/** Lets finite animations (the notice rises in) end before axe measures colours. */
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

test.describe("use my location (METRO-113)", () => {
  // The fixture scans with axe when each test ends, and a notice has just risen in (opacity and offset): wait
  // for the finite animations so colours are not measured halfway through (seen in Firefox).
  test.afterEach(async ({ page }) => {
    await settle(page);
  });

  test("METRO-113 locating: a status with the looping mark and the handoff text, then the result", async ({
    page,
  }) => {
    await stubGeolocation(page, "pending");
    await open(page);
    await locate(page).click();
    const status = page.getByRole("status").filter({ hasText: "Finding your position" });
    await expect(status).toBeVisible();
    await expect(status).toContainText("This can take a few seconds indoors.");
    // One polite status for this concern, no control inside it, and the mark loops (the ping animates).
    expect(await status.getByRole("button").count()).toBe(0);
    const animation = await status
      .locator(".mark__ping")
      .first()
      .evaluate((node) => getComputedStyle(node).animationName);
    expect(animation).toBe("mark-ping-loop");
    // The button keeps its place in the order and says it is busy without leaving the tab order.
    await expect(locate(page)).toHaveAttribute("aria-disabled", "true");
    await expect(locate(page)).toHaveJSProperty("disabled", false);
    expect(await snap(page)).toBe("half");
  });

  test("METRO-124 one press on Use my location starts the search while the station list is open", async ({
    page,
  }) => {
    await stubGeolocation(page, "pending");
    await open(page);
    await combo(page).fill("mir");
    await expect(combo(page)).toHaveAttribute("aria-expanded", "true");
    // No Escape first: the press itself blurs the input, and the list must not collapse under the pointer.
    await locate(page).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Finding your position" }),
    ).toBeVisible();
    await expect(locate(page)).toHaveAttribute("aria-disabled", "true");
    // The press is over: the list closed, as a blur always did.
    await expect(combo(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("METRO-113 locating with reduced motion: the ping does not move", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await stubGeolocation(page, "pending");
    await open(page);
    await locate(page).click();
    const status = page.getByRole("status").filter({ hasText: "Finding your position" });
    const animation = await status
      .locator(".mark__ping")
      .first()
      .evaluate((node) => getComputedStyle(node).animationName);
    expect(animation).toBe("none");
  });

  test("METRO-113 a good fix: one result with focus on its heading, the pin and highlight, Also nearby, one walking route", async ({
    page,
  }) => {
    await stubGeolocation(page, NEAR_UTTARA_NORTH);
    await open(page);
    await locate(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(page.getByText("straight-line distance · est.")).toBeVisible();
    await expect(page.locator(".metric__about").first()).toBeVisible();
    await expect(page.locator(".result__fare")).toContainText("Single fare from here");
    await expect(page.getByText(/^Fares as of: DTCA notice dated/u)).toBeVisible();
    const also = page.getByRole("region", { name: "Also nearby" });
    await expect(also.getByRole("listitem")).toHaveCount(2);
    await expect(also.getByRole("listitem").first()).toContainText("Uttara Center");
    await expect(page.getByRole("link", { name: /Directions in Google Maps/u })).toHaveAttribute(
      "href",
      /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=[\d.]+,[\d.]+$/u,
    );
    await expect(page.locator("svg.map .map__pin--hl")).toHaveCount(1);
    await expect(page.locator("svg.map .map__me")).toHaveCount(1);
    // METRO-114: a good fix asks for one walking route and shows it as an estimate.
    await expect(page.locator(".result__walk")).toContainText("about 1.2 km, 15 min · est.");
    await expect(page.getByText("The walking route is unavailable.")).toHaveCount(0);
    expect(await snap(page)).toBe("half");
    // One result: a single article, no ticket.
    await expect(page.getByRole("article")).toHaveCount(1);
  });

  test("METRO-113 rough: the notice with the rounded size, no station, no pin, no highlight, focus on Try again", async ({
    page,
  }) => {
    await stubGeolocation(page, { ...NEAR_UTTARA_NORTH, accuracy: 25_000 });
    await open(page);
    await locate(page).click();
    await expect(rough(page)).toContainText("with an error of about 25 km");
    await expect(rough(page).getByRole("button", { name: "Try again" })).toBeFocused();
    await expect(page.locator(".result")).toHaveCount(0);
    await expect(page.locator("svg.map .map__pin--hl")).toHaveCount(0);
    await expect(page.locator("svg.map .map__me")).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(await snap(page)).toBe("half");
  });

  test("METRO-113 rough, unknown accuracy: the variant without a size", async ({ page }) => {
    await stubGeolocation(page, { ...NEAR_UTTARA_NORTH, accuracy: -1 });
    await open(page);
    await locate(page).click();
    const notice = page.getByRole("group", {
      name: /could not say how precisely it found your position/u,
    });
    await expect(notice).toBeVisible();
    await expect(notice.getByRole("button", { name: "Try again" })).toBeFocused();
    await expect(page.locator(".result")).toHaveCount(0);
  });

  test("METRO-113 the METRO-103 rule is unchanged: a 100 m fix is good, never called rough", async ({
    page,
  }) => {
    await stubGeolocation(page, { ...NEAR_UTTARA_NORTH, accuracy: 100 });
    await open(page);
    await locate(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(page.locator("svg.map .map__me")).toHaveCount(1);
  });

  test("METRO-113 denied: the fixed copy, the search action focused, no Try again, no alert role", async ({
    page,
  }) => {
    await stubGeolocation(page, "denied");
    await open(page);
    await locate(page).click();
    const notice = page.getByRole("group", {
      name: "Location is turned off. Search for a place instead.",
    });
    await expect(notice).toBeVisible();
    const search = notice.getByRole("button", { name: "Search for a place" });
    await expect(search).toBeFocused();
    // The search action is the only control: no Try again for a refusal.
    await expect(notice.getByRole("button")).toHaveCount(1);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(await snap(page)).toBe("half");
    // Activating it moves focus into the search field: the plain input takes it, asks for the script, and the
    // widget (the stub's input stands for Google's) replaces it with focus kept. Only the stub is verified.
    await search.click();
    await expect(widgetSearch(page)).toBeFocused();
    // Typing opens the sheet to full (METRO-114), like the station picker; focus alone does not.
    expect(await snap(page)).toBe("half");
    await page.keyboard.type("m");
    await expect.poll(() => snap(page)).toBe("full");
  });

  test("METRO-113 a station picked while locating cancels it: the status goes and the late answer changes nothing", async ({
    page,
  }) => {
    await stubGeolocation(page, "pending");
    await open(page);
    await locate(page).click();
    const status = page.getByRole("status").filter({ hasText: "Finding your position" });
    await expect(status).toBeVisible();
    await combo(page).fill("farm");
    await combo(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await expect(page.getByText("Finding your position")).toHaveCount(0);
    // The old request now answers with a good fix.
    await page.evaluate(() => {
      const give: unknown = Reflect.get(window, "__answerLater");
      if (typeof give === "function") Reflect.apply(give, window, []);
    });
    await expect(heading(page, "Farmgate")).toBeFocused();
    await expect(page.locator(".result")).toHaveCount(0);
    await expect(page.locator("svg.map .map__me")).toHaveCount(0);
  });

  test("METRO-113 unavailable or timeout: Try again first and focused, then it asks again", async ({
    page,
  }) => {
    await stubGeolocation(page, "unavailable");
    await open(page);
    await locate(page).click();
    const retry = unavailable(page).getByRole("button", { name: "Try again" });
    await expect(retry).toBeFocused();
    await expect(
      unavailable(page).getByRole("button", { name: "Search for a place" }),
    ).toBeVisible();
    // Switch the seam to a good answer for the second ask.
    await page.evaluate(() => {
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (success: (position: unknown) => void) =>
            success({ coords: { latitude: 23.87, longitude: 90.367, accuracy: 20 } }),
        },
      });
    });
    await retry.click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(unavailable(page)).toHaveCount(0);
  });

  test("METRO-113 an invalid position is the no-station state, with the fixed copy and focus on its heading", async ({
    page,
  }) => {
    await stubGeolocation(page, { lat: 200, lng: 0, accuracy: 10 });
    await open(page);
    await locate(page).click();
    await expect(heading(page, "Nearest station")).toBeFocused();
    await expect(page.getByText("No station could be found for that location.")).toBeVisible();
    await expect(page.locator("svg.map .map__pin--hl")).toHaveCount(0);
    await expect(page.locator("svg.map .map__me")).toHaveCount(0);
  });

  test("METRO-113 order A: a station picked after a location result replaces it everywhere", async ({
    page,
  }) => {
    await stubGeolocation(page, NEAR_UTTARA_NORTH);
    await open(page);
    await locate(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await combo(page).fill("farm");
    await combo(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await expect(page.locator(".result")).toHaveCount(0);
    await expect(page.locator(".ticket")).toHaveCount(1);
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.locator("svg.map .map__pin--hl")).toHaveCount(1);
    await expect(page.locator("svg.map .map__me")).toHaveCount(0);
    await expect(page.getByRole("list", { name: /^Stations on MRT Line 6/u })).toContainText(
      "Farmgate, highlighted",
    );
    expect(await snap(page)).toBe("half");
  });

  test("METRO-113 order B: a location fix after a pick replaces it everywhere", async ({
    page,
  }) => {
    await stubGeolocation(page, NEAR_UTTARA_NORTH);
    await open(page);
    await combo(page).fill("farm");
    await combo(page).press("Enter");
    await expect(heading(page, "Farmgate")).toBeFocused();
    await locate(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await expect(page.locator(".ticket")).toHaveCount(0);
    await expect(page.locator(".result")).toHaveCount(1);
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("list", { name: /^Stations on MRT Line 6/u })).toContainText(
      "Uttara North, highlighted",
    );
    await expect(page.locator("svg.map .map__pin--hl")).toHaveCount(1);
    await expect(page.locator("svg.map .map__me")).toHaveCount(1);
  });

  test("METRO-113 the position never leaves the device: no request of any kind follows a fix", async ({
    page,
    baseURL,
  }) => {
    // The listener is attached before the page loads, so every request is seen, the chunk loads included.
    const requests: { url: string; headers: string; body: string }[] = [];
    page.on("request", (request) =>
      requests.push({
        url: request.url(),
        headers: JSON.stringify(request.headers()),
        body: request.postData() ?? "",
      }),
    );
    page.on("websocket", (socket) => requests.push({ url: socket.url(), headers: "", body: "" }));
    await stubGeolocation(page, NEAR_UTTARA_NORTH);
    const stub = await installMapsStub(page);
    await page.route("**/api/vitals", (route) => route.fulfill({ status: 204 }));
    await page.goto("/");
    await expect(locate(page)).toBeVisible();
    // Let the first load settle (chunks, the Maps stub script) before the press.
    await expect
      .poll(() => requests.some((r) => r.url.includes("web-vitals-")), { timeout: 10_000 })
      .toBe(true);
    const before = requests.length;
    await locate(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    // The only request a result may add is the mono font file its eyebrow draws with (same origin, a static file).
    // Our own web-vitals report (LCP is final at the first input) is allowed here and checked below: its keys are
    // the five fixed ones and it carries no position.
    const vitals = requests.slice(before).filter((r) => new URL(r.url).pathname === "/api/vitals");
    for (const report of vitals) {
      const body: unknown = JSON.parse(report.body);
      expect(isRecord(body)).toBe(true);
      expect(new Set(isRecord(body) ? Object.keys(body) : [])).toEqual(
        new Set(["id", "name", "navigationType", "rating", "value"]),
      );
    }
    // METRO-114: the fix asks Google for its walking route, which loads the Maps script once (the stub answers it;
    // the position itself is passed to the stubbed library call and is in no request, checked below).
    const scripts = requests
      .slice(before)
      .filter((r) => r.url.startsWith("https://maps.googleapis.com/"));
    expect(scripts).toHaveLength(1);
    const added = requests
      .slice(before)
      .filter((r) => !r.url.startsWith("https://maps.googleapis.com/"))
      .filter((r) => new URL(r.url).pathname !== "/api/vitals")
      .filter(
        (r) =>
          !(r.url.startsWith(`${baseURL ?? ""}/`) && new URL(r.url).pathname.endsWith(".woff2")),
      );
    expect(added).toEqual([]);
    // Not vacuous: the listener saw the page's own loads, and everything it saw carries no position.
    expect(requests.length).toBeGreaterThan(5);
    const everything = requests.map((r) => `${r.url} ${r.headers} ${r.body}`).join("\n");
    for (const fragment of ["23.87", "90.367", "lat=", "lng=", "latitude", "longitude"]) {
      expect(everything).not.toContain(fragment);
    }
    expect(
      requests.every(
        (r) =>
          new URL(r.url).host === new URL(baseURL ?? "").host ||
          r.url.startsWith("https://maps.googleapis.com/"),
      ),
    ).toBe(true);
    const calls = await stub.calls();
    expect(calls.fetchFields).toEqual([]);
    expect(calls.routes).toHaveLength(1);
    expect(stub.blocked).toEqual([]);
  });

  test("METRO-113 keyboard order: Home first, then Use my location, the search, the picker, the result link, then the map", async ({
    page,
  }) => {
    await stubGeolocation(page, NEAR_UTTARA_NORTH);
    await open(page);
    await locate(page).click();
    await expect(heading(page, "Uttara North")).toBeFocused();
    // Start from the Home link (the first stop of the page, before the result took focus) and walk on.
    await page.locator("a.brand").focus();
    const stops: string[] = ["Home"];
    for (let i = 0; i < 30; i += 1) {
      await page.keyboard.press("Tab");
      stops.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          if (el === null) return "";
          return (
            el.getAttribute("aria-label") ||
            document.querySelector(`label[for="${el.id}"]`)?.textContent ||
            el.textContent ||
            el.tagName
          ).trim();
        }),
      );
      if (stops.at(-1) === "Show whole line") break;
    }
    const index = (text: string | RegExp): number =>
      stops.findIndex((stop) => (typeof text === "string" ? stop === text : text.test(stop)));
    const locateAt = index(/^Use my location/u);
    // The plain input is named "Search for a place"; if the Tab walk focused it, the widget (stub name "Search For
    // a Place") has replaced it by the next stop. Either way there is one stop for the search, matched ignoring case.
    const searchAt = index(/^search for a place$/iu);
    const pickAt = index("Or pick a station");
    expect(locateAt, "Use my location").toBeGreaterThan(-1);
    expect(searchAt, "place search").toBeGreaterThan(locateAt);
    expect(pickAt, "picker").toBeGreaterThan(searchAt);
    if (await linksAreTabbable(page)) {
      const dirAt = index(/^Directions in Google Maps/u);
      expect(dirAt, "Directions").toBeGreaterThan(pickAt);
      // The map and its three buttons come last: the walk ends on "Show whole line".
      expect(stops.at(-1)).toBe("Show whole line");
      expect(stops.length - 1).toBeGreaterThan(dirAt);
    }
  });

  // One test per state, theme and size (METRO-125): the six states in one test took 15 s alone and passed 30 s
  // on a loaded machine, so the test timed out although every state was fine. Each state still gets a fresh page.
  const AXE_STATES: readonly (readonly [string, Parameters<typeof stubGeolocation>[1]])[] = [
    ["locating", "pending"],
    ["denied", "denied"],
    ["unavailable", "unavailable"],
    ["rough", { ...NEAR_UTTARA_NORTH, accuracy: 25_000 }],
    ["rough-unknown", { ...NEAR_UTTARA_NORTH, accuracy: -1 }],
    ["result", NEAR_UTTARA_NORTH],
  ];
  for (const theme of ["light", "dark"] as const) {
    for (const size of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
    ]) {
      for (const [name, answer] of AXE_STATES) {
        test(`METRO-113 the ${name} state passes axe in ${theme} at ${size.width} px`, async ({
          page,
        }) => {
          await page.setViewportSize(size);
          await open(page, theme);
          expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe(theme);
          await page.evaluate((given) => {
            Object.defineProperty(navigator, "geolocation", {
              configurable: true,
              value: {
                getCurrentPosition: (
                  success: (position: unknown) => void,
                  failure: (error: unknown) => void,
                ) => {
                  if (given === "pending") return;
                  if (given === "denied" || given === "unavailable") {
                    failure({
                      code: given === "denied" ? 1 : 2,
                      PERMISSION_DENIED: 1,
                      POSITION_UNAVAILABLE: 2,
                      TIMEOUT: 3,
                    });
                    return;
                  }
                  success({
                    coords: {
                      latitude: given.lat,
                      longitude: given.lng,
                      accuracy: given.accuracy ?? 20,
                    },
                  });
                },
              },
            });
          }, answer);
          await locate(page).click();
          if (name === "locating") {
            await expect(
              page.getByRole("status").filter({ hasText: "Finding your position" }),
            ).toBeVisible();
          } else if (name === "result") {
            await expect(heading(page, "Uttara North")).toBeFocused();
          } else {
            await expect(page.locator(".notice")).toBeVisible();
          }
          await settle(page);
          const violations = (await axeBuilder(page).analyze()).violations.map((v) => v.id);
          expect(violations, `${name} in ${theme}`).toEqual([]);
        });
      }
    }
  }
});
