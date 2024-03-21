// pages/_app.tsx
import '../styles/globals.css'; // Import global styles
import '../components/AuthModal/AuthModal.css'; // Import AuthModal global styles
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="antialiased text-gray-700">
      {' '}
      {/* Apply base styles */}
      <Component {...pageProps} />
    </div>
  );
}

export default MyApp;
