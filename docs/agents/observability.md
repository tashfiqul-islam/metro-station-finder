# Observability

Read when: adding or reading logs, traces or request signals, changing Workers Logs settings, or diagnosing a failure.

## Rules

- Define which event occurred, which stage failed and what observation proves recovery. Keep provider response, app outcome and user-visible state distinct. Use synthetic fixtures and sanitized identifiers; never paste credential-bearing URLs. Record missing telemetry as Unknown; do not invent production dashboards, tracing IDs, retention policies or health guarantees. New instrumentation needs explicit ticket scope. Read [security](security.md) if signals can hold inputs, coordinates, addresses or keys, and [testing](testing.md) to reproduce failures.
- Every `/api/*` response carries `x-request-id`: a client value matching `^[A-Za-z0-9_-]{8,64}$` is echoed, anything else is replaced by a UUID. Each request writes one JSON line with `level`, `event`, `requestId`, `method`, `path`, `status` and `durationMs`; an unexpected error adds `{level:"error", event:"error", requestId, errorName}`. The `LogLine` type in `apps/api/src/app.ts` is the allow-list: query strings, headers, bodies, cookies and error messages cannot be logged. A preview also returns `x-preview-sha`. These console lines are collected by Workers Observability, so their shape is the integration contract. OTLP export is not implemented. Reproduce with `bun test apps/api`.
- `apps/api/wrangler.jsonc` sets `observability` for the default environment and for `env.preview` with identical keys, written out in full rather than inherited. Use the nested `logs` form: top-level `enabled: true` as the master switch and every logs setting only under `logs`; set no top-level `head_sampling_rate`. The exact object for each environment:
  - `enabled: true`
  - `logs.enabled: true`
  - `logs.head_sampling_rate: 1` (log every request; lower it only if monthly ingestion nears 50 GB)
  - `logs.invocation_logs: false` (the app already writes one allow-listed line per request; the platform line duplicates it and carries the URL; accepted cost: a failure before the app runs leaves no log line, only a Workers Metrics count; turn it on to diagnose such an outage)
  - `redact_query_string: true` (strips query strings from platform logs and traces)
  - `traces.enabled: false` (tracing is out of scope; stated so a platform default cannot enable it)
- Workers Logs is a diagnosis aid, not a record of truth: it keeps data 7 days, with no longer-term store. Dashboards, alerts and external export (OTLP, Logpush) are Unknown and out of scope. Re-run `wrangler types --check` (part of `bun run check`) after any key change.

## Enforced by

- `scripts/observability-config.test.ts`: parses `wrangler.jsonc` and fails if either environment's whole `observability` object differs from the one above. Change the config and this list together in a reviewed change.
- `apps/api/src/observability.test.ts`: fails if a log line gains a field outside the allow-list or a request id is not echoed or replaced as above.

## Read more

- [Moved observability detail](../evidence/metro-86-moved-observability.md): retention and pricing facts (Web-verified 2026-11-05), cost arithmetic, form and precedence notes.
- [Specification quality-gates](../specifications/quality-gates.md), [ADR-0006](../adr/0006-cloudflare-preview.md).
