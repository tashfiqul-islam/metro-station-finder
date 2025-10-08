#!/usr/bin/env bun

/**
 * Automatically update packageManager field in package.json
 * to match the current Bun version
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const PACKAGE_JSON_PATH = "./package.json";

try {
  // Get current Bun version
  const bunVersion = execSync("bun --version", { encoding: "utf8" }).trim();
  console.log(`📦 Current Bun version: ${bunVersion}`);

  // Read package.json
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8"));

  // Update packageManager field
  const newPackageManager = `bun@${bunVersion}`;
  const oldPackageManager = packageJson.packageManager;

  if (oldPackageManager === newPackageManager) {
    console.log("✅ packageManager is already up to date");
    process.exit(0);
  }

  packageJson.packageManager = newPackageManager;

  // Write updated package.json
  writeFileSync(PACKAGE_JSON_PATH, `${JSON.stringify(packageJson, null, 2)}\n`);

  console.log(
    `✅ Updated packageManager: ${oldPackageManager} → ${newPackageManager}`
  );
} catch (error) {
  console.error("❌ Error updating packageManager:", error.message);
  process.exit(1);
}
