# METRO-8 and METRO-9 implementation plan

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../../README.md).

Goal: two verified documentation PRs targeting feature/metro-rebuild.
Architecture: unchanged legacy Next.js app; proposed rebuild boundaries clearly separated.
Tech: Markdown and PowerShell checks; lockfile Next 14.0.4, React 18.2.0, TypeScript 5.3.3.
Spec: Plane project 1ab13b1b-d537-4524-8f18-45ee42262dc4, bootstrap e1defa37-c65c-430e-8a8b-5f8d0f7fffe3, operating guide 144aa09c-cd9a-4ce6-9161-a28826bb405b.

## Global Constraints
- Documentation/audit only; no product, dependency, workflow or permission changes.
- Baseline af903d7a2c1bf08165cfcf4a00ca0c0d73eedead. Label confirmed, inferred, unknown.
- Separate ticket branches; PR base feature/metro-rebuild. No merges, releases, default switch or master deletion.
- Scaffold commands pending; do not imply proposed gates are enforced.
- Preserve Ready/Done policy; integration merge alone is not merged-to-main Done. Flag native automation mismatch.
- No personal location or secret evidence.

## Task 1: METRO-8
- [ ] Create concise AGENTS.md and docs/agents/{workflow,architecture,api,ui,testing,security,observability,maintenance,quality-gates}.md.
- [ ] Scoped AGENTS only where existing directory behavior differs; otherwise record omission rationale.
- [ ] Parity/glossary pending via METRO-9 link until files exist; avoid broken links in independent PRs.
- [ ] docs/evidence/metro-8.md: exact API/UI/bug/dependency/release read sets, source revision, gaps.
- [ ] Verify links/anchors, routing, root scope, no product diff; commit and independent review.

## Task 2: METRO-9
- [ ] Inspect source, manifests, lock, config and accessible live UI.
- [ ] docs/product/feature-parity.md and docs/product/glossary.md with source permalinks.
- [ ] docs/evidence/metro-9.md: manual evidence, fare/distance edges, authority/staleness risks, deterministic fixture requirements.
- [ ] Verify source traces and synthetic fare/distance cases; label unrun provider paths.
- [ ] Verify links/claims; commit and independent review.

## Review Focus
Exact additive routing; no duplicate policy or invented commands. Geographic nearest differs from walking distance. Proposed architecture is not observed implementation. Doc checks apply; app build/CI changes excluded.
