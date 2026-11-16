import type { Locator, Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

/**
 * METRO-158: the service-worker update prompt is a `.toast` and is styled on every route, not only after the
 * Nearby chunk has loaded (`toast.css` now loads with the shell). The registration code runs in the built app
 * (a production build, after idle) against a stubbed container whose registration already has a waiting worker,
 * so no real worker is involved (ADR-0024; the real takeover is covered in `offline-shell.e2e.ts`).
 *
 * The provider's own behaviour (4 s, 6 s, pause, replace, Undo once, announcements, reduced motion) is proven
 * with fake timers in `apps/web/src/shell/toast.test.tsx`: no screen calls `useToast` yet, so there is nothing
 * in the built app to drive it from a browser. Whichever ticket adds the first caller adds its browser check.
 */

/** Replaces `navigator.serviceWorker` before any page script runs, and records what the page tells the worker. */
async function stubWaitingWorker(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const sent: unknown[] = [];
    Reflect.set(window, "sentToWorker", sent);
    const waiting = {
      state: "installed",
      postMessage: (message: unknown) => {
        sent.push(message);
      },
      addEventListener: () => {},
    };
    const registration = {
      active: {},
      waiting,
      installing: null,
      addEventListener: () => {},
      update: () => Promise.resolve(),
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        controller: {},
        register: () => Promise.resolve(registration),
        addEventListener: () => {},
      },
    });
  });
}

const prompt = (page: Page): Locator =>
  page.locator(".toast-region .toast").filter({ hasText: "A new version is ready." });

/**
 * The prompt is offered after the page has loaded and gone idle (a 1 s timer in WebKit) and after a lazy chunk
 * has arrived, so under load it can take longer than the default 5 s. The wait is on the prompt itself.
 */
const appears = (page: Page): Promise<void> =>
  expect(prompt(page)).toBeVisible({ timeout: 20_000 });

async function open(page: Page): Promise<void> {
  await stubWaitingWorker(page);
  await installMapsStub(page);
  await page.goto("/");
  await appears(page);
}

/**
 * Ends a test that has pressed a toast button. In Firefox the shared axe teardown (`e2e/fixtures.ts`) then hangs
 * about one run in fourteen while closing the helper page that axe opens: the same hang occurs on the base commit
 * with no toast code, whenever a shell button holds focus (a probe that only focuses "Make panel larger" hangs
 * every time), so it is not this feature. The fixture skips its scan on `about:blank`; the prompt's colours and
 * roles are scanned by the light and dark tests below, and its "Updating..." state by `offline-shell.e2e.ts`.
 */
const leave = (page: Page): Promise<unknown> => page.goto("about:blank");

const sent = (page: Page): Promise<unknown> =>
  page.evaluate(() => Reflect.get(window, "sentToWorker") as unknown);

test.describe("service-worker toast", () => {
  // The blocked chunk is logged by the browser as a failed resource and by the app's error boundary (fixed
  // label, no message), on purpose.
  test.describe("without the Nearby chunk", () => {
    test.use({
      allowedConsoleError:
        /Failed to load resource|Load failed|NS_ERROR|net::ERR|^Render error: Error$/u,
    });
    test("METRO-158 the update prompt is styled even when the Nearby chunk never loads", async ({
      page,
    }) => {
      await page.route(/\/assets\/Nearby-[^/]+\.(js|css)$/u, (route) => route.abort());
      await stubWaitingWorker(page);
      await installMapsStub(page);
      await page.goto("/");
      const toast = prompt(page);
      await appears(page);
      // Rules from toast.css, which the entry now carries: they are not there if the CSS came with Nearby.
      await expect(toast).toHaveCSS("display", "flex");
      await expect(toast).toHaveCSS("border-radius", "18px");
      await expect(toast).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(toast.getByRole("button", { name: "Reload" })).toHaveCSS("font-weight", "700");
      await expect(page.locator(".toast-region")).toHaveCSS("position", "absolute");
    });
  });

  test("METRO-158 Dismiss removes the prompt and tells the worker nothing", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(prompt(page)).toHaveCount(0);
    expect(await sent(page)).toEqual([]);
    await leave(page);
  });

  test("METRO-158 Reload sends skip-waiting once and the prompt says it is updating", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Reload" }).click();
    await expect(page.locator(".toast-region")).toContainText("Updating…");
    expect(await sent(page)).toEqual([{ type: "skip-waiting" }]);
    await expect(page.getByRole("button", { name: "Reload" })).toBeHidden();
    await expect(page.getByRole("button", { name: "Dismiss" })).toBeFocused();
    await leave(page);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`METRO-158 the prompt passes axe in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      expect(
        await axeBuilder(page)
          .analyze()
          .then((results) => results.violations),
      ).toEqual([]);
    });
  }

  test("METRO-158 the toast actions are the last stops in the focus order and Escape leaves the prompt alone", async ({
    page,
  }) => {
    await open(page);
    const order = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ]
        .filter((element) => element.getClientRects().length > 0)
        .map((element) => (element.closest(".toast-region") === null ? "page" : element.className)),
    );
    expect(order.slice(-2)).toEqual(["toast__action", "toast__close"]);
    expect(order.slice(0, -2)).not.toContain("toast__action");

    await page.getByRole("button", { name: "Reload" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Dismiss" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("button", { name: "Reload" })).toBeFocused();
    // The handoff gives the toast no Escape rule (Escape closes only the palette), so the key does nothing here.
    await page.keyboard.press("Escape");
    await expect(prompt(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reload" })).toBeFocused();
  });
});
