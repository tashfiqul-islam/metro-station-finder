# ADR-0014: Language level per project and the Workers type source

- Status: Accepted
- Date: 2026-11-05
- Ticket and specification: METRO-49 (decisions taken by the owner's delegate); audit rows LC-03, LC-04, LC-05 and RT-17 in [the November audit](../evidence/audit-2026-11.md)

## Context

Every project inherited `target` and `lib` ES2022 from `tsconfig.base.json`, a floor chosen for shared code. Runtimes differ, and the Worker's API types came from `@cloudflare/workers-types` while `wrangler types` also generated a (runtime-less) `worker-configuration.d.ts`.

Evidence (labelled; today is 2026-11-05):

- Node 26.13.0 runs V8 14.6.202.34 (Repo-verified: `process.versions.v8`).
- The installed workerd is 1.20261023.1 (Repo-verified: `bun.lock`, `workerd --version`), which pins V8 15.7.112.5 (Web-verified: `build/deps/v8.MODULE.bazel` at tag v1.20261023.1). The ticket's "workerd 1.20260930.1 ships V8 15.5" was not re-checked for that older tag; the installed one is newer and is what runs here. Both are newer than Node's V8.
- Feature probes (Repo-verified, run 2026-11-05). The ES2025 additions come from the installed TypeScript's `lib.es2025.{collection,float16,intl,iterator,promise,regexp}.d.ts`; ES2023 and ES2024 library additions are also new relative to the ES2022 floor, so they are probed too. Each was run with `node -e`-style probes on Node 26.13.0 (V8 14.6) and inside the installed workerd 1.20261023.1 (`workerd serve`, compatibility date 2026-10-30). Every probe is present in both:

  | Feature                                                                                                                                                                  | Node 26.13 | workerd 1.20261023.1 |
  | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------------------- |
  | ES2023 `toSorted`, `findLast`, `with`                                                                                                                                    | present    | present              |
  | ES2024 `Object.groupBy`, `Map.groupBy`, `Promise.withResolvers`, `isWellFormed`, `toWellFormed`, `ArrayBuffer` resize and transfer, `Atomics.waitAsync`, regexp `v` flag | present    | present              |
  | ES2025 Set methods (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`)                                        | present    | present              |
  | ES2025 Iterator helpers (`Iterator.from`, `map`, `filter`, `take`, `drop`, `flatMap`, `reduce`, `toArray`, `forEach`, `some`, `every`, `find`)                           | present    | present              |
  | ES2025 `Promise.try`, `RegExp.escape`                                                                                                                                    | present    | present              |
  | ES2025 `Float16Array`, `Math.f16round`, `DataView` `getFloat16` and `setFloat16`                                                                                         | present    | present              |
  | ES2025 `Intl.DurationFormat`                                                                                                                                             | present    | present              |
  | ES2025 regexp modifiers `(?i:...)`, duplicate named groups                                                                                                               | present    | present              |
  | ES2025 JSON import attributes (`import(x, { with: ... })` syntax)                                                                                                        | present    | not probed           |

  Nothing is absent, so the ES2025 decision stands unadjusted. These are presence probes, not conformance tests. Cloudflare's compatibility-flags page (first 100,000 characters read) names no gate on these features (Web-verified, partial).

- TypeScript 7.0.2 (installed) accepts `ES2025` for `target` and `lib` (Repo-verified: `tsc -b` green with it; Context7-verified: `lib.es2025.d.ts` exists). `es2026` is in the compiler source but the ticket says 7.1 is beta and not adopted; not used here.
- Vite 8 transpiles for Chrome and Edge 111, Firefox 114 and Safari 16.4 by default (Web-verified: vite.dev/guide/build). No browser support matrix is written.
- Cloudflare: "We recommend you use `wrangler types` to generate runtime types, rather than using the `@cloudflare/workers-types` package" (Web-verified: developers.cloudflare.com/workers/languages/typescript). Wrangler itself says `wrangler types` "supersedes" `@cloudflare/workers-types` and that it should be uninstalled and removed from tsconfig (Context7-verified: `/cloudflare/workers-sdk`). The same page says `wrangler types --check` does not validate the generated body, only whether the recorded configuration and runtime inputs are current.
- `nodenext` for scripts was trialled before this ticket and fails: TS2835 on core's extensionless import, TS2322 on the `Equal` guard (from the ticket; not re-run here, Unverified).

## Decision

We will set the language level per project:

| Project (config)                  | target | lib                         | Reason                                                                                                  |
| --------------------------------- | ------ | --------------------------- | ------------------------------------------------------------------------------------------------------- |
| scripts (`scripts/tsconfig.json`) | ES2025 | ES2025                      | Run by Node 26 (V8 14.6)                                                                                |
| api (`apps/api/tsconfig.json`)    | ES2025 | ES2025                      | Runs in workerd (V8 15.x)                                                                               |
| e2e (`tsconfig.e2e.json`)         | ES2025 | ES2025, DOM, DOM.Iterable   | Runs in Node via Playwright                                                                             |
| core, contracts                   | ES2022 | ES2022 (contracts adds DOM) | Shared code that also reaches browsers; stays at the web floor                                          |
| web, dom-test                     | ES2022 | ES2022, DOM, DOM.Iterable   | Browser matrix not written: Vite 8 default targets                                                      |
| test (`tsconfig.test.json`)       | ES2022 | ES2022                      | Not raised: Bun, not Node, runs these and they share files with the base floor; revisit with the matrix |

`tsconfig.base.json` stays at ES2022 as the floor; the raised projects override it.

We will take the Workers API types from `wrangler types` only. `apps/api` runs `wrangler types` without `--include-runtime=false`, so `worker-configuration.d.ts` carries the runtime types (generated with workerd 1.20261023.1), `apps/api/tsconfig.json` lists that file in `include` and has `types: []`, and `@cloudflare/workers-types` is removed from `package.json` and `bun.lock`. `types:check` and `tsc -b` are green with `skipLibCheck: false`.

We will not adopt `nodenext` for scripts now. Trigger to retry: core's imports gain extensions or core ships as a package with an `exports` map, and the `Equal` guard is rewritten to compile under `nodenext`.

We will write a browser support matrix before raising web, core or contracts. Until then: Vite 8 default targets. Trigger to revisit: the matrix is written, or Vite changes its default targets in a major release.

Windows `wrangler types --check` (RT-17): Wrangler 4.156.1 fixed `--check` on CRLF checkouts. Installed now: wrangler 4.156.0 (Repo-verified), which predates the fix. The newest published is 4.157.0 (Repo-verified: `npm view`, 2026-11-05). Bumping is out of scope for METRO-49. Re-test step after the next wrangler bump, recorded in [maintenance](../agents/maintenance-runbook.md#wrangler-types-check-on-windows).

## Consequences

- A script or Worker may use ES2025 library APIs; shared packages may not, and the type checker says so.
- Lib-leak constraint on `tsconfig.test.json`. It inherits the ES2022 floor and includes `scripts/**/*.test.ts`, `apps/**/*.test.ts`, `packages/**/*.test.ts` and four scripts files (`configuration.ts`, `hooks-status.ts`, `mise-lock.ts`, `tools.ts`) that the scripts project excludes. A test file also pulls in whatever it imports, for example `apps/api/src/*.ts` (ES2025 project) or `scripts/git-env.ts`. If such a module uses an ES2025-only API (say `Set.prototype.union` or `Promise.try`), the production project accepts it but the test project's typecheck fails with a missing-property error on that module. Guard: `tsc -b` (`bun run typecheck`, part of `bun run check`) checks every project, so the failure is caught before merge. When it triggers, either avoid the ES2025 API in the module the tests import, or, if Bun's runtime has the API (probe it first), raise `tsconfig.test.json` to ES2025 and update the expected table in `scripts/language-level.test.ts` in the same change. Do not suppress the error.
- `worker-configuration.d.ts` grows from 38 lines to about 626 KB. It stays ignored by oxlint and oxfmt, as before. Regenerate it with `bun run --cwd apps/api types` whenever `wrangler.jsonc`, `compatibility_date` or wrangler changes; `types:check` fails when its recorded inputs are stale but not when the body was hand-edited.
- Bun-typed test projects still cannot include the generated file (its `*.txt` module declarations conflict with Bun's), so `apps/api/test-env.d.ts` stays.
- The language levels above must be revisited when the browser matrix is written, when TypeScript 7.1 is stable (`es2026`), and when Node or workerd moves V8 below a feature in use.

## Alternatives considered

- Keep `@cloudflare/workers-types` and `--include-runtime=false`: rejected; Cloudflare recommends generated types, and two sources can drift (the package pins its own date, the generated file the Worker's compatibility date).
- Both sources together: rejected; duplicate global declarations conflict.
- ES2025 everywhere: rejected; core and contracts are shared with the browser and the matrix is unwritten.
- ESNext or ES2026: rejected; moving targets, and 7.1 is beta.
- `nodenext` for scripts now: rejected; fails today (see Context).

## Confirmation

`scripts/language-level.test.ts` resolves every project with `tsc --showConfig` and fails when its `target` or `lib` differs from the table above. It also asserts that the api project includes `worker-configuration.d.ts` with `types: []`, and that no `package.json` depends on `@cloudflare/workers-types`. `scripts/binding-types.test.ts` runs the same `wrangler types --check` command as `types:check`. `bun run types:check` (part of `bun run check`) fails when the generated Workers types are stale, and `tsc -b` fails when the Worker uses an API the generated types lack. The Windows re-test step is a manual procedure (policy) in [maintenance](../agents/maintenance-runbook.md#wrangler-types-check-on-windows).
