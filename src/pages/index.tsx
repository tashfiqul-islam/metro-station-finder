import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '../components/SearchBar';
import MetroInfoCard from '../components/MetroInfoCard';
import Layout from '../components/Layout';
import { findNearestMetro } from '../services/metroServices';
import { MetroStation } from '../utils/constants';
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
        <Layout>
          {/* Main Content Section */}
          <div className="flex-grow">
            <header className="w-full max-w-lg mx-auto mt-14">
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
        </Layout>
      </div>
    </>
  );
};

export default HomePage;
