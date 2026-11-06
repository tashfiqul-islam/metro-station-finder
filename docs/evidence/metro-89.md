# METRO-89 evidence: web may run core through its public entry

Scope: ADR-0018 follow-up 1, owner scope recorded in the ticket on 2026-11-06. Base: `553dbffc18a8b4391e1197e424cc22bd06b05e85`.

## Rule before and after

Before (`.dependency-cruiser.mts`):

```
name: "web-never-imports-core-runtime",
comment: "The browser app gets every runtime value through contracts (ADR-0003); importing a type from core is fine.",
severity: "error",
from: { path: "^apps/web/" },
to: { path: "^packages/core/", dependencyTypesNot: ["type-only"] },
```

After:

```
name: "web-imports-core-public-entry-only",
comment: "The browser app may run core, but only through its public entry.",
severity: "error",
from: { path: "^apps/web/" },
to: { path: "^packages/core/", pathNot: "^packages/core/src/index\\.ts$" },
```

Every other rule is unchanged. `@metro/core` resolves through the workspace link and core's exports map to `packages/core/src/index.ts`, so the rule matches the resolved path (proved with real resolution in the fixtures, both `@metro/core` and the relative path).

## Fixtures (scripts/layering.test.ts)

Red on base (11 failures before the rule edit): web runtime import (value, export star, dynamic import) of the public entry by `@metro/core` and by relative path (6 cases, rejected on base); deep relative import of a core internal in all five forms (the three runtime forms were rejected on base under the old rule name, and the two type-only forms were not rejected at all, so the new rule-name assertion failed). Green after: all 42 tests.

Old assertion to new assertion:

| Old                                                                                                         | New                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| web value / export star / dynamic import of core rejected naming `web-never-imports-core-runtime` (6 cases) | Inverted on purpose: the same six are allowed through the public entry (`METRO-89 ... is allowed`)                                              |
| web `import type` / inline type of core allowed (4 cases)                                                   | Kept, still allowed                                                                                                                             |
| none                                                                                                        | New: web import of `packages/core/src/domain/station.ts` by relative path, all five forms, rejected naming `web-imports-core-public-entry-only` |
| none                                                                                                        | New: `@metro/core/src/domain/station.ts` is rejected as `no-unresolved` (the exports map hides it, as for contracts)                            |
| api may import a runtime value from core; contracts-internal cases; other rules                             | Unchanged                                                                                                                                       |

## Dependency and knip

`apps/web/package.json` gains `"@metro/core": "workspace:*"`; `bun.lock` updated; `bun install --frozen-lockfile` passes. With the dependency and no web import, `bun run unused` failed (`Unused dependencies: @metro/core`). Resolution without touching `knip.json`: a small real test, `apps/web/src/core-entry.test.ts`, imports `baselineDataset` and `validateDataset` from `@metro/core` and asserts the baseline dataset validates in the web test environment. It proves the workspace link resolves in the web project and adds no production code. No placeholder runtime import.

TypeScript: `packages/contracts` has no project reference from `apps/web/tsconfig.json`; it is referenced only from the root `tsconfig.json`, which already references `./packages/core`. Neither package is composite, so a web-level `references` entry would break `tsc -b`. None was added; `tsc -b` is green and type-checks the web import through bundler resolution.

## Bundle (bundle:check)

Before and after: 225877 bytes raw, 70421 bytes gzip (unchanged, nothing in the shipped web code imports core yet).

## Verified

`bun run check` (full, including imports:check, unused, tests, vitest coverage, coverage:scope, typecheck) passes locally; `scripts/adr.test.ts` passes (22).

## Not verified

Hosted Quality gates (see the PR). Browser behaviour of core in Chromium, Firefox and WebKit (ADR-0018 follow-up 4). ADR-0018 Context still says "Today ... only types" as a description of the situation before this change; left as history.
