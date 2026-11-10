import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { build, defineConfig } from "vite";

import { serviceWorkerPlugin, type WorkerConfig } from "../../scripts/sw-plugin.ts";

/**
 * Bundles the offline shell worker (METRO-106, ADR-0023) as one classic script with the build's config
 * baked in. A separate small build, so the worker is not a chunk of the app, is not hashed and is not in
 * the manifest; the plugin writes it to `sw.js` once the client output exists.
 */
async function bundleWorker(config: WorkerConfig): Promise<string> {
  const result = await build({
    configFile: false,
    root: import.meta.dirname,
    logLevel: "silent",
    publicDir: false,
    define: { SW_CONFIG: JSON.stringify(config) },
    build: {
      write: false,
      minify: true,
      target: "es2022",
      lib: { entry: "src/sw/sw.ts", formats: ["iife"], name: "metroShellWorker" },
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((item) =>
    "output" in item ? item.output : [],
  );
  const chunk = outputs.find((output) => output.type === "chunk");
  if (chunk === undefined) throw new Error("The offline shell worker produced no script");
  return chunk.code;
}

export default defineConfig({
  // The owner keeps the Maps key in the repository root `.env` (git-ignored). Only `VITE_`-prefixed
  // names reach the client bundle, so the other secrets in that file stay out of it.
  envDir: "../..",
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    cloudflare({ configPath: "../api/wrangler.jsonc" }),
    // METRO_SW_KILL=1 builds the worker that removes itself and its caches (the kill switch, ADR-0023).
    serviceWorkerPlugin({ bundle: bundleWorker, kill: process.env["METRO_SW_KILL"] === "1" }),
  ],
  // The first-visit bundle budget reads dist/client/.vite/manifest.json (METRO-104, ADR-0020).
  build: { manifest: true },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  // METRO-130: SMOKE_PORT (set by scripts/smoke.ts) picks the preview port; strictPort makes a clash fail loudly.
  preview: { host: "127.0.0.1", port: Number(process.env["SMOKE_PORT"] ?? 4173), strictPort: true },
});
