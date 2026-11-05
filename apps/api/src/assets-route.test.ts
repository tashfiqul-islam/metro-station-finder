import { parseErrorEnvelope } from "@metro/contracts";

import { createApp } from "./app";

function envWith(respond: (request: Request) => Response): Env {
  return { ASSETS: { fetch: (request) => Promise.resolve(respond(request)) } };
}

function html(contentType = "text/html; charset=utf-8"): Response {
  return new Response("<!doctype html>", { headers: { "content-type": contentType } });
}

const IMMUTABLE = "public, max-age=31536000, immutable";

/** Like the real ASSETS fetcher, whose response headers are immutable (set() throws). */
function script(): Response {
  const response = new Response("console.log(1)", {
    headers: { "content-type": "text/javascript", "cache-control": IMMUTABLE },
  });
  Object.defineProperty(response.headers, "set", {
    value: () => {
      throw new TypeError("immutable headers");
    },
  });
  return response;
}

const SECURITY = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(self)",
} as const;

function expectSecurityHeaders(response: Response): void {
  for (const [name, value] of Object.entries(SECURITY)) {
    expect(response.headers.get(name)).toBe(value);
  }
}

test("METRO-31 /assets/* passes a real asset through and keeps its immutable Cache-Control", async () => {
  const response = await createApp().request("/assets/index-abc.js", {}, envWith(script));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/javascript");
  expect(response.headers.get("cache-control")).toBe(IMMUTABLE);
  expect(await response.text()).toBe("console.log(1)");
  expectSecurityHeaders(response);
});

test("METRO-31 /assets/* turns the SPA index.html fallback into an uncached 404 envelope", async () => {
  // Static Assets answers a missing file with index.html (200), which _headers would mark immutable.
  const response = await createApp().request(
    "/assets/missing-abc.js",
    {},
    envWith(() => html()),
  );
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expectSecurityHeaders(response);
  expect(parseErrorEnvelope(await response.json()).error.code).toBe("not_found");
});

test("METRO-31 the HTML check ignores the case of the content type", async () => {
  const response = await createApp().request(
    "/assets/missing.js",
    {},
    envWith(() => html("TEXT/HTML")),
  );
  expect(response.status).toBe(404);
});

test("METRO-31 a response without a content type passes through", async () => {
  const response = await createApp().request(
    "/assets/blob",
    {},
    envWith(() => new Response("x")),
  );
  expect(response.status).toBe(200);
  expect(await response.text()).toBe("x");
});

test("METRO-31 a 304 without a content type passes through", async () => {
  const response = await createApp().request(
    "/assets/index-abc.js",
    { headers: { "if-none-match": '"abc"' } },
    envWith(() => new Response(null, { status: 304 })),
  );
  expect(response.status).toBe(304);
});

test("METRO-31 HEAD passes through to the asset fetcher", async () => {
  let method = "";
  const response = await createApp().request(
    "/assets/index-abc.js",
    { method: "HEAD" },
    envWith((request) => {
      method = request.method;
      return script();
    }),
  );
  expect(response.status).toBe(200);
  expect(method).toBe("HEAD");
  expect(await response.text()).toBe("");
});

test("METRO-31 other methods on /assets/* return a 405 envelope with Allow and never reach the fetcher", async () => {
  let called = false;
  const env = envWith(() => {
    called = true;
    return script();
  });
  const response = await createApp().request("/assets/index-abc.js", { method: "POST" }, env);
  expect(response.status).toBe(405);
  expect(response.headers.get("allow")).toBe("GET, HEAD");
  expectSecurityHeaders(response);
  expect(parseErrorEnvelope(await response.json()).error.code).toBe("method_not_allowed");
  expect(called).toBe(false);
});
