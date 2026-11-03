import { AxeBuilder } from "@axe-core/playwright";
import { expect, test as base } from "@playwright/test";

interface Options {
  /** A console error a test provokes on purpose (for example an injected HTTP 500). */
  allowedConsoleError: RegExp | null;
}

/**
 * Every test fails on any console error or uncaught page error, and every page a test leaves open
 * must have zero axe violations in every project.
 */
export const test = base.extend<{ guards: void } & Options>({
  allowedConsoleError: [null, { option: true }],
  guards: [
    async ({ page, allowedConsoleError }, use) => {
      const problems: string[] = [];
      page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        if (allowedConsoleError?.test(message.text())) return;
        problems.push(`console.error: ${message.text()}`);
      });
      await use();
      expect(problems, "console and page errors").toEqual([]);
      if (page.url() !== "about:blank") {
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations, "axe violations").toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };
