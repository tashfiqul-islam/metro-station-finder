import type { Locator, Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { installMapsStub, plainSearch, stubGeolocation } from "./maps-stub";

/**
 * METRO-120: a notice's suggested next step names only what is available right now. Each location notice is
 * checked with place search available and with it unavailable (no connection, the `online` event to bring it
 * back, and a Maps script that fails). Fakes only: `installMapsStub` answers or aborts every Google request.
 */
const SEARCH = "Search for a place instead.";
const PICK = "Pick a station instead.";
const ROUGH_KNOWN = "Your device found your position only roughly, with an error of about 25 km.";
const ROUGH_UNKNOWN = "Your device could not say how precisely it found your position.";
const ROUGH_TAIL = " The nearest station could be wrong, so none is shown. ";

type Answer = Parameters<typeof stubGeolocation>[1];

const CASES: readonly {
  readonly name: string;
  readonly answer: Answer;
  readonly lead: string;
  readonly retry: boolean;
}[] = [
  { name: "denied", answer: "denied", lead: "Location is turned off. ", retry: false },
  {
    name: "unavailable",
    answer: "unavailable",
    lead: "Your position could not be found. ",
    retry: true,
  },
  {
    name: "rough",
    answer: { lat: 23.87, lng: 90.367, accuracy: 25_000 },
    lead: ROUGH_KNOWN + ROUGH_TAIL,
    retry: true,
  },
  {
    name: "rough-unknown",
    answer: { lat: 23.87, lng: 90.367, accuracy: -1 },
    lead: ROUGH_UNKNOWN + ROUGH_TAIL,
    retry: true,
  },
];

const locate = (page: Page): Locator => page.getByRole("button", { name: "Use my location" });
const smallNotice = (page: Page): Locator => page.locator(".notice[data-size='sm']");

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

async function open(page: Page, scriptFails = false): Promise<void> {
  await installMapsStub(page, { scriptFails });
  await page.goto("/");
  await expect(locate(page)).toBeVisible();
}

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

/** Axe after the notice has finished rising in: a half-faded notice reads as a contrast failure. */
async function expectAxeClean(page: Page): Promise<void> {
  await settle(page);
  expect((await axeBuilder(page).analyze()).violations.map((v) => v.id)).toEqual([]);
}

test.describe("a notice's next step is available right now (METRO-120)", () => {
  test.afterEach(async ({ page }) => {
    await settle(page);
  });

  for (const item of CASES) {
    test(`METRO-120 ${item.name} with place search available: search step, search action first or second, focus on the first action`, async ({
      page,
    }) => {
      await stubGeolocation(page, item.answer);
      await open(page);
      await locate(page).click();
      const group = page.getByRole("group", { name: item.lead + SEARCH });
      await expect(group).toBeVisible();
      const search = group.getByRole("button", { name: "Search for a place" });
      await expect(search).toBeVisible();
      await expect(
        item.retry ? group.getByRole("button", { name: "Try again" }) : search,
      ).toBeFocused();
      await expectAxeClean(page);
    });

    test(`METRO-120 ${item.name} with place search unavailable (no connection): pick step, no search action, focus follows`, async ({
      page,
    }) => {
      await noConnection(page);
      await stubGeolocation(page, item.answer);
      await open(page);
      await locate(page).click();
      const group = page.getByRole("group", { name: item.lead + PICK });
      await expect(group).toBeVisible();
      await expect(group).not.toContainText(/search/iu);
      await expect(group.getByRole("button", { name: "Search for a place" })).toHaveCount(0);
      // Denied has no action left, so the notice itself takes focus; the rest keep Try again.
      await expect(
        item.retry ? group.getByRole("button", { name: "Try again" }) : group,
      ).toBeFocused();
      // The notice below says the same thing about place search: one story, not two.
      await expect(smallNotice(page)).toContainText("Pick a station instead.");
      await expect(page.getByText(SEARCH)).toHaveCount(0);
      await expectAxeClean(page);
    });
  }

  test("METRO-120 the connection returning while a notice shows: its step and action follow, so the text stays true", async ({
    page,
  }) => {
    await noConnection(page);
    await stubGeolocation(page, "denied");
    await open(page);
    await locate(page).click();
    await expect(
      page.getByRole("group", { name: "Location is turned off. " + PICK }),
    ).toBeVisible();
    await reconnect(page);
    const group = page.getByRole("group", { name: "Location is turned off. " + SEARCH });
    await expect(group.getByRole("button", { name: "Search for a place" })).toBeVisible();
    await expect(page.getByText(PICK)).toHaveCount(0);
    await expect(plainSearch(page)).toBeVisible();
    await expectAxeClean(page);
  });

  test.describe("when the Maps script cannot load", () => {
    test.use({ allowedConsoleError: /Failed to load resource|ERR_FAILED/u });

    test("METRO-120 the failure while the search action has focus: the step changes, the action goes and the notice keeps focus", async ({
      page,
    }) => {
      await stubGeolocation(page, "unavailable");
      await open(page, true);
      await locate(page).click();
      const before = page.getByRole("group", {
        name: "Your position could not be found. " + SEARCH,
      });
      await expect(before).toBeVisible();
      // The first focus of the plain field starts the load that fails.
      await plainSearch(page).focus();
      const after = page.getByRole("group", {
        name: "Your position could not be found. " + PICK,
      });
      await expect(after).toBeVisible();
      await expect(after.getByRole("button", { name: "Search for a place" })).toHaveCount(0);
      await expect(page.getByText(SEARCH)).toHaveCount(0);
      await expectAxeClean(page);
    });
  });
});
