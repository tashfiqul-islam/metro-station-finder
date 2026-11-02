# API and contracts

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

**Confirmed / Repo-verified:** [metroServices](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/services/metroServices.ts) calls an external geocoding endpoint. This is not evidence of an implemented REST/OpenAPI server contract.

Read [architecture](architecture.md) when changing providers/imports; [security](security.md) for input, keys or location; [testing](testing.md) for behavior. Verify installed package versions and provider docs before API guidance.

For an authorized API slice, settle request/response/error shape, validation, cancellation/timeout and provider failure observations in its spec. Define deterministic contract seams and malformed/empty/provider-failure cases; distinguish provider acceptance from delivered user result. Client/server contract changes require explicit scope. Do not introduce a backend or claim OpenAPI generation exists under documentation work.
