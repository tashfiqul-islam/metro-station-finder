#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Generate Metro Station Finder SVG icons
 * Creates modern, sleek SVG icons that match the website's branding
 */

// Metro Station Finder Icon configurations with proper branding
const METRO_ICONS = [
  {
    name: "metro-station",
    emoji: "🚇",
    primaryColor: "#2563eb", // Blue
    secondaryColor: "#1e40af",
    description: "Metro Station Icon",
  },
  {
    name: "fare-calculator",
    emoji: "💰",
    primaryColor: "#059669", // Green
    secondaryColor: "#047857",
    description: "Fare Calculator Icon",
  },
  {
    name: "route-finder",
    emoji: "🗺️",
    primaryColor: "#dc2626", // Red
    secondaryColor: "#b91c1c",
    description: "Route Finder Icon",
  },
  {
    name: "location-pin",
    emoji: "📍",
    primaryColor: "#7c3aed", // Purple
    secondaryColor: "#6d28d9",
    description: "Location Pin Icon",
  },
  {
    name: "metro-train",
    emoji: "🚊",
    primaryColor: "#f59e0b", // Orange
    secondaryColor: "#d97706",
    description: "Metro Train Icon",
  },
];

function generateSVGIcon(icon) {
  return `<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gradient-${icon.name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${icon.primaryColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${icon.secondaryColor};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow-${icon.name}" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.2)"/>
    </filter>
  </defs>
  
  <!-- Background circle with gradient -->
  <circle cx="16" cy="16" r="14" fill="url(#gradient-${icon.name})" filter="url(#shadow-${icon.name})"/>
  
  <!-- Inner circle for depth -->
  <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  
  <!-- Icon emoji -->
  <text x="16" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="white" filter="url(#shadow-${icon.name})">
    ${icon.emoji}
  </text>
</svg>`.trim();
}

async function generateMetroIcons() {
  console.log("🎨 Generating Metro Station Finder SVG icons...");

  try {
    // Ensure public directory exists
    await mkdir("public", { recursive: true });

    for (const icon of METRO_ICONS) {
      console.log(`📦 Generating ${icon.name}.svg...`);

      const svgContent = generateSVGIcon(icon);
      const filePath = join(process.cwd(), "public", `${icon.name}.svg`);

      await writeFile(filePath, svgContent);
      console.log(`✅ Generated ${icon.name}.svg - ${icon.description}`);
    }

    console.log("\n🎉 All Metro Station Finder icons generated successfully!");
    console.log("\n📁 Generated files:");
    for (const icon of METRO_ICONS) {
      console.log(`   - public/${icon.name}.svg`);
    }

    console.log("\n💡 Usage in your components:");
    for (const icon of METRO_ICONS) {
      console.log(`   <img src="/${icon.name}.svg" alt="${icon.description}" />`);
    }
  } catch (error) {
    console.error("❌ Error generating Metro icons:", error);
    process.exit(1);
  }
}

// Run the script
generateMetroIcons();
