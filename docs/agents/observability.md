# Observability

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

Read for logs, traces or failure diagnosis. Read [security](security.md) if signals can contain inputs, coordinates, addresses or keys. Read [testing](testing.md) for failure reproduction.

Define which event occurred, which stage failed and what observation proves recovery. Keep provider response, app outcome and user-visible state distinct. Use synthetic fixtures and sanitized identifiers; never paste credential-bearing URLs. Record missing telemetry as Unknown; do not invent production dashboards, tracing IDs, retention policies or health guarantees. New instrumentation requires explicit ticket scope.

## API request signals (METRO-13)

Every `/api/*` response carries `x-request-id` (a client value matching `^[A-Za-z0-9_-]{8,64}$` is echoed, anything else is replaced by a UUID). Each request writes one JSON line: `level`, `event`, `requestId`, `method`, `path`, `status`, `durationMs`; an unexpected error adds `{level:"error", event:"error", requestId, errorName}`. The `LogLine` type in `apps/api/src/app.ts` is the allow-list: query strings, headers, bodies, cookies and error messages cannot be logged, so keys, coordinates and tokens cannot appear. A preview additionally returns `x-preview-sha`. OTLP export is not implemented; Workers Observability collects these console lines, so their shape is the integration contract. Reproduce with `bun test apps/api`. Production dashboards, retention and tracing IDs are Unknown (none exist).

## Workers Logs settings, retention and cost (METRO-43)

`apps/api/wrangler.jsonc` sets observability for the default (production) environment and for `env.preview`, with the same keys in both, so no environment depends on a platform default. `scripts/observability-config.test.ts` parses the file as JSONC and fails if either block is missing or differs from this table.

| Key                    | Value   | Why                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`              | `true`  | Logs persisted to Workers Logs (the `enabled` shorthand sets `logs.enabled`).                                                                                                                                                                                                                                                                                                                     |
| `head_sampling_rate`   | `1`     | Log every request. Traffic is tiny, a sampled-out request would hide its own error line, and the cost below is negligible at 100%. Lower it only if the cost arithmetic below stops holding.                                                                                                                                                                                                      |
| `logs.invocation_logs` | `false` | Our app already writes one allow-listed line per request (METRO-13). The platform invocation log duplicates it, adds a second event per request and carries the request URL; `redact_query_string` below is the backstop if the line is ever re-enabled. A Worker crash before the app runs would lose its invocation line; the `error` event and the Workers Metrics dashboard still cover that. |
| `redact_query_string`  | `true`  | Removes query strings from request URLs in platform logs and traces, so coordinates or keys sent as query parameters cannot reach the platform fields.                                                                                                                                                                                                                                            |
| `traces.enabled`       | `false` | Tracing is not in scope; stated explicitly so the platform default can never turn it on and bill it.                                                                                                                                                                                                                                                                                              |

Wrangler environments are configured per environment, so each block above is written out in full rather than assumed to be inherited. Whether `observability` is inherited by `env.preview` is Unverified (the Cloudflare pages read do not list it among the non-inheritable keys, and the config explicitly avoids depending on it). Re-check `wrangler types --check` (part of `bun run check`) after any key change.

### Retention

Workers Logs keeps data 7 days on Workers Paid and 3 days on Workers Free until 2026-12-01; afterwards shared-allowance logs default to 7 days, with configurable 30, 90 and 365 days announced but not yet available (Web-verified 2026-11-05: <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>, <https://developers.cloudflare.com/observability/pricing/>). Maximum log size 256 KB and 5 billion logs per account per day (after which a 1% sample applies). No longer-term store exists; anything older than 7 days is gone. Cloudflare Workers Logs is not a record of truth, only a diagnosis aid.

### Cost basis

Until 2026-11-30 Workers Logs is billed per event: Free 200,000 events per day; Paid 20 million per month included, then $0.60 per additional million. From 2026-12-01 (accounts on Free, Pro and Business; Enterprise at renewal; only data received on or after that date) Workers Logs, traces and other logs share one allowance billed by size, not by event (Web-verified 2026-11-05: <https://developers.cloudflare.com/observability/pricing/>):

|                      | Free                                             | Paid                          |
| -------------------- | ------------------------------------------------ | ----------------------------- |
| Included ingestion   | 0.5 GB per day (ingestion stops until 00:00 UTC) | 50 GB per billing cycle       |
| Included storage     | 7-day retention                                  | 10 GB-month per billing cycle |
| Additional ingestion | not available                                    | $0.25 per GB                  |
| Additional storage   | not separately metered                           | $0.10 per GB-month            |

Ingestion counts the event body, default enriched attributes and custom attributes, before compression, and excludes dropped events; sampling lowers both ingestion and storage. GB-month is the sum of each day's maximum queryable GB divided by 30.

Arithmetic at `head_sampling_rate: 1`, one event per request (invocation logs off), assuming 1 KB per event including enriched attributes. The 1 KB is an assumption, not a measurement (Unverified; measure a real event in the dashboard once production exists and replace it):

| Requests per month | Ingestion | Steady 7-day storage | Paid-plan overage                                                      | Free-plan fit                                                                                |
| ------------------ | --------- | -------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 100,000            | 0.1 GB    | about 0.02 GB-month  | $0                                                                     | yes (about 3,300 events per day against 500,000)                                             |
| 1 million          | 1 GB      | about 0.23 GB-month  | $0                                                                     | yes                                                                                          |
| 10 million         | 10 GB     | about 2.3 GB-month   | $0                                                                     | marginal (about 0.33 GB per day against 0.5 GB; spikes would stop ingestion until 00:00 UTC) |
| 100 million        | 100 GB    | about 23 GB-month    | (100 - 50) x $0.25 + (23 - 10) x $0.10 = $12.50 + $1.30 = about $13.80 | no                                                                                           |

At the expected scale (at most a few hundred thousand requests per month) the logging cost is $0 on either plan, so sampling stays at 1. Leaving `invocation_logs` on would double the event count and, because the platform line is larger than ours, more than double the bytes; it would not change the conclusion at this scale but removes nothing of value. Revisit if monthly ingestion approaches 50 GB (about 50 million requests at 1 KB): first lower `head_sampling_rate`, then consider a 30-day retention option once Cloudflare ships it.

Dashboards, alerts and external export (OTLP, Logpush) remain Unknown and out of scope.
