// Test options every Vitest config must spread (scripts/configuration.ts enforces it). A project does not
// inherit the root `test` options, so ordering lives here: with `shuffle` only in the root config, tests
// inside a project's files kept their source order (measured in workerd, METRO-77).
//
// Random order exposes shared-state coupling. Vitest picks a new seed per run and prints it
// (`Running tests with seed "N"`); reproduce with `--sequence.seed=N`. Never set `seed` here:
// a fixed seed is a fixed order.
export const sharedTestOptions = {
  sequence: { shuffle: true },
} as const;
