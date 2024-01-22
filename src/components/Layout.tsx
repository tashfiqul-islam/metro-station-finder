import React from 'react';
import NavBar from './NavBar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen flex flex-col">
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
);

export default Layout;
