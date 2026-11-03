# Architecture

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

**Confirmed / Repo-verified:** baseline uses Next pages/components/services/utils, not an implemented layered workspace. Inspect [manifest](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/package.json), [TypeScript config](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/tsconfig.json) and relevant imports before changing structure.

**Confirmed / Repo-verified:** `packages/core` contains executable domain/application synthetic status code with no dependencies. `apps/web` and `apps/api` compose inward. Its standalone TypeScript check excludes runtime/framework globals; `scripts/boundaries.ts` rejects external and escaping imports plus dependency declarations. This is a narrow scaffold guard, not full graph enforcement.

**Required future boundary:** application owns ports when needed; adapters implement them; apps compose. Keep API clients on REST/OpenAPI contracts when implemented. Version station/fare data; database and native UI require demonstrated need and explicit scope. No speculative ports/adapters are created by this scaffold.

For package/import/provider changes, identify affected boundaries, installed lockfile versions and applicable ADRs. No ADR directory exists at source baseline; record material decisions before introducing them. Do not fabricate ADR links. Contract, permissions and gate-policy changes need explicit task scope. Full boundary/quality enforcement belongs to METRO-12. See [workspace decisions](../development.md).
