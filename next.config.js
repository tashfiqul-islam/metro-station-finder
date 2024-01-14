/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static HTML export
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
};

module.exports = nextConfig;
