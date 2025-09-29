#!/usr/bin/env bun

/**
 * Post-install script for Metro Station Finder
 * Ensures project is properly set up after installation
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";

console.log("🚀 Setting up Metro Station Finder...");

// Ensure required directories exist
const requiredDirs = [
  "dist-scripts",
  "out",
  ".next",
  "coverage",
  "playwright-report",
  "test-results",
];

for (const dir of requiredDirs) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

// Install Playwright browsers if not already installed
try {
  console.log("🎭 Installing Playwright browsers...");
  execSync("bun run e2e:install", { stdio: "inherit" });
} catch (error) {
  console.warn("⚠️  Playwright browser installation failed:", error.message);
}

// Generate TypeScript build info
try {
  console.log("🔧 Generating TypeScript build info...");
  execSync("bun run type-check", { stdio: "pipe" });
} catch (error) {
  console.warn("⚠️  TypeScript type check failed:", error.message);
}

console.log("✅ Post-install setup complete!");
