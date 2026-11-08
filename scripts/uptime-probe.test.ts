import {
  type FailureMode,
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

const SECURITY = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(self)",
};
const ENVELOPE = JSON.stringify({ error: { code: "not_found", message: "No such API route" } });
const SECRET_MARKER = "secret-marker-do-not-print";

type Handler = (path: string) => Response | Promise<Response>;

function page(extra: Record<string, string> = {}, status = 200): Response {
  return new Response("<!doctype html><title>x</title>", {
    status,
    headers: {
      ...SECURITY,
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "default-src 'self'",
      ...extra,
    },
  });
}
function missing(extra: Record<string, string> = {}, status = 404, body = ENVELOPE): Response {
  return new Response(body, {
    status,
    headers: {
      ...SECURITY,
      "content-type": "application/json",
      "x-request-id": "request-id-1",
      ...extra,
    },
  });
}
/** A healthy site; each test overrides one route. */
function site(
  overrides: {
    page?: () => Response | Promise<Response>;
    api?: () => Response | Promise<Response>;
  } = {},
) {
  return (path: string): Response | Promise<Response> =>
    path === "/" ? (overrides.page ?? page)() : (overrides.api ?? missing)();
}

const servers: { stop(force?: boolean): unknown }[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) void server.stop(true);
});

function serve(handler: Handler): string {
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: (request) => handler(new URL(request.url).pathname),
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

const withoutNosniff = () => {
  const response = page();
  response.headers.delete("x-content-type-options");
  return response;
};
const withoutId = () => {
  const response = missing();
  response.headers.delete("x-request-id");
  return response;
};
const away = () => new Response(null, { status: 302, headers: { location: "http://127.0.0.2/" } });
const permanent = () => new Response(null, { status: 301, headers: { location: "/elsewhere" } });
const never = () => new Promise<Response>((resolve) => setTimeout(() => resolve(page()), 2000));
const dns: ProbeFetch = () => Promise.reject(new TypeError(`ENOTFOUND ${SECRET_MARKER}`));
const aborted: ProbeFetch = () => Promise.reject(new DOMException("x", "AbortError"));
const opaque: ProbeFetch = () =>
  Promise.resolve({ status: 0, headers: { get: () => null }, json: () => Promise.resolve({}) });

test("METRO-44 a healthy local server passes through the real fetch", async () => {
  const requested: string[] = [];
  const origin = serve((path) => {
    requested.push(path);
    return site()(path);
  });
  await probe(origin);
  expect(requested).toEqual(["/", UNKNOWN_API_PATH]);
});

test("METRO-44 fixture: every page failure mode fails with its own mode", async () => {
  const cases: [FailureMode, () => Response][] = [
    ["page-status", () => page({}, 500)],
    ["page-status", () => page({}, 204)],
    ["page-content-type", () => page({ "content-type": "application/json" })],
    ["page-headers", () => page({ "x-frame-options": "SAMEORIGIN" })],
    ["page-headers", () => page({ "content-security-policy": "" })],
    ["page-headers", () => page({ "permissions-policy": "geolocation=*" })],
  ];
  for (const [mode, override] of cases)
    expect(await modeOf(serve(site({ page: override })))).toBe(mode);
});

test("METRO-44 fixture: a missing page header fails", async () => {
  expect(await modeOf(serve(site({ page: withoutNosniff })))).toBe("page-headers");
});

test("METRO-44 fixture: every API failure mode fails with its own mode", async () => {
  const cases: [FailureMode, () => Response][] = [
    ["api-status", () => missing({}, 200)],
    ["api-status", () => missing({}, 500)],
    ["api-envelope", () => missing({}, 404, '{"x":1}')],
    ["api-envelope", () => missing({}, 404, "<html>not json</html>")],
    ["api-request-id", withoutId],
    ["api-headers", () => missing({ "x-frame-options": "ALLOW" })],
  ];
  for (const [mode, override] of cases)
    expect(await modeOf(serve(site({ api: override })))).toBe(mode);
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

test("METRO-44 an abort error from fetch is a timeout, and the default limit is bounded", async () => {
  expect((await failureOf("https://example.invalid", { fetch: aborted }))?.mode).toBe("timeout");
  expect(REQUEST_TIMEOUT_MS).toBe(10_000);
});

test("METRO-44 an opaque redirect (status 0) fails as a redirect", async () => {
  expect((await failureOf("https://example.invalid", { fetch: opaque }))?.mode).toBe("redirect");
});

test("METRO-44 the API request carries a searchable x-request-id the API will echo", async () => {
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

test("METRO-44 base URL: https origins and 127.0.0.1 over http pass, all else is bad-url", () => {
  expect(parseBaseUrl("https://example.com")).toBe("https://example.com");
  expect(parseBaseUrl(" https://example.com/ ")).toBe("https://example.com");
  expect(parseBaseUrl("http://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
  const bad = [
    "",
    "not a url",
    "http://example.com",
    "http://localhost:3000",
    "ftp://example.com",
    "https://user:pass@example.com",
    "https://example.com/path",
    "https://example.com/?key=abc",
    "https://example.com?",
    "https://example.com/#frag",
    "https://example.com#",
  ];
  for (const text of bad) expect(() => parseBaseUrl(text)).toThrow(ProbeFailure);
});

test("METRO-44 the CLI passes, prints only the origin, and leaves the exit code alone", async () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const previous = process.exitCode;
  process.exitCode = 0;
  try {
    const origin = serve(site());
    await uptimeProbeMain([origin], {});
    expect(process.exitCode).toBe(0);
    expect(log).toHaveBeenLastCalledWith(`Uptime probe passed for ${origin}`);
    await uptimeProbeMain([], { PROBE_BASE_URL: origin });
    expect(log).toHaveBeenCalledTimes(2);
    expect(error).not.toHaveBeenCalled();
  } finally {
    process.exitCode = previous ?? 0;
    log.mockRestore();
    error.mockRestore();
  }
});

test("METRO-44 the CLI fails non-zero with one fixed message and never prints the response", async () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const previous = process.exitCode;
  try {
    const leaky = () =>
      new Response(`{"leak":"${SECRET_MARKER}"}`, {
        status: 404,
        headers: { ...SECURITY, "x-request-id": SECRET_MARKER },
      });
    const origin = serve(site({ api: leaky }));
    process.exitCode = 0;
    await uptimeProbeMain([origin], {});
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

    // A non-ProbeFailure cause (a fake fetch that throws a plain value) still prints only a fixed message.
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
