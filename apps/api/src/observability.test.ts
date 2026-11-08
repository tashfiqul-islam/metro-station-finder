import { expect, test } from "vitest";

import { createApp, type ApiApp, type LogLine } from "./app";

// The API has no routes. Probe routes registered through the `register` seam stand in for real ones.
function probes(app: ApiApp): void {
  app.get("/api/probe", (context) => context.json({ ok: true }));
  app.get("/api/boom", () => {
    throw new Error("api-key=SECRET-VALUE lat=23.8103 lon=90.4125");
  });
  app.get("/api/long-name", () => {
    class LongName extends Error {
      override name = "N".repeat(500);
    }
    throw new LongName("x");
  });
}

function recorded() {
  const lines: LogLine[] = [];
  const app = createApp((line) => lines.push(line), probes);
  return { app, lines };
}

test("METRO-13 every API response carries a generated x-request-id", async () => {
  const { app } = recorded();
  const ok = await app.request("/api/probe");
  const missing = await app.request("/api/nope");
  const first = ok.headers.get("x-request-id");
  expect(first).toMatch(/^[0-9a-f-]{36}$/u);
  expect(missing.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/u);
  expect(missing.headers.get("x-request-id")).not.toBe(first);
});

test("METRO-13 a well-formed client x-request-id is echoed, a malformed one is replaced", async () => {
  const { app, lines } = recorded();
  const echoed = await app.request("/api/probe", {
    headers: { "x-request-id": "client-id_12345" },
  });
  expect(echoed.headers.get("x-request-id")).toBe("client-id_12345");
  expect(lines[0]?.requestId).toBe("client-id_12345");
  for (const bad of ["short", "has space in it!", "x".repeat(65)]) {
    const response = await app.request("/api/probe", {
      headers: { "x-request-id": bad },
    });
    expect(response.headers.get("x-request-id")).not.toBe(bad);
    expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/u);
  }
});

test("METRO-13 one structured line per request with the agreed fields", async () => {
  const { app, lines } = recorded();
  const response = await app.request("/api/probe", { method: "GET" });
  expect(lines).toHaveLength(1);
  const [line] = lines;
  expect(line).toMatchObject({
    level: "info",
    event: "request",
    method: "GET",
    path: "/api/*",
    status: 200,
    requestId: response.headers.get("x-request-id"),
  });
  expect(line?.event === "request" && typeof line.durationMs === "number").toBe(true);
  expect(new Set(Object.keys(line ?? {}))).toEqual(
    new Set(["durationMs", "event", "level", "method", "path", "requestId", "status"]),
  );
});

test("METRO-13 query string, headers and error messages never reach a log line", async () => {
  const { app: failing, lines } = recorded();
  const response = await failing.request("/api/boom?key=SECRET-QUERY&lat=23.81", {
    headers: { authorization: "Bearer SECRET-HEADER", cookie: "session=SECRET-COOKIE" },
  });
  expect(response.status).toBe(500);
  const text = JSON.stringify(lines);
  for (const secret of ["SECRET", "23.81", "90.41", "key=", "Bearer", "session"]) {
    expect(text).not.toContain(secret);
  }
  expect(lines.map((line) => line.event)).toEqual(["error", "request"]);
  expect(lines[0]).toMatchObject({ level: "error", errorName: "Error" });
  expect(lines[1]).toMatchObject({ status: 500, path: "/api/*" });
});

test("METRO-13 the preview SHA is exposed only when the PREVIEW_SHA var is set", async () => {
  const { app } = recorded();
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const preview = await app.request("/api/probe", {}, { PREVIEW_SHA: sha });
  expect(preview.headers.get("x-preview-sha")).toBe(sha);
  const plain = await app.request("/api/probe");
  expect(plain.headers.has("x-preview-sha")).toBe(false);
  const malformed = await app.request("/api/probe", {}, { PREVIEW_SHA: "not a sha" });
  expect(malformed.headers.has("x-preview-sha")).toBe(false);
});

test("METRO-13 a secret in the URL path or in x-request-id never reaches a log line", async () => {
  const { app, lines } = recorded();
  await app.request("/api/SECRET-IN-PATH/12.345,67.890");
  await app.request("/api/probe", {
    headers: { "x-request-id": "SECRET-IN-HEADER with space" },
  });
  const text = JSON.stringify(lines);
  for (const secret of ["SECRET", "12.345", "67.890"]) expect(text).not.toContain(secret);
  expect(lines[0]).toMatchObject({ path: "/api/*", status: 404 });
});

test("METRO-13 an error name is capped", async () => {
  const { app: failing, lines } = recorded();
  await failing.request("/api/long-name");
  expect(lines[0]).toMatchObject({ level: "error", errorName: "N".repeat(64) });
});
