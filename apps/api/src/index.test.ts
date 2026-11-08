import { parseErrorEnvelope } from "@metro/contracts";
import { exports } from "cloudflare:workers";
import { expect, test } from "vitest";

import app from "./index";

test("FND-R3 every /api/* request returns a 404 with a schema-valid error envelope (the API has no routes)", async () => {
  for (const path of ["/api/unknown", "/api", "/api/nearest"]) {
    const response = await app.request(path);
    expect(response.status).toBe(404);
    expect(parseErrorEnvelope(await response.json()).error.code).toBe("not_found");
  }
});

test("METRO-93 a non-GET method on an unknown /api/* path is still the 404 envelope", async () => {
  const response = await app.request("/api/unknown", { method: "POST" });
  expect(response.status).toBe(404);
  expect(parseErrorEnvelope(await response.json()).error.code).toBe("not_found");
});

test("METRO-77 the real Worker entry runs inside workerd and answers /api/* with the 404 envelope", async () => {
  // Proves the runtime: Bun and Node report other user agents.
  expect(navigator.userAgent).toBe("Cloudflare-Workers");
  const response = await exports.default.fetch("https://metro.test/api/unknown");
  expect(response.status).toBe(404);
  expect(parseErrorEnvelope(await response.json()).error.code).toBe("not_found");
});

test("METRO-77 a missing /assets/* file is a 404 error envelope through the real Worker entry (ADR-0011)", async () => {
  const response = await exports.default.fetch("https://metro.test/assets/missing.js");
  expect(response.status).toBe(404);
  expect(parseErrorEnvelope(await response.json()).error.code).toBe("not_found");
});
