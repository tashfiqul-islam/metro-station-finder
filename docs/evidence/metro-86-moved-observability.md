# METRO-86 moved text: observability

Moved from docs/agents/observability.md at revision db8d5e5 on 2026-11-06 (METRO-86). Repo-verified: the text below is copied from that revision with three mechanical changes only: relative links were retargeted so they resolve from docs/evidence/, headings were demoted two levels under each source heading, and a few in-page anchors or section references to moved text were repointed. No sentence was reworded, so its original dates, labels (Confirmed, Repo-verified, Web-verified, Unverified) and ticket references keep their original meaning. The rules in force live in [observability.md](../agents/observability.md). Frozen after this ticket.

## From observability.md, lines 9-9

Every `/api/*` response carries `x-request-id` (a client value matching `^[A-Za-z0-9_-]{8,64}$` is echoed, anything else is replaced by a UUID). Each request writes one JSON line: `level`, `event`, `requestId`, `method`, `path`, `status`, `durationMs`; an unexpected error adds `{level:"error", event:"error", requestId, errorName}`. The `LogLine` type in `apps/api/src/app.ts` is the allow-list: query strings, headers, bodies, cookies and error messages cannot be logged, so keys, coordinates and tokens cannot appear. A preview additionally returns `x-preview-sha`. OTLP export is not implemented; Workers Observability collects these console lines, so their shape is the integration contract. Reproduce with `bun test apps/api`. Production dashboards, retention and tracing IDs are Unknown (none exist).

## From observability.md, lines 13-15

`apps/api/wrangler.jsonc` sets observability for the default (production) environment and for `env.preview`, with the same keys in both, so no environment depends on a platform default. `scripts/observability-config.test.ts` parses the file as JSONC and asserts, with `toEqual`, that each environment's whole `observability` object is exactly the object in this table, so any added, removed or changed key fails.

Form: the nested `logs` form. Cloudflare documents the top-level `enabled` as a "shorthand for `logs.enabled`" and a top-level `head_sampling_rate`, but does not state precedence when both top-level and `logs.*` keys are set (Web-verified 2026-11-05: <https://developers.cloudflare.com/workers/wrangler/configuration/#observability>). The Workers best-practices example uses top-level `enabled` with nested `logs.head_sampling_rate` (<https://developers.cloudflare.com/workers/best-practices/workers-best-practices/>), so we follow that: top-level `enabled` as the master switch, and every logs setting only under `logs`. No top-level `head_sampling_rate` is set, so there is nothing to conflict.

## From observability.md, lines 26-26

Wrangler environments are configured per environment, so each block above is written out in full rather than assumed to be inherited. Whether `observability` is inherited by `env.preview` is Unverified (the Cloudflare pages read do not list it among the non-inheritable keys, and the config explicitly avoids depending on it). Re-check `wrangler types --check` (part of `bun run check`) after any key change.

## From observability.md, lines 28-56

##### Retention

Workers Logs keeps data 7 days on Workers Paid and 3 days on Workers Free until 2026-12-01; afterwards shared-allowance logs default to 7 days, with configurable 30, 90 and 365 days announced but not yet available (Web-verified 2026-11-05: <https://developers.cloudflare.com/workers/observability/logs/workers-logs/>, <https://developers.cloudflare.com/observability/pricing/>). Maximum log size 256 KB and 5 billion logs per account per day (after which a 1% sample applies). No longer-term store exists; anything older than 7 days is gone. Cloudflare Workers Logs is not a record of truth, only a diagnosis aid.

##### Cost basis

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

At the expected scale (at most a few hundred thousand requests per month) the logging cost is $0 on either plan, so sampling stays at 1. Leaving `invocation_logs` on would double the event count and, because the platform line is larger than ours, more than double the bytes; it would not change the cost conclusion at this scale; the reason it is off is the duplicate URL-bearing event, at the price of the lost pre-app failure line described above. Revisit if monthly ingestion approaches 50 GB (about 50 million requests at 1 KB): first lower `head_sampling_rate`, then consider a 30-day retention option once Cloudflare ships it.

Dashboards, alerts and external export (OTLP, Logpush) remain Unknown and out of scope.
