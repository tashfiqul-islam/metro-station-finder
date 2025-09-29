#!/usr/bin/env bun
/**
 * Prepare script for Metro Station Finder
 * Runs before git hooks and CI/CD
 */

import { execSync } from "node:child_process";

console.log("🔧 Preparing Metro Station Finder...");

try {
  // Ensure all dependencies are installed
  console.log("📦 Installing dependencies...");
  execSync("bun install", { stdio: "inherit" });

  // Run type check
  console.log("🔍 Running type check...");
  execSync("bun run type-check", { stdio: "inherit" });

  // Run linting
  console.log("🧹 Running linting...");
  execSync("npx ultracite@latest check", { stdio: "inherit" });

  console.log("✅ Preparation complete!");
} catch (error) {
  console.error("❌ Preparation failed:", error.message);
  process.exit(1);
}
