import type { Page } from "@playwright/test";

import { axeBuilder, expect, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

/**
 * METRO-105: the design foundation in the real build, served with the real enforced CSP. Light and dark are
 * the Lagoon tokens (`--color-bg` #F2F6F6 and #060A0A); the maps stub keeps every request off Google.
 */
const BG = { light: "rgb(242, 246, 246)", dark: "rgb(6, 10, 10)" } as const;

async function open(page: Page, saved?: "light" | "dark" | "system"): Promise<void> {
  if (saved !== undefined) {
    await page.addInitScript((value) => localStorage.setItem("msf-theme", value), saved);
  }
  await installMapsStub(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeVisible();
}

const background = (page: Page): Promise<string> =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test.describe("themes", () => {
  for (const theme of ["light", "dark"] as const) {
    test(`METRO-105 the saved ${theme} theme paints the ${theme} tokens and the shell and slice pass axe`, async ({
      page,
    }) => {
      await open(page, theme);
      expect(await page.evaluate(() => document.documentElement.dataset["theme"])).toBe(theme);
      expect(await background(page)).toBe(BG[theme]);
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme),
      ).toBe(theme);
      const results = await axeBuilder(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`METRO-105 with no saved theme the OS ${scheme} preference decides, without a data-theme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await open(page);
      expect(await page.evaluate(() => document.documentElement.hasAttribute("data-theme"))).toBe(
        false,
      );
      expect(await background(page)).toBe(BG[scheme]);
      const results = await axeBuilder(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }

  test("METRO-105 the theme is on <html> before the body exists, so there is no flash", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("msf-theme", "dark");
      const seen: (string | null)[] = [];
      Reflect.set(window, "themeWhenBodyAppeared", seen);
      new MutationObserver((_records, observer) => {
        if (document.body !== null) {
          seen.push(document.documentElement.getAttribute("data-theme"));
          observer.disconnect();
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await open(page);
    const seen = await page.evaluate((): unknown => Reflect.get(window, "themeWhenBodyAppeared"));
    expect(seen).toEqual(["dark"]);
  });

  test("METRO-105 blocked storage does not break the page and the OS preference applies", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    await page.emulateMedia({ colorScheme: "dark" });
    await open(page);
    expect(await page.evaluate(() => document.documentElement.hasAttribute("data-theme"))).toBe(
      false,
    );
    expect(await background(page)).toBe(BG.dark);
    // The toggle still works for this page view.
    await page.getByRole("button", { name: "Theme: System. Switch to Light" }).click();
    await expect.poll(() => background(page)).toBe(BG.light);
  });

  test("METRO-105 the header button cycles System, Light, Dark, System and the choice survives a reload", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await open(page);
    const attribute = (): Promise<string | null> =>
      page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await page.getByRole("button", { name: "Theme: System. Switch to Light" }).click();
    await expect.poll(attribute).toBe("light");
    await expect.poll(() => background(page)).toBe(BG.light);
    await page.getByRole("button", { name: "Theme: Light. Switch to Dark" }).click();
    await expect.poll(attribute).toBe("dark");
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await attribute()).toBe("dark");
    await expect(page.getByRole("button", { name: "Theme: Dark. Switch to System" })).toBeVisible();
    await page.getByRole("button", { name: "Theme: Dark. Switch to System" }).click();
    await expect.poll(attribute).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem("msf-theme"))).toBe("system");
  });

  test("METRO-105 the reveal runs where View Transitions exist and leaves no marker behind", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "View Transitions timing is checked on Chromium");
    await open(page, "light");
    await page.getByRole("button", { name: "Theme: Light. Switch to Dark" }).click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset["theme"]))
      .toBe("dark");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains("vt-theme")))
      .toBe(false);
    expect(await background(page)).toBe(BG.dark);
  });
});

test.describe("script and style delivery under the enforced CSP", () => {
  test("METRO-105 theme-boot.js is a same-origin classic script in <head> and the page has no inline script or style", async ({
    page,
  }) => {
    await open(page);
    const structure = await page.evaluate(() => {
      const boot = document.head.querySelector("script[src='/theme-boot.js']");
      const scripts = [...document.querySelectorAll("script")];
      return {
        bootInHead: boot !== null,
        bootIsModule: boot?.getAttribute("type") === "module",
        bootDeferred: boot?.hasAttribute("defer") === true || boot?.hasAttribute("async") === true,
        inlineScripts: scripts.filter((script) => !script.hasAttribute("src")).length,
        styleElements: document.querySelectorAll("style").length,
        styleAttributes: document.querySelectorAll("[style]").length,
      };
    });
    expect(structure).toEqual({
      bootInHead: true,
      bootIsModule: false,
      bootDeferred: false,
      inlineScripts: 0,
      styleElements: 0,
      styleAttributes: 0,
    });
    const response = await page.request.get("/theme-boot.js");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/javascript/u);
    expect(response.headers()["content-security-policy"]).toContain("script-src 'self' ");
    expect(response.headers()["content-security-policy"]).not.toContain("unsafe-inline");
  });

  test("METRO-105 the Hanken Grotesk file is preloaded from /assets and the text is set in it", async ({
    page,
  }) => {
    await open(page);
    const preload = await page.evaluate(() => {
      const link = document.head.querySelector<HTMLLinkElement>("link[rel='preload'][as='font']");
      return {
        href: link?.getAttribute("href") ?? "",
        type: link?.type,
        crossorigin: link?.getAttribute("crossorigin"),
      };
    });
    expect(preload.href).toMatch(/^\/assets\/hanken-grotesk-latin-wght-[\w-]+\.woff2$/u);
    expect(preload.type).toBe("font/woff2");
    expect(preload.crossorigin).toBe("");
    const font = await page.request.get(preload.href);
    expect(font.status()).toBe(200);
    expect(font.headers()["cache-control"]).toContain("immutable");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('16px "Hanken Grotesk"'))).toBe(true);
  });

  test("METRO-105 a first visit downloads Hanken Grotesk only, not JetBrains Mono", async ({
    page,
  }) => {
    const fonts: string[] = [];
    page.on("request", (request) => {
      if (/\.woff2(\?|$)/u.test(request.url())) fonts.push(new URL(request.url()).pathname);
    });
    await open(page);
    await page.evaluate(() => document.fonts.ready);
    // WebKit fetches the preloaded file twice; what matters is that no other font file is requested.
    const distinct = [...new Set(fonts)];
    expect(distinct).toHaveLength(1);
    expect(distinct[0]).toMatch(/hanken-grotesk/u);
  });

  test("METRO-105 the licence notice for the fonts and icons is served", async ({ request }) => {
    const response = await request.get("/licenses.txt");
    expect(response.status()).toBe(200);
    const text = await response.text();
    for (const needle of [
      "SIL OPEN FONT LICENSE Version 1.1",
      "Hanken Grotesk",
      "JetBrains Mono",
      "ISC License",
      "Lucide",
    ]) {
      expect(text, needle).toContain(needle);
    }
  });
});

/** "0.01s, 0.2s" to [0.01, 0.2]. */
const seconds = (value: string): number[] =>
  value.split(",").map((part) => Number.parseFloat(part));

test.describe("user preferences", () => {
  test("METRO-105 reduced motion stops transitions and animations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page);
    const durations = {
      panel: seconds(
        await page.locator(".panel").evaluate((n) => getComputedStyle(n).transitionDuration),
      ),
      button: seconds(
        await page.locator(".icon-btn").evaluate((n) => getComputedStyle(n).transitionDuration),
      ),
    };
    for (const value of [...durations.panel, ...durations.button])
      expect(value).toBeLessThan(0.001);
  });

  test("METRO-105 without the preference the panel and button keep their transitions", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open(page);
    const duration = await page
      .locator(".icon-btn")
      .evaluate((node) => Number.parseFloat(getComputedStyle(node).transitionDuration));
    expect(duration).toBeGreaterThan(0.05);
  });

  test("METRO-105 forced colours: controls get a system-colour border and the focus ring uses Highlight", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName === "webkit", "WebKit does not emulate forced colours");
    await page.emulateMedia({ forcedColors: "active" });
    await open(page);
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    const button = page.getByRole("button", { name: "Use my location" });
    expect(await button.evaluate((node) => getComputedStyle(node).borderTopWidth)).toBe("1px");
    await button.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const outline = await button.evaluate((node) => getComputedStyle(node).outlineStyle);
    expect(outline).not.toBe("none");
    const results = await axeBuilder(page).analyze();
    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });

  // Playwright has no reduced-transparency option, so Chromium is driven through DevTools. Only Chromium can
  // do this, so the other browsers skip; `scripts/design-contrast.test.ts` asserts the override exists for
  // every theme selector as text. In Chromium a build that cannot emulate the preference fails here.
  const SOLID_PANEL = { light: "rgb(250, 251, 252)", dark: "rgb(16, 18, 21)" } as const;
  const TRANSPARENCY_CASES = [
    { name: "OS dark, no saved theme", scheme: "dark", saved: undefined, solid: SOLID_PANEL.dark },
    {
      name: "OS light, no saved theme",
      scheme: "light",
      saved: undefined,
      solid: SOLID_PANEL.light,
    },
    {
      name: "saved dark under an OS light",
      scheme: "light",
      saved: "dark",
      solid: SOLID_PANEL.dark,
    },
    {
      name: "saved light under an OS dark",
      scheme: "dark",
      saved: "light",
      solid: SOLID_PANEL.light,
    },
  ] as const;
  for (const { name, scheme, saved, solid } of TRANSPARENCY_CASES) {
    test(`METRO-105 reduced transparency makes the panel solid: ${name}`, async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName !== "chromium",
        "Only Chromium can emulate the preference, through DevTools",
      );
      await page.emulateMedia({ colorScheme: scheme });
      const session = await page.context().newCDPSession(page);
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
      });
      await open(page, saved);
      expect(
        await page.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches),
        "this Chromium must report prefers-reduced-transparency under emulation",
      ).toBe(true);
      const panel = await page.locator(".panel").evaluate((node) => {
        const style = getComputedStyle(node);
        return { background: style.backgroundColor, filter: style.backdropFilter };
      });
      expect(panel.filter).toBe("none");
      expect(panel.background).toBe(solid);
    });
  }

  test("METRO-105 at 1280 px the panel is a sidebar and the sheet handle is not in the page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page);
    const box = await page.locator(".panel").boundingBox();
    expect(box?.width).toBe(400);
    expect(box?.x).toBe(12);
    await expect(page.getByRole("button", { name: /^Resize panel/u })).toBeHidden();
  });

  test.describe("below 768 px", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test("METRO-105 the sheet is a bottom sheet at half height with a 44 px handle row", async ({
      page,
    }) => {
      await open(page);
      const panel = await page.locator(".panel").boundingBox();
      expect(Math.round(panel?.height ?? 0)).toBe(Math.round(844 * 0.58));
      const handle = await page.locator(".panel__handle").boundingBox();
      expect(handle?.height).toBe(44);
      const grip = await page.getByRole("button", { name: /^Resize panel/u }).boundingBox();
      expect(grip?.width).toBeGreaterThanOrEqual(44);
      expect(grip?.height).toBe(44);
    });

    test("METRO-105 tap cycles, arrow keys resize, dragging writes --sheet-h by CSSOM and leaves no style attribute", async ({
      page,
    }) => {
      await open(page);
      const app = page.locator(".app");
      const grip = page.getByRole("button", { name: /^Resize panel/u });
      await expect(app).toHaveAttribute("data-snap", "half");
      await grip.click();
      await expect(app).toHaveAttribute("data-snap", "full");
      await grip.focus();
      await page.keyboard.press("ArrowDown");
      await expect(app).toHaveAttribute("data-snap", "half");
      await page.keyboard.press("ArrowDown");
      await expect(app).toHaveAttribute("data-snap", "peek");
      expect(await grip.getAttribute("aria-label")).toBe(
        "Resize panel. Now peek height. Drag, or use the arrow keys.",
      );

      // The sheet animates to peek (196 px); measure the grip only once it has stopped.
      await expect
        .poll(async () => Math.round((await page.locator(".panel").boundingBox())?.height ?? 0))
        .toBe(196);
      const box = await grip.boundingBox();
      if (box === null) throw new Error("the grip has no box");
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y - 150, { steps: 6 });
      expect(await app.evaluate((node) => node.style.getPropertyValue("--sheet-h"))).toMatch(
        /^\d+(\.\d+)?px$/u,
      );
      await expect(page.locator(".panel")).toHaveAttribute("data-dragging", "");
      await page.mouse.up();
      await expect(app).toHaveAttribute("data-snap", "half");
      expect(await app.evaluate((node) => node.style.getPropertyValue("--sheet-h"))).toBe("");
      await expect(page.locator(".panel")).not.toHaveAttribute("data-dragging", /.*/u);
      expect(await page.evaluate(() => document.querySelectorAll("[style]").length)).toBe(0);
    });

    test("METRO-105 Tab from the handle into the content of a peeking sheet opens it to half", async ({
      page,
    }) => {
      await open(page);
      const app = page.locator(".app");
      const grip = page.getByRole("button", { name: /^Resize panel/u });
      await grip.focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowDown");
      await expect(app).toHaveAttribute("data-snap", "peek");
      await page.keyboard.press("Tab"); // "Make panel larger", still a handle control
      await expect(app).toHaveAttribute("data-snap", "peek");
      await page.keyboard.press("Tab"); // first control in the content
      await expect(app).toHaveAttribute("data-snap", "half");
      expect(
        await page.evaluate(() => document.activeElement?.closest(".panel__scroll") !== null),
      ).toBe(true);
    });

    test("METRO-105 the slice is reachable and axe passes at 390 px in dark", async ({ page }) => {
      await open(page, "dark");
      const results = await axeBuilder(page).analyze();
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  });
});
