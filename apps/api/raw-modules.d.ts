// Vite `?raw` imports (the ADR text in error-format.test.ts), declared by hand on purpose: adding "vite/client"
// to tsconfig.worker-test.json fails `tsc -b` (vite 8.3.5; METRO-80, real output in docs/evidence/metro-80.md).
// Both vite/client.d.ts and the generated worker-configuration.d.ts declare module "*.txt" with an
// `export default` (TS2300 at both), and vite's `?sharedworker` types need SharedWorker (TS2304), which the
// Worker lib lacks. Retry the swap when vite/client stops declaring those.
declare module "*?raw" {
  const content: string;
  export default content;
}
