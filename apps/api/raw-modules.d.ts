// Vite `?raw` imports (the ADR text in error-format.test.ts). Only the Worker test project includes this file.
declare module "*?raw" {
  const content: string;
  export default content;
}
