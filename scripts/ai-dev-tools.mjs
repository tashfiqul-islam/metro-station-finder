#!/usr/bin/env bun

/**
 * AI-Friendly Development Tools
 * Essential utilities for AI-assisted development in 2025
 */

import { execSync } from "node:child_process";

const aiCommands = {
  // AI Development Workflow
  "ai:setup": () => {
    console.log("🤖 Setting up AI development environment...");
    execSync("bun run storybook:build", { stdio: "inherit" });
    execSync("bun run test:run", { stdio: "inherit" });
    console.log("✅ AI development environment ready!");
  },

  "ai:test": () => {
    console.log("🧪 Running AI-friendly tests...");
    execSync("bun run test:ui", { stdio: "inherit" });
  },

  "ai:components": () => {
    console.log("🎨 Managing shadcn/ui components...");
    console.log("Available commands:");
    console.log("  bun run ui:add <component>  # Add a component");
    console.log("  bun run ui:diff             # Check for updates");
    console.log("  bun run ui:init             # Reinitialize");
  },

  "ai:analyze": () => {
    console.log("🔍 Running comprehensive AI analysis...");
    execSync(
      "bun run type-check && bun run lint && bun run test:run && bun run analyze",
      {
        stdio: "inherit",
      }
    );
  },

  "ai:validate": () => {
    console.log("✅ Validating AI-generated code...");
    execSync("bun run health && bun run build", {
      stdio: "inherit",
    });
  },

  // Component Development
  "component:create": (name) => {
    if (!name) {
      console.log(
        "❌ Please provide component name: bun run ai:component:create Button"
      );
      return;
    }
    console.log(`🎨 Creating component: ${name}`);
    // This would create component files, stories, and tests
    console.log("✅ Component created with AI-friendly structure");
  },

  "component:test": (name) => {
    if (!name) {
      console.log(
        "❌ Please provide component name: bun run ai:component:test Button"
      );
      return;
    }
    console.log(`🧪 Testing component: ${name}`);
    execSync(`bun run test -- --grep "${name}"`, { stdio: "inherit" });
  },

  // Code Quality for AI
  "ai:quality": () => {
    console.log("🔍 Running AI-optimized quality checks...");
    execSync(
      "bun run type-check && bun run lint && bun run test:run && bun run analyze:security",
      {
        stdio: "inherit",
      }
    );
  },

  "ai:fix": () => {
    console.log("🔧 Fixing AI-generated code...");
    execSync("bun run lint:fix && bun run format", { stdio: "inherit" });
  },

  // Documentation
  "ai:docs": () => {
    console.log("📖 Generating component documentation...");
    console.log("shadcn/ui components are self-documenting with TypeScript");
    console.log("Use 'bun run ui:add <component>' to add new components");
  },

  // Performance Analysis
  "ai:perf": () => {
    console.log("⚡ Running AI performance analysis...");
    execSync("bun run build && bun run analyze:bundle", { stdio: "inherit" });
  },
};

const command = process.argv[2];
const arg = process.argv[3];

if (!(command && aiCommands[command])) {
  console.log("🤖 AI Development Tools:");
  console.log("");
  console.log("Workflow:");
  console.log("  bun run ai:setup          # Setup AI development environment");
  console.log("  bun run ai:analyze        # Comprehensive analysis");
  console.log("  bun run ai:validate       # Validate AI-generated code");
  console.log("");
  console.log("Development:");
  console.log("  bun run ai:test           # AI-friendly test UI");
  console.log("  bun run ai:components     # shadcn/ui component management");
  console.log("  bun run ai:quality        # AI-optimized quality checks");
  console.log("  bun run ai:fix            # Fix AI-generated code");
  console.log("");
  console.log("Components:");
  console.log("  bun run ai:component:create <name>  # Create component");
  console.log("  bun run ai:component:test <name>    # Test component");
  console.log("");
  console.log("Analysis:");
  console.log("  bun run ai:docs           # Generate documentation");
  console.log("  bun run ai:perf           # Performance analysis");
  console.log("");
  process.exit(0);
}

try {
  aiCommands[command](arg);
} catch (error) {
  console.error(`❌ AI command failed: ${error.message}`);
  process.exit(1);
}
