// Note (METRO-102): scripts/ is not a layer here. The one script-to-app import, scripts/smoke-live.ts reading
// apps/web/src/features/nearest-station/copy.ts (no imports of its own), is pinned by an allowlist test in
// scripts/script-imports.test.ts so the hint text lives once. No rule below was changed for it.
export default {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    {
      name: "no-unresolved",
      comment:
        "cloudflare:workers and cloudflare:test are runtime modules that only workerd provides (types come from the Worker test project).",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, pathNot: "^cloudflare:(workers|test)$" },
    },
    {
      name: "core-imports-only-core",
      comment: "Core is dependency-free: it may import only other core modules.",
      severity: "error",
      from: { path: "^packages/core/" },
      to: { pathNot: "^packages/core/", dependencyTypesNot: ["core"] },
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
      name: "web-imports-core-public-entry-only",
      comment: "The browser app may run core, but only through its public entry.",
      severity: "error",
      from: { path: "^apps/web/" },
      to: { path: "^packages/core/", pathNot: "^packages/core/src/index\\.ts$" },
    },
    {
      name: "maps-library-only-in-maps-adapter",
      comment:
        "Google Maps libraries (@vis.gl/react-google-maps and @googlemaps/*) are imported only by apps/web/src/adapters/maps, the one place that touches Google; everything else gets a fake in tests.",
      severity: "error",
      from: { pathNot: "^apps/web/src/adapters/maps/" },
      to: { path: "(^|/)node_modules/(@vis\\.gl/react-google-maps|@googlemaps)/" },
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
