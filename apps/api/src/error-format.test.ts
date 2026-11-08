import { parseErrorEnvelope } from "@metro/contracts";
import { expect, test } from "vitest";

import adr from "../../../docs/adr/0013-api-error-format.md?raw";
import { createApp, type ApiApp } from "./app";

// ADR-0013 keeps the { error: { code, message } } envelope and does not adopt RFC 9457
// application/problem+json. These tests pin what 404, 405 and 500 return today, so adopting
// problem+json (or any new error shape) must change them deliberately, through a new ADR.
// The ADR text is imported with Vite `?raw`: workerd has no view of the repository file system.

// The 500 comes from a probe route registered through the `register` seam (the one real route cannot fail).
const probe = (app: ApiApp) => {
  app.get("/api/probe", () => {
    throw new Error("secret internal detail");
  });
};
const makeApp = () => createApp(undefined, probe);

test("METRO-53 ADR-0013 exists and records both decisions", () => {
  expect(adr.length).toBeGreaterThan(0);
  const text = adr;
  expect(text).toContain("application/problem+json");
  expect(text).toContain("RFC 9457");
  expect(text).toContain("tolerant reader");
});

test("METRO-53 ADR-0013 error responses are application/json envelopes, not problem+json", async () => {
  const cases = [
    [await makeApp().request("/api/unknown"), 404, "not_found"],
    [await makeApp().request("/assets/x.js", { method: "POST" }), 405, "method_not_allowed"],
    [await makeApp().request("/api/probe"), 500, "internal_error"],
  ] as const;
  for (const [response, status, code] of cases) {
    expect(response.status).toBe(status);
    expect(response.headers.get("content-type")).toBe("application/json");
    const body: unknown = await response.json();
    expect(parseErrorEnvelope(body).error.code).toBe(code);
    // No `status` member: the HTTP status line is the only carrier of the status.
    expect(Object.keys(parseErrorEnvelope(body))).toEqual(["error"]);
  }
});

test("METRO-53 ADR-0013 the API 404, 405 and 500 set no Cache-Control", async () => {
  const app = makeApp();
  for (const response of [
    await app.request("/api/unknown"),
    await app.request("/assets/x.js", { method: "POST" }),
    await app.request("/api/probe"),
  ]) {
    expect(response.headers.get("cache-control")).toBeNull();
  }
});

test("METRO-93 a 500 never leaks the thrown error's text in the body", async () => {
  const response = await makeApp().request("/api/probe");
  expect(response.status).toBe(500);
  const text = await response.text();
  expect(text).not.toContain("secret internal detail");
  expect(parseErrorEnvelope(JSON.parse(text)).error.code).toBe("internal_error");
});
