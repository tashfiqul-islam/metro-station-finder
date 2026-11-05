import { axeBuilder, expect, test } from "./fixtures";
import { expectTabReachesEveryControl } from "./keyboard";

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

test.describe("accessibility tree of main (METRO-41)", () => {
  test("METRO-41 success state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("main")).toMatchAriaSnapshot(`
      - main:
        - /children: equal
        - heading "Metro scaffold" [level=1]
        - paragraph: Synthetic workspace check. No station or fare features.
        - status "Scaffold status": /\\{"kind":"synthetic-scaffold","ready":true\\}/
    `);
  });

  test.describe("when the status request fails", () => {
    test.use({ allowedConsoleError: /Failed to load resource.*status of 500/u });

    test("METRO-41 error state announces through role=alert", async ({ page }) => {
      await page.route("**/api/scaffold/status", (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "internal_error", message: "Internal server error" },
          }),
        }),
      );
      await page.goto("/");
      await expect(page.getByRole("main")).toMatchAriaSnapshot(`
        - main:
          - /children: equal
          - heading "Metro scaffold" [level=1]
          - paragraph: Synthetic workspace check. No station or fare features.
          - alert: /Scaffold status unavailable. Status request failed with HTTP 500/
      `);
      await expect(page.getByRole("alert")).toHaveCount(1);
    });
  });
});

test.describe("keyboard flow (METRO-41)", () => {
  test("METRO-41 the scaffold has no interactive control and Tab focuses nothing", async ({
    page,
    browserName,
  }) => {
    await page.goto("/");
    await expect(page.getByLabel("Scaffold status")).toBeVisible();
    expect(
      await expectTabReachesEveryControl(page, { linksTabbable: browserName !== "webkit" }),
    ).toBe(0);
  });

  test("METRO-41 Tab reaches every control with a visible focus indicator", async ({ page }) => {
    await page.setContent(CONTROLS_OK);
    expect(await expectTabReachesEveryControl(page, { linksTabbable: true })).toBe(3);
  });

  test("METRO-41 the check fails when a control's focus is hidden", async ({ page }) => {
    await page.setContent(
      CONTROLS_OK.replace("<main>", "<style>button:focus{outline:none}</style><main>"),
    );
    await expect(expectTabReachesEveryControl(page, { linksTabbable: true })).rejects.toThrow(
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
    await expect(expectTabReachesEveryControl(page, { linksTabbable: true })).rejects.toThrow(
      /not covered/u,
    );
  });

  test("METRO-41 the check rejects a positive tabindex", async ({ page }) => {
    await page.setContent(CONTROLS_OK.replace("<button>", "<button tabindex='2'>"));
    await expect(expectTabReachesEveryControl(page, { linksTabbable: true })).rejects.toThrow(
      /positive tabindex/u,
    );
  });
});
