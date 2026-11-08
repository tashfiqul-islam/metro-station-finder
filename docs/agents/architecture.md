# Architecture

Read when: changing packages, imports, providers, workspace names or structure, or recording a decision.

## Rules

- Layers: `packages/core` imports only core. `packages/contracts` imports only core and Valibot. `apps/web` and `apps/api` never import each other. `apps/web` may run core, but only through its public entry `packages/core/src/index.ts` (ADR-0018, METRO-89). Contracts is reached only through its public entry `src/index.ts`. Contracts govern what crosses the network, not what web may import from core. Allowed edges: web to core and contracts, api to core and contracts, contracts to core. Used today: web to core, web to contracts (types only, so no valibot in the browser), api to contracts.
- Core is pure: executable domain and application code, no dependencies, no I/O, no framework or runtime globals. Its standalone TypeScript check excludes runtime globals.
- Future boundary: the application layer owns ports when needed, adapters implement them, apps compose. Create no speculative ports or adapters; the one real adapter is `apps/web/src/adapters/maps`, the only code that imports a Google Maps library or uses its ambient `google.maps` types ([golden path](golden-path.md)). Keep API clients on plain `fetch` with Valibot schemas from `packages/contracts` ([ADR-0003](../adr/0003-contracts.md)); a REST or OpenAPI layer needs a new ADR. Version station and fare data. A database or native UI needs demonstrated need and explicit scope.
- Package names are `@metro/<one-word-noun>` after the role (`@metro/core`, `@metro/contracts`, `@metro/web`, `@metro/api`; root `metro-workspace`). No unscoped `metro-*`, no `metro-` prefix inside the scope, no hyphenated `metro-x-y`: a two-word name means two jobs, so split it. A package needs a role and a second consumer. Rename only with an ADR.
- Before a package, import or provider change, identify the affected boundaries, the installed lockfile versions and the applicable ADRs. Read the [foundation baseline](../adr/0001-foundation-baseline.md) first and record a new ADR (form: [template](../adr/0000-template.md), MADR 4.0.0, including `Confirmation`) before a material decision. Do not fabricate ADR links. Contract, permission and gate-policy changes need explicit task scope.
- The legacy baseline `af903d7` is Next pages, components, services and utils, not a layered workspace. Inspect it ([manifest](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/package.json)) before relying on it.

## Enforced by

- `bun run imports:check` (dependency-cruiser, `.dependency-cruiser.mts`): fails on cycles, unresolved imports and any layering rule above. Each rule is proven red by a fixture in `scripts/layering.test.ts`. Fix the import, not the rule.
- Rule `maps-library-only-in-maps-adapter` in the same file, with a fixture per import form in `scripts/layering.test.ts`; `scripts/google-containment.test.ts` covers the ambient `google.maps` global as a text guard (an alias is not caught).
- `scripts/boundaries.ts` (in `check`): fails core on external or escaping imports and on declared dependencies. It is a narrow smoke guard, not a sandbox.
- `scripts/adr.test.ts`: fails an ADR with a wrong header, status or missing section.

## Read more

- [ADR-0002](../adr/0002-runtime-topology.md) topology, [ADR-0003](../adr/0003-contracts.md) contracts, [ADR-0018](../adr/0018-where-core-runs.md) where core runs, [workspace facts](../development.md).
