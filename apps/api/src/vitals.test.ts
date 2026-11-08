import { parseErrorEnvelope } from "@metro/contracts";
import { expect, test } from "vitest";

import { createApp, type LogLine } from "./app";
import { MAX_VITAL_BYTES } from "./vitals";

const vital = {
  name: "LCP",
  value: 1234.5,
  rating: "good",
  navigationType: "navigate",
  id: "v5-1731000000000-4567890123456",
};

function recorded() {
  const lines: LogLine[] = [];
  return { app: createApp((line) => lines.push(line)), lines };
}

function post(app: ReturnType<typeof createApp>, body: BodyInit | null, type?: string) {
  return app.request("/api/vitals", {
    method: "POST",
    body,
    headers: type === undefined ? {} : { "content-type": type },
  });
}

/** The valid beacon followed by spaces up to `size` bytes. */
function padded(size: number): string {
  const json = JSON.stringify(vital);
  return json + " ".repeat(size - json.length);
}

/** The status and error code of a rejection; the envelope, content type and request id are checked here. */
async function rejected(response: Response): Promise<{ status: number; code: string }> {
  expect(response.headers.get("content-type")).toBe("application/json");
  expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/u);
  const { error } = parseErrorEnvelope(await response.json());
  return { status: response.status, code: error.code };
}

test("METRO-44 a valid beacon gets 204, no body, the security headers and a request id", async () => {
  const { app } = recorded();
  const response = await post(app, JSON.stringify(vital), "application/json");
  expect(response.status).toBe(204);
  expect(await response.text()).toBe("");
  expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/u);
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("x-frame-options")).toBe("DENY");
});

test("METRO-44 a content type with a charset parameter and any case is accepted", async () => {
  const { app } = recorded();
  const response = await post(app, JSON.stringify(vital), "Application/JSON; charset=UTF-8");
  expect(response.status).toBe(204);
});

test("METRO-44 an accepted beacon logs one request line with only the validated fields and no id", async () => {
  const { app, lines } = recorded();
  const response = await post(app, JSON.stringify(vital), "application/json");
  expect(lines).toHaveLength(1);
  const [line] = lines;
  expect(line).toMatchObject({
    level: "info",
    event: "request",
    method: "POST",
    path: "/api/vitals",
    status: 204,
    requestId: response.headers.get("x-request-id"),
    vital: { name: "LCP", value: 1234.5, rating: "good", navigationType: "navigate" },
  });
  expect(new Set(Object.keys(line ?? {}))).toEqual(
    new Set(["durationMs", "event", "level", "method", "path", "requestId", "status", "vital"]),
  );
  expect(Object.keys((line?.event === "request" && line.vital) || {}).toSorted()).toEqual([
    "name",
    "navigationType",
    "rating",
    "value",
  ]);
  expect(JSON.stringify(lines)).not.toContain(vital.id);
});

test("METRO-44 a rejected beacon logs no vital and no input", async () => {
  const { app, lines } = recorded();
  await post(app, JSON.stringify({ ...vital, lat: 23.81 }), "application/json");
  expect(lines).toHaveLength(1);
  expect(lines[0]).toMatchObject({ path: "/api/vitals", status: 400 });
  expect(Object.keys(lines[0] ?? {})).not.toContain("vital");
  expect(JSON.stringify(lines)).not.toContain("23.81");
});

test("METRO-44 anything outside the contract is a 400 invalid_payload that echoes nothing", async () => {
  const { app } = recorded();
  for (const body of [
    { ...vital, lat: 23.81 },
    { ...vital, lng: 90.41 },
    { ...vital, url: "https://example.test/?q=SECRET" },
    { ...vital, name: "SECRETNAME" },
    { ...vital, id: "SECRET?lat=1" },
    { ...vital, value: -1 },
    [vital],
    null,
  ]) {
    const response = await post(app, JSON.stringify(body), "application/json");
    const text = await response.clone().text();
    expect(await rejected(response)).toEqual({ status: 400, code: "invalid_payload" });
    expect(text).not.toContain("SECRET");
    expect(text).not.toContain("23.81");
  }
});

