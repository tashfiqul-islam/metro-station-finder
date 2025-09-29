#!/usr/bin/env bun

/**
 * Health check script for Metro Station Finder
 * Validates project health and configuration
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

console.log("🏥 Running health check...");

const checks = [
  {
    name: "TypeScript Configuration",
    check: () =>
      existsSync("tsconfig.json") && existsSync("tsconfig.scripts.json"),
    fix: "Ensure tsconfig.json and tsconfig.scripts.json exist",
  },
  {
    name: "Next.js Configuration",
    check: () => existsSync("next.config.ts"),
    fix: "Ensure next.config.ts exists",
  },
  {
    name: "Ultracite Configuration",
    check: () => existsSync("biome.jsonc"),
    fix: "Ensure biome.jsonc exists",
  },
  {
    name: "Environment Variables",
    check: () => existsSync(".env.local") || existsSync(".env.example"),
    fix: "Create .env.local or .env.example file",
  },
  {
    name: "TypeScript Compilation",
    check: () => {
      try {
        execSync("bun run type-check", { stdio: "pipe" });
        return true;
      } catch {
        return false;
      }
    },
    fix: "Fix TypeScript compilation errors",
  },
  // Note: Scripts TypeScript check skipped as we use .mjs files
  {
    name: "Linting",
    check: () => {
      try {
        execSync("npx ultracite@latest check", { stdio: "pipe" });
        return true;
      } catch {
        return false;
      }
    },
    fix: "Fix linting errors",
  },
];

let allPassed = true;

for (const { name, check, fix } of checks) {
  try {
    const passed = check();
    if (passed) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name} - ${fix}`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.message}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log("🎉 All health checks passed!");
  process.exit(0);
} else {
  console.log("⚠️  Some health checks failed. Please fix the issues above.");
  process.exit(1);
}
