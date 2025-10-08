import type { NextConfig } from "next";

// Bundle analyzer integration
// Usage: bun run build:analyze or bun run build:webpack:analyze
// Opens interactive bundle analysis in browser
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

// Regex patterns for webpack optimization
const NODE_MODULES_REGEX = /[\\/]node_modules[\\/]/;
const VIS_GL_REGEX = /[\\/]node_modules[\\/]@vis\.gl[\\/]/;
const LUCIDE_REGEX = /[\\/]node_modules[\\/]lucide-react[\\/]/;
const SVG_REGEX = /\.svg$/;

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

const IMAGE_SIZES = [
  ICON_XS,
  ICON_SM,
  ICON_MD,
  ICON_LG,
  ICON_XL,
  ICON_2XL,
  ICON_3XL,
  ICON_4XL,
];

// Webpack optimization constants
// Optimized for static export and mobile performance
const MIN_CHUNK_SIZE = 20_000; // Conservative minimum to avoid tiny chunks
const MAX_CHUNK_SIZE = 150_000; // Conservative maximum for mobile loading
const VENDOR_CHUNK_SIZE = 80_000; // Reasonable vendor chunk size

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
  // Note: headers and redirects don't work with static export
  // These would need to be handled at the hosting/CDN level
  output: "export",
  distDir: "out",
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,

  // Disable features incompatible with static export
  eslint: {
    ignoreDuringBuilds: false,
  },

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

  // Experimental features
  experimental: {
    reactCompiler: true,
    viewTransition: true,
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 8,
    staticGenerationMinPagesPerWorker: 25,
    optimizePackageImports: [
      "@react-google-maps/api",
      "@vis.gl/react-google-maps",
      "lucide-react",
      "zod",
      "react-hook-form",
      "@hookform/resolvers",
      // Removed react and react-dom - they're optimized by default
    ],
    scrollRestoration: true,
  },

  // Compiler settings
  compiler: {
    removeConsole: isProduction ? { exclude: ["error", "warn"] } : false,
    styledComponents: false,
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

  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (isProduction && !isServer) {
      config.optimization.splitChunks = {
        chunks: "all",
        minSize: MIN_CHUNK_SIZE,
        maxSize: MAX_CHUNK_SIZE,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          vendor: {
            test: NODE_MODULES_REGEX,
            name: "vendors",
            chunks: "all",
            priority: 10,
            maxSize: VENDOR_CHUNK_SIZE,
            // Removed enforce: true to prevent aggressive splitting
          },
          maps: {
            test: VIS_GL_REGEX,
            name: "maps",
            chunks: "all",
            priority: 20,
            maxSize: 150_000,
            enforce: true,
          },
          icons: {
            test: LUCIDE_REGEX,
            name: "icons",
            chunks: "all",
            priority: 15,
            maxSize: 50_000,
            enforce: true,
          },
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 5,
            maxSize: 100_000,
            reuseExistingChunk: true,
          },
        },
      };
    }

    // SVG handling - only for webpack (turbopack has its own SVG handling)
    // Check if we're in turbopack mode to avoid conflicts
    const isTurbopack =
      config.name?.includes("turbopack") ||
      process.env.TURBOPACK === "1" ||
      process.env.NEXT_TURBOPACK === "1";

    if (!isTurbopack) {
      config.module.rules.push({
        test: SVG_REGEX,
        use: ["@svgr/webpack"],
      });
    }

    return config;
  },

  // Environment variables
  env: {
    // biome-ignore lint/style/useNamingConvention: Next.js requires NEXT_PUBLIC_ prefix for client-side env vars
    NEXT_PUBLIC_APP_NAME: "Metro Station Finder",
    // biome-ignore lint/style/useNamingConvention: Next.js requires NEXT_PUBLIC_ prefix for client-side env vars
    NEXT_PUBLIC_APP_VERSION: "2.0.0",
  },

  // Performance settings
  poweredByHeader: false,
  compress: true,
  generateBuildId: () => `metro-station-finder-${Date.now()}`,
};

export default withBundleAnalyzer(nextConfig);
