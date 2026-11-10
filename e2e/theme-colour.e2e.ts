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
      const button = page.getByRole("button", { name: /^Theme: /u });
      const steps = [
        ["Theme: Light.", COLOUR.light],
        ["Theme: Dark.", COLOUR.dark],
        ["Theme: System.", COLOUR[os]],
      ] as const;
      expect(await effective(page)).toBe(COLOUR[os]);
      for (const [label, colour] of steps) {
        await button.click();
        await expect(button).toHaveAccessibleName(new RegExp(`^${label}`, "u"));
        expect(await effective(page), label).toBe(colour);
      }
    }
  });

  test("METRO-119 the choice survives a reload and the colour is right before the body exists", async ({
    page,
  }) => {
    await open(page, "light");
    const button = page.getByRole("button", { name: /^Theme: /u });
    for (const label of ["Light", "Dark"]) {
      await button.click();
      await expect(button).toHaveAccessibleName(new RegExp(`^Theme: ${label}[.]`, "u"));
    }
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
});
