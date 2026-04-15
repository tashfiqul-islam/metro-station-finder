import { defineConfig } from "oxlint";

import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

// https://oxc.rs/docs/guide/usage/linter/config-file-reference
//
// `extends` applies Ultracite's curated Oxlint presets (core + React).
// We layer `ignorePatterns` for generated/build output that neither
// humans nor agents should ever format or lint.
export default defineConfig({
  extends: [core, react],
  ignorePatterns: [
    "**/routeTree.gen.ts",
    "**/.claude/**",
    "**/.tanstack/**",
    "**/.nitro/**",
    "**/.output/**",
    "**/dist/**",
    "**/coverage/**",
    "**/node_modules/**",
    "**/playwright-report/**",
    "**/test-results/**",
    "**/*.min.js",
    "**/*.min.css",
  ],
});
