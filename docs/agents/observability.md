# Observability

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

Read for logs, traces or failure diagnosis. Read [security](security.md) if signals can contain inputs, coordinates, addresses or keys. Read [testing](testing.md) for failure reproduction.

Define which event occurred, which stage failed and what observation proves recovery. Keep provider response, app outcome and user-visible state distinct. Use synthetic fixtures and sanitized identifiers; never paste credential-bearing URLs. Record missing telemetry as Unknown; do not invent production dashboards, tracing IDs, retention policies or health guarantees. New instrumentation requires explicit ticket scope. Preview health/error behavior is future METRO-13 work.
