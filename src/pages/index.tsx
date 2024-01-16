/* eslint-disable react/no-unknown-property */
/* eslint-disable node/no-missing-import */
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '../components/SearchBar';
import MetroInfoCard from '../components/MetroInfoCard';
import { findNearestMetro } from '../services/metroServices';
import { MetroStation } from '../utils/constants';
import { FaGithub } from 'react-icons/fa';
import Image from 'next/image';
import img from '../../public/assets/logo.png';
import { useRouter } from 'next/router';
import Head from 'next/head';

// Dynamically import MapView with no server-side rendering
const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

const HomePage: React.FC = () => {
  // Initial coordinates for Dhaka's center
  const initialDhakaCenter = { lat: 23.8103, lng: 90.4125 };

  // State for user location, nearest metro, distance, unit, and error messages
  const [userLocation, setUserLocation] =
    useState<google.maps.LatLngLiteral>(initialDhakaCenter);
  const [nearestMetro, setNearestMetro] = useState<MetroStation | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [unit, setUnit] = useState<'km' | 'miles'>('km');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Use router to make page reload
  const router = useRouter();

  // Callback to handle distance and unit updates from MapView
  const handleDistanceUpdate = (
    newDistance: number,
    newUnit: 'km' | 'miles',
  ) => {
    setDistance(newDistance);
    setUnit(newUnit);
  };

  // Handle location search
  const handleSearch = async (location: google.maps.LatLngLiteral) => {
    try {
      setErrorMessage(''); // Reset any previous error messages
      setUserLocation(location); // Update user location
      const nearest = findNearestMetro(location);
      setNearestMetro(nearest); // Update nearest metro station
    } catch (error) {
      console.error('Error in search:', error);
      setErrorMessage(
        'Failed to find the nearest metro station. Please try again.',
      );
    }
  };

  const [isClient, setIsClient] = useState(false);

  // This effect sets isClient to true after component mounts, indicating client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Reload page on logo click
  const handleLogoClick = () => {
    router.reload();
  };

  // Open github in a new tab
  const handleGithubLinkClick = () => {
    const githubUrl = 'https://github.com/tashfiqul-islam/metro-station-finder';
    window.open(githubUrl, '_blank');
  };

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: '#121212' }}
    >
      <Head>
        {/* Specify multiple favicon links */}
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png" // Relative to the root
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png" // Relative to the root
        />
        {/* Fallback favicon for other sizes or formats */}
        <link
          rel="icon"
          href="/favicon.png" // Relative to the root
        />
      </Head>

      {/* Standard Padding on top, left, and right */}
      <div className="py-8 px-5"></div>

      {/* Header Section */}
      <div className="w-full text-center relative flex flex-col md:flex-row items-center justify-center">
        {/* Logo and Header on the same line on mobile */}
        <div className="flex flex-col md:flex-row items-center justify-center">
          {/* Logo on the left */}
          <div
            className="flex items-center cursor-pointer"
            onClick={handleLogoClick}
          >
            <Image
              src={img}
              alt="Metro Station Finder Logo"
              width={65}
              height={65} // Adjust the height to maintain aspect ratio
            />
            <div style={{ width: '15px' }}></div>
            {/* Title in the middle */}
            <h1 className="text-2xl font-bold text-white font-mono">
              Metro Station Finder
            </h1>
          </div>
        </div>

        {/* GitHub icon on the right */}
        <div
          className="mt-2 md:mt-0 md:absolute md:right-20 md:top-4"
          onClick={handleGithubLinkClick}
          style={{ cursor: 'pointer' }}
        >
          <FaGithub size={24} className="text-white hover:text-slate-400" />{' '}
          {/* GitHub Icon */}
        </div>
      </div>

      <style jsx>{`
        /* Mobile-specific styles */
        @media (max-width: 640px) {
          /* Add a 5px gap between Line 1 and Line 2 */
          .flex.flex-col.md:flex-row.items-center.justify-center
            > div:first-child {
            margin-bottom: 5px;
          }
        }
      `}</style>

      {/* Main Content Section */}
      <div className="flex-grow">
        <header className="w-full max-w-lg mx-auto mt-12">
          <SearchBar onSearch={handleSearch} />
          {errorMessage && (
            <p className="text-red-600 text-center mt-2">{errorMessage}</p>
          )}
        </header>

        <main className="w-full max-w-lg mx-auto mt-5">
          {isClient && (
            <>
              {/* MapView Section */}
              <div className="mb-4">
                <MapView
                  userLocation={userLocation}
                  metroStation={nearestMetro}
                  onDistanceCalculated={handleDistanceUpdate}
                />
              </div>

              {/* MetroInfoCard Section */}
              {distance !== null && nearestMetro && (
                <div className="mt-10">
                  <MetroInfoCard
                    metroStation={nearestMetro}
                    distance={distance}
                    unit={unit}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer Section */}
      <div className="w-full text-center py-5">
        <p className="text-slate-300 text-sm">
          &copy; 2024 | v0.0.2 | Made with{' '}
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
  );
};

export default HomePage;
