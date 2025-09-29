#!/usr/bin/env bun

/**
 * 🔍 Metro Station Finder - Configuration Validation Script
 *
 * Validates all project configuration files and ensures they're properly set up
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONFIG_FILES = [
  "package.json",
  "tsconfig.json",
  "tsconfig.scripts.json",
  "biome.jsonc",
  "next.config.ts",
  "vitest.config.ts",
  "commitlint.config.mjs",
  ".releaserc.json",
  "lefthook.yml",
  "components.json",
];

const REQUIRED_SCRIPTS = [
  "dev",
  "build",
  "test",
  "lint",
  "type-check",
  "semantic-release",
];

/**
 * Validate a configuration file exists and is readable
 */
function validateConfigFile(filePath) {
  const fullPath = join(process.cwd(), filePath);

  if (!existsSync(fullPath)) {
    console.error(`❌ Configuration file missing: ${filePath}`);
    return false;
  }

  try {
    const content = readFileSync(fullPath, "utf8");
    if (content.trim().length === 0) {
      console.error(`❌ Configuration file is empty: ${filePath}`);
      return false;
    }
    console.log(`✅ Configuration file valid: ${filePath}`);
    return true;
  } catch (error) {
    console.error(
      `❌ Error reading configuration file ${filePath}:`,
      error.message
    );
    return false;
  }
}

/**
 * Validate package.json scripts
 */
function validatePackageScripts() {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

    if (!packageJson.scripts) {
      console.error("❌ No scripts section found in package.json");
      return false;
    }

    const missingScripts = REQUIRED_SCRIPTS.filter(
      (script) => !packageJson.scripts[script]
    );

    if (missingScripts.length > 0) {
      console.error(
        `❌ Missing required scripts: ${missingScripts.join(", ")}`
      );
      return false;
    }

    console.log("✅ All required scripts present in package.json");
    return true;
  } catch (error) {
    console.error("❌ Error validating package.json scripts:", error.message);
    return false;
  }
}

/**
 * Main validation function
 */
function main() {
  console.log("🔍 Metro Station Finder - Configuration Validation");
  console.log("==================================================");
  console.log("");

  let allValid = true;

  // Validate configuration files
  console.log("📋 Validating configuration files...");
  for (const configFile of CONFIG_FILES) {
    if (!validateConfigFile(configFile)) {
      allValid = false;
    }
  }

  console.log("");

  // Validate package.json scripts
  console.log("📦 Validating package.json scripts...");
  if (!validatePackageScripts()) {
    allValid = false;
  }

  console.log("");

  if (allValid) {
    console.log("🎉 All configurations are valid!");
    process.exit(0);
  } else {
    console.log(
      "❌ Some configurations are invalid. Please fix the issues above."
    );
    process.exit(1);
  }
}

// Run validation
main();
