# API and contracts

Read when: adding or changing a route, a request or response shape, an error body or an external provider call.

## Rules

- The API today is one Hono route, `GET /api/scaffold/status` (`apps/api/src/app.ts`), validated by the Valibot schemas and error envelope in `packages/contracts` ([ADR-0003](../adr/0003-contracts.md)). There is no OpenAPI document; do not add a route or claim OpenAPI generation under documentation work.
- Errors use `{ error: { code, message } }` with `Content-Type: application/json`, not `application/problem+json`. Request and response schemas stay strict (`strictObject`). Validate success bodies (`parseScaffoldStatus`) before sending; build error bodies from the `ErrorEnvelope` type only. Relaxing either decision needs a new ADR and an owner decision ([ADR-0013](../adr/0013-api-error-format.md) lists revisit triggers).
- An API slice settles request, response and error shapes, validation, cancellation and timeout, and provider failure observations in its spec. Define deterministic contract seams and malformed, empty and provider-failure cases. Distinguish provider acceptance from the delivered user result. Client or server contract changes need explicit scope.
- Verify installed package versions and provider docs before giving API guidance. The legacy `metroServices` call was a client-side provider call, not a server contract.
- Read [architecture](architecture.md) for providers and imports, [security](security.md) for input, keys or location, [testing](testing.md) for behavior.

## Enforced by

- `packages/contracts` tests and `apps/api/src/error-format.test.ts`: parse real error responses with `errorEnvelopeSchema`. Fix the response, not the schema.
- `bun run types:check`: fails when generated Worker binding types are stale.

## Read more

- [ADR-0003](../adr/0003-contracts.md), [ADR-0013](../adr/0013-api-error-format.md), [maps design](../specifications/maps-provider-design.md).
