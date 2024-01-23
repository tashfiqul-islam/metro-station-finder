// components/Layout.tsx
import React from 'react';
import Head from 'next/head';
import NavBar from './NavBar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    {/* Favicon section */}
    <Head>
      <link
        rel="icon"
        href="https://github.com/tashfiqul-islam/metro-station-finder/raw/master/public/favicon-16x16.png"
        sizes="16x16"
      />
      <link
        rel="icon"
        href="https://github.com/tashfiqul-islam/metro-station-finder/raw/master/public/favicon-32x32.png"
        sizes="32x32"
      />
      <link
        rel="icon"
        href="https://github.com/tashfiqul-islam/metro-station-finder/raw/master/public/favicon.png"
        sizes="any"
      />
    </Head>

    {/* Background color */}
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: '#121212' }}
    >
      {/* Navigation Bar */}
      <NavBar />

      {/* Content Area */}
      <main className="flex-grow">{children}</main>

      {/* Footer Section */}
      <div className="fixed bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="w-full text-center py-5 bg-transparent">
          <p className="text-slate-300 text-sm">
            &copy; 2024 | v0.0.1 | Made with{' '}
            <span className="text-red-500">&hearts;</span> by
            <a
              href="https://github.com/tashfiqul-islam"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              {' '}
              Tashfiq
            </a>
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default Layout;