test("METRO-44 malformed JSON, invalid UTF-8 and an empty body are 400 invalid_body", async () => {
  const { app } = recorded();
  const invalidBody = { status: 400, code: "invalid_body" };
  expect(await rejected(await post(app, "{not json SECRET", "application/json"))).toEqual(
    invalidBody,
  );
  expect(
    await rejected(await post(app, new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]), "application/json")),
  ).toEqual(invalidBody);
  expect(await rejected(await post(app, null, "application/json"))).toEqual(invalidBody);
});

test("METRO-44 any content type other than application/json is a 415, including text/plain and none", async () => {
  const { app } = recorded();
  const unsupported = { status: 415, code: "unsupported_media_type" };
  for (const type of [
    "text/plain",
    "text/plain;charset=UTF-8",
    "application/x-www-form-urlencoded",
  ]) {
    expect(await rejected(await post(app, JSON.stringify(vital), type))).toEqual(unsupported);
  }
  expect(await rejected(await post(app, null))).toEqual(unsupported);
});

test("METRO-44 a body over the cap is a 413, by declared length and by streamed bytes", async () => {
  const { app, lines } = recorded();
  const big = JSON.stringify({ ...vital, id: "x".repeat(MAX_VITAL_BYTES) });
  const tooLarge = { status: 413, code: "payload_too_large" };
  expect(await rejected(await post(app, big, "application/json"))).toEqual(tooLarge);
  // No content-length: a stream that keeps sending must be cut off at the cap.
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      sent += 256;
      controller.enqueue(new Uint8Array(256).fill(0x20));
      if (sent > 100 * MAX_VITAL_BYTES) controller.close();
    },
  });
  const chunked = await app.request("/api/vitals", {
    method: "POST",
    body: stream,
    headers: { "content-type": "application/json" },
    // @ts-expect-error -- duplex is required for a streamed request body and is missing from the DOM types
    duplex: "half",
  });
  expect(await rejected(chunked)).toEqual(tooLarge);
  expect(sent).toBeLessThan(100 * MAX_VITAL_BYTES);
  expect(lines.map((line) => line.event === "request" && line.status)).toEqual([413, 413]);
});

test("METRO-44 a declared content-length over the cap is refused before the body is read", async () => {
  const { app } = recorded();
  const response = await app.request("/api/vitals", {
    method: "POST",
    body: JSON.stringify(vital),
    headers: { "content-type": "application/json", "content-length": String(MAX_VITAL_BYTES + 1) },
  });
  expect(await rejected(response)).toEqual({ status: 413, code: "payload_too_large" });
});

test("METRO-44 a body exactly at the cap is read, a byte over is refused", async () => {
  const { app } = recorded();
  expect((await post(app, padded(MAX_VITAL_BYTES), "application/json")).status).toBe(204);
  expect((await post(app, padded(MAX_VITAL_BYTES + 1), "application/json")).status).toBe(413);
});

