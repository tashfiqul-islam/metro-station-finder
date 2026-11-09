import { parseErrorEnvelope } from "@metro/contracts";
import { expect, test } from "vitest";

import { createApp } from "./app";

function envWith(respond: (request: Request) => Response): Env {
  // The generated Env types ASSETS as the full workerd Fetcher; only `fetch` is used here.
  return {
    ASSETS: {
      fetch: (input, init) =>
        Promise.resolve(respond(input instanceof Request ? input : new Request(input, init))),
      connect: () => {
        throw new Error("connect is not used by the assets route");
      },
    },
  };
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

function worker(): Response {
  return new Response("self.addEventListener('fetch', () => {})", {
    headers: {
      "content-type": "text/javascript",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}

test("METRO-106 /sw.js passes a real worker through with its own revalidating Cache-Control, not immutable", async () => {
  const response = await createApp().request("/sw.js", {}, envWith(worker));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/javascript");
  expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
});

test("METRO-106 /sw.js turns the SPA index.html fallback into an uncached 404 envelope", async () => {
  const response = await createApp().request(
    "/sw.js",
    {},
    envWith(() => html()),
  );
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(parseErrorEnvelope(await response.json()).error.code).toBe("not_found");
});

test("METRO-106 other methods on /sw.js return a 405 envelope and never reach the fetcher", async () => {
  let called = false;
  const env = envWith(() => {
    called = true;
    return worker();
  });
  const response = await createApp().request("/sw.js", { method: "POST" }, env);
  expect(response.status).toBe(405);
  expect(response.headers.get("allow")).toBe("GET, HEAD");
  expect(called).toBe(false);
});
