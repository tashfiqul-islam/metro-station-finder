import { expect, type Page } from "@playwright/test";

const LINKS = "a[href], area[href]";
const FOCUSABLE =
  "button, input:not([type=hidden]), select, textarea, summary, iframe, [contenteditable=''], [contenteditable='true'], [tabindex]";

export interface TabOptions {
  /** Exact number of interactive controls the page must have. A mismatch fails with instructions. */
  readonly expected: number;
  /** Replaces the built-in control selector. Only for proving the helper itself. */
  readonly selector?: string;
}

/** What the page reports about the element that holds focus. */
interface FocusReport {
  readonly index: number;
  readonly focusVisible: boolean;
  /** Outline or box-shadow differs from the same control unfocused. */
  readonly indicatorChanged: boolean;
  /** Of five sample points inside the visible part, how many hit the focused element or a descendant. */
  readonly unobscuredPoints: number;
  readonly samplePoints: number;
  /** Part of the control lies inside the viewport. */
  readonly partlyVisible: boolean;
  readonly geometry: string;
}

const STYLE_KEYS = ["outlineStyle", "outlineWidth", "outlineColor", "boxShadow"] as const;

/**
 * Whether this browser Tabs onto a link. WebKit on macOS does not by default (Safari's "Press Tab to
 * highlight each item" is off); other engines do. Measured in a throwaway page, never assumed.
 */
export async function linksAreTabbable(page: Page): Promise<boolean> {
  const probe = await page.context().newPage();
  try {
    await probe.setContent("<!doctype html><title>probe</title><a href='#probe'>link</a>");
    await probe.bringToFront();
    await probe.keyboard.press("Tab");
    return await probe.evaluate(() => document.activeElement?.tagName === "A");
  } finally {
    await probe.close();
  }
}

/**
 * Presses Tab through the page and proves that, for every interactive control in DOM order, Tab
 * reaches it (2.1.1 Keyboard), that its focus indicator differs from its unfocused look and it
 * matches `:focus-visible` (2.4.7 Focus Visible), and that nothing covers it (2.4.11 Focus Not
 * Obscured (Minimum); stricter: five sample points inside its visible part must all hit it). Rules:
 * the focused control must be at least partly inside the viewport (Tab scrolls it into view; a
 * control taller than the viewport is judged on its visible part); no keyboard
 * trap (the page must not cancel Tab, and Shift+Tab from the last control must reach the previous
 * one); a page with no control must leave `document.activeElement` on the body. A single control
 * cannot be tested for a trap by Shift+Tab, only for a cancelled Tab.
 * DOM order stands in for tab order (sanity only, not a 2.4.3 check), so a positive `tabindex`
 * is rejected. Links are included only where this browser Tabs to them (`linksAreTabbable`).
 */