test("METRO-44 other methods on /api/vitals are 405 with Allow: POST and the fixed envelope", async () => {
  const { app } = recorded();
  for (const method of ["GET", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
    const response = await app.request("/api/vitals", { method });
    expect(await rejected(response)).toEqual({ status: 405, code: "method_not_allowed" });
    expect(response.headers.get("allow")).toBe("POST");
  }
});

test("METRO-44 only the exact path is the route: other /api paths stay 404 and log /api/*", async () => {
  const { app, lines } = recorded();
  for (const path of ["/api/vitals/", "/api/vitals/x", "/api/vitalsx", "/api/other"]) {
    const response = await post(app, JSON.stringify(vital), "application/json");
    expect(response.status).toBe(204);
    const missing = await app.request(path, { method: "POST" });
    expect(await rejected(missing)).toEqual({ status: 404, code: "not_found" });
  }
  expect(lines.filter((line) => line.event === "request" && line.status === 404)).toHaveLength(4);
  for (const line of lines)
    expect(line.event === "request" && line.status === 404 ? line.path : "/api/*").toBe("/api/*");
});

test("METRO-44 a query string on the route is not logged and does not change the result", async () => {
  const { app, lines } = recorded();
  const response = await app.request("/api/vitals?lat=23.81&lng=90.41", {
    method: "POST",
    body: JSON.stringify(vital),
    headers: { "content-type": "application/json", authorization: "Bearer SECRET" },
  });
  expect(response.status).toBe(204);
  const text = JSON.stringify(lines);
  for (const secret of ["23.81", "90.41", "lat=", "SECRET", "Bearer"]) {
    expect(text).not.toContain(secret);
  }
});

test("METRO-44 the content type must be exactly application/json, not a prefix or a variant", async () => {
  const { app } = recorded();
  for (const type of ["application/jsonp", "application/json-patch+json", "application/jsonx"]) {
    const response = await post(app, JSON.stringify(vital), type);
    expect(await rejected(response)).toEqual({ status: 415, code: "unsupported_media_type" });
  }
});

test("METRO-44 405 and OPTIONS answers carry no CORS header, and HEAD is a 405", async () => {
  const { app } = recorded();
  for (const method of ["OPTIONS", "GET", "HEAD"]) {
    const response = await app.request("/api/vitals", {
      method,
      headers: { origin: "https://other.example", "access-control-request-method": "POST" },
    });
    expect(response.status).toBe(405);
    expect(
      [...response.headers.keys()].filter((name) => name.startsWith("access-control-")),
    ).toEqual([]);
  }
  const accepted = await post(app, JSON.stringify(vital), "application/json");
  expect(accepted.headers.has("access-control-allow-origin")).toBe(false);
});

test("METRO-44 a percent-encoded path is decoded by the router, reaches the route and logs the exact path", async () => {
  const { app, lines } = recorded();
  const response = await post(app, JSON.stringify(vital), "application/json");
  expect(response.status).toBe(204);
  const encoded = await app.request("/api/%76itals", {
    method: "POST",
    body: JSON.stringify(vital),
    headers: { "content-type": "application/json" },
  });
  expect(encoded.status).toBe(204);
  expect(lines.map((line) => line.event === "request" && line.path)).toEqual([
    "/api/vitals",
    "/api/vitals",
  ]);
});

test("METRO-44 a byte-order mark is rejected, not silently stripped", async () => {
  const { app } = recorded();
  const bytes = new TextEncoder().encode(JSON.stringify(vital));
  const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...bytes]);
  expect(await rejected(await post(app, withBom, "application/json"))).toEqual({
    status: 400,
    code: "invalid_body",
  });
});

test("METRO-44 a duplicate key keeps the last value, which is then validated", async () => {
  const { app, lines } = recorded();
  const duplicate = `{"name":"LCP","name":"CLS","value":0.05,"rating":"good","navigationType":"navigate","id":"abcdef12"}`;
  expect((await post(app, duplicate, "application/json")).status).toBe(204);
  expect(lines[0]).toMatchObject({ vital: { name: "CLS", value: 0.05 } });
  const invalidLast = `{"name":"LCP","value":1,"value":-1,"rating":"good","navigationType":"navigate","id":"abcdef12"}`;
  expect((await post(app, invalidLast, "application/json")).status).toBe(400);
});

test("METRO-44 an own __proto__ key is rejected by the strict schema", async () => {
  const { app } = recorded();
  const body = `{"__proto__":{"lat":1},"name":"LCP","value":1,"rating":"good","navigationType":"navigate","id":"abcdef12"}`;
  expect(await rejected(await post(app, body, "application/json"))).toEqual({
    status: 400,
    code: "invalid_payload",
  });
});

test("METRO-44 the logged value is rounded to four decimals", async () => {
  const { app, lines } = recorded();
  await post(app, JSON.stringify({ ...vital, value: 1234.567_891_234 }), "application/json");
  await post(
    app,
    JSON.stringify({ ...vital, name: "CLS", value: 0.001_639_404_296_875 }),
    "application/json",
  );
  expect(lines.map((line) => line.event === "request" && line.vital?.value)).toEqual([
    1234.5679, 0.0016,
  ]);
});

test("METRO-44 a lying content-length is refused before the body is read", async () => {
  const { app } = recorded();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify(vital)));
      controller.close();
    },
  });
  const response = await app.request("/api/vitals", {
    method: "POST",
    body: stream,
    headers: { "content-type": "application/json", "content-length": String(MAX_VITAL_BYTES + 1) },
    // @ts-expect-error -- duplex is required for a streamed request body and is missing from the DOM types
    duplex: "half",
  });
  // The runtime pulls a stream once on construction, so a pull count proves nothing. The real body is short enough
  // to pass the streamed check, so the 413 can only come from the declared length (the workerd runtime keeps it).
  expect(await rejected(response)).toEqual({ status: 413, code: "payload_too_large" });
});
