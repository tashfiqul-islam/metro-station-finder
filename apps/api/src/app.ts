import { parseScaffoldStatus, type ErrorEnvelope } from "@metro/contracts";
import { getScaffoldStatus } from "@metro/core";
import { Hono } from "hono";

function envelope(code: string, message: string): ErrorEnvelope {
  return { error: { code, message } };
}

/** Builds the API. The status source is injectable so failure paths can be tested. */
export function createApp(readStatus: () => unknown = getScaffoldStatus) {
  const app = new Hono<{ Bindings: Env }>();
  app.get("/api/scaffold/status", (context) => context.json(parseScaffoldStatus(readStatus())));
  app.all("/api/scaffold/status", (context) => {
    context.header("Allow", "GET, HEAD");
    return context.json(envelope("method_not_allowed", "Use GET"), 405);
  });
  app.all("/api/*", (context) => context.json(envelope("not_found", "No such API route"), 404));
  // The cause is deliberately not echoed to clients.
  app.onError((_error, context) =>
    context.json(envelope("internal_error", "Internal server error"), 500),
  );
  return app;
}
