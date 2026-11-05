# API and contracts

**Confirmed / Repo-verified:** the rebuild's API is one Hono route, `GET /api/scaffold/status` (`apps/api/src/app.ts`), validated by the Valibot schemas and error envelope in `packages/contracts` ([ADR-0003](../adr/0003-contracts.md)); there is no OpenAPI document. **Confirmed / Repo-verified (legacy baseline `af903d7`):** [metroServices](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/services/metroServices.ts) calls an external geocoding endpoint. That is a client-side provider call, not a server contract.

Read [architecture](architecture.md) when changing providers/imports; [security](security.md) for input, keys or location; [testing](testing.md) for behavior. Verify installed package versions and provider docs before API guidance.

For an authorized API slice, settle request/response/error shape, validation, cancellation/timeout and provider failure observations in its spec. Define deterministic contract seams and malformed/empty/provider-failure cases; distinguish provider acceptance from delivered user result. Client/server contract changes require explicit scope. Do not add a route or claim OpenAPI generation exists under documentation work.
