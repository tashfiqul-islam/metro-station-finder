export default {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    { name: "no-unresolved", severity: "error", from: {}, to: { couldNotResolve: true } },
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
    doNotFollow: { path: "node_modules" },
    // node_modules stays in the graph (not followed) so layering rules can see third-party imports.
    exclude: { path: "(^|/)dist/" },
  },
};
