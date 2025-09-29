import type { NextConfig } from "next";

// Regex patterns for webpack optimization
const NODE_MODULES_REGEX = /[\\/]node_modules[\\/]/;
const VIS_GL_REGEX = /[\\/]node_modules[\\/]@vis\.gl[\\/]/;

const nextConfig: NextConfig = {
  // React Strict Mode (enabled by default in App Router)
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    // Fail build on TypeScript errors
    ignoreBuildErrors: false,
  },

  // ESLint configuration
  eslint: {
    // Fail build on ESLint errors
    ignoreDuringBuilds: false,
  },

  // Image optimization with latest Next.js 15.5 features
  images: {
    // Allow images from Google Maps and other external sources
    domains: [
      "maps.googleapis.com",
      "maps.gstatic.com",
      "streetviewpixels-pa.googleapis.com",
    ],
    // Enable modern image formats
    formats: ["image/webp", "image/avif"],
    // Optimize images
    minimumCacheTTL: 60,
    // For static export
    unoptimized: true,
    // Enable local patterns for better security
    localPatterns: [
      {
        pathname: "/public/**",
        search: "",
      },
    ],
  },

  // Enable typed routes for better type safety (moved from experimental)
  typedRoutes: true,

  // Experimental features for Next.js 15.5 (latest 2025)
  experimental: {
    // Enable Lightning CSS for faster CSS processing (Rust-based)
    useLightningcss: true,

    // Enable modern React features
    reactCompiler: true,

    // Enable optimized package imports
    optimizePackageImports: [
      "@vis.gl/react-google-maps",
      "lucide-react",
      "framer-motion",
      "zod",
    ],

    // Enable view transitions for smoother UX
    viewTransition: true,

    // Static generation optimization
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 8,
    staticGenerationMinPagesPerWorker: 25,
  },

  // Turbopack configuration (Next.js 15.5)
  turbopack: {
    // Module resolution aliases
    resolveAlias: {
      "@": "./",
      "@/components": "./components",
      "@/lib": "./lib",
      "@/types": "./types",
      "@/utils": "./utils",
      "@/hooks": "./hooks",
      "@/styles": "./styles",
    },
    // Custom file extensions
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".json", ".css"],
    // Custom rules for file processing
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // Compiler options for better performance
  compiler: {
    // Remove console.log in production
    removeConsole: {
      exclude: ["error"],
    },
    // Enable emotion support if needed
    emotion: {
      sourceMap: true,
      autoLabel: "dev-only",
      labelFormat: "[local]",
    },
  },

  // Note: Headers and redirects don't work with static export
  // They will be handled by the hosting platform (Vercel)

  // Webpack configuration for better performance
  webpack: (config, { dev, isServer }) => {
    // Optimize for production
    if (!(dev || isServer)) {
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          vendor: {
            test: NODE_MODULES_REGEX,
            name: "vendors",
            chunks: "all",
          },
          maps: {
            test: VIS_GL_REGEX,
            name: "maps",
            chunks: "all",
            priority: 10,
          },
        },
      };
    }

    return config;
  },

  // Output configuration for static export
  output: "export",
  trailingSlash: true,

  // Fix for static export build issues
  distDir: "out",
  generateBuildId: async () => `build-${Date.now()}`,

  // Bundle pages router dependencies (promoted from experimental)
  bundlePagesRouterDependencies: true,

  // Environment variables
  env: {
    customKey: "metro-station-finder",
  },

  // Allowed development origins
  allowedDevOrigins: ["localhost", "127.0.0.1"],
};

export default nextConfig;
