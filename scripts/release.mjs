#!/usr/bin/env bun

/**
 * 🚀 Metro Station Finder - Release Script
 *
 * Comprehensive release management with semantic-release integration
 * Supports manual releases, dry runs, and CI/CD automation
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RELEASE_TYPES = ["patch", "minor", "major", "prerelease"];
const DRY_RUN = process.argv.includes("--dry-run");
const DEBUG = process.argv.includes("--debug");
const CI = process.argv.includes("--ci");

// Parse command line arguments
const releaseType = process.argv[2] || "auto";
const isManualRelease = RELEASE_TYPES.includes(releaseType);

/**
 * Execute command with proper error handling
 */
function execCommand(command, options = {}) {
  try {
    console.log(`🔧 Executing: ${command}`);
    const result = execSync(command, {
      stdio: "inherit",
      encoding: "utf8",
      ...options,
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Check if we're in a clean git state
 */
function checkGitStatus() {
  try {
    const status = execSync("git status --porcelain", { encoding: "utf8" });
    if (status.trim()) {
      console.error("❌ Working directory is not clean. Please commit or stash changes first.");
      console.log("Uncommitted changes:");
      console.log(status);
      process.exit(1);
    }
    console.log("✅ Working directory is clean");
  } catch (error) {
    console.error("❌ Failed to check git status:", error.message);
    process.exit(1);
  }
}

/**
 * Validate project configuration
 */
function validateProject() {
  console.log("🔍 Validating project configuration...");

  // Check if semantic-release is installed
  try {
    execSync("npx semantic-release --version", { stdio: "pipe" });
    console.log("✅ semantic-release is available");
  } catch (_error) {
    console.error("❌ semantic-release not found. Please install it first.");
    process.exit(1);
  }

  // Check if commitlint is configured
  try {
    execSync("npx commitlint --version", { stdio: "pipe" });
    console.log("✅ commitlint is available");
  } catch (_error) {
    console.error("❌ commitlint not found. Please install it first.");
    process.exit(1);
  }

  // Validate TypeScript
  console.log("🔍 Running TypeScript type check...");
  execCommand("bun run type-check");

  // Run linting
  console.log("🔍 Running linting...");
  execCommand("bun run lint");

  // Run tests
  console.log("🔍 Running tests...");
  execCommand("bun run test:run");

  console.log("✅ Project validation completed");
}

/**
 * Build the project
 */
function buildProject() {
  console.log("🏗️ Building project...");
  execCommand("bun run build");
  console.log("✅ Build completed");
}

/**
 * Run semantic-release
 */
function runSemanticRelease() {
  console.log("🚀 Running semantic-release...");

  const command = ["npx semantic-release", DRY_RUN && "--dry-run", DEBUG && "--debug", CI && "--ci"]
    .filter(Boolean)
    .join(" ");

  execCommand(command);
  console.log("✅ Semantic release completed");
}

/**
 * Manual release with specific version
 */
function runManualRelease() {
  console.log(`🚀 Running manual ${releaseType} release...`);

  // Update package.json version
  const packageJsonPath = join(process.cwd(), "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

  const [major, minor, patch] = packageJson.version.split(".").map(Number);
  let newVersion;

  switch (releaseType) {
    case "major":
      newVersion = `${major + 1}.0.0`;
      break;
    case "minor":
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case "patch":
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    case "prerelease":
      newVersion = `${major}.${minor}.${patch}-beta.1`;
      break;
    default:
      console.error(`❌ Invalid release type: ${releaseType}`);
      process.exit(1);
  }

  console.log(`📦 Updating version from ${packageJson.version} to ${newVersion}`);
  packageJson.version = newVersion;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  // Commit version bump
  execCommand("git add package.json");
  execCommand(`git commit -m "chore(release): ${newVersion} [skip ci]"`);

  // Create git tag
  execCommand(`git tag v${newVersion}`);

  console.log(`✅ Manual release ${newVersion} completed`);
}

/**
 * Main release function
 */
function main() {
  console.log("🚀 Metro Station Finder - Release Process");
  console.log("==========================================");

  if (isManualRelease) {
    console.log(`📋 Manual ${releaseType} release requested`);
  } else {
    console.log("📋 Automatic semantic release");
  }

  if (DRY_RUN) {
    console.log("🧪 Dry run mode - no changes will be made");
  }

  if (DEBUG) {
    console.log("🐛 Debug mode enabled");
  }

  if (CI) {
    console.log("🤖 CI mode enabled");
  }

  console.log("");

  // Pre-release checks
  if (!CI) {
    checkGitStatus();
  }

  validateProject();
  buildProject();

  // Run release
  if (isManualRelease) {
    runManualRelease();
  } else {
    runSemanticRelease();
  }

  console.log("");
  console.log("🎉 Release process completed successfully!");
  console.log("📋 Check the releases page for details");
}

// Handle command line arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`
🚀 Metro Station Finder - Release Script

Usage:
  bun run release [type] [options]

Release Types:
  auto        Automatic semantic release (default)
  patch       Manual patch release (1.0.0 -> 1.0.1)
  minor       Manual minor release (1.0.0 -> 1.1.0)
  major       Manual major release (1.0.0 -> 2.0.0)
  prerelease  Manual prerelease (1.0.0 -> 1.0.0-beta.1)

Options:
  --dry-run   Show what would be released without making changes
  --debug     Enable debug output
  --ci        Run in CI mode (skip git checks)
  --help      Show this help message

Examples:
  bun run release                    # Automatic semantic release
  bun run release patch              # Manual patch release
  bun run release --dry-run          # Dry run semantic release
  bun run release minor --debug      # Manual minor release with debug
  `);
  process.exit(0);
}

// Run the release process
main();
