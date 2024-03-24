import React, { useEffect, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';

const NavBar: React.FC = () => {
  // State to toggle the mobile menu
  const [isMenuOpen, setMenuOpen] = useState(false);
  // Access the Next.js router
  const router = useRouter();

  // Function to toggle the mobile menu
  const toggleMenu = () => {
    setMenuOpen(!isMenuOpen);
  };

  // Function to handle clicking on the "Home" link
  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (router.pathname !== '/') {
      // If the current route is not the home page, navigate to it
      router.push('/');
    } else {
      // If the current route is already the home page, reload it
      router.reload();
    }
  };

  // Add a click event listener to the "Metro Station Finder" title for reloading the home page
  useEffect(() => {
    const handleReload = () => {
      router.reload();
    };

    const h1TextElement = document.querySelector('.clickable-h1-text');

    if (h1TextElement instanceof HTMLElement) {
      // Change the cursor style to indicate clickability
      h1TextElement.style.cursor = 'pointer';
      // Add a click event listener to reload the home page
      h1TextElement.addEventListener('click', handleReload);

      return () => {
        // Remove the event listener when the component unmounts
        h1TextElement.removeEventListener('click', handleReload);
      };
    }

    // Return an empty function when h1TextElement is not found
    return () => {};
  }, [router]);

  return (
    // Navigation bar container
    <nav className="relative px-4 sm:px-10 py-4 flex justify-between items-center bg-transparent">
      {/* Name (Metro Station Finder) */}
      <div className="flex items-center">
        <Link
          href="/"
          className="text-2xl font-bold leading-none text-blue-500 clickable-h1-text"
          onClick={handleHomeClick}
        >
          Metro Station Finder
        </Link>
      </div>

      {/* Mobile menu button */}
      <div className="sm:hidden">
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

      {/* Menu Items (Home, Route Fare) */}
      <ul
        className={`${
          isMenuOpen ? 'block' : 'hidden'
        } sm:flex sm:mx-auto sm:flex sm:items-center sm:w-auto sm:space-x-6`}
      >
        {/* Home link */}
        <li>
          <Link href="/">
            <span
              className={`text-sm font-bold ${
                router.pathname === '/' ? 'text-blue-600' : 'text-gray-400'
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
              className={`text-sm ${
                router.pathname === '/route-fare'
                  ? 'font-bold text-blue-600'
                  : 'text-gray-400'
              }`}
            >
              Route Fare
            </span>
          </Link>
        </li>
      </ul>

      {/* GitHub button & Avatar */}
      <div className="hidden sm:flex items-center">
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

        {/* Avatar */}
        <div className="avatar ml-4">
          <img
            className="w-8 h-8 rounded-full"
            src="https://via.placeholder.com/50"
            alt="Avatar"
          />
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
