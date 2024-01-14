/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static HTML export
  images: {
    unoptimized: true, // Disable Image Optimization API for export
  },
};

module.exports = nextConfig;
