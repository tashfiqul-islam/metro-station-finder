const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  // Base path for GitHub Pages
  basePath: isProd ? '/metro-station-finder' : '',
  assetPrefix: isProd ? '/metro-station-finder/' : '',

  // Static export settings
  exportPathMap() {
    return {
      '/': { page: '/' },
    };
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },

  // Image optimization settings
  images: {
    disableStaticImages: true,
  },
};
