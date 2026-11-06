// Vite `?raw` imports (the ADR text in error-format.test.ts), declared by hand on purpose: adding "vite/client"
// to tsconfig.worker-test.json fails `tsc -b` (vite 8.3.5 with the generated Worker types; METRO-80, see
// docs/evidence/metro-80.md): duplicate identifier `src` against worker-configuration.d.ts, and `SharedWorker`
// is not defined in the Worker lib. Retry the swap when vite/client stops declaring DOM-only names.
declare module "*?raw" {
  const content: string;
  export default content;
}
