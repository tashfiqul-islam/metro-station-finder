import { type EnvelopeProblem, envelopeProblem } from "./api-envelope.ts";

/**
 * Synthetic uptime check (METRO-44 part A, docs/agents/uptime-runbook.md). `bun scripts/uptime-probe.ts <base-url>`
 * does two requests: GET / must be 200 HTML with the static-asset security headers, and GET of an unknown
 * /api path must be the 404 error envelope with an x-request-id and the Worker's security headers.
 *
 * Every failure is one fixed message. Nothing that came back from the network is printed: no body, no header
 * values, no error text. Only the origin of the base URL is ever printed, never a path or query.
 */

export const REQUEST_TIMEOUT_MS = 10_000;
/** The unknown-route body is a few dozen bytes; anything past this is not the envelope and is never buffered further. */
export const MAX_BODY_BYTES = 16 * 1024;
export const UNKNOWN_API_PATH = "/api/uptime-probe-does-not-exist";

/**
 * Headers the app sets with a fixed value on both the pages (apps/web/public/_headers) and /api/* (apps/api/src/app.ts).
 * uptime-probe.test.ts compares these with both files, so a header change there fails a test instead of the probe.
 */
export const EXPECTED_VALUES: Readonly<Record<string, string>> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(self)",
};
/** The page also carries a Content-Security-Policy; its value changes with the build, so only its presence is checked. */
const PAGE_ONLY_PRESENT = "content-security-policy";

export type FailureMode =
  | "not-configured"
  | "bad-url"
  | "timeout"
  | "network"
  | "redirect"
  | "page-status"
  | "page-content-type"
  | "page-headers"
  | "api-status"
  | "api-envelope"
  | "api-request-id"
  | "api-request-id-mismatch"
  | "api-body-too-large"
  | "api-headers";

const ENVELOPE_MODES: Readonly<Record<EnvelopeProblem, FailureMode>> = {
  status: "api-status",
  envelope: "api-envelope",
  "request-id": "api-request-id",
};

const MESSAGES: Readonly<Record<FailureMode, string>> = {
  "not-configured":
    "Uptime probe has no base URL: pass one as the argument or set the PRODUCTION_URL repository variable.",
  "bad-url":
    "Uptime probe base URL must be a bare https origin with a DNS name (no path, query, fragment, credentials, IP address or local name).",
  timeout: "Uptime probe request timed out.",
  network: "Uptime probe could not connect (DNS, connection or TLS failure).",
  redirect: "Uptime probe got a redirect; the site must answer directly.",
  "page-status": "GET / did not return 200.",
  "page-content-type": "GET / did not return text/html.",
  "page-headers": "GET / is missing a security header or has a wrong value.",
  "api-status": "Unknown API route did not return 404.",
  "api-envelope": "Unknown API route did not return the error envelope.",
  "api-request-id": "Unknown API route response has no x-request-id.",
  "api-request-id-mismatch":
    "Unknown API route response did not echo the x-request-id the probe sent.",
  "api-body-too-large": "Unknown API route response body is larger than the probe reads.",
  "api-headers": "Unknown API route response is missing a security header or has a wrong value.",
};

export class ProbeFailure extends Error {
  readonly mode: FailureMode;
  constructor(mode: FailureMode) {
    super(MESSAGES[mode]);
    this.name = "ProbeFailure";
    this.mode = mode;
  }
}

/** The part of a Response the probe reads; a structural type so any runtime's Response fits. */
interface ProbeResponse {
  status: number;
  headers: { get(name: string): string | null };
  body: ReadableStream<Uint8Array> | null;
}
export type ProbeFetch = (
  input: string,
  init: { redirect: "manual"; signal: AbortSignal; headers: Record<string, string> },
) => Promise<ProbeResponse>;

export interface ProbeOptions {
  fetch?: ProbeFetch;
  timeoutMs?: number;
  /** Sent as x-request-id on the API request so the probe's own log line can be found. Must match the API's id pattern. */
  requestId?: string;
}

/** A request id the API echoes (^[A-Za-z0-9_-]{8,64}$, docs/agents/observability.md) and a person can search for. */
export function newRequestId(now: Date = new Date()): string {
  return `uptime-probe-${now.getTime().toString(36)}`;
}

/** Hosts that are not a public DNS name: IP literals (the URL parser also normalizes 0x7f.1 and similar), single labels, local suffixes. */
function notPublicName(hostname: string): boolean {
  return (
    /^[0-9.]+$/u.test(hostname) ||
    hostname.includes(":") ||
    !hostname.includes(".") ||
    /\.(?:localhost|local|internal|localdomain|lan|home\.arpa)$/u.test(hostname)
  );
}

/**
 * The origin to probe. Throws bad-url unless it is a bare https origin with a public-looking DNS name.
 * `allowLoopback` (the tests set PROBE_ALLOW_LOOPBACK=1; no workflow does) also accepts http://127.0.0.1.
 */
