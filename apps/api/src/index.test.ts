import { parseErrorEnvelope, parseScaffoldStatus } from "@metro/contracts";
import { exports } from "cloudflare:workers";
import { expect, test } from "vitest";

import { createApp } from "./app";
import app from "./index";

test("FND-R3 GET /api/scaffold/status returns a schema-valid body", async () => {
  const response = await app.request("/api/scaffold/status");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
  expect(parseScaffoldStatus(await response.json())).toEqual({
    kind: "synthetic-scaffold",
    ready: true,
  });
});

test("FND-R3 unknown /api/* returns a 404 with a schema-valid error envelope", async () => {
  for (const path of ["/api/unknown", "/api", "/api/scaffold"]) {
    const response = await app.request(path);
    expect(response.status).toBe(404);
    expect(parseErrorEnvelope(await response.json()).error.code).toBe("not_found");
  }
});

test("FND-R3 the old scaffold route is gone", async () => {
  const response = await app.request("/__scaffold/status");
  expect(response.status).toBe(404);
});

test("FND-R3 other methods on the status route return 405 with an envelope and Allow", async () => {
  const response = await app.request("/api/scaffold/status", { method: "POST" });
  expect(response.status).toBe(405);
  expect(response.headers.get("allow")).toBe("GET, HEAD");
  expect(parseErrorEnvelope(await response.json()).error.code).toBe("method_not_allowed");
});

test("FND-R4 an unexpected failure returns a 500 envelope without leaking the cause", async () => {
  const failing = createApp(() => {
    throw new Error("secret internal detail");
  });
  const response = await failing.request("/api/scaffold/status");
  expect(response.status).toBe(500);
  const text = await response.text();
  expect(text).not.toContain("secret internal detail");
  expect(parseErrorEnvelope(JSON.parse(text)).error.code).toBe("internal_error");
});

test("FND-R4 a status that drifts from the contract is rejected at the API", async () => {
  const drifted = createApp(() => ({ kind: "synthetic-scaffold", ready: false }));
  expect((await drifted.request("/api/scaffold/status")).status).toBe(500);
});

test("FND-R3 HEAD on the status route is served and OPTIONS is a 405 envelope", async () => {
  const head = await app.request("/api/scaffold/status", { method: "HEAD" });
  expect(head.status).toBe(200);
  expect(await head.text()).toBe("");
  const options = await app.request("/api/scaffold/status", { method: "OPTIONS" });
  expect(options.status).toBe(405);
});

test("METRO-77 the real Worker entry runs inside workerd and serves the status route", async () => {
  // Proves the runtime: Bun and Node report other user agents.
  expect(navigator.userAgent).toBe("Cloudflare-Workers");
  const response = await exports.default.fetch("https://metro.test/api/scaffold/status");
  expect(response.status).toBe(200);
  expect(parseScaffoldStatus(await response.json())).toEqual({
    kind: "synthetic-scaffold",
    ready: true,
  });
});
