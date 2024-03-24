import React, { useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image'; // Import Image component from next/image
import Avatar from './Avatar';

const NavBar: React.FC = () => {
  // State to toggle the mobile menu
  const [isMenuOpen, setMenuOpen] = useState(false);
  // Access the Next.js router
  const router = useRouter();

  // Function to toggle the mobile menu
  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  return (
    // Navigation bar container
    <nav className="fixed top-0 left-0 right-0 z-10 px-4 sm:px-5 py-2 flex justify-between items-center bg-gradient-to-r from-blue-800 to-blue-500 shadow-lg rounded-md mx-5 my-5">
      {/* Logo and Title (Metro Station Finder) - Clickable */}
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
      {/* Mobile menu button */}
      <div className="sm:hidden">
        <button
          className="navbar-burger flex items-center text-white p-2"
          onClick={toggleMenu}
        >
          <svg
            className={`h-5 w-5 fill-current ${
              isMenuOpen ? 'block' : 'hidden'
            }`}
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Mobile menu</title>
            <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"></path>
          </svg>
        </button>
      </div>
      {/* Menu Items (Home, Route Fare) */}
      <ul
        className={`${
          isMenuOpen ? 'block' : 'hidden'
        } sm:flex sm:mx-auto sm:flex sm:items-center sm:w-auto sm:space-x-4`}
      >
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
      {/* GitHub button */}
      <div className="github-button inline-block">
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
      {/* Avatar section */}
      <Avatar isAuthenticated={false} />
    </nav>
  );
};

export default NavBar;
