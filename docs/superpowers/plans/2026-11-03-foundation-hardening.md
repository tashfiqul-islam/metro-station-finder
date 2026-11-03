# Foundation Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox syntax for tracking.

**Goal:** Complete METRO-16 with reproducible, strict, consistently formatted configuration.

**Architecture:** Exact runtime pins shared by mise and package metadata, checked by an executable guard. Separate compiler projects enforce runtime boundaries; a pinned formatter checks configuration files. Existing product and development behavior stays intact.

**Tech Stack:** Bun 1.4.4, Node 26.13.0, TypeScript 7.0.2, TypeScript 6.0.2 API compatibility package, Oxfmt 0.75.0.

**Spec:** Plane Page f9fa08b6-2593-4e1c-acf3-048b3d620d9c, revision 2026-11-03-r1; mirrored in docs/specifications/foundation-hardening.md.

## Global Constraints

- METRO-16 only; no broad CI/hooks/lint rollout from METRO-12.
- Merge feature/metro-rebuild; preserve independent history and current default until v1.0.0 release readiness.
- Bun package manager; signed commits. No weak assertions or fallback paths.
- CFG-1 through CFG-6 and seams CFG-S1 through CFG-S4 are binding.
- Exact pins, dated official evidence, documented compatibility exceptions; no decorative dependencies.

## Review Focus

1. A valid but mismatched runtime pin must fail, including malformed/missing manifest fields.
2. Ambient types must not leak from Bun into browser, Worker or Node projects.
3. Formatter check must not write; malformed JSONC/TOML must fail.
4. Secret ignore rules must preserve safe examples at nested paths.
5. TS7 compiler migration must preserve the real compiler-API boundary check and Node development lifecycle.

## Task 1: Enforce the complete configuration contract

**Files:** Modify package.json, workspace package manifests, bun.lock, mise.toml, tsconfig.json, packages/core/tsconfig.json, scripts/tools.ts, scripts/boundaries.ts, .gitignore, docs/development.md, docs/agents/maintenance.md and directly affected TypeScript source. Create bunfig.toml, .editorconfig, .gitattributes, tsconfig.base.json, apps/web/tsconfig.json, apps/api/tsconfig.json, scripts/tsconfig.json, tsconfig.test.json, scripts/configuration.ts, scripts/configuration.test.ts, scripts/format.ts, docs/evidence/metro-16.md and spec mirror. Pin any newly used skill support files in docs/agents/skills.lock.json. Formatter configuration only if needed for explicit consistent style.

**Interfaces:** configuration.ts exports validateConfiguration(root: string): Promise<void>, throwing actionable errors; tools.ts invokes it and checks effective runtimes. format.ts CLI accepts --check or --write and covers tracked JSON/JSONC/TOML (including newly added configuration before commit). package scripts expose format, format:check, typecheck and check; mise tasks delegate to those scripts without duplicating commands.

- [x] Write and run failing CFG-S1 tests for malformed required configs, missing fields and package/mise version disagreement; preserve actual filesystem parsing.
- [x] Implement configuration guard, exact Bun/Node updates, Hono 4.13.16, TypeScript 7.0.2 and @typescript/typescript6 6.0.2 boundary API import. Retain other verified latest direct pins. Verify additional type dependencies against official sources before adding.
- [x] Add minimal supported bunfig install policy: exact=true, auto="disable", linker="isolated", saveTextLockfile=true. Bootstrap retains explicit frozen lockfile. Guard concrete runtime/install alignment.
- [x] Add real compiler tests with positive controls and rejected unsafe indexing, explicit undefined optional properties, missing returns, unused declarations and cross-runtime globals. Shared strict settings include strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noImplicitReturns, noFallthroughCasesInSwitch, noImplicitOverride, noUnusedLocals, noUnusedParameters, noPropertyAccessFromIndexSignature, verbatimModuleSyntax; check library types where compatible. Isolate web DOM, Worker, Node tools, Bun tests and runtime-free core. Avoid type assertions that merely suppress failures.
- [x] Add Oxfmt 0.75.0 and executable format checks. Real CLI tests prove malformed and unformatted JSON/JSONC/TOML rejection, check-mode byte preservation and write idempotence. Keep formatting scope configurations, not unrelated source cleanup.
- [x] Add structured mise tasks, package metadata and concise explanatory TOML/JSONC comments; strict JSON remains valid. Add editor line-ending/indent rules and targeted secret/generated ignores. Verify nested secret/example cases with git check-ignore.
- [x] Document policy, exact release links, compatibility exception, configuration ownership, commands and acceptance evidence. Mirror full settled spec and Plane operation IDs. Update reviewed skill pins only after reading bytes.
- [x] Run focused tests after each behavioral change, then frozen bootstrap, complete check, build, browser/HTTP smoke, preparation validator and negative tests. Use local mise data/browser directories. Expected all pass; record exact output, remaining limitations and base/head.
- [x] Self-review diff, commit with signing enabled, write implementation report. Controller handles independent task/final reviews and remote integration.
