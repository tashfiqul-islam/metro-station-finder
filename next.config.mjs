/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // Enable static HTML export
  output: 'export',
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
};

export default nextConfig;
