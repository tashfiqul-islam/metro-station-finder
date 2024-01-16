import withImages from 'next-images';

export default withImages({
  // Enable static HTML export
  output: 'out',
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  images: {
    disableStaticImages: true, // Disable Image Optimization
  },
});
