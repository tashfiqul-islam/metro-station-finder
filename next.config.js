/**
 * @type {import('next').NextConfig}
 */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  // Base path and asset prefix for GitHub Pages
  basePath: isProd ? '/metro-station-finder' : '',
  assetPrefix: isProd ? '/metro-station-finder/' : '',

  // Configure for static export
  output: 'export',

  // Environment variables
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },

  // Image optimization settings
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
