import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const shared = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(self)",
};

function collect(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });
  return violations;
}

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

  // Chromium logs a report-only violation as a console "info" message (not an error), so the shared
  // fixture would not catch it. Firefox and WebKit word or route it differently; Chromium is the guard.
  test.describe("CSP report-only console messages", () => {
    test.use({ allowedConsoleError: /Failed to load resource/u });

    test("METRO-31 positive control: a disallowed image is reported", async ({
      page,
      browserName,
    }) => {
      test.skip(browserName !== "chromium", "console wording is verified on Chromium only");
      const violations = collect(page);
      await page.goto("/");
      await expect(page.getByLabel("Scaffold status")).toBeVisible();
      await page.evaluate(() => {
        const image = document.createElement("img");
        image.alt = "";
        image.src = "http://localhost:4173/csp-control.png";
        document.body.append(image);
      });
      await expect.poll(() => violations.length).toBeGreaterThan(0);
      expect(violations.join("\n")).toContain("report-only");
    });

    test("METRO-31 the app itself produces no CSP report-only violation", async ({ page }) => {
      const violations = collect(page);
      await page.goto("/");
      await expect(page.getByLabel("Scaffold status")).toBeVisible();
      expect(violations).toEqual([]);
    });
  });
});
