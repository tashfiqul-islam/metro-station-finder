/**
 * @type {import('next').NextConfig}
 **/
const nextConfig = {
  distDir: 'build',
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '', // Provide a default empty string value
  },
  images: {
    disableStaticImages: true, // Disable Image Optimization
  },
};

module.exports = nextConfig;
