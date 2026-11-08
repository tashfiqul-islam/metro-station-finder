import type { ErrorEnvelope } from "@metro/contracts";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";

/**
 * One structured log line. Only these fields exist, so nothing else (query string, headers, bodies,
 * error messages) can be logged by accident. See docs/specifications/cloudflare-preview.md.
 */
export type LogLine =
  | {
      level: "info";
      event: "request";
      requestId: string;
      method: string;
      path: string;
      status: number;
      durationMs: number;
    }
  | { level: "error"; event: "error"; requestId: string; errorName: string };

export type Logger = (line: LogLine) => void;

/** Workers Observability collects console output; one JSON object per line is the contract. */
const consoleLogger: Logger = (line) => {
  // oxlint-disable-next-line eslint/no-console -- the Workers log sink is the console
  console.log(JSON.stringify(line));
};

const REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/u;
const GIT_SHA = /^[0-9a-f]{40}$/u;

function envelope(code: string, message: string): ErrorEnvelope {
  return { error: { code, message } };
}

/**
 * Same values as apps/web/public/_headers. Every other secureHeaders default stays on except HSTS,
 * which waits for the custom domain (ADR-0011). No CSP: these responses are JSON and never rendered.
 */
const SECURE_HEADERS = {
  strictTransportSecurity: false,
  referrerPolicy: "strict-origin-when-cross-origin",
  xFrameOptions: "DENY",
  permissionsPolicy: { geolocation: ["self"] },
} as const satisfies Parameters<typeof secureHeaders>[0];

/**
 * The route pattern to log. The API has no routes yet, so every request logs `/api/*` and a raw path is
 * never logged. When the first route lands, map only its exact pattern here.
 */
const LOGGED_PATH = "/api/*";

function previewSha(env: unknown): string | undefined {
  if (typeof env !== "object" || env === null || !("PREVIEW_SHA" in env)) return undefined;
  const value = env.PREVIEW_SHA;
  return typeof value === "string" && GIT_SHA.test(value) ? value : undefined;
}

export type ApiApp = Hono<{ Bindings: Env; Variables: { requestId: string } }>;

/**
 * Builds the API. The log sink and the route registration are injectable so failure paths can be
 * tested. `register` runs after the shared middleware and before the 404 catch-all: it is where the
 * first real route goes (docs/agents/api.md). The API has none today.
 */
export function createApp(log: Logger = consoleLogger, register: (app: ApiApp) => void = () => {}) {
  const app: ApiApp = new Hono();

  // Worker-generated responses: /api/* and the /assets/* 404 and 405 (ADR-0011).
  app.use("/api/*", secureHeaders(SECURE_HEADERS));
  app.use("/assets/*", secureHeaders(SECURE_HEADERS));

  app.use("/api/*", async (context, next) => {
    const supplied = context.req.header("x-request-id");
    const requestId =
      supplied !== undefined && REQUEST_ID.test(supplied) ? supplied : crypto.randomUUID();
    context.set("requestId", requestId);
    const started = performance.now();
    await next();
    context.header("x-request-id", requestId);
    const sha = previewSha(context.env);
    if (sha !== undefined) context.header("x-preview-sha", sha);
    log({
      level: "info",
      event: "request",
      requestId,
      method: context.req.method,
      path: LOGGED_PATH,
      status: context.res.status,
      durationMs: Math.round(performance.now() - started),
    });
  });

  register(app);
  // Worker-first for /assets/* (see wrangler.jsonc). With run_worker_first patterns Cloudflare answers a
  // missing file with the SPA's index.html (200), and _headers would mark that immutable. Only a real
  // asset may pass; an HTML answer under /assets/ is a miss. That includes any .html or .htm file
  // placed under /assets/ on purpose: it is indistinguishable from the SPA fallback and is a 404.
  app.get("/assets/*", async (context) => {
    const asset = await context.env.ASSETS.fetch(context.req.raw);
    if (!(asset.headers.get("content-type") ?? "").toLowerCase().startsWith("text/html")) {
      // The fetcher's response has immutable headers; copy it so secureHeaders can add its own.
      return new Response(asset.body, asset);
    }
    context.header("Cache-Control", "no-store");
    return context.json(envelope("not_found", "No such asset"), 404);
  });
  app.all("/assets/*", (context) => {
    context.header("Allow", "GET, HEAD");
    return context.json(envelope("method_not_allowed", "Use GET"), 405);
  });
  app.all("/api/*", (context) => context.json(envelope("not_found", "No such API route"), 404));
  // The cause is deliberately not echoed to clients or logged beyond its class name.
  app.onError((error, context) => {
    log({
      level: "error",
      event: "error",
      requestId: context.get("requestId"),
      errorName: error.name.slice(0, 64),
    });
    return context.json(envelope("internal_error", "Internal server error"), 500);
  });
  return app;
}
