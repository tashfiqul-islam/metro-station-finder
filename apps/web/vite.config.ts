import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // The owner keeps the Maps key in the repository root `.env` (git-ignored). Only `VITE_`-prefixed
  // names reach the client bundle, so the other secrets in that file stay out of it.
  envDir: "../..",
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    cloudflare({ configPath: "../api/wrangler.jsonc" }),
  ],
  // The first-visit bundle budget reads dist/client/.vite/manifest.json (METRO-104, ADR-0020).
  build: { manifest: true },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
