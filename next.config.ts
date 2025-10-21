import type { NextConfig } from "next";

// Bundle analyzer integration
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// Environment detection
const isProduction = process.env.NODE_ENV === "production";

// Standard responsive breakpoints for Next.js images
const MOBILE_SMALL = 640;
const MOBILE_MEDIUM = 750;
const TABLET_SMALL = 828;
const TABLET_LARGE = 1080;
const DESKTOP_SMALL = 1200;
const DESKTOP_MEDIUM = 1920;
const DESKTOP_LARGE = 2048;
const DESKTOP_XL = 3840;

const DEVICE_SIZES = [
  MOBILE_SMALL,
  MOBILE_MEDIUM,
  TABLET_SMALL,
  TABLET_LARGE,
  DESKTOP_SMALL,
  DESKTOP_MEDIUM,
  DESKTOP_LARGE,
  DESKTOP_XL,
];

// Standard icon and image sizes
const ICON_XS = 16;
const ICON_SM = 32;
const ICON_MD = 48;
const ICON_LG = 64;
const ICON_XL = 96;
const ICON_2XL = 128;
const ICON_3XL = 256;
const ICON_4XL = 384;

const IMAGE_SIZES = [ICON_XS, ICON_SM, ICON_MD, ICON_LG, ICON_XL, ICON_2XL, ICON_3XL, ICON_4XL];

const nextConfig: NextConfig = {
  // React configuration
  reactStrictMode: true,

  // TypeScript settings
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "./tsconfig.json",
  },

  // Routing settings for static export
  typedRoutes: true,
  trailingSlash: true,

  // Static export configuration
  // NOTE: Static export is currently disabled due to Next.js 16 beta limitations
  // The new App Router navigation requires RSC payloads that aren't generated in static exports
  // This will be re-enabled once Next.js 16 stable is released with proper static export support
  // output: "export",
  // distDir: "out", // Use default .next directory for Node.js builds
  skipTrailingSlashRedirect: true,
  skipProxyUrlNormalize: true,

  // Image optimization settings
  images: {
    unoptimized: true,
    formats: ["image/webp", "image/avif"],
    deviceSizes: DEVICE_SIZES,
    imageSizes: IMAGE_SIZES,
    remotePatterns: [
      { protocol: "https", hostname: "maps.googleapis.com" },
      { protocol: "https", hostname: "maps.gstatic.com" },
      { protocol: "https", hostname: "streetviewpixels-pa.googleapis.com" },
      { protocol: "https", hostname: "fonts.googleapis.com" },
      { protocol: "https", hostname: "fonts.gstatic.com" },
    ],
  },

  // Server-side bundling optimization
  serverExternalPackages: ["sharp", "canvas"],

  // React Compiler (Next.js 16: stable, moved to top-level)
  reactCompiler: isProduction,

  // Experimental features (Next.js 16 beta)
  experimental: {
    // Next.js 16 beta: Turbopack filesystem caching
    turbopackFileSystemCacheForDev: true,
    viewTransition: true,
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 8,
    staticGenerationMinPagesPerWorker: 25,
    // Package import optimizations for tree-shaking
    optimizePackageImports: [
      "@react-google-maps/api",
      "@vis.gl/react-google-maps",
      "lucide-react",
      "zod",
      "react-hook-form",
      "@hookform/resolvers",
      "motion",
      "next-themes",
      "@tsparticles/react",
      "@tsparticles/slim",
    ],
    scrollRestoration: true,
    optimizeServerReact: true,
    serverMinification: true,
    serverSourceMaps: false,
    esmExternals: true,
  },

  // Compiler settings
  compiler: {
    removeConsole: isProduction ? { exclude: ["error", "warn"] } : false,
    styledComponents: false,
    reactRemoveProperties: isProduction ? { properties: ["^data-testid$"] } : false,
  },

  // Turbopack configuration
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: "Metro Station Finder",
    NEXT_PUBLIC_APP_VERSION: "2.0.0",
  },

  // Performance settings
  poweredByHeader: false,
  compress: true,
  generateBuildId: () => `metro-station-finder-${Date.now()}`,

  // Modern bundling optimizations (2025 approach)
  bundlePagesRouterDependencies: true,
};

export default withBundleAnalyzer(nextConfig);
