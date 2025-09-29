#!/usr/bin/env bun
/**
 * Cleanup script for Metro Station Finder
 * Cleans up temporary files and caches
 */

import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";

console.log("🧹 Cleaning up Metro Station Finder...");

const cleanupTargets = [
  ".next",
  "out",
  "dist",
  "dist-scripts",
  ".tsbuildinfo",
  "coverage",
  "playwright-report",
  "test-results",
  "node_modules/.cache",
  ".turbo",
];

let cleanedCount = 0;

for (const target of cleanupTargets) {
  if (existsSync(target)) {
    try {
      rmSync(target, { recursive: true, force: true });
      console.log(`🗑️  Removed: ${target}`);
      cleanedCount++;
    } catch (error) {
      console.warn(`⚠️  Failed to remove ${target}:`, error.message);
    }
  }
}

// Clear Bun cache
console.log("🧹 Clearing Bun cache...");
try {
  execSync("bun pm cache rm", { stdio: "pipe" });
  console.log("✅ Bun cache cleared");
} catch (error) {
  console.warn("⚠️  Failed to clear Bun cache:", error.message);
}

// Clear npm cache (if exists)
console.log("🧹 Clearing npm cache...");
try {
  execSync("npm cache clean --force", { stdio: "pipe" });
  console.log("✅ npm cache cleared");
} catch (_error) {
  console.warn("⚠️  npm cache clear failed (this is normal if not using npm)");
}

console.log(`✅ Cleanup complete! Removed ${cleanedCount} items.`);
console.log("💡 Run 'bun install' to reinstall dependencies if needed.");
