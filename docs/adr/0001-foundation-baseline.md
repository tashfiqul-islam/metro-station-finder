# ADR-0001: Foundation baseline

- Status: Accepted
- Date: 2026-11-03
- Ticket and specification: METRO-19, `metro-foundation-completion` revision `2026-11-03-r1`

## Context

The independent Metro rebuild started with a scaffold whose decisions were recorded only in guidance and evidence documents. This ADR records the decisions that already exist, with their evidence. It introduces no new decision. Later decisions (runtime topology, contracts) get their own ADRs.

## Decision

1. **Bun and mise.** Bun installs, tests and orchestrates; mise pins every tool (Bun, Node, Gitleaks, hk, Pkl). Exact pins and one text lockfile; frozen bootstrap. See [development](../development.md#bootstrap-and-commands) and [configuration ownership](../development.md#configuration-ownership).
2. **TypeScript 7 compiler with a TypeScript 6 API seam.** `tsc` is TypeScript 7. `@typescript/typescript6` supplies only the JavaScript compiler API used by the core import guard and dependency-cruiser. See [METRO-16 evidence](../evidence/metro-16.md).
3. **Hono on a Cloudflare Worker.** `apps/api` is a Hono application with a Worker default export, run locally in workerd. See [workspace boundaries](../development.md#boundaries-and-choices).
4. **React and Vite.** `apps/web` is a React DOM application built with Vite. Frontend stack choices beyond this (router, styling, data fetching, internationalisation) are not decided here.
5. **Core purity.** `packages/core` is dependency-free and uses ES types only; `scripts/boundaries.ts` enforces it. See [architecture](../agents/architecture.md).
6. **Plane as issue tracker.** Tickets, specifications and readiness live in Plane; GitHub is the code host only. See [issue tracker](../agents/issue-tracker.md) and [Plane adapter](../agents/plane.md).

## Consequences

- Upgrades to the compiler, Wrangler or Vite must recheck the TypeScript 6 seam and the runtime smoke.
- Core cannot import frameworks or other packages; shared contracts need a separate package (decided in a later ADR).
- Work tracking depends on the Plane connector; its limits are documented in the adapter.

## Alternatives considered

Alternatives were not recorded when these decisions were made; they are not reconstructed here. Evidence for each decision is linked above.

## Confirmation

- `scripts/configuration.ts` (pins, cooldown, trusted dependencies), `scripts/tools.ts` and `scripts/boundaries.ts` (core purity), all run by `bun run check`.
- Decisions 3 to 6 (Hono Worker, React and Vite, Plane) have no dedicated test beyond the build, smoke and the documents they link: `None (policy)` for those.
