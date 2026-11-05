import { expect, test } from "./fixtures";

const shared = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(self)",
};

test.describe("security headers and caching (METRO-31)", () => {
  for (const path of ["/", "/deep/link", "/api/scaffold/status"]) {
    test(`METRO-31 ${path} carries the security headers`, async ({ request }) => {
      const headers = (await request.get(path)).headers();
      expect(headers).toMatchObject(shared);
      // Report-Only CSP guards pages; the JSON API has none. No enforcing CSP and no HSTS anywhere yet.
      expect(headers["content-security-policy-report-only"] !== undefined).toBe(
        !path.startsWith("/api/"),
      );
      expect(headers["content-security-policy"]).toBeUndefined();
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
    for (const path of ["/", "/index.html"]) {
      expect((await request.get(path)).headers()["cache-control"] ?? "").not.toContain("immutable");
    }
  });

  test("METRO-31 the page logs no CSP report-only violation", async ({ page }) => {
    // Chromium logs a report-only violation as a console "info" message (not an error), so the shared
    // fixture would not catch it. Firefox and WebKit word or route it differently; Chromium is the guard.
    const violations: string[] = [];
    page.on("console", (message) => {
      if (message.text().includes("Content Security Policy")) violations.push(message.text());
    });
    await page.goto("/");
    await expect(page.getByLabel("Scaffold status")).toBeVisible();
    expect(violations).toEqual([]);
  });
});
