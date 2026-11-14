import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

/**
 * METRO-133: a theme chosen in one tab reaches every other open tab of the site. Two pages share one browser
 * context (so one localStorage); a press in page A raises a `storage` event in page B, which must show the
 * same theme with no reload. All waits are auto-waiting assertions; page A's `settled()` (as in
 * `theme-colour.e2e.ts`) keeps a press from starting while the previous reveal still covers A.
 */
type Preference = "system" | "light" | "dark";
const NAME: Record<Preference, string> = { system: "System", light: "Light", dark: "Dark" };
const NEXT: Record<Preference, string> = { system: "Light", light: "Dark", dark: "System" };

const toggle = (page: Page) => page.getByRole("button", { name: /^Theme: /u });

/** Page has taken `theme`: the button names it and the next one, and `<html>` carries it (System: nothing). */
async function showsTheme(page: Page, theme: Preference): Promise<void> {
  await expect(toggle(page)).toHaveAccessibleName(
    `Theme: ${NAME[theme]}. Switch to ${NEXT[theme]}`,
  );
  const root = page.locator("html");
  if (theme === "system") await expect(root).not.toHaveAttribute("data-theme", /.+/u);
  else await expect(root).toHaveAttribute("data-theme", theme);
}

/** Page A: wait for any reveal to end (`html.vt-theme` removed when the View Transition finishes). */
async function settled(page: Page, theme: Preference): Promise<void> {
  await showsTheme(page, theme);
  await expect(page.locator("html")).not.toHaveClass(/(^|\s)vt-theme(\s|$)/u);
}

async function open(page: Page): Promise<void> {
  await installMapsStub(page);
  await page.goto("/");
  await expect(toggle(page)).toBeVisible();
}

for (const run of Array.from({ length: 40 }, (_, index) => index)) {
  test(`METRO-133 repeat ${run}: a theme chosen in one tab appears in the other`, async ({
    context,
  }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await open(a);
    await open(b);
    await settled(a, "system");
    await showsTheme(b, "system");
    for (const theme of ["light", "dark", "system"] as const) {
      await toggle(a).click();
      await settled(a, theme);
      await showsTheme(b, theme);
    }
  });
}
