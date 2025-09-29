#!/usr/bin/env bun

/**
 * Pre-build script for Metro Station Finder
 * Runs before the build process
 */

import { execSync } from "node:child_process";

console.log("🔧 Running pre-build checks...");

try {
  // Run type checking
  console.log("🔍 Type checking...");
  execSync("bun run type-check", { stdio: "inherit" });

  // Run linting
  console.log("🧹 Linting...");
  execSync("bun run lint", { stdio: "inherit" });

  console.log("✅ Pre-build checks completed!");
} catch (error) {
  console.error("❌ Pre-build failed:", error.message);
  process.exit(1);
}
