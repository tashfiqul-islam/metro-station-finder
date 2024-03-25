import React, { useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image'; // Import Image component from next/image
import Avatar from './Avatar'; // Import the Avatar component

const NavBar: React.FC = () => {
  // State to toggle the mobile menu
  const [isMenuOpen, setMenuOpen] = useState(false);
  // Access the Next.js router
  const router = useRouter();

  return (
    // Navigation bar container
    <nav className="fixed top-0 left-0 right-0 z-10 px-4 sm:px-5 py-1 flex justify-between items-center bg-gradient-to-r from-blue-800 to-blue-500 shadow-lg rounded-md mx-5 my-5">
      {/* Logo and Title (Metro Station Finder) - Clickable */}
      <div className="flex items-center">
        <Link href="/" onClick={(e) => { e.preventDefault(); router.push('/'); }} className="flex items-center">
          <div className="flex items-center">
            <Image src="/assets/metro-station-finder-logo.png" alt="Metro Station Finder Logo" width={45} height={45} />
          </div>
          <div className="flex items-center">
            <span className="text-xl font-bold leading-none text-white clickable-h1-text">
              Metro Station Finder
            </span>
          </div>
        </Link>
      </div>

      {/* Menu Items - Centered for web */}
      <div className="hidden sm:flex flex-grow justify-center">
        <ul className="flex space-x-4">
          {/* Home link */}
          <li>
            <Link href="/">
              <span
                className={`text-sm text-white px-4 py-2 rounded-md hover:bg-blue-700 ${
                  router.pathname === '/' ? 'bg-blue-900' : ''
                }`}
              >
                Home
              </span>
            </Link>
          </li>
          {/* Route Fare link */}
          <li>
            <Link href="/route-fare">
              <span
                className={`text-sm text-white px-4 py-2 rounded-md hover:bg-blue-700 ${
                  router.pathname === '/route-fare' ? 'bg-blue-900' : ''
                }`}
              >
                Route Fare
              </span>
            </Link>
          </li>
        </ul>
      </div>

      {/* GitHub button - Right for web */}
      <div className="hidden sm:flex items-center">
        <a
          className="border border-white text-white text-base font-bold rounded-md px-2 py-1.5 inline-flex items-center justify-center hover:bg-slate-500 hover:text-white transition duration-300"
          href="https://github.com/tashfiqul-islam/metro-station-finder"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaGithub className="text-white mr-2" />
          <span>View on GitHub</span>
        </a>
      </div>

      {/* Avatar section - Right for web */}
      <div className="hidden sm:flex items-center">
        <Avatar isAuthenticated={false} />
      </div>

      {/* Hamburger menu for mobile */}
      <div className="sm:hidden">
        <button
          onClick={() => setMenuOpen(!isMenuOpen)}
          className="text-white focus:outline-none"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            ></path>
          </svg>
        </button>

        {/* Dropdown menu */}
        {isMenuOpen && (
          <div className="absolute top-full right-0 mt-1 bg-blue-800 shadow-lg rounded-md">
            <ul className="flex flex-col space-y-2">
              {/* Home link */}
              <li>
                <Link href="/">
                  <span
                    className={`block text-sm text-white px-4 py-2 rounded-md hover:bg-blue-700 ${
                      router.pathname === '/' ? 'bg-blue-900' : ''
                    }`}
                  >
                    Home
                  </span>
                </Link>
              </li>
              {/* Route Fare link */}
              <li>
                <Link href="/route-fare">
                  <span
                    className={`block text-sm text-white px-4 py-2 rounded-md hover:bg-blue-700 ${
                      router.pathname === '/route-fare' ? 'bg-blue-900' : ''
                    }`}
                  >
                    Route Fare
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
