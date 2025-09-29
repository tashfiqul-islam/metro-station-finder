#!/usr/bin/env bun

/**
 * Project validation script for Metro Station Finder
 * Validates project structure and configuration
 */

import { existsSync, readFileSync } from "node:fs";

console.log("🔍 Validating Metro Station Finder project...");

const validations = [
  {
    name: "Package.json Structure",
    validate: () => {
      const pkg = JSON.parse(readFileSync("package.json", "utf8"));
      return (
        pkg.name === "metro-station-finder" &&
        pkg.type === "module" &&
        pkg.packageManager === "bun@1.2.22"
      );
    },
  },
  {
    name: "TypeScript Configuration",
    validate: () => {
      const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8"));
      return (
        tsconfig.compilerOptions.target === "ES2024" &&
        tsconfig.compilerOptions.module === "ESNext" &&
        tsconfig.compilerOptions.strict === true
      );
    },
  },
  {
    name: "Next.js Configuration",
    validate: () => {
      const nextConfig = readFileSync("next.config.ts", "utf8");
      return (
        nextConfig.includes("NextConfig") && nextConfig.includes("turbopack")
      );
    },
  },
  {
    name: "Ultracite Configuration",
    validate: () => {
      const biome = JSON.parse(readFileSync("biome.jsonc", "utf8"));
      return (
        biome.extends?.includes("ultracite") && biome.linter?.enabled === true
      );
    },
  },
  {
    name: "Project Structure",
    validate: () => {
      const requiredDirs = ["app", "lib", "types", "scripts"];
      const requiredFiles = ["next.config.ts", "tsconfig.json", "biome.jsonc"];

      return (
        requiredDirs.every((dir) => existsSync(dir)) &&
        requiredFiles.every((file) => existsSync(file))
      );
    },
  },
];

let allValid = true;

for (const { name, validate } of validations) {
  try {
    const isValid = validate();
    if (isValid) {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name}`);
      allValid = false;
    }
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.message}`);
    allValid = false;
  }
}

if (allValid) {
  console.log("🎉 Project validation passed!");
  process.exit(0);
} else {
  console.log("⚠️  Project validation failed. Please check the issues above.");
  process.exit(1);
}
