import type { Page } from "@playwright/test";

import { animationsSettled, axeBuilder, expect, test } from "./fixtures";
import { expectTabReachesEveryControl, linksAreTabbable } from "./keyboard";

/** Two 16 px buttons touching: fails WCAG 2.2 SC 2.5.8 Target Size (Minimum), axe rule `target-size`. */
const SMALL_TARGETS =
  "<!doctype html><html lang='en'><head><title>t</title></head><body><main><h1>t</h1>" +
  "<button style='width:16px;height:16px;padding:0;margin:0'>a</button>" +
  "<button style='width:16px;height:16px;padding:0;margin:0'>b</button></main></body></html>";
/** No <main> landmark: only the axe best-practice rule `landmark-one-main` (and `region`) objects. */
const NO_LANDMARK =
  "<!doctype html><html lang='en'><head><title>t</title></head><body><div><h1>t</h1><p>x</p></div></body></html>";

const CONTROLS_OK =
  "<!doctype html><html lang='en'><head><title>t</title></head><body><main><h1>t</h1>" +
  "<button>one</button> <input aria-label='field'> <button>two</button></main></body></html>";

test.describe("axe configuration (METRO-41)", () => {
  test("METRO-41 the scan runs the WCAG 2.2 AA tag list plus best-practice", async ({ page }) => {
    await page.setContent(CONTROLS_OK);
    const results = await axeBuilder(page).analyze();
    expect(results.toolOptions).toMatchObject({
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"],
      },
    });
  });

  test("METRO-41 a WCAG 2.2 only rule (2.5.8 target size) is reported", async ({ page }) => {
    await page.setContent(SMALL_TARGETS);
    const results = await axeBuilder(page).analyze();
    expect(results.violations.map((violation) => violation.id)).toContain("target-size");
  });

  test("METRO-41 best-practice rules that axe runs by default are still reported", async ({
    page,
  }) => {
    await page.setContent(NO_LANDMARK);
    const results = await axeBuilder(page).analyze();
    expect(results.violations.map((violation) => violation.id)).toContain("landmark-one-main");
  });
});

/** Black text on white; the script below fades it in from nearly invisible, which axe reads as low contrast. */
const FADING =
  "<!doctype html><html lang='en'><head><title>t</title></head><body style='background:#fff'><main><h1>t</h1>" +
  "<p id='p' style='color:#000'>Fading text</p></main></body></html>";
const fade = (page: Page, options: KeyframeAnimationOptions, pause = false): Promise<void> =>
  page.evaluate(
    ({ timing, paused }) => {
      const animation = document.getElementById("p")?.animate({ opacity: [0.05, 1] }, timing);
      if (paused) animation?.pause();
    },
    { timing: options, paused: pause },
  );
const fadeState = (page: Page): Promise<string> =>
  page.evaluate(() => document.getAnimations()[0]?.playState ?? "none");

test.describe("animations settle before axe (METRO-125)", () => {
  test("METRO-125 a running finite animation is waited for, so axe sees the settled colours", async ({
    page,
  }) => {
    await page.setContent(FADING);
    // Created paused and resumed in one step, so "running" is read at the moment of resuming, not after a delay a
    // stalled machine could stretch; 3 s outlasts a stall and still ends inside the wait's 5 s bound.
    await fade(page, { duration: 3000, fill: "forwards" }, true);
    expect(await fadeState(page)).toBe("paused");
    expect(
      await page.evaluate(() => {
        const animation = document.getAnimations()[0];
        animation?.play();
        return animation?.playState;
      }),
    ).toBe("running");
    const results = await axeBuilder(page).analyze();
    expect(await fadeState(page)).toBe("finished");
    expect(results.violations.map((violation) => violation.id)).not.toContain("color-contrast");
  });

  test("METRO-125 a paused finite animation does not hang the wait", async ({ page }) => {
    await page.setContent(FADING);
    await fade(page, { duration: 1500, fill: "forwards" }, true);
    expect(await fadeState(page)).toBe("paused");
    await animationsSettled(page);
    expect(await fadeState(page)).toBe("paused");
  });

  test("METRO-125 an infinite animation does not hang the wait", async ({ page }) => {
    await page.setContent(FADING);
    await fade(page, { duration: 1500, iterations: Infinity });
    await animationsSettled(page);
    expect(await fadeState(page)).toBe("running");
  });
});

