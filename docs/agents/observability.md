# Observability

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

Read for logs, traces or failure diagnosis. Read [security](security.md) if signals can contain inputs, coordinates, addresses or keys. Read [testing](testing.md) for failure reproduction.

Define which event occurred, which stage failed and what observation proves recovery. Keep provider response, app outcome and user-visible state distinct. Use synthetic fixtures and sanitized identifiers; never paste credential-bearing URLs. Record missing telemetry as Unknown; do not invent production dashboards, tracing IDs, retention policies or health guarantees. New instrumentation requires explicit ticket scope.

## API request signals (METRO-13)

Every `/api/*` response carries `x-request-id` (a client value matching `^[A-Za-z0-9_-]{8,64}$` is echoed, anything else is replaced by a UUID). Each request writes one JSON line: `level`, `event`, `requestId`, `method`, `path`, `status`, `durationMs`; an unexpected error adds `{level:"error", event:"error", requestId, errorName}`. The `LogLine` type in `apps/api/src/app.ts` is the allow-list: query strings, headers, bodies, cookies and error messages cannot be logged, so keys, coordinates and tokens cannot appear. A preview additionally returns `x-preview-sha`. OTLP export is not implemented; Workers Observability collects these console lines, so their shape is the integration contract. Reproduce with `bun test apps/api`. Production dashboards, retention and tracing IDs are Unknown (none exist).
