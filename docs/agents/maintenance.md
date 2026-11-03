# Maintenance and releases

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

Read [architecture](architecture.md) for dependency/import/provider changes and [security](security.md) for scans, permissions or secrets. Inspect manifest, lockfile, tool configs and affected workflow before advice. Use effective installed resolution, then version-specific official docs. Bun/mise pins and replacement commands are in [development](../development.md). Do not run package installation for documentation verification.

**Confirmed / Repo-verified:** historical [manifest](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/package.json) defines dev/build/start/lint/format/pretty-lint/ts-node; historical [workflow](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/.github/workflows/nextjs.yml) selects npm or yarn and deploys Pages. Those files are absent from the rebuild. Root bootstrap/dev/check/build replace local scaffold commands; there is no rebuild CI/deploy workflow yet. Avoid legacy `pretty-lint` as a read-only check: it writes fixes/formatting.

Deploy/rollback changes require exact checked revision, environment, smoke results and rollback evidence. Cloudflare preview is pending METRO-13; production switch is separate authorization. Never imply existing Pages deployment proves proposed preview behavior.

Release authority is GitHub tag/release plus SHA. Plane mirrors exact version/tag, release URL, SHA and notes, with ticket IDs/PRs. Done and release assignment do not establish shipping. Release reconciliation, deduplication, retry/out-of-order handling and deployment-failure behavior remain METRO-14 implementation; native PR automation does not supply them. Follow [workflow integration exception](workflow.md#integration-exception) before any merge/status claim.
