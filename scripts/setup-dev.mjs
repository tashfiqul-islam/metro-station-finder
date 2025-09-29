#!/usr/bin/env bun
/**
 * Development setup script for Metro Station Finder
 * Sets up the complete development environment
 */

import { execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

console.log("🚀 Setting up Metro Station Finder development environment...");

// Check if .env.local exists, if not create from .env.example
if (!existsSync(".env.local") && existsSync(".env.example")) {
  console.log("📝 Creating .env.local from .env.example...");
  execSync("cp .env.example .env.local");
} else if (!existsSync(".env.local")) {
  console.log("📝 Creating .env.local template...");
  writeFileSync(
    ".env.local",
    `# Metro Station Finder Environment Variables
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=Metro Station Finder
NEXT_PUBLIC_APP_VERSION=1.0.0
`
  );
}

// Install dependencies
console.log("📦 Installing dependencies...");
execSync("bun install", { stdio: "inherit" });

// Install Playwright browsers
console.log("🎭 Installing Playwright browsers...");
try {
  execSync("bun run e2e:install", { stdio: "inherit" });
} catch (error) {
  console.warn("⚠️  Playwright installation failed:", error.message);
}

// Run health check
console.log("🏥 Running health check...");
try {
  execSync("bun run health", { stdio: "inherit" });
} catch (error) {
  console.warn("⚠️  Health check failed:", error.message);
}

// Run validation
console.log("🔍 Running project validation...");
try {
  execSync("bun run validate", { stdio: "inherit" });
} catch (error) {
  console.warn("⚠️  Project validation failed:", error.message);
}

console.log("✅ Development environment setup complete!");
console.log("🎯 Next steps:");
console.log("  1. Add your Google Maps API key to .env.local");
console.log("  2. Run 'bun run dev' to start development server");
console.log("  3. Run 'bun run test' to run tests");
console.log("  4. Run 'bun run e2e' to run E2E tests");
