import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const shared = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(self)",
};

/** Console messages that name a Content Security Policy, with the level the browser logged them at. */
function collect(page: Page): { level: string; text: string }[] {
  const violations: { level: string; text: string }[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (text.includes("Content Security Policy")) violations.push({ level: message.type(), text });
  });
  return violations;
}

async function injectBlockedImage(page: Page): Promise<void> {
  await page.evaluate(() => {
    const image = document.createElement("img");
    image.alt = "";
    // A different origin from the app (127.0.0.1), so `img-src 'self'` blocks it.
    image.src = "http://localhost:4173/csp-control.png";
    document.body.append(image);
  });
}

test.describe("security headers and caching (METRO-31)", () => {
  for (const path of ["/", "/deep/link", "/api/scaffold/status"]) {
    test(`METRO-31 ${path} carries the security headers`, async ({ request }) => {
      const headers = (await request.get(path)).headers();
      expect(headers).toMatchObject(shared);
      // An enforced CSP guards pages (METRO-88); the JSON API has none. No Report-Only policy and no HSTS anywhere.
      expect(headers["content-security-policy"] !== undefined).toBe(!path.startsWith("/api/"));
      expect(headers["content-security-policy-report-only"]).toBeUndefined();
      expect(headers["strict-transport-security"]).toBeUndefined();
    });
  }

  test("METRO-31 the hashed asset is immutable; / and /index.html are not", async ({ request }) => {
    const html = await (await request.get("/")).text();
    const asset = /(?:src|href)="(\/assets\/[^"]+)"/u.exec(html)?.[1];
    expect(asset, "hashed /assets/ URL in index.html").toBeDefined();
    const response = await request.get(asset ?? "");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("immutable");
    expect(response.headers()).toMatchObject(shared);
    for (const path of ["/", "/index.html"]) {
      expect((await request.get(path)).headers()["cache-control"] ?? "").not.toContain("immutable");
    }
  });

  test("METRO-31 a missing /assets/ file is never served as immutable", async ({ request }) => {
    for (const path of ["/assets/does-not-exist.js", "/assets/nested/missing.css"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(response.headers(), path).toMatchObject({ ...shared, "cache-control": "no-store" });
      expect(response.headers()["cache-control"] ?? "", path).not.toContain("immutable");
    }
  });

  // The CSP is enforced (METRO-88, ADR-0011 amendment). Chromium logs an enforced violation as a console
  // "error", which the shared fixture already fails on; the tests below prove that instead of assuming it.
  // Firefox and WebKit word the message differently, so the message text is checked on Chromium only.
  const BLOCKED_IMAGE = /violates the following Content Security Policy directive/u;

  test.describe("CSP console errors", () => {
    test.use({ allowedConsoleError: BLOCKED_IMAGE });

    test("METRO-88 positive control: a blocked image is logged at error level", async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== "chromium", "console wording is verified on Chromium only");
      const violations = collect(page);
      await page.goto("/");
      await expect(page.getByLabel("Scaffold status")).toBeVisible();
      await injectBlockedImage(page);
      await expect.poll(() => violations.length).toBeGreaterThan(0);
      expect(violations[0]?.level).toBe("error");
      expect(violations[0]?.text).toMatch(BLOCKED_IMAGE);
      expect(violations[0]?.text).not.toContain("report-only");
    });

    test("METRO-31 the app itself produces no CSP violation", async ({ page }) => {
      const violations = collect(page);
      await page.goto("/");
      await expect(page.getByLabel("Scaffold status")).toBeVisible();
      expect(violations).toEqual([]);
      const styling = await page.evaluate(() => ({
        stylesheets: document.styleSheets.length,
        styleElements: document.querySelectorAll("style").length,
        styleAttributes: document.querySelectorAll("[style]").length,
      }));
      // One same-origin stylesheet (focus.css, METRO-58) is allowed by `style-src 'self'`; nothing inline.
      expect(styling).toEqual({ stylesheets: 1, styleElements: 0, styleAttributes: 0 });
    });
  });

  // Proves the console-error fixture itself: with no `allowedConsoleError`, the same blocked image must
  // fail the test. `test.fail` passes only when the fixture reports the violation.
  test("METRO-88 the console-error fixture fails a test that triggers a CSP violation", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "console wording is verified on Chromium only");
    test.fail();
    const logged = page.waitForEvent("console", {
      predicate: (message) => BLOCKED_IMAGE.test(message.text()),
    });
    await page.goto("/");
    await expect(page.getByLabel("Scaffold status")).toBeVisible();
    await injectBlockedImage(page);
    await logged;
  });
});
