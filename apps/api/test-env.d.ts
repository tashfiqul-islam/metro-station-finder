// Test-only stand-in for the generated `Env` (worker-configuration.d.ts). The generated file declares
// `*.txt` style modules that conflict with Bun's own, so the Bun-typed test project cannot include it.
// It mirrors the one binding (the static assets fetcher); the real file is checked by `types:check`.
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}
