# METRO-11 workspace implementation plan

**Goal:** Reproducible minimal web/Workers foundation from independent rebuild history.
**Architecture:** React/Vite web and Hono Worker compose one dependency-free shared domain/application package. No product features added.
**Tech stack:** Bun, mise, TypeScript, React, Vite, Hono, Wrangler. Exact compatible versions must be verified against official documentation and registry metadata before pinning.
**Spec:** Plane METRO-11 (`f0d18c25-97d0-4b32-b338-de5e210073df`), bootstrap page `e1defa37-c65c-430e-8a8b-5f8d0f7fffe3`; owner scope correction 2026-11-03 takes precedence over older main-switch wording.

## Global constraints

- Base `92739bd32ba948106d600a4f73fcf6deb0036a8b`; ticket branch `codex/metro-11-workspace`; PR base `feature/metro-rebuild`.
- Preserve independent rebuild history. Never import master code or ancestry. Keep repository default unchanged until fully ready to release v1.0.0.
- One Bun lockfile, exact dependency and mise runtime pins. Fresh checkout bootstrap, dev, check, build must work.
- Pure shared domain/application code must run without React, Hono, Cloudflare or provider dependencies. Apps compose inward. Add packages only with executable code.
- No database, Docker, native scaffold, product behavior, speculative adapter/port packages, deployment or release automation. Broader CI/gates belong to METRO-12; preview/release to METRO-13/14.
- Fail visibly; do not weaken tests or add silent fallback paths. PowerShell and Bun; no npm install. Signed commits only.
- Record compatibility sources, exact versions, tests, revisions, unknowns. Existing preparation checks must remain valid.

## Review focus

1. Frozen install actually reproducible: test clean exported checkout with pinned tools.
2. Browser and Worker actually execute: HTTP/runtime smoke as well as builds.
3. Shared layer remains pure: positive smoke and negative import-boundary fixture.
4. Release instructions cannot trigger premature default switch: inspect all changed migration wording; read remote default and ancestry.
5. Runtime/dependency compatibility proven: lock resolution, official docs and local execution; record unsupported checks honestly.

## Task 1: Minimal executable workspace

**Files:** root `package.json`, `bun.lock`, `mise.toml`, `tsconfig.json`, `.gitignore`; `apps/web/` manifest/index/source/Vite config; `apps/api/` manifest/source/Wrangler config; `packages/core/` manifest/domain/application/tests; `scripts/` bootstrap/check/smoke/boundary scripts as needed; `docs/development.md`, `docs/evidence/metro-11.md`; update README and relevant agent documentation including reviewed skill support pins.
**Interfaces:** consumes settled scope and base instructions; produces root bootstrap/dev/check/build commands, minimal shared smoke result consumed by web and Worker, frozen dependency graph, documented version evidence.

- [ ] Inspect relevant skills and package evidence; use Context7 official docs and official web/registry evidence for version selection. Record exact pins and rationale.
- [ ] Add failing shared behavior and boundary checks before implementation. Confirm failures are meaningful, not merely missing tools.
- [ ] Implement smallest real scaffold. Use a clearly synthetic scaffold status result, not station/fare functionality.
- [ ] Run focused tests, frozen install in fresh exported checkout, typecheck, builds, browser and Worker runtime smoke, negative boundary case and existing preparation checks.
- [ ] Update stale docs-only statements and main-switch wording. Document release-time CI/deploy/PR/protection changes and rollback; default stays unchanged.
- [ ] Self-review and signed commit. Record commands/results and unresolved limitations.

## Integration (controller)

- [ ] Independent task review, then whole-branch review; resolve blocking findings.
- [ ] Verify remote default, independent ancestry and protection/check state. Prepare main from reviewed independent lineage without making it default.
- [ ] Push ticket branch; PR to feature/metro-rebuild; In Review with evidence.
- [ ] Merge when required checks/review pass. Verify merge, delete ticket branch, mark Done. Do not release or switch default.

## Plan review

Single cohesive scaffold task avoids splitting lockfiles and shared interfaces between writers. Version research is explicitly part of execution. User authorized implementation and integration; no further plan confirmation needed. Acceptance criteria map to the review focus and integration checklist above.
