export default {
  forbidden: [
    { name: "no-cycles", severity: "error", from: {}, to: { circular: true } },
    { name: "no-unresolved", severity: "error", from: {}, to: { couldNotResolve: true } },
  ],
  options: {
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "node", "default", "types"],
    },
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(dist|node_modules)/" },
  },
};
