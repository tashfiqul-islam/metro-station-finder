import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// https://vite.dev/config
// https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering
export default defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
    cssMinify: "lightningcss",
    reportCompressedSize: false,
    rolldownOptions: {
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
    sourcemap: true,
    target: "es2024",
  },

  optimizeDeps: {
    // Pre-bundle these for faster dev cold-start
    include: ["react", "react-dom", "react-dom/client"],
  },

  plugins: [
    // TanStack devtools overlay (dev only, auto-disabled in prod)
    devtools(),

    // Tailwind v4 Oxide engine
    tailwindcss(),

    // Nitro server runtime (used by TanStack Start for SSR/prerender)
    nitro(),

    // TanStack Start
    //
    // - Prerender defaults to off; we enable it for full SSG. The crawler
    //   walks `<a>` tags starting from `/` to discover routes, so every
    //   public page is emitted as static HTML at build time.
    // - `autoSubfolderIndex: true` emits `/<route>/index.html` so static
    //   hosts serve clean URLs without trailing-slash redirects.
    // - `autoStaticPathsDiscovery: true` lets route `staticPaths` loaders
    //   contribute to the prerender queue automatically.
    //
    // NOTE: vite-plugin-pwa wiring is deferred to the PWA implementation
    // phase; once in, it will sit after tanstackStart() to register the
    // service worker against the prerendered assets.
    tanstackStart({
      prerender: {
        autoStaticPathsDiscovery: true,
        autoSubfolderIndex: true,
        concurrency: 14,
        crawlLinks: true,
        enabled: true,
        retryCount: 2,
        retryDelay: 1000,
      },
    }),

    // React must come AFTER tanstackStart() per TanStack docs
    viteReact(),
  ],

  // Path alias — kept in sync with tsconfig.json `paths`.
  // Plain alias is stable across Vite / Vitest / Rolldown / IDE TS servers.
  // Vite 8's `resolve.tsconfigPaths` is experimental and has flaky IDE types.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },

  server: {
    port: 3000,
    strictPort: true,
  },
});
