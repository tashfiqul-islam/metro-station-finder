# Security, permissions and location

Historical baseline: legacy implementation references and checks below concern commit `af903d7a2c1bf08165cfcf4a00ca0c0d73eedead`, not files or executable gates in this independent rebuild. See [rebuild boundary](../../README.md).

Read on secrets, coordinates, permissions, external input or provider changes. Inspect affected call sites and config; [script loader](https://github.com/tashfiqul-islam/metro-station-finder/blob/af903d7a2c1bf08165cfcf4a00ca0c0d73eedead/src/utils/loadGoogleMapScript.ts) illustrates browser provider access, not a security audit.

Use synthetic data in evidence. Do not record personal locations, addresses, credentials or secret-bearing request URLs. Public browser configuration is visible to clients; verify provider restrictions and handling against official docs for an authorized change, never claim secrecy from an environment-variable name. Contract/permission changes need explicit scope.

Specify validation and observable denial/provider-failure behavior; avoid silent catch-and-continue paths. Do not introduce logging of sensitive inputs while diagnosing. `bun run scan` audits dependencies (`bun audit`) and scans tracked files for secrets with the pinned Gitleaks, locally and in the CI `security` job. The scan refuses tracked symlinks and submodules except a symlink whose target is a plain relative name of another tracked regular file (read from the git object, never followed outside the repository), such as `CLAUDE.md` pointing at `AGENTS.md`; the target is scanned as itself (see [quality gates](quality-gates.md)). A passing scan is not a security clearance: it does not cover application logic, permissions or runtime configuration.
