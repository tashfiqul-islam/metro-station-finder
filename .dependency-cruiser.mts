export default {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    {
      name: "no-unresolved",
      comment:
        "cloudflare:* specifiers are runtime modules that only workerd provides (types come from the Worker test project).",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, pathNot: "^cloudflare:" },
    },
    {
      name: "core-imports-only-core",
      comment: "Core is dependency-free: it may import only other core modules.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { pathNot: "^packages/core/", dependencyTypesNot: ["core"] },
    },
    {
      name: "core-domain-imports-only-domain",
      comment:
        "Station, Coordinate, Fare and distance types live in core's domain layer, which imports only itself (not core application or data). Like the core rule, Node built-ins are allowed.",
      severity: "error",
      from: { path: "^packages/core/src/domain/" },
      to: { pathNot: "^packages/core/src/domain/", dependencyTypesNot: ["core"] },
    },
    {
      name: "contracts-imports-only-core-and-schema-library",
      comment: "Contracts may import core and the Standard Schema library (valibot) only.",
      severity: "error",
      from: { path: "^packages/contracts/" },
      to: {
        pathNot: "^packages/(contracts|core)/|(^|/)node_modules/valibot/",
        dependencyTypesNot: ["core"],
      },
    },
    {
      name: "web-never-imports-core-runtime",
      comment:
        "The browser app gets every runtime value through contracts (ADR-0003); importing a type from core is fine.",
      severity: "error",
      from: { path: "^apps/web/" },
      to: { path: "^packages/core/", dependencyTypesNot: ["type-only"] },
    },
    {
      name: "contracts-public-entry-only",
      comment:
        "Outside the package, contracts is reached only through its public entry (src/index.ts, the package exports map).",
      severity: "error",
      from: { pathNot: "^packages/contracts/" },
      to: { path: "^packages/contracts/", pathNot: "^packages/contracts/src/index\\.ts$" },
    },
    {
      name: "apps-never-import-each-other",
      comment: "Web and API communicate over HTTP and the shared contract, never by import.",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: { path: "^apps/", pathNot: "^apps/$1/" },
    },
  ],
  options: {
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "node", "default", "types"],
    },
    // Without this the cruiser drops imports TypeScript erases (`import type`), so type-only edges
    // would bypass every rule. It also makes `type-only` a dependency type rules can match.
    tsPreCompilationDeps: true,
    doNotFollow: { path: "node_modules" },
    // node_modules stays in the graph (not followed) so layering rules can see third-party imports.
    exclude: { path: "(^|/)dist/" },
  },
};
