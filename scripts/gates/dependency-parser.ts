import { registerHooks } from "node:module";

// dependency-cruiser requires the JavaScript compiler API; tsc remains TypeScript 7.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.includes("/dependency-cruiser/") &&
      (specifier === "typescript" || specifier === "typescript/package.json")
    ) {
      return nextResolve(specifier.replace("typescript", "@typescript/typescript6"), context);
    }
    return nextResolve(specifier, context);
  },
});
