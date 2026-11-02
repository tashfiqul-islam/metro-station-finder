# Security, permissions and location

Read on secrets, coordinates, permissions, external input or provider changes. Inspect affected call sites and config; [script loader](../../src/utils/loadGoogleMapScript.ts) illustrates browser provider access, not a security audit.

Use synthetic data in evidence. Do not record personal locations, addresses, credentials or secret-bearing request URLs. Public browser configuration is visible to clients; verify provider restrictions and handling against official docs for an authorized change, never claim secrecy from an environment-variable name. Contract/permission changes need explicit scope.

Specify validation and observable denial/provider-failure behavior; avoid silent catch-and-continue paths. Do not introduce logging of sensitive inputs while diagnosing. Security/dependency scans and enforcement remain pending METRO-12; no security clearance follows from this document.
