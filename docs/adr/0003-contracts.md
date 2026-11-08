# ADR-0003: Contracts

- Status: Accepted
- Date: 2026-11-03
- Ticket and specification: METRO-21, `metro-foundation-completion` revision `2026-11-03-r1`

## Context

The status moved from the page importing core directly to a Worker response the page must trust only after validation. The specification requires one Standard Schema v1 validation library, selected on Standard Schema compliance, Hono validator support, measured bundle impact inside the existing budget and TypeScript 7 compatibility. Evidence: [METRO-21 evidence](../evidence/metro-foundation-dev-runtime.md); layering in [ADR-0002](0002-runtime-topology.md).

## Decision

- We will add `packages/contracts` using Valibot 1.5.0. It defines the status schema and the error envelope schema, both strict (unknown fields are rejected) and read-only, derives their types, and exports a status parser and `parseErrorEnvelope`.
- **Update (METRO-93, owner-approved contract removal):** the status schema, its parser, the core status type and the compile-time `Equal` assertion below were removed with the status route. Only the error envelope remains; the first real contract follows the same rules (strict, read-only, API validates its own output).
- (Removed by METRO-93 with the status type.) A compile-time `Equal` assertion keeps core's `ScaffoldStatus` and the schema-derived type identical; drift fails `typecheck`. Core stays dependency-free and now only re-exports its type.
- The web client uses `fetch` plus a schema parse, not Hono RPC (`hc`). It rejects non-2xx responses, non-JSON responses and schema violations. The web app therefore imports no API code at all, and the layering rule is simply "apps never import each other".
- The API validates its own output with the same schema before responding, so contract drift becomes a visible 500 instead of a silent bad body.
- `packages/contracts/tsconfig.json` adds the `DOM` lib because Valibot's published declarations reference `Blob` and `File`. `skipLibCheck` stays off.
- React Compiler is adopted through `@vitejs/plugin-react`'s `reactCompilerPreset` with `@rolldown/plugin-babel` 0.2.4 (inside plugin-react 6.1.2's supported range), `babel-plugin-react-compiler` 1.0.0 and `@babel/core` 8.0.10. Evidence: the build output contains the compiler memo-cache runtime, smoke and Fast Refresh checks pass, and the bundle stays inside the budget.

## Consequences

- Strict schemas make additive API changes breaking for old clients; a relaxation needs a new ADR.
- Valibot is the only runtime library in contracts; the layering rule `contracts-imports-only-core-and-schema-library` must change if the library does.
- The compiler adds Babel to the build toolchain (development dependencies only). `@rolldown/plugin-babel` 0.3.0 requires a newer plugin-react (6.2.1, under the release cooldown when adopted), so Renovate must move those packages together.

## Alternatives considered

- Zod 4.6.7 and ArkType 2.2.9: both Standard Schema compliant, heavier in bytes for a two-field contract.
- Hono RPC (`hc`): ties the web app to API types and needs a declared type-only import; unnecessary for one route.
- Plain type guards: no Standard Schema interface and no reuse in Hono validators.
- Defer React Compiler: unnecessary, it is compatible with the pinned React, Vite and plugin-react.

## Confirmation

- `contracts-imports-only-core-and-schema-library` and `contracts-public-entry-only` in `.dependency-cruiser.mts`, proven red by `scripts/layering.test.ts`.
- (Removed by METRO-93.) The compile-time `Equal` assertion in `packages/contracts/src/index.ts` (`bun run typecheck`) and `packages/contracts/src/contracts.test.ts`.
