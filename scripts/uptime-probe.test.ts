import { readFileSync } from "node:fs";

import {
  EXPECTED_VALUES,
  type FailureMode,
  MAX_BODY_BYTES,
  newRequestId,
  parseBaseUrl,
  probe,
  ProbeFailure,
  type ProbeFetch,
  type ProbeOptions,
  REQUEST_TIMEOUT_MS,
  UNKNOWN_API_PATH,
  uptimeProbeMain,
} from "./uptime-probe.ts";

const ENVELOPE = JSON.stringify({ error: { code: "not_found", message: "No such API route" } });
const SECRET_MARKER = "secret-marker-do-not-print";
const LOOPBACK = { PROBE_ALLOW_LOOPBACK: "1" };
const encoder = new TextEncoder();

type Handler = (path: string, request: Request) => Response | Promise<Response>;

function page(extra: Record<string, string> = {}, status = 200): Response {
  return new Response("<!doctype html><title>x</title>", {
    status,
    headers: {
      ...EXPECTED_VALUES,
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'self'",
      ...extra,
    },
  });
}
/** The healthy API answer: echoes the request id the probe sent, as the Worker does. */
function missing(
  request: Request,
  extra: Record<string, string> = {},
  status = 404,
  body: string | ReadableStream<Uint8Array> = ENVELOPE,
): Response {
  return new Response(body, {
    status,
    headers: {
      ...EXPECTED_VALUES,
      "content-type": "application/json",
      "x-request-id": request.headers.get("x-request-id") ?? "none",
      ...extra,
    },
  });
}
type Route = (request: Request) => Response | Promise<Response>;
/** A healthy site; each test overrides one route. */
function site(overrides: { page?: Route; api?: Route } = {}): Handler {
  return (path, request) =>
    path === "/"
      ? (overrides.page ?? (() => page()))(request)
      : (overrides.api ?? missing)(request);
}

const servers: { stop(force?: boolean): unknown }[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) void server.stop(true);
});

function serve(handler: Handler): string {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request) => handler(new URL(request.url).pathname, request),
  });
  servers.push(server);
  return `http://127.0.0.1:${server.port}`;
}

async function failureOf(
  origin: string,
  options: ProbeOptions = {},
): Promise<ProbeFailure | undefined> {
  try {
    await probe(origin, options);
  } catch (error) {
    return error instanceof ProbeFailure ? error : undefined;
  }
  return undefined;
}
async function modeOf(origin: string, timeoutMs?: number): Promise<FailureMode | undefined> {
  const failure = await failureOf(origin, timeoutMs === undefined ? {} : { timeoutMs });
  return failure?.mode;
}

const withoutNosniff: Route = () => {
  const response = page();
  response.headers.delete("x-content-type-options");
  return response;
};
const withoutId: Route = (request) => {
  const response = missing(request);
  response.headers.delete("x-request-id");
  return response;
};
const away: Route = () =>
  new Response(null, { status: 302, headers: { location: "http://127.0.0.2/" } });
const permanent: Route = () =>
  new Response(null, { status: 301, headers: { location: "/elsewhere" } });
const never: Route = () =>
  new Promise<Response>((resolve) => setTimeout(() => resolve(page()), 2000));
/** Headers and the first byte arrive, then nothing. */
const stalledBody: Route = (request) =>
  missing(
    request,
    {},
    404,
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("{"));
      },
    }),
  );
/** A body that never ends. */
const endlessBody: Route = (request) =>
  missing(
    request,
    {},
    404,
    new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(4096).fill(32));
      },
    }),
  );
const dns: ProbeFetch = () => Promise.reject(new TypeError(`ENOTFOUND ${SECRET_MARKER}`));
const aborted: ProbeFetch = () => Promise.reject(new DOMException("x", "AbortError"));
const opaque: ProbeFetch = () =>
  Promise.resolve({ status: 0, headers: { get: () => null }, body: null });
/** A body stream that fails while being read with a plain error. */
const brokenBody: ProbeFetch = (input) =>
  Promise.resolve(
    input.endsWith("/")
      ? page()
      : {
          status: 404,
          headers: { get: () => null },
          body: new ReadableStream<Uint8Array>({
            pull(controller) {
              controller.error(new Error(SECRET_MARKER));
            },
          }),
        },
  );

test("METRO-44 a healthy local server passes through the real fetch", async () => {
  const requested: string[] = [];
  const healthy = site();
  const origin = serve((path, request) => {
    requested.push(path);
    return healthy(path, request);
  });
  await probe(origin);
  expect(requested).toEqual(["/", UNKNOWN_API_PATH]);
});

test("METRO-44 the expected headers equal the files that set them", () => {
  const headersFile = readFileSync("apps/web/public/_headers", "utf8");
  // The vitest test that asserts the Worker's live responses states the same four values.
  const apiTest = readFileSync("apps/api/src/security-headers.test.ts", "utf8");
  expect(Object.keys(EXPECTED_VALUES)).toHaveLength(4);
  for (const [name, value] of Object.entries(EXPECTED_VALUES)) {
    expect(headersFile.split("\n").map((line) => line.trim().toLowerCase())).toContain(
      `${name}: ${value}`.toLowerCase(),
    );
    expect(apiTest).toContain(`"${name}": "${value}"`);
  }
});

