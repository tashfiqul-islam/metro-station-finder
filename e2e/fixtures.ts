import { AxeBuilder } from "@axe-core/playwright";
import { expect, test as base, type Page } from "@playwright/test";

interface Options {
  /** A console error a test provokes on purpose (for example an injected HTTP 500). */
  allowedConsoleError: RegExp | null;
}

/**
 * The one console error WebKit prints under the enforced CSP (METRO-88): when a `<select>` is first
 * inserted, WebKit applies its own built-in menu stylesheet and reports it against `style-src`. It is not
 * the app's style: a probe on Playwright 1.64.1 WebKit (2026-11-07) logged it for a `<select>` and for no
 * other of `p`, `button`, `input`, `fieldset`, `output` or `dl`, and `e2e/headers.e2e.ts` proves the
 * message appears with a bare `<select>` and that the app has no inline style. Matched whole and only
 * for WebKit, so any other console error still fails. Whether real Safari renders the menu without its
 * built-in styling under this policy is Unverified; adding `'unsafe-inline'` was rejected.
 */
const WEBKIT_STYLESHEET_NOTICE =
  /^Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy\.$/u;

export function isWebKitStylesheetNotice(browserName: string, text: string): boolean {
  return browserName === "webkit" && WEBKIT_STYLESHEET_NOTICE.test(text);
}

export interface ConsoleEntry {
  readonly type: string;
  readonly text: string;
}

/**
 * The console entries that fail a test: every `error` not allowed by the test, except that the WebKit
 * stylesheet notice is tolerated once per test (a second one is a real problem). Pure, so the rule that
 * a CSP violation fails a test is checked directly in `e2e/headers.e2e.ts`.
 */
export function consoleProblems(
  entries: readonly ConsoleEntry[],
  allowed: RegExp | null,
  browserName: string,
): string[] {
  let noticesTolerated = 0;
  const problems: string[] = [];
  for (const { type, text } of entries) {
    if (type !== "error" || allowed?.test(text) === true) continue;
    if (noticesTolerated === 0 && isWebKitStylesheetNotice(browserName, text)) {
      noticesTolerated += 1;
      continue;
    }
    problems.push(`console.error: ${text}`);
  }
  return problems;
}

/**
 * Every Google host. No test may reach one: the shared fixture aborts and reports any request that no
 * test stub took, so a test that forgets `installMapsStub` fails closed instead of calling Google with
 * the fake key.
 */
export const GOOGLE_HOSTS =
  /^https:\/\/([^/]+\.)?(googleapis|gstatic|google|googleusercontent)\.com\//u;

/**
 * Target: WCAG 2.2 AA. axe-core 4.14.0 tags WCAG 2.0/2.1/2.2 rules by level, and `wcag22aa` is the
 * only tag that selects `target-size` (SC 2.5.8), which axe leaves disabled by default.
 * `best-practice` keeps every rule axe ran before tags were set: a tag filter replaces the default
 * rule set, and without it 27 default rules (landmark-one-main, region, heading-order, ...) drop out. Measured in axe-core 4.14.0 by listing the ids from `axe.getRules()` with `enabled !== false` that `axe.getRules(tags)` lacks.
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

/**
 * Every test fails on any console error or uncaught page error, and every page a test leaves open
 * must have zero axe violations in every project.
 */
export const test = base.extend<{ guards: void } & Options>({
  allowedConsoleError: [null, { option: true }],
  guards: [
    async ({ page, allowedConsoleError, browserName }, use) => {
      const pageErrors: string[] = [];
      const entries: ConsoleEntry[] = [];
      const unstubbed: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => entries.push({ type: message.type(), text: message.text() }));
      // Registered first, so a test's own route (the Maps stub) takes precedence over it.
      await page.route(GOOGLE_HOSTS, async (route) => {
        unstubbed.push(`unstubbed Google request to ${new URL(route.request().url()).host}`);
        await route.abort();
      });
      await use();
      const problems = [
        ...pageErrors,
        ...consoleProblems(entries, allowedConsoleError, browserName),
        ...unstubbed,
      ];
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