test.describe("keyboard flow (METRO-41)", () => {
  test("METRO-41 a changed control count fails with instructions", async ({ page }) => {
    await page.setContent(CONTROLS_OK);
    await expect(expectTabReachesEveryControl(page, { expected: 0 })).rejects.toThrow(
      /controls changed: found 3, pinned 0.*Set expected to 3/su,
    );
  });

  test("METRO-41 Tab reaches every control with a visible focus indicator", async ({ page }) => {
    await page.setContent(CONTROLS_OK);
    expect(await expectTabReachesEveryControl(page, { expected: 3 })).toBe(3);
  });

  test("METRO-41 links are checked where this browser Tabs to them", async ({ page }) => {
    test.skip(!(await linksAreTabbable(page)), "this browser does not Tab to links by default");
    await page.setContent(CONTROLS_OK.replace("<button>one", "<a href='#x'>link</a> <button>one"));
    expect(await expectTabReachesEveryControl(page, { expected: 4 })).toBe(4);
  });

  test("METRO-41 a control taller than the viewport passes on its visible part", async ({
    page,
  }) => {
    await page.setContent(CONTROLS_OK.replace("<button>one", "<button style='height:4000px'>one"));
    expect(await expectTabReachesEveryControl(page, { expected: 3 })).toBe(3);
  });

  test("METRO-41 the check fails when a control's focus is hidden", async ({ page }) => {
    await page.setContent(
      CONTROLS_OK.replace("<main>", "<style>button:focus{outline:none}</style><main>"),
    );
    await expect(expectTabReachesEveryControl(page, { expected: 3 })).rejects.toThrow(
      /focus indicator/u,
    );
  });

  test("METRO-41 the check fails when focus looks the same as unfocused", async ({ page }) => {
    await page.setContent(
      CONTROLS_OK.replace(
        "<main>",
        "<style>button{box-shadow:0 0 0 2px red}button:focus{outline:none}</style><main>",
      ),
    );
    await expect(expectTabReachesEveryControl(page, { expected: 3 })).rejects.toThrow(
      /focus indicator/u,
    );
  });

  test("METRO-41 the check fails when a fixed overlay covers a focused control", async ({
    page,
  }) => {
    await page.setContent(
      CONTROLS_OK.replace(
        "</main>",
        "</main><div style='position:fixed;inset:0 0 0 0;background:#fff;pointer-events:auto'></div>",
      ),
    );
    await expect(expectTabReachesEveryControl(page, { expected: 3 })).rejects.toThrow(
      /not covered/u,
    );
  });

  test("METRO-41 the check fails on a keyboard trap", async ({ page }) => {
    await page.setContent(
      CONTROLS_OK.replace(
        "<button>two</button>",
        "<button id='trap'>two</button><script>document.getElementById('trap').addEventListener('keydown',(e)=>{if(e.key==='Tab'){e.preventDefault();}})</script>",
      ),
    );
    await expect(expectTabReachesEveryControl(page, { expected: 3 })).rejects.toThrow(
      /keyboard trap/u,
    );
  });

  test("METRO-41 the check fails on a focusable element the selector missed", async ({ page }) => {
    await page.setContent(CONTROLS_OK);
    await expect(
      expectTabReachesEveryControl(page, { expected: 0, selector: "button.none" }),
    ).rejects.toThrow(/Tab focuses nothing/u);
  });

  test("METRO-41 the check rejects a positive tabindex", async ({ page }) => {
    await page.setContent(CONTROLS_OK.replace("<button>", "<button tabindex='2'>"));
    await expect(expectTabReachesEveryControl(page, { expected: 3 })).rejects.toThrow(
      /positive tabindex/u,
    );
  });
});
