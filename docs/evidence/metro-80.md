# METRO-80 evidence: Vitest guards left over from METRO-77

Base: `472a3a8` (feature/metro-rebuild). Bun 1.4.4, oxlint 1.90.0, vitest 5.1.0, @cloudflare/vitest-plugin 1.5.0, vite 8.3.5. Repo-verified unless stated.

## 1. Lint ban on Vitest imports in Bun-owned directories

- RED (before the override existed): the four new fixtures in `scripts/test-hygiene.test.ts` for `import ... from "vitest"` in `scripts/` and `packages/core/src/`, and `@vitest/browser` in `scripts/`, failed with `Expected to contain: "(no-restricted-imports)" Received: ""`.
- GREEN: a final `.oxlintrc.json` override for `scripts/**` and `packages/**` bans `vitest` and `@vitest/*`. Controls pass: a string that contains `import { test } from "vitest"` is not flagged, and `apps/api` and `apps/web` fixtures importing `vitest` lint clean (METRO-79 moves web onto Vitest).
- An override replaces, not merges, the earlier `no-restricted-imports` config, so the `bun:test` ban is repeated in it. The list to shrink is the override's `files` (commented `VITEST_IMPORT_BAN_DIRECTORIES`).

## 2. Plugin peer range

- `Bun.semver.satisfies` exists in Bun 1.4.4: `5.0.1` satisfies `^4.1.0 || ^5.0.0`; `6.0.0`, `4.0.9` and `5.1.0-beta.1` do not.
- The range is read from the plugin's `bun.lock` entry (`peerDependencies.vitest`, `^4.1.0 || ^5.0.0` for 1.5.0). The plugin is not read from `node_modules` so the check stays pure over the parsed lock.
- RED (implementation reverted): `vitest 6.0.0` pin gave no problem (`Expected to contain: "^4.1.0 || ^5.0.0" Received: ""`) and a lock entry without the peer gave `Received: ""`; 2 fail, 13 pass in `scripts/vitest-sync.test.ts`. GREEN: 15 pass.
- Moving `scripts/vitest-sync.ts` to use `Bun` needed it listed in `tsconfig.test.json` and excluded from `scripts/tsconfig.json`, the same arrangement as `configuration.ts` and the other Bun-using scripts.

## 3. vite/client instead of raw-modules.d.ts

Tried: `"types": ["@cloudflare/vitest-plugin/types", "vite/client"]` in `apps/api/tsconfig.worker-test.json` and the `.d.ts` removed. `tsc -b` output:

```
apps/api/worker-configuration.d.ts(19,17): error TS2300: Duplicate identifier 'src'.
node_modules/.bun/vite@8.3.5+6e33d93364884e11/node_modules/vite/client.d.ts(196,18): error TS2300: Duplicate identifier 'src'.
node_modules/.bun/vite@8.3.5+6e33d93364884e11/node_modules/vite/client.d.ts(232,40): error TS2304: Cannot find name 'SharedWorker'.
node_modules/.bun/vite@8.3.5+6e33d93364884e11/node_modules/vite/client.d.ts(239,40): error TS2304: Cannot find name 'SharedWorker'.
```

Outcome: reverted; `raw-modules.d.ts` stays with a comment naming the conflict.

## Not verified

Hosted CI result is reported on the PR. The peer check trusts `bun.lock` to carry the plugin's peer range (it does for 1.5.0; a missing range is itself an error).
