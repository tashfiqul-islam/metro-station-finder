import { expect, test } from "vitest";

import { createApp } from "./app";
import app from "./index";

const EXPECTED = {
  "x-content-type-options": "nosniff",
  "permissions-policy": "geolocation=(self)",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
} as const;

function expectSecurityHeaders(response: Response): void {
  for (const [name, value] of Object.entries(EXPECTED)) {
    expect(response.headers.get(name)).toBe(value);
  }
  // Report-only CSP is a static-asset (HTML) concern; HSTS waits for the custom domain (ADR-0011).
  expect(response.headers.get("content-security-policy")).toBeNull();
  expect(response.headers.get("strict-transport-security")).toBeNull();
}

test("METRO-31 GET /api/scaffold/status carries the security headers", async () => {
  const response = await app.request("/api/scaffold/status");
  expect(response.status).toBe(200);
  expectSecurityHeaders(response);
});

test("METRO-31 404, 405 and 500 API responses carry the security headers", async () => {
  expectSecurityHeaders(await app.request("/api/unknown"));
  expectSecurityHeaders(await app.request("/api/scaffold/status", { method: "POST" }));
  const failing = createApp(
    () => {
      throw new Error("boom");
    },
    () => {},
  );
  const response = await failing.request("/api/scaffold/status");
  expect(response.status).toBe(500);
  expectSecurityHeaders(response);
});
