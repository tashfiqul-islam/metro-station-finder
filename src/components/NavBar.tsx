import router from 'next/router';
import React, { useEffect, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import Link from 'next/link';

// Define the NavBar component
const NavBar: React.FC = () => {
  // State to toggle the mobile menu
  const [isMenuOpen, setMenuOpen] = useState(false);

  // Function to toggle the mobile menu
  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  // Function to handle clicking on the "Home" link
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault(); // Prevent the default link behavior
    if (router.pathname !== '/') {
      // If the current route is not the home page, navigate to it
      router.push('/');
    } else {
      // If the current route is already the home page, reload it
      router.reload();
    }
  };

  useEffect(() => {
    const handleReload = () => {
      router.reload();
    };

    const h1TextElement = document.querySelector('.clickable-h1-text');

    if (h1TextElement instanceof HTMLElement) {
      h1TextElement.style.cursor = 'pointer';
      h1TextElement.addEventListener('click', handleReload);

      return () => {
        h1TextElement.removeEventListener('click', handleReload);
      };
    }

    // Return an empty function when h1TextElement is not found
    return () => {};
  }, []);

  return (
    // Navigation bar container
    <nav className="relative px-10 py-8 flex justify-between items-center bg-transparent">
      {/* Metro Station Finder title */}
      <Link
        href="/"
        className="text-2xl font-bold leading-none text-blue-500 clickable-h1-text"
        onClick={handleHomeClick}
      >
        Metro Station Finder
      </Link>

      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          className="navbar-burger flex items-center text-blue-600 p-3"
          onClick={toggleMenu}
        >
          <svg
            className={`h-4 w-4 fill-current ${
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

      {/* GitHub button */}
      <div className="github-button inline-block">
        <a
          className="border border-slate-500 text-white text-sm font-bold rounded-md px-2 py-1 inline-flex items-center justify-center hover:bg-slate-500 hover:text-white"
          href="https://github.com/tashfiqul-islam/metro-station-finder"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaGithub className="text-white mr-2" />
          <span>GitHub</span>
        </a>
      </div>

      {/* Navigation links */}
      <ul
        className={`hidden absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 lg:flex lg:mx-auto lg:flex lg:items-center lg:w-auto lg:space-x-6 ${
          isMenuOpen ? 'block' : 'hidden'
        }`}
      >
        <li>
          <Link href="/">
            <span className="text-sm text-blue-600 font-bold">Home</span>
          </Link>
        </li>
        <li>
          <a
            className="text-sm text-gray-400 hover:text-gray-500"
            href="/route-fare"
          >
            Route Fare
          </a>
        </li>
      </ul>
    </nav>
  );
};

export default NavBar;
