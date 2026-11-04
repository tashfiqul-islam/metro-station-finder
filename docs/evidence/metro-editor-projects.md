# METRO-26 evidence: editor type errors

Ticket METRO-26. Date 2026-11-04. Base `feature/metro-rebuild` at `d360b84`.

## Cause (Repo-verified by reproduction)

An editor opens a file in the nearest `tsconfig.json` that includes it, or else in an inferred project. Every test file, `e2e/`, `playwright.config.ts`, `scripts/configuration.ts` and `scripts/tools.ts` are excluded from the production project configs (their types differ), and the root `tsconfig.json` had `files: []` and no references. They therefore opened in inferred projects, where TypeScript 6 defaults `types` to none: `bun:test`, `node:path`, `node:fs/promises`, `node:os`, `process`, `Bun`, `console` and `Response` were missing, and implicit-any followed.

Reproduction used the TypeScript 6 `ProjectService` (the class an editor's language server uses): at baseline 67 tracked TypeScript files, 38 of them with problems, 180 problems in total, every one in an inferred project. The owner saw 118, later 68, depending on the files open.

## Fix

- Root `tsconfig.json` is a solution file: `files: []` and `references` to all eight project configs. TypeScript 6 and 7 accept it without errors; no `composite` needed.
- After the change the same harness reports 0 problems for all files (67 at baseline, 70 once this ticket's three new files are tracked), and each file opens in the project the gates use (on the 67-file run: 36 `tsconfig.test.json`, 18 `scripts`, 3 `tsconfig.e2e.json`, 3 `apps/web`, 3 `apps/api`, 2 `packages/core`, 1 `tsconfig.dom-test.json`, 1 `packages/contracts`).
- Regression test `scripts/tsconfig-projects.test.ts` (red first against the old root; dropping one reference makes both tests fail): every tracked project config is referenced, and every tracked `.ts`/`.tsx` file is listed by some referenced project (`tsc --listFilesOnly`).

## Consequence found and handled

The type-aware linter finds a file's project the same way the editor does (nearest `tsconfig.json`, then references), so test files are now linted against the real Bun types instead of an unresolved `bun:test`. That exposed 38 `typescript/await-thenable` findings, all `await expect(promise).rejects.toThrow(...)`: Bun types the `rejects` matchers as `void` although they return a promise (`rejects: Matchers<unknown>` in `bun-types@1.4.4`, which cannot be overridden by augmentation). No rule, severity or threshold was changed. 36 sites in `scripts/` use the new `expectRejection` helper (`scripts/test-support.ts`, with its own tests: passes on rejection with or without a message, fails on fulfilment, fails on a message mismatch and shows expected and seen). 2 sites in `apps/web` use a plain `.then` outcome. A deliberate wrong message makes the rewritten test fail with the helper's message.

## Obsolete lint exemption removed (strengthening)

`.oxlintrc.json` carried an override turning off the five `typescript/no-unsafe-*` rules for test files, `scripts/tools.ts` and `scripts/configuration.ts`, with the comment that the linter's nearest `tsconfig.json` had no Bun types. That was this ticket's root cause. With the solution-style root the override is removed. Nine real findings appeared (untyped `JSON.parse` results in `scripts/tools.ts`, `scripts/configuration.test.ts`, `scripts/repository.test.ts`); they are fixed with typed reads (`unknown` plus the existing `isRecord` guard), not suppressed. The five rules are now enforced everywhere. `.dependency-cruiser.mts` (tracked, in no project) is now part of `scripts/tsconfig.json`, and the test covers `.mts`/`.cts`.

## Checks

`mise exec -- bun run check` green on the final tree (373 tests, 0 fail), including lint, `typecheck` (each project directly) and the coverage gates.

## Independent review disposition

No Critical or Important findings. Fixed: `.dependency-cruiser.mts` was an orphan (now in the scripts project; the orphan test also lists `.mts`/`.cts`, and a mutation removing it fails the test naming the file); empty `git ls-files` could pass vacuously (guards added); the stale lint-override comment (override removed, see above). Not changed: the `.d.ts` exclusion in the orphan test (`worker-configuration.d.ts` is covered by `apps/api`); untracked new files are seen only once tracked (fine in CI); the Linux path of `node_modules/.bin/tsc` is verified by the hosted run, not locally.

## Not verified

- The owner uses the Cursor IDE (a VS Code fork with its own bundled TypeScript server); Cursor was not run here, and the TypeScript version it uses was not reported. The harness uses the TypeScript 6 project service; the type-aware linter (a TypeScript 7 based engine) agrees on the project mapping by its own documented behaviour, and passes. The editor itself was not run.
- `.vscode/settings.json` sets `typescript.tsdk` to `node_modules/@typescript/typescript6/lib`, which contains `tsserverlibrary.js` but no `tsserver.js`. An editor that requires `tsserver.js` there would fall back to its bundled TypeScript; the project mapping fix does not depend on which version it is. Left unchanged.
