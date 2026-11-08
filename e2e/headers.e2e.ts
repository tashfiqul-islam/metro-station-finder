import type { Page } from "@playwright/test";

import { consoleProblems, expect, isWebKitStylesheetNotice, test } from "./fixtures";
import { installMapsStub } from "./maps-stub";

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
  for (const path of ["/", "/deep/link", "/api/unknown"]) {
    test(`METRO-31 ${path} carries the security headers`, async ({ request }) => {
      const headers = (await request.get(path)).headers();
      expect(headers).toMatchObject(shared);
      // An enforced CSP guards pages (METRO-88); the JSON API has none. No Report-Only policy and no HSTS anywhere.
      expect(headers["content-security-policy"] !== undefined).toBe(!path.startsWith("/api/"));
      expect(headers["content-security-policy-report-only"]).toBeUndefined();
      expect(headers["strict-transport-security"]).toBeUndefined();
    });
  }

  test("METRO-96 the served CSP allows the Google font hosts and two style hashes, nothing broader", async ({
    request,
  }) => {
    const policy = (await request.get("/")).headers()["content-security-policy"] ?? "";
    const sources = (name: string): string[] | undefined =>
      policy
        .split(";")
        .map((part) => part.trim().split(/\s+/u))
        .find(([directive]) => directive === name)
        ?.slice(1);
    expect(sources("style-src")).toEqual([
      "'self'",
      "https://fonts.googleapis.com",
      "'sha256-6THUUcZnIM+50QUKRA2tjLYNFvBVYjT3//X9aTSTJWc='",
      "'sha256-5wjeBWXQ+uhb+jIpjvGSs73Ok5HO26+ZJJAPeEXZDT8='",
    ]);
    expect(sources("font-src")).toEqual(["'self'", "https://fonts.gstatic.com"]);
    for (const banned of ["'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "blob:", "*"]) {
      expect(policy.split(/[\s;]+/u)).not.toContain(banned);
    }
  });

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
      await installMapsStub(page);
      await page.goto("/");
      await expect(
        page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
      ).toBeVisible();
      await injectBlockedImage(page);
      await expect.poll(() => violations.length).toBeGreaterThan(0);
      expect(violations[0]?.level).toBe("error");
      expect(violations[0]?.text).toMatch(BLOCKED_IMAGE);
      expect(violations[0]?.text).not.toContain("report-only");
    });

    test("METRO-31 the app itself produces no CSP violation", async ({ page }) => {
      const violations = collect(page);
      await installMapsStub(page);
      await page.goto("/");
      await expect(
        page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
      ).toBeVisible();
      expect(violations).toEqual([]);
      const styling = await page.evaluate(() => ({
        stylesheets: document.styleSheets.length,
        linked: document.querySelectorAll('link[rel="stylesheet"]').length,
        foreign: [...document.styleSheets].filter(
          (sheet) => sheet.href !== null && new URL(sheet.href).origin !== location.origin,
        ).length,
        styleElements: document.querySelectorAll("style").length,
        styleAttributes: document.querySelectorAll("[style]").length,
      }));
      // Only same-origin stylesheets, as linked files (the entry's, then the slice chunk's), allowed by
      // `style-src 'self'`; nothing inline (METRO-58, METRO-105).
      expect(styling.stylesheets).toBeGreaterThanOrEqual(1);
      expect(styling).toEqual({
        stylesheets: styling.linked,
        linked: styling.linked,
        foreign: 0,
        styleElements: 0,
        styleAttributes: 0,
      });
    });
  });

  // Keeps the WebKit allowance in fixtures.ts honest: the notice must still be there for a bare <select>
  // (when WebKit stops logging it this fails and the allowance goes), and nothing else is tolerated.
  test("METRO-88 WebKit reports its own menu stylesheet for a <select>, and only that", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "webkit", "WebKit-only behaviour");
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await installMapsStub(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
    await page.evaluate(() => {
      const select = document.createElement("select");
      select.setAttribute("aria-label", "probe");
      document.querySelector("main")?.append(select);
    });
    await expect.poll(() => errors.length).toBe(1);
    expect(errors[0]).toMatch(/^Refused to apply a stylesheet because /u);
    expect(isWebKitStylesheetNotice("webkit", errors[0] ?? "")).toBe(true);
    expect(isWebKitStylesheetNotice("chromium", errors[0] ?? "")).toBe(false);
    expect(isWebKitStylesheetNotice("webkit", "Refused to load the image")).toBe(false);
  });

  // The rule behind the proof below, checked directly so the reason is explicit: a CSP console error is a
  // problem, a tolerated entry is not, and the WebKit notice is tolerated once per test only.
  test("METRO-88 consoleProblems reports a CSP console error and tolerates one WebKit notice", () => {
    const csp = {
      type: "error",
      text: "Refused to load the image 'http://x.test/a.png' because it violates the following Content Security Policy directive: \"img-src 'self'\".",
    };
    const notice = {
      type: "error",
      text: "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.",
    };
    expect(consoleProblems([csp], null, "chromium")).toEqual([`console.error: ${csp.text}`]);
    expect(consoleProblems([csp], /violates the following/u, "chromium")).toEqual([]);
    expect(consoleProblems([{ type: "info", text: csp.text }], null, "chromium")).toEqual([]);
    expect(consoleProblems([notice], null, "webkit")).toEqual([]);
    expect(consoleProblems([notice, notice], null, "webkit")).toEqual([
      `console.error: ${notice.text}`,
    ]);
    expect(consoleProblems([notice], null, "chromium")).toEqual([`console.error: ${notice.text}`]);
    expect(consoleProblems([csp, notice], null, "webkit")).toEqual([`console.error: ${csp.text}`]);
  });

  // Fail closed: a test that forgets the Maps stub must not reach Google. The slice loads the Maps script at
  // once, so without a stub the fixture aborts that request and reports it, and this test fails by design
  // (`test.fail`).
  test("METRO-88 the fixture fails a test that reaches a Google host without a stub", async ({
    page,
  }) => {
    test.fail();
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
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
    await installMapsStub(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Nearest Metro station" }),
    ).toBeVisible();
    await injectBlockedImage(page);
    await logged;
  });
});