test("METRO-44 fixture: every page failure mode fails with its own mode", async () => {
  const cases: [FailureMode, Route][] = [
    ["page-status", () => page({}, 500)],
    ["page-status", () => page({}, 204)],
    ["page-content-type", () => page({ "content-type": "application/json" })],
    ["page-headers", () => page({ "x-frame-options": "SAMEORIGIN" })],
    ["page-headers", () => page({ "content-security-policy": "" })],
    ["page-headers", () => page({ "permissions-policy": "geolocation=*" })],
    ["page-headers", withoutNosniff],
  ];
  for (const [mode, override] of cases)
    expect(await modeOf(serve(site({ page: override })))).toBe(mode);
});

test("METRO-44 fixture: every API failure mode fails with its own mode", async () => {
  const cases: [FailureMode, Route][] = [
    ["api-status", (request) => missing(request, {}, 200)],
    ["api-status", (request) => missing(request, {}, 500)],
    ["api-envelope", (request) => missing(request, {}, 404, '{"x":1}')],
    ["api-envelope", (request) => missing(request, {}, 404, "<html>not json</html>")],
    ["api-request-id", withoutId],
    [
      "api-request-id-mismatch",
      (request) => missing(request, { "x-request-id": "other-id-12345" }),
    ],
    ["api-headers", (request) => missing(request, { "x-frame-options": "ALLOW" })],
    ["api-body-too-large", endlessBody],
    ["api-body-too-large", (request) => missing(request, {}, 404, " ".repeat(MAX_BODY_BYTES + 1))],
  ];
  for (const [mode, override] of cases)
    expect(await modeOf(serve(site({ api: override })))).toBe(mode);
});

test("METRO-44 fixture: a body at the cap is still read", async () => {
  const padded = `${ENVELOPE}${" ".repeat(MAX_BODY_BYTES - ENVELOPE.length)}`;
  expect(padded.length).toBe(MAX_BODY_BYTES);
  await probe(serve(site({ api: (request) => missing(request, {}, 404, padded) })));
});

test("METRO-44 fixture: a redirect fails, including to another origin", async () => {
  expect(await modeOf(serve(site({ page: away })))).toBe("redirect");
  expect(await modeOf(serve(site({ api: away })))).toBe("redirect");
  expect(await modeOf(serve(site({ page: permanent })))).toBe("redirect");
});

test("METRO-44 fixture: a server that never answers fails with a timeout", async () => {
  expect(await modeOf(serve(site({ page: never })), 50)).toBe("timeout");
  expect(await modeOf(serve(site({ api: never })), 50)).toBe("timeout");
});

test("METRO-44 fixture: headers then a stalled body fails as a timeout, not as an envelope error", async () => {
  expect(await modeOf(serve(site({ api: stalledBody })), 300)).toBe("timeout");
});

test("METRO-44 fixture: a refused connection fails as a network error", async () => {
  const origin = serve(site());
  for (const server of servers.splice(0)) await server.stop(true);
  expect(await modeOf(origin)).toBe("network");
});

test("METRO-44 fixture: a fetch that throws (DNS failure) fails as a network error", async () => {
  const failure = await failureOf("https://example.invalid", { fetch: dns });
  expect(failure?.mode).toBe("network");
  expect(String(failure)).not.toContain(SECRET_MARKER);
});

test("METRO-44 fixture: a body that breaks while read fails as a network error", async () => {
  const failure = await failureOf("https://example.invalid", { fetch: brokenBody });
  expect(failure?.mode).toBe("network");
  expect(String(failure)).not.toContain(SECRET_MARKER);
});

test("METRO-44 an abort error from fetch is a timeout, and the default limit is bounded", async () => {
  expect((await failureOf("https://example.invalid", { fetch: aborted }))?.mode).toBe("timeout");
  expect(REQUEST_TIMEOUT_MS).toBe(10_000);
});

test("METRO-44 an opaque redirect (status 0) fails as a redirect", async () => {
  expect((await failureOf("https://example.invalid", { fetch: opaque }))?.mode).toBe("redirect");
});

test("METRO-44 the API request carries a searchable x-request-id the API must echo", async () => {
  const origin = serve(site());
  const ids: (string | null)[] = [];
  const recording: ProbeFetch = (input, init) => {
    ids.push(init.headers["x-request-id"] ?? null);
    return fetch(input, init);
  };
  await probe(origin, { fetch: recording });
  await probe(origin, { fetch: recording, requestId: "custom-id-12345" });
  expect(ids[0]).toBeNull();
  expect(ids[1]).toMatch(/^[A-Za-z0-9_-]{8,64}$/u);
  expect(ids[3]).toBe("custom-id-12345");
  expect(newRequestId(new Date(0))).toBe("uptime-probe-0");
});

