#!/usr/bin/env bun

/**
 * Development Tools Script
 * Essential utilities for amazing dev experience
 */

import { execSync } from "node:child_process";

const commands = {
  // Quick development commands
  "dev:full": () => {
    console.log("🚀 Starting full development environment...");
    execSync("bun run dev", { stdio: "inherit" });
  },

  "dev:clean": () => {
    console.log("🧹 Cleaning and starting fresh...");
    execSync("bun run clean && bun run dev", { stdio: "inherit" });
  },

  // Code quality commands
  "quality:check": () => {
    console.log("🔍 Running full quality checks...");
    execSync("bun run type-check && bun run lint && bun run test:run", {
      stdio: "inherit",
    });
  },

  "quality:fix": () => {
    console.log("🔧 Fixing all fixable issues...");
    execSync("bun run lint:fix && bun run format", { stdio: "inherit" });
  },

  // Performance analysis
  "perf:quick": () => {
    console.log("⚡ Quick performance check...");
    execSync("bun run build && bun run analyze:size", { stdio: "inherit" });
  },

  // Project health
  "health:quick": () => {
    console.log("🏥 Quick health check...");
    execSync("bun run health", { stdio: "inherit" });
  },

  // Git workflow
  "git:ready": () => {
    console.log("✅ Preparing for commit...");
    execSync("bun run quality:fix && bun run test:run", { stdio: "inherit" });
  },

  // Emergency reset
  "emergency:reset": () => {
    console.log("🚨 Emergency reset - cleaning everything...");
    execSync("bun run clean:all && bun install && bun run setup:dev", {
      stdio: "inherit",
    });
  },
};

const command = process.argv[2];

if (!(command && commands[command])) {
  console.log("🛠️  Available development tools:");
  console.log("");
  for (const cmd of Object.keys(commands)) {
    console.log(`  bun run dev-tools ${cmd}`);
  }
  console.log("");
  process.exit(0);
}

try {
  commands[command]();
} catch (error) {
  console.error(`❌ Command failed: ${error.message}`);
  process.exit(1);
}
