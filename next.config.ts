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
const REACT_REGEX = /[\\/]node_modules[\\/](react|react-dom)[\\/]/;
const UI_LIBRARIES_REGEX =
  /[\\/]node_modules[\\/](@radix-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)[\\/]/;
const SVG_REGEX = /\.svg$/;
const NEXTJS_REGEX = /[\\/]node_modules[\\/](next|@next)[\\/]/;

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
const _MIN_CHUNK_SIZE = 20_000; // Conservative minimum to avoid tiny chunks
const _MAX_CHUNK_SIZE = 150_000; // Conservative maximum for mobile loading
const _VENDOR_CHUNK_SIZE = 80_000; // Reasonable vendor chunk size

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

  // Server-side bundling optimization (2025 approach)
  serverExternalPackages: [
    // Exclude packages that should remain external for better performance
    "sharp", // Image processing
    "canvas", // Canvas operations
  ],

  // Experimental features - 2025 optimizations for 100% Lighthouse
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
      "motion",
      "next-themes",
    ],
    scrollRestoration: true,
    // Add performance optimizations
    optimizeServerReact: true,
    serverMinification: true,
    serverSourceMaps: false,
    // Enable modern JavaScript features
    esmExternals: true,
  },

  // Compiler settings
  compiler: {
    removeConsole: isProduction ? { exclude: ["error", "warn"] } : false,
    styledComponents: false,
    // Add minification optimizations
    reactRemoveProperties: isProduction
      ? { properties: ["^data-testid$"] }
      : false,
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
    // Production optimizations - 2025 approach for 100% Lighthouse
    if (isProduction && !isServer) {
      // Enable aggressive minification
      config.optimization.minimize = true;

      // Optimize split chunks for maximum performance
      config.optimization.splitChunks = {
        chunks: "all",
        minSize: 20_000, // Smaller chunks for better caching
        maxSize: 200_000, // Prevent chunks from being too large
        maxAsyncRequests: 50, // Allow more async chunks
        maxInitialRequests: 30,
        cacheGroups: {
          // Critical React libraries - highest priority
          react: {
            test: REACT_REGEX,
            name: "react",
            chunks: "all",
            priority: 50,
            maxSize: 150_000,
            enforce: true,
            reuseExistingChunk: true,
          },
          // Next.js framework
          nextjs: {
            test: NEXTJS_REGEX,
            name: "nextjs",
            chunks: "all",
            priority: 45,
            maxSize: 200_000,
            enforce: true,
          },
          // Google Maps - lazy loaded only
          maps: {
            test: VIS_GL_REGEX,
            name: "maps",
            chunks: "async",
            priority: 20,
            maxSize: 300_000,
            enforce: true,
          },
          // UI libraries
          ui: {
            test: UI_LIBRARIES_REGEX,
            name: "ui",
            chunks: "all",
            priority: 35,
            maxSize: 100_000,
            enforce: true,
          },
          // Icons - separate chunk for better caching
          icons: {
            test: LUCIDE_REGEX,
            name: "icons",
            chunks: "all",
            priority: 25,
            maxSize: 50_000,
            enforce: true,
          },
          // Other vendor libraries
          vendor: {
            test: NODE_MODULES_REGEX,
            name: "vendors",
            chunks: "all",
            priority: 10,
            maxSize: 150_000,
            reuseExistingChunk: true,
          },
          // Common code
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

      // Enable aggressive tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      config.optimization.providedExports = true;
      config.optimization.concatenateModules = true;
      config.optimization.mergeDuplicateChunks = true;
      config.optimization.removeAvailableModules = true;
      config.optimization.removeEmptyChunks = true;

      // Optimize module resolution
      config.resolve.symlinks = false;
      config.resolve.cacheWithContext = false;
      config.resolve.modules = ["node_modules"];
      config.resolve.mainFields = ["browser", "module", "main"];

      // 2025 bundling optimization - modern approach
      config.optimization.moduleIds = "deterministic";
      config.optimization.chunkIds = "deterministic";

      // Optimize module resolution
      config.resolve.alias = {
        ...config.resolve.alias,
        react: "react",
        "react-dom": "react-dom",
      };

      // Enable source maps for production debugging
      config.devtool = "source-map";
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

  // Modern bundling optimizations (2025 approach)
  bundlePagesRouterDependencies: true,
};

export default withBundleAnalyzer(nextConfig);
