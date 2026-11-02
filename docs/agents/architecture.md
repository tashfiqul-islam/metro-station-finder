# Architecture

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

**Confirmed / Repo-verified:** baseline uses Next pages/components/services/utils, not an implemented layered workspace. Inspect [manifest](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/package.json), [TypeScript config](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/tsconfig.json) and relevant imports before changing structure.

**Required rebuild boundary / not implemented:** pure domain has no React, Hono, Cloudflare or provider bindings. Application owns ports; adapters implement ports; apps compose. Dependencies point inward. Keep API clients on REST/OpenAPI contracts when implemented. Version station/fare data; database and native UI require demonstrated need and explicit scope. These constraints derive from bootstrap policy, not verified stack compatibility.

For package/import/provider changes, identify affected boundaries, installed lockfile versions and applicable ADRs. No ADR directory exists at source baseline; record material decisions before introducing them. Do not fabricate ADR links. Contract, permissions and gate-policy changes need explicit task scope. Scaffold/boundary enforcement belongs to METRO-11/12; documentation alone enforces nothing.
