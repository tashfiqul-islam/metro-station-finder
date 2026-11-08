# ADR-0013: API error format and response compatibility rule

- Status: Accepted
- Date: 2026-11-05
- Ticket and specification: METRO-53 (Plane); no separate specification, the ticket acceptance is the contract. Decisions taken by the owner's delegate.

## Context

Two questions were open: which body the API returns for errors, and whether response schemas tolerate additive change. This ADR amends nothing; it references [ADR-0002](0002-runtime-topology.md) (the route and error contract) and [ADR-0003](0003-contracts.md) (strict schemas, "a relaxation needs a new ADR").

- Web-verified 2026-11-05 ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html), July 2023, obsoletes RFC 7807): problem details are served as `application/problem+json` with the members `type` (URI reference, default `about:blank`), `title`, `status`, `detail` and `instance`. `status` "is only advisory", but generators MUST send the same status in the HTTP response. Clients MUST ignore extension members they do not recognise, and a member whose value has the wrong type MUST be ignored.
- Context7-verified 2026-11-05 (Valibot docs): `object` removes unknown entries, `looseObject` keeps them, `strictObject` returns an issue for the first unknown entry. The installed contracts use `strictObject` for both the status and the error envelope (Repo-verified, `packages/contracts/src/index.ts`).
- Repo-verified at this revision, what the API returns today (`apps/api/src/app.ts`, pinned by `apps/api/src/error-format.test.ts`):

| Case                                        | Status | Body `error.code`    | Content-Type       | Other headers                                             |
| ------------------------------------------- | ------ | -------------------- | ------------------ | --------------------------------------------------------- |
| Unknown `/api/*`                            | 404    | `not_found`          | `application/json` | no `Cache-Control`; security headers, `x-request-id`      |
| Unexpected failure or contract drift        | 500    | `internal_error`     | `application/json` | no `Cache-Control`; the cause is never echoed             |
| Missing `/assets/*` file (Worker-generated) | 404    | `not_found`          | `application/json` | `Cache-Control: no-store` (the only `no-store`, ADR-0011) |
| Non-GET/HEAD on `/assets/*`                 | 405    | `method_not_allowed` | `application/json` | `Allow: GET, HEAD`                                        |

The body is always `{ "error": { "code": string, "message": string } }`. There is no `status` member in the body.

- Repo-verified gap: `@metro/contracts` exports `errorEnvelopeSchema` and `parseErrorEnvelope`, but the API builds error bodies with an `ErrorEnvelope` type annotation (`envelope()` in `app.ts`), not by running the schema at runtime. The API has no success bodies since METRO-93 retired the only route. Tests (`index.test.ts`, `assets-route.test.ts`, `error-format.test.ts`, `e2e/app-shell.e2e.ts`) parse real error responses with the schema, so a drifting shape fails them, and the type annotation fails `typecheck`. The web client does not parse the error body (it rejects any non-2xx).
- Deployment skew: the same Worker deployment serves the SPA and the API atomically, so a new API never meets an old SPA bundle from the same deployment. The only skew is a stale open tab or cached SPA calling a newer API. Its failure mode is a visible error state; METRO-58 adds an error boundary.

## Decision

(a) Error format. We will keep the `{ error: { code, message } }` envelope and will not adopt `application/problem+json` now. Reasons: only our own SPA (and later our own native apps) consume the API; `code` is a closed, machine-readable set; the envelope is consistent, tested and typed; and a switch is cheap while there is exactly one endpoint. Error responses keep `Content-Type: application/json`. New error codes are added to the closed set deliberately.

Revisit (a), through a new ADR, when any of these happens: a third-party consumer appears; we need `type` URIs, standard problem-details tooling or client libraries; or more than one error shape appears. If problem+json is then chosen, that ADR must change the 404, 405 and 500 tests to assert `Content-Type: application/problem+json`, a `status` member equal to the HTTP status, and the updated bodies.

(b) Response compatibility. We will keep response schemas strict (`strictObject`) for now, and will not weaken them. Requests stay strict in any case: an unknown request field is a client bug and is rejected. Strictness is accepted knowing that an additive response change breaks an older tab; the deploy is atomic and the failure is visible. No owner-level supersession of ADR-0003 is needed because nothing is relaxed.

Revisit (b) at the first additive response change, or the first native client (installed apps cannot be refreshed atomically). The likely move is a tolerant reader on responses only: Valibot `object` (drops unknown fields) or `looseObject` (keeps them), with required fields and types still checked, matching RFC 9457's rule that clients ignore unknown members. That move needs a new ADR and an owner decision, and must change the tests named below in the same pull request.

## Consequences

- Easier: one error shape for clients, no content negotiation, nothing to migrate now.
- Harder: no standard problem-details tooling; each error body carries no machine-readable `type` URI or `instance`.
- Any additive change to a response, including adding a field to the error envelope, is a breaking change for stale clients until (b) is revisited. Ship it with the schema change in the same deployment and expect stale tabs to show the error state.
- The error envelope is checked in tests and by the type annotation, not validated at runtime before sending. If an error body ever needs runtime validation, parse it with `errorEnvelopeSchema` in `envelope()`; that is not done here.
- Unverified: how long stale tabs or cached SPA shells survive in practice behind Cloudflare; no measurement was made.

## Alternatives considered

- Adopt `application/problem+json` now: rejected for the reasons in (a); it would change every error test and the web contract for no current consumer.
- Return both shapes (envelope members inside a problem document): rejected, two shapes to maintain and a mixed contract.
- Tolerant response schemas now: rejected, no additive change is pending and the deploy is atomic; relaxing later is a one-line schema change per object once a trigger fires.
- Tolerant request schemas: rejected, silently ignoring unknown request fields hides client bugs.

## Confirmation

- `apps/api/src/error-format.test.ts` fails if this file is missing or loses its decisions, if 404, 405 or 500 stop being `application/json` envelopes, gain a `status` member or gain a `Cache-Control`.
- `packages/contracts/src/contracts.test.ts` (tests named `METRO-53 ADR-0013 ...`) fails if a response with an extra field is accepted, if a wrong field type is accepted, or if the contract objects stop being `strict_object`. Relaxing any of these requires changing a test on purpose.
- `scripts/adr.test.ts` checks the structure of this file.