export async function expectTabReachesEveryControl(
  page: Page,
  { expected, selector }: TabOptions,
): Promise<number> {
  const linksTabbable = await linksAreTabbable(page);
  const count = await page.evaluate(
    ({ query, keys }) => {
      const controls = [...document.querySelectorAll<HTMLElement>(query)].filter((element) => {
        const style = getComputedStyle(element);
        return (
          !element.matches(":disabled") &&
          element.tabIndex >= 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          element.getClientRects().length > 0
        );
      });
      controls.forEach((element, index) => {
        element.setAttribute("data-tab-index", String(index));
        const style = getComputedStyle(element);
        element.setAttribute("data-tab-unfocused", JSON.stringify(keys.map((key) => style[key])));
      });
      return controls.length;
    },
    {
      query: selector ?? (linksTabbable ? `${LINKS}, ${FOCUSABLE}` : FOCUSABLE),
      keys: STYLE_KEYS,
    },
  );
  expect(
    count,
    `interactive controls changed: found ${count}, pinned ${expected}. Set expected to ${count} and add ARIA snapshot and keyboard cases for the new controls`,
  ).toBe(expected);
  expect(
    await page.evaluate(
      () => document.querySelectorAll("[tabindex]:not([tabindex='0'], [tabindex^='-'])").length,
    ),
    "positive tabindex changes tab order",
  ).toBe(0);

  await page.evaluate(() => {
    window.addEventListener("keydown", (event) => {
      if (event.key === "Tab" && event.defaultPrevented) {
        document.documentElement.setAttribute("data-tab-prevented", "");
      }
    });
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    // Put the sequential focus starting point at the top of the document, whatever was clicked or focused
    // before (a focused control, or the map, leaves it elsewhere): focus a probe that is first in the DOM.
    const probe = document.createElement("span");
    probe.tabIndex = -1;
    document.body.prepend(probe);
    probe.focus();
    probe.blur();
    probe.remove();
  });
  for (let position = 0; position < count; position += 1) {
    await page.keyboard.press("Tab");
    const measure = () =>
      page.evaluate((keys): FocusReport | null => {
        const element = document.activeElement;
        // An SVG element can be a tab stop too (the line map, METRO-111); `tabIndex` and focus work the same.
        const focusable = element instanceof HTMLElement || element instanceof SVGElement;
        if (!focusable || !element.hasAttribute("data-tab-index")) {
          return null;
        }
        const rect = element.getBoundingClientRect();
        const left = Math.max(rect.left, 0);
        const top = Math.max(rect.top, 0);
        const right = Math.min(rect.right, innerWidth);
        const bottom = Math.min(rect.bottom, innerHeight);
        const partlyVisible = right > left && bottom > top;
        const points: readonly (readonly [number, number])[] = [
          [0.5, 0.5],
          [0.25, 0.5],
          [0.75, 0.5],
          [0.5, 0.25],
          [0.5, 0.75],
        ];
        const hits = partlyVisible
          ? points.filter(([x, y]) => {
              const hit = document.elementFromPoint(
                left + (right - left) * x,
                top + (bottom - top) * y,
              );
              return hit !== null && element.contains(hit);
            }).length
          : 0;
        const style = getComputedStyle(element);
        return {
          index: Number(element.getAttribute("data-tab-index")),
          focusVisible: element.matches(":focus-visible"),
          indicatorChanged:
            JSON.stringify(keys.map((key) => style[key])) !==
            element.getAttribute("data-tab-unfocused"),
          unobscuredPoints: hits,
          samplePoints: points.length,
          partlyVisible,
          geometry: `top ${Math.round(rect.top)}, height ${Math.round(rect.height)}, viewport ${innerHeight}, scrollY ${Math.round(scrollY)}`,
        };
      }, STYLE_KEYS);
    // Scrolling a focused control into view is asynchronous in some engines (Linux WebKit in CI
    // was still unscrolled when first measured), so measure again until it is in view (the positive signal),
    // within the same 2 s budget and the old 50 ms cadence. Only the poll's own timeout (never in view) is turned
    // into the report that the assertions below fail on (`partlyVisible` is asserted there); an error raised by
    // the measurement itself (a closed page, say) is rethrown.
    let report = await measure();
    if (report && !report.partlyVisible) {
      let measureFailed = false;
      try {
        await expect
          .poll(
            async () => {
              try {
                report = await measure();
              } catch (error) {
                measureFailed = true;
                throw error;
              }
              return report?.partlyVisible ?? true;
            },
            { timeout: 2000, intervals: [50] },
          )
          .toBe(true);
      } catch (error) {
        if (measureFailed) throw error;
      }
    }
    const label = `Tab press ${position + 1} of ${count}`;
    expect(report, `${label} focuses a control`).not.toBeNull();
    expect(report?.index, `${label} reaches control ${position} in order`).toBe(position);
    expect(report?.focusVisible, `control ${position} matches :focus-visible`).toBe(true);
    expect(report?.indicatorChanged, `control ${position} draws a focus indicator`).toBe(true);
    expect(
      report?.partlyVisible,
      `control ${position} is scrolled into view (${report?.geometry ?? "no report"})`,
    ).toBe(true);
    expect(report?.unobscuredPoints, `control ${position} is not covered`).toBe(
      report?.samplePoints,
    );
  }

  if (count === 0) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => {
        const active = document.activeElement;
        return active === null || active === document.body || active === document.documentElement;
      }),
      "Tab focuses nothing in a page without controls",
    ).toBe(true);
  } else if (count > 1) {
    // Shift+Tab from the last control must reach the one before it, and then Tab must not have
    // been cancelled anywhere (a trap cancels Tab; Firefox keeps focus on the last control at the
    // end of the page, so "focus stayed" alone cannot tell a trap from the end of the page).
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() => Number(document.activeElement?.getAttribute("data-tab-index"))),
      "Shift+Tab from the last control reaches the previous control (keyboard trap)",
    ).toBe(count - 2);
    await page.keyboard.press("Tab");
  }
  expect(
    await page.evaluate(() => document.documentElement.hasAttribute("data-tab-prevented")),
    "Tab was cancelled by the page (keyboard trap)",
  ).toBe(false);
  return count;
}