export function parseBaseUrl(text: string, allowLoopback = false): string {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    throw new ProbeFailure("bad-url");
  }
  const secure = url.protocol === "https:" && !notPublicName(url.hostname);
  const local = allowLoopback && url.protocol === "http:" && url.hostname === "127.0.0.1";
  const bare =
    url.username === "" &&
    url.password === "" &&
    url.pathname === "/" &&
    url.search === "" &&
    url.hash === "";
  if (!(secure || local) || !bare || /[?#]/u.test(text)) throw new ProbeFailure("bad-url");
  return url.origin;
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/**
 * Reads at most MAX_BODY_BYTES. The request's timeout signal keeps running while the body is read, so a
 * server that sends headers and then stalls ends as a timeout, and one that streams forever as too large.
 */
async function readCapped(response: ProbeResponse): Promise<string> {
  const reader = response.body?.getReader();
  if (reader === undefined) return "";
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) return text + decoder.decode();
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        void reader.cancel();
        throw new ProbeFailure("api-body-too-large");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
  } catch (error) {
    if (error instanceof ProbeFailure) throw error;
    throw new ProbeFailure(isTimeout(error) ? "timeout" : "network");
  }
}

async function get(
  fetchFn: ProbeFetch,
  url: string,
  timeoutMs: number,
  headers: Record<string, string> = {},
): Promise<ProbeResponse> {
  let response: ProbeResponse;
  try {
    response = await fetchFn(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers,
    });
  } catch (error) {
    // The error text is dropped on purpose: it can carry the URL or resolver details.
    throw new ProbeFailure(isTimeout(error) ? "timeout" : "network");
  }
  // redirect: "manual" yields the 3xx itself (Bun and Node) or an opaque-redirect with status 0 (browsers).
  if ((response.status >= 300 && response.status < 400) || response.status === 0)
    throw new ProbeFailure("redirect");
  return response;
}

function headersOk(response: ProbeResponse, mustHaveCsp: boolean): boolean {
  const valuesOk = Object.entries(EXPECTED_VALUES).every(
    ([name, value]) => response.headers.get(name) === value,
  );
  return valuesOk && (!mustHaveCsp || !!response.headers.get(PAGE_ONLY_PRESENT));
}

/** Runs both checks against an origin. Throws a ProbeFailure on the first failure; resolves when both pass. */
export async function probe(origin: string, options: ProbeOptions = {}): Promise<void> {
  const fetchFn: ProbeFetch = options.fetch ?? ((input, init) => fetch(input, init));
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;

  const page = await get(fetchFn, `${origin}/`, timeoutMs);
  if (page.status !== 200) throw new ProbeFailure("page-status");
  if (!(page.headers.get("content-type") ?? "").toLowerCase().includes("text/html"))
    throw new ProbeFailure("page-content-type");
  if (!headersOk(page, true)) throw new ProbeFailure("page-headers");
  // The page body is not needed; release the connection.
  await page.body?.cancel();

  const requestId = options.requestId ?? newRequestId();
  const missing = await get(fetchFn, `${origin}${UNKNOWN_API_PATH}`, timeoutMs, {
    "x-request-id": requestId,
  });
  // Only a 404 body can be the envelope; any other status is reported without reading it.
  const text = missing.status === 404 ? await readCapped(missing) : "";
  const problem = await envelopeProblem({
    status: missing.status,
    headers: missing.headers,
    json: () => Promise.resolve().then((): unknown => JSON.parse(text)),
  });
  if (problem !== undefined) throw new ProbeFailure(ENVELOPE_MODES[problem]);
  if (missing.headers.get("x-request-id") !== requestId)
    throw new ProbeFailure("api-request-id-mismatch");
  if (!headersOk(missing, false)) throw new ProbeFailure("api-headers");
}

/** CLI: base URL from the first argument, else PROBE_BASE_URL (the workflow passes the input or the repository variable). */
export async function uptimeProbeMain(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  options: ProbeOptions = {},
): Promise<void> {
  const requestId = options.requestId ?? newRequestId();
  try {
    const supplied = (args[0] ?? env["PROBE_BASE_URL"] ?? "").trim();
    if (supplied === "") throw new ProbeFailure("not-configured");
    const origin = parseBaseUrl(supplied, env["PROBE_ALLOW_LOOPBACK"] === "1");
    await probe(origin, { ...options, requestId });
    console.log(`Uptime probe passed for ${origin}`);
  } catch (error) {
    // Only the fixed ProbeFailure text is ever printed; anything else maps to the connection message.
    console.error(error instanceof ProbeFailure ? error.message : MESSAGES.network);
    // Our own id, not network data: the Workers Logs search key for the probe's API request (runbook).
    // Configuration failures happen before any request, so there is no id to search for.
    const sent = !(
      error instanceof ProbeFailure &&
      (error.mode === "not-configured" || error.mode === "bad-url")
    );
    if (sent) console.error(`x-request-id sent to the API route: ${requestId}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) await uptimeProbeMain(process.argv.slice(2), process.env);
