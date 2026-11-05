# ADR-0015: Shared tsconfig structure

- Status: Accepted
- Date: 2026-11-05
- Ticket and specification: METRO-56, decision taken by the owner's delegate; no separate specification

## Context

The repository holds one shared compiler policy file, `tsconfig.base.json`, at the root. Every project config reaches it by a relative `extends` (`apps/*`, `packages/*` and `scripts` use `../tsconfig.base.json` or `../../tsconfig.base.json`; the three cross-cutting configs `tsconfig.test.json`, `tsconfig.dom-test.json` and `tsconfig.e2e.json` use `./tsconfig.base.json`). The root `tsconfig.json` is a solution file (`files: []` plus `references` to all eight projects), needed by editors and the type-aware linter (METRO-26, see [development](../development.md)). The three root project configs are projects, not presets: their `include` globs span many directories, and `scripts/`, `e2e/` and `playwright.config.ts` are outside the bun workspaces.

METRO-56 asked whether to keep this, move the base into a config package, or co-locate the cross-cutting test configs with their owners.

Facts (the labels say how each was established):

- Repo-verified: the structure above, by reading the root `tsconfig*.json` files and `scripts/tsconfig-projects.test.ts`.
- Context7-verified and Web-verified (TypeScript `tsconfig` reference, "extends"): "Currently, the only top-level property that is excluded from inheritance is `references`." Context7 (TypeScript 2.1 release notes): `files`, `include` and `exclude` in the extending config overwrite the base, and relative paths resolve relative to the file they originate in. So a shared file can carry compiler options only, never include globs or solution references.
- Context7-verified (TypeScript 3.2 release notes): a bare package name in `extends` is resolved by looking through `node_modules`, using the package's `tsconfig` field or a root `tsconfig.json`.
- Experiment (Repo-verified on tsc 7.0.2, 2026-11-04, by the ticket author; not re-run for this ADR): extends through a package name works and honors the package `exports` map (a map that omits the file fails with TS6053). Inferred consequence: before `bun install` the package does not exist in `node_modules`, so every config extending it fails.
- Context7-verified (Turborepo, "Sharing tsconfig.json"): the recommended pattern is a `packages/typescript-config` package with a `base.json`, consumed by `extends` plus a workspace devDependency in each package, and Turborepo "do[es] not recommend using TypeScript Project References". The premise is that every package owns its tsconfig.json.
- Web-verified (create-vite `template-react-ts`, `main`): the official template's root `tsconfig.json` is `{ "files": [], "references": [ tsconfig.app.json, tsconfig.node.json ] }`, the same solution pattern used here.

## Decision

- We will keep `tsconfig.base.json` at the root, reached by a relative `extends` from every project config. We will not create a config package now.
- We will keep the root `tsconfig.json` as a solution file that references exactly the project configs.
- We will keep `tsconfig.test.json`, `tsconfig.dom-test.json` and `tsconfig.e2e.json` at the root and not co-locate them with their owners now.
- We will revisit this decision when any of these happens: the repository needs several presets per runtime (for example node, dom, worker and bun bases); a consumer outside this repository needs the shared options; or Turborepo or Nx is adopted.

## Consequences

- No workspace wiring and no install step are needed to typecheck; `tsc` works on a fresh checkout before `bun install`.
- The Turborepo recommendation is not followed. Its premise (a tsconfig per package, no project references) does not hold here, because the solution file and cross-cutting projects are deliberate (METRO-26).
- The root keeps five tsconfig files. Co-locating the three test configs would reduce root files but add files overall and split ownership of the `include` globs.
- A config package would move only one file; the projects and the solution file cannot move into it (`references` and include globs are not shareable).

## Alternatives considered

- Shared config package (`packages/typescript-config`): rejected for now. It adds a package, a workspace devDependency in every consumer and a dependency on install ordering (TS6053 before `bun install`) for one file with one consumer family. Revisit on the triggers above.
- Co-locate the three cross-cutting test configs: rejected for now. They span directories, so no single owner exists, and the change adds files without simplifying anything.
- Drop the solution file and project references (Turborepo's advice): rejected. Editors and the type-aware linter need the solution file to open each file in its project, and `tsc -b` is the typecheck gate.

## Confirmation

`scripts/tsconfig-projects.test.ts` (in `bun run check`) fails when: a project config is not referenced from the solution file or a reference points to a non-config (METRO-26); a project config does not extend the root `tsconfig.base.json` by a relative path; or the base holds anything but `compilerOptions` (so it cannot gain `references`, `include` or `files`). The revisit triggers are `None (policy)`.
