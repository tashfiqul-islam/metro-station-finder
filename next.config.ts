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

  // Image optimization for static export
  images: {
    // Required for static export (no optimization server)
    unoptimized: true,
    // Allow images from Google Maps (using modern remotePatterns)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "maps.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "streetviewpixels-pa.googleapis.com",
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
    // Custom rules for SVG imports as React components
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // Compiler options for better performance
  compiler: {
    // Remove console.log in production (keep error logs)
    removeConsole: {
      exclude: ["error"],
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
};

export default nextConfig;