test("METRO-44 base URL: public https origins pass, all else is bad-url", () => {
  expect(parseBaseUrl("https://example.com")).toBe("https://example.com");
  expect(parseBaseUrl(" https://example.com/ ")).toBe("https://example.com");
  expect(parseBaseUrl("https://metro.example.workers.dev")).toBe(
    "https://metro.example.workers.dev",
  );
  const bad = [
    "",
    "not a url",
    "http://example.com",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "ftp://example.com",
    "https://user:pass@example.com",
    "https://example.com/path",
    "https://example.com/?key=abc",
    "https://example.com?",
    "https://example.com/#frag",
    "https://example.com#",
    "https://127.0.0.1",
    "https://10.0.0.5",
    "https://169.254.169.254",
    "https://0x7f.1",
    "https://[::1]",
    "https://[2001:db8::1]",
    "https://localhost",
    "https://app.localhost",
    "https://printer.local",
    "https://db.internal",
    "https://intranet",
  ];
  for (const text of bad) expect(() => parseBaseUrl(text)).toThrow(ProbeFailure);
});

test("METRO-44 base URL: loopback http is accepted only with the explicit flag", () => {
  expect(parseBaseUrl("http://127.0.0.1:8080", true)).toBe("http://127.0.0.1:8080");
  expect(() => parseBaseUrl("http://127.0.0.1:8080", false)).toThrow(ProbeFailure);
  expect(() => parseBaseUrl("http://10.0.0.5", true)).toThrow(ProbeFailure);
  expect(() => parseBaseUrl("http://localhost", true)).toThrow(ProbeFailure);
});

test("METRO-44 the CLI passes, prints only the origin, and leaves the exit code alone", async () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const previous = process.exitCode;
  process.exitCode = 0;
  try {
    const origin = serve(site());
    await uptimeProbeMain([origin], LOOPBACK);
    expect(process.exitCode).toBe(0);
    expect(log).toHaveBeenLastCalledWith(`Uptime probe passed for ${origin}`);
    await uptimeProbeMain([], { ...LOOPBACK, PROBE_BASE_URL: origin });
    expect(log).toHaveBeenCalledTimes(2);
    expect(error).not.toHaveBeenCalled();
  } finally {
    process.exitCode = previous ?? 0;
    log.mockRestore();
    error.mockRestore();
  }
});

test("METRO-44 the CLI refuses loopback without the flag, as a workflow would run it", async () => {
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const previous = process.exitCode;
  process.exitCode = 0;
  try {
    await uptimeProbeMain([serve(site())], {});
    expect(process.exitCode).toBe(1);
    expect(String(error.mock.calls.at(-1)?.[0])).toContain("bare https origin");
  } finally {
    process.exitCode = previous ?? 0;
    error.mockRestore();
  }
});

test("METRO-44 the CLI fails non-zero with one fixed message and never prints the response", async () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const previous = process.exitCode;
  try {
    const leaky: Route = () =>
      new Response(`{"leak":"${SECRET_MARKER}"}`, {
        status: 404,
        headers: { ...EXPECTED_VALUES, "x-request-id": SECRET_MARKER },
      });
    const origin = serve(site({ api: leaky }));
    process.exitCode = 0;
    await uptimeProbeMain([origin], LOOPBACK);
    expect(process.exitCode).toBe(1);
    expect(error).toHaveBeenCalledWith("Unknown API route did not return the error envelope.");
    expect(String(error.mock.calls.at(-1)?.[0])).toMatch(
      /^x-request-id sent to the API route: uptime-probe-[a-z0-9]+$/u,
    );

    process.exitCode = 0;
    await uptimeProbeMain([], {});
    expect(process.exitCode).toBe(1);
    // Configuration failures happen before any request: one line, no request id.
    expect(error.mock.calls.at(-1)).toHaveLength(1);
    expect(String(error.mock.calls.at(-1)?.[0])).toContain("PRODUCTION_URL");
    await uptimeProbeMain([], { PROBE_BASE_URL: "   " });
    expect(String(error.mock.calls.at(-1)?.[0])).toContain("PRODUCTION_URL");

    process.exitCode = 0;
    await uptimeProbeMain(["https://example.com/?token=abc"], {});
    expect(process.exitCode).toBe(1);
    expect(String(error.mock.calls.at(-1)?.[0])).toContain("bare https origin");

    // A fake fetch that throws a plain error still prints only a fixed message.
    process.exitCode = 0;
    const boom: ProbeFetch = () => {
      throw new Error(SECRET_MARKER);
    };
    await uptimeProbeMain(["https://example.com"], {}, { fetch: boom });
    expect(process.exitCode).toBe(1);
    expect(String(error.mock.calls.at(-2)?.[0])).toContain("could not connect");

    const printed = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
    expect(printed).not.toContain(SECRET_MARKER);
    expect(printed).not.toContain("token=abc");
  } finally {
    process.exitCode = previous ?? 0;
    log.mockRestore();
    error.mockRestore();
  }
});
