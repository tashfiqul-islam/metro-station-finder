/* eslint-disable node/no-missing-import */
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '../components/SearchBar';
import MetroInfoCard from '../components/MetroInfoCard';
import { findNearestMetro } from '../services/metroServices';
import { MetroStation } from '../utils/constants';
import { FaGithub } from 'react-icons/fa';
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

  return (
    <>
      <Head>
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" />
        <link rel="shortcut icon" href="/favicon.png" />
      </Head>
      <div
        className="flex flex-col min-h-screen"
        style={{ backgroundColor: '#121212' }}
      >
        {/* Header Section */}
        <div className="w-full text-center py-10 relative">
          <h1 className="text-2xl font-bold text-white font-mono">
            Metro Station Finder
          </h1>
          <a
            href="https://github.com/tashfiqul-islam/metro-station-finder"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:absolute top-8 right-12 mt-2 text-white hover:text-slate-400 md:block"
          >
            <FaGithub size={24} /> {/* GitHub Icon */}
          </a>
        </div>

        {/* Main Content Section */}
        <div className="flex-grow">
          <header className="w-full max-w-lg mx-auto mt-5">
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
    </>
  );
};

export default HomePage;
