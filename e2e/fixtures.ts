import { AxeBuilder } from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

interface Options {
  /** A console error a test provokes on purpose (for example an injected HTTP 500). */
  allowedConsoleError: RegExp | null;
}

/**
 * Two exact console errors WebKit prints for any HTML page served with our Report-Only CSP header
 * (METRO-31, ADR-0011), verified 2026-11-05 on Playwright 1.64.1 WebKit. Neither comes from the app:
 * the first says a Report-Only policy without a `report-to` directive has no effect, and the second
 * is WebKit's own stylesheet; it also appears on a bare `<p>hi</p>` page. They are matched whole,
 * and only for WebKit, so any other console error still fails. `e2e/headers.e2e.ts` separately
 * proves the app has no `<style>` element, `style` attribute or stylesheet.
 */
const WEBKIT_REPORT_ONLY_NOISE = [
  /^The Content Security Policy '[^]+' was delivered in report-only mode, but does not specify a 'report-to'; the policy will have no effect\. Please either add a 'report-to' directive, or deliver the policy via the 'Content-Security-Policy' header\.$/u,
  /^\[Report Only\] Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy\.$/u,
];

/**
 * Target: WCAG 2.2 AA. axe-core 4.14.0 tags WCAG 2.0/2.1/2.2 rules by level, and `wcag22aa` is the
 * only tag that selects `target-size` (SC 2.5.8), which axe leaves disabled by default.
 * `best-practice` keeps every rule axe ran before tags were set: a tag filter replaces the default
 * rule set, and without it 26 default rules (landmark-one-main, region, heading-order, ...) drop out.
 */
export const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
] as const;

/** Axe runs through this one builder, in the guard and in the tests that prove its configuration. */
export function axeBuilder(page: Page): AxeBuilder {
  return new AxeBuilder({ page }).withTags([...AXE_TAGS]);
}

export function isWebKitReportOnlyNoise(browserName: string, text: string): boolean {
  return browserName === "webkit" && WEBKIT_REPORT_ONLY_NOISE.some((pattern) => pattern.test(text));
}

/**
 * Every test fails on any console error or uncaught page error, and every page a test leaves open
 * must have zero axe violations in every project.
 */
export const test = base.extend<{ guards: void } & Options>({
  allowedConsoleError: [null, { option: true }],
  guards: [
    async ({ page, allowedConsoleError, browserName }, use) => {
      const problems: string[] = [];
      page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        if (allowedConsoleError?.test(message.text())) return;
        if (isWebKitReportOnlyNoise(browserName, message.text())) return;
        problems.push(`console.error: ${message.text()}`);
      });
      await use();
      expect(problems, "console and page errors").toEqual([]);
      if (page.url() !== "about:blank") {
        const results = await axeBuilder(page).analyze();
        expect(results.violations, "axe violations").toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };
