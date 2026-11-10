import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

/**
 * METRO-119: the browser's theme colour (status bar, tab strip) follows the chosen theme. The page background
 * tokens are #F2F6F6 (light) and #060A0A (dark); index.html carries one `theme-color` tag per scheme.
 * "Effective" is what a browser uses: the first tag whose media query matches right now.
 */
const COLOUR = { light: "#F2F6F6", dark: "#060A0A" } as const;
type Scheme = keyof typeof COLOUR;

const effective = (page: Page): Promise<string | null> =>
  page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].find(
        (tag) => matchMedia(tag.getAttribute("media") ?? "all").matches,
      )?.content ?? null,
  );

type Preference = "system" | "light" | "dark";
const NAME: Record<Preference, string> = { system: "System", light: "Light", dark: "Dark" };

/**
 * Waits until the page has fully taken `theme` and is idle: the button names it, `<html>` carries it (System
 * means no `data-theme`) and the reveal is over (`html.vt-theme` is removed when the View Transition
 * finishes, about 560 ms after the press; METRO-119 flake). The name changes in the first frame of a press,
 * while the reveal's overlay still covers the page, so a click made on the name alone can land during the
 * previous reveal and be lost (seen once in WebKit CI: the name stayed on Dark for the whole 5 s).
 */
async function settled(page: Page, theme: Preference): Promise<void> {
  const root = page.locator("html");
  await expect(page.getByRole("button", { name: /^Theme: /u })).toHaveAccessibleName(
    new RegExp(`^Theme: ${NAME[theme]}[.]`, "u"),
  );
  if (theme === "system") await expect(root).not.toHaveAttribute("data-theme", /.+/u);
  else await expect(root).toHaveAttribute("data-theme", theme);
  await expect(root).not.toHaveClass(/(^|\s)vt-theme(\s|$)/u);
}

/** One press of the theme button, then the wait above: the next press never starts mid-reveal. */
async function pressTo(page: Page, theme: Preference): Promise<void> {
  await page.getByRole("button", { name: /^Theme: /u }).click();
  await settled(page, theme);
}

async function open(
  page: Page,
  scheme: Scheme,
  saved?: "light" | "dark" | "system",
): Promise<void> {
  await page.emulateMedia({ colorScheme: scheme });
  if (saved !== undefined) {
    await page.addInitScript((value) => localStorage.setItem("msf-theme", value), saved);
  }
  await installMapsStub(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Theme: /u })).toBeVisible();
}

test.describe("theme colour", () => {
  for (const os of ["light", "dark"] as const) {
    for (const saved of ["system", "light", "dark"] as const) {
      const expected = saved === "system" ? COLOUR[os] : COLOUR[saved];
      test(`METRO-119 on an OS set to ${os}, ${saved} gives the ${expected} theme colour`, async ({
        page,
      }) => {
        await open(page, os, saved);
        expect(await effective(page)).toBe(expected);
      });
    }
  }

  test("METRO-119 System follows the OS preference when it changes while the page is open", async ({
    page,
  }) => {
    await open(page, "light", "system");
    expect(await effective(page)).toBe(COLOUR.light);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => effective(page)).toBe(COLOUR.dark);
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => effective(page)).toBe(COLOUR.light);
  });

  test("METRO-119 the theme button cycles the colour System, Light, Dark, System on a dark OS and a light OS", async ({
    page,
  }) => {
    for (const os of ["dark", "light"] as const) {
      await open(page, os);
      const steps = [
        ["light", COLOUR.light],
        ["dark", COLOUR.dark],
        ["system", COLOUR[os]],
      ] as const;
      await settled(page, "system");
      expect(await effective(page)).toBe(COLOUR[os]);
      for (const [theme, colour] of steps) {
        await pressTo(page, theme);
        expect(await effective(page), theme).toBe(colour);
      }
    }
  });

  test("METRO-119 the choice survives a reload and the colour is right before the body exists", async ({
    page,
  }) => {
    await open(page, "light");
    for (const theme of ["light", "dark"] as const) await pressTo(page, theme);
    expect(await effective(page)).toBe(COLOUR.dark);
    // On every later load, record the colour the moment the parser creates <body>: no timer, no flash.
    await page.addInitScript(() => {
      const seen: (string | null)[] = [];
      Reflect.set(window, "colourWhenBodyAppeared", seen);
      new MutationObserver((_records, observer) => {
        if (document.body === null) return;
        seen.push(
          document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? null,
        );
        observer.disconnect();
      }).observe(document, { childList: true, subtree: true });
    });
    await page.reload();
    await expect(page.getByRole("button", { name: /^Theme: Dark\./u })).toBeVisible();
    expect(await effective(page)).toBe(COLOUR.dark);
    expect(
      await page.evaluate((): unknown => Reflect.get(window, "colourWhenBodyAppeared")),
    ).toEqual([COLOUR.dark]);
  });

  for (const first of ["light", "dark"] as const) {
    for (const os of ["light", "dark"] as const) {
      test(`METRO-119 saved ${first}, opened on a ${os} OS, then pressed through the other themes and System, shows the right colour each time`, async ({
        page,
      }) => {
        await open(page, os, first);
        await settled(page, first);
        expect(await effective(page), `saved ${first}`).toBe(COLOUR[first]);
        // From the saved theme the button goes to the next one, then the next, then back to the saved one.
        const order = ["system", "light", "dark"] as const;
        let at = order.indexOf(first);
        for (let step = 0; step < 4; step += 1) {
          at = (at + 1) % order.length;
          const theme = order[at] ?? "system";
          await pressTo(page, theme);
          expect(await effective(page), `${theme} after saved ${first} on a ${os} OS`).toBe(
            theme === "system" ? COLOUR[os] : COLOUR[theme],
          );
        }
      });
    }
  }

  for (const os of ["light", "dark"] as const) {
    test(`METRO-119 on a ${os} OS: saved Light, press to Dark, reload, press again in the same session, right colour at every step`, async ({
      page,
    }) => {
      await open(page, os);
      const press = async (theme: Preference, expected: string, step: string): Promise<void> => {
        await pressTo(page, theme);
        expect(await effective(page), step).toBe(expected);
      };
      await press("light", COLOUR.light, "Light");
      await press("dark", COLOUR.dark, "Dark");
      await page.reload();
      await settled(page, "dark");
      expect(await effective(page), "Dark after reload").toBe(COLOUR.dark);
      await press("system", COLOUR[os], "System after reload");
      await press("light", COLOUR.light, "Light after reload");
      await press("dark", COLOUR.dark, "Dark again");
    });
  }
});
