import { expect, type Page } from "@playwright/test";

const LINKS = "a[href], area[href]";
const FOCUSABLE =
  "button, input:not([type=hidden]), select, textarea, summary, iframe, [contenteditable=''], [contenteditable='true'], [tabindex]";

/** What the page reports about the element that holds focus. */
interface FocusReport {
  readonly tag: string;
  readonly index: number;
  readonly focusVisible: boolean;
  readonly indicator: boolean;
  /** Sample points (centre and the four quarter points) that hit the focused element or a descendant. */
  readonly unobscuredPoints: number;
  readonly inViewport: boolean;
}

/**
 * Presses Tab through the page and proves, for every interactive control in DOM order, that Tab
 * reaches it, that it matches `:focus-visible` with a drawn indicator, and that nothing covers it
 * (WCAG 2.4.7 Focus Visible, 2.4.11 Focus Not Obscured (Minimum), 2.1.1 Keyboard). The unobscured
 * check is stricter than 2.4.11: all five sample points must hit the control. A page with no
 * interactive control passes only if Tab focuses nothing in it.
 * Returns the number of controls so callers can pin it. WebKit does not Tab to links by default (Safari's "Press Tab to highlight each item" is off), so
 * callers pass `linksTabbable: false` there; Linux WebKit is Unverified. DOM order stands in for tab order, so a
 * positive `tabindex` is rejected rather than guessed at.
 */
export async function expectTabReachesEveryControl(
  page: Page,
  { linksTabbable }: { readonly linksTabbable: boolean },
): Promise<number> {
  const count = await page.evaluate(
    (selector) => {
      const controls = [...document.querySelectorAll<HTMLElement>(selector)].filter((element) => {
        const style = getComputedStyle(element);
        return (
          !element.matches(":disabled") &&
          element.tabIndex >= 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          element.getClientRects().length > 0
        );
      });
      controls.forEach((element, index) => element.setAttribute("data-tab-index", String(index)));
      return controls.length;
    },
    linksTabbable ? `${LINKS}, ${FOCUSABLE}` : FOCUSABLE,
  );
  expect(
    await page.evaluate(
      () => document.querySelectorAll("[tabindex]:not([tabindex='0'], [tabindex^='-'])").length,
    ),
    "positive tabindex changes tab order",
  ).toBe(0);

  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  for (let expected = 0; expected < count; expected += 1) {
    await page.keyboard.press("Tab");
    const report = await page.evaluate((): FocusReport | null => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement) || element === document.body) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const points: readonly (readonly [number, number])[] = [
        [0.5, 0.5],
        [0.25, 0.5],
        [0.75, 0.5],
        [0.5, 0.25],
        [0.5, 0.75],
      ];
      const hits = points.filter(([x, y]) => {
        const hit = document.elementFromPoint(
          rect.left + rect.width * x,
          rect.top + rect.height * y,
        );
        return hit !== null && element.contains(hit);
      }).length;
      return {
        tag: element.tagName.toLowerCase(),
        index: Number(element.getAttribute("data-tab-index") ?? -1),
        focusVisible: element.matches(":focus-visible"),
        indicator:
          (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
          style.boxShadow !== "none",
        unobscuredPoints: hits,
        inViewport:
          rect.width > 0 &&
          rect.height > 0 &&
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= innerHeight &&
          rect.right <= innerWidth,
      };
    });
    expect(report, `Tab press ${expected + 1} of ${count} focuses a control`).not.toBeNull();
    expect(report?.index, `Tab press ${expected + 1} reaches control ${expected} in order`).toBe(
      expected,
    );
    expect(report?.focusVisible, `control ${expected} matches :focus-visible`).toBe(true);
    expect(report?.indicator, `control ${expected} draws a focus indicator`).toBe(true);
    expect(report?.inViewport, `control ${expected} is inside the viewport`).toBe(true);
    expect(report?.unobscuredPoints, `control ${expected} is not covered`).toBe(5);
  }

  if (count === 0) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => document.activeElement?.hasAttribute("data-tab-index") ?? false),
      "Tab focuses nothing in a page without controls",
    ).toBe(false);
  }
  return count;
}
