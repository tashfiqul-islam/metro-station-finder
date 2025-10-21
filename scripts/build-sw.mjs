#!/usr/bin/env bun

/**
 * Build script for TypeScript Service Worker
 * Compiles sw.ts to sw.js for production deployment
 * Supports both development and production builds
 */

import { writeFileSync } from "node:fs";
import { build } from "esbuild";

const SW_SOURCE = "public/sw.ts";
const SW_OUTPUT = "public/sw.js";

// Check if we're in development mode
const isDev = process.argv.includes("--dev") || process.env.NODE_ENV === "development";

async function buildServiceWorker() {
  try {
    console.log(
      `🔨 Building TypeScript Service Worker (${isDev ? "development" : "production"})...`
    );

    const result = await build({
      entryPoints: [SW_SOURCE],
      outfile: SW_OUTPUT,
      format: "esm",
      target: "es2022",
      minify: !isDev, // Don't minify in development
      sourcemap: isDev, // Include sourcemaps in development
      bundle: true,
      write: false,
      define: {
        "process.env.NODE_ENV": `"${isDev ? "development" : "production"}"`,
      },
      // Service worker specific settings
      globalName: "self",
      platform: "neutral",
      mainFields: ["browser", "module", "main"],
    });

    if (result.outputFiles && result.outputFiles.length > 0) {
      const output = result.outputFiles[0].text;
      writeFileSync(SW_OUTPUT, output);
      console.log(`✅ Service Worker built successfully: ${SW_OUTPUT}`);

      // Add a comment header to the built file
      const header = `/*
 * Service Worker for Metro Station Finder
 * Built from TypeScript source: ${SW_SOURCE}
 * Generated: ${new Date().toISOString()}
 * Mode: ${isDev ? "development" : "production"}
 * 
 * This file is auto-generated. Do not edit directly.
 * Edit ${SW_SOURCE} instead.
 */

`;

      const finalOutput = header + output;
      writeFileSync(SW_OUTPUT, finalOutput);

      const BytesPerKb = 1024;
      console.log(`📦 Output size: ${(output.length / BytesPerKb).toFixed(2)} KB`);

      if (isDev) {
        console.log("💡 Development mode: Service worker will be served from TypeScript source");
        console.log("💡 Set NEXT_PUBLIC_ENABLE_SW=true to enable service worker in development");
      }
    } else {
      throw new Error("No output files generated");
    }
  } catch (error) {
    console.error("❌ Failed to build Service Worker:", error);
    process.exit(1);
  }
}

// Run the build
buildServiceWorker();
