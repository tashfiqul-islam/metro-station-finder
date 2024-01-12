/* eslint-disable node/no-missing-import */
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '../components/SearchBar';
import { findNearestMetro } from '../services/metroServices';
import { MetroStation } from '../types';

// Dynamically import MapView with no server-side rendering
const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

const HomePage: React.FC = () => {
  // Initial coordinates for Dhaka's center
  const initialDhakaCenter = { lat: 23.8103, lng: 90.4125 };

  // State for user location, nearest metro, and error messages
  const [userLocation, setUserLocation] =
    useState<google.maps.LatLngLiteral>(initialDhakaCenter);
  const [nearestMetro, setNearestMetro] = useState<MetroStation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Handle location search
  const handleSearch = async (location: google.maps.LatLngLiteral) => {
    try {
      setErrorMessage(''); // Reset any previous error messages
      setUserLocation(location); // Update user location

      // Find and update nearest metro station
      const nearest = findNearestMetro(location);
      setNearestMetro(nearest);
    } catch (error) {
      console.error('Error in search:', error);
      setErrorMessage(
        'Failed to find the nearest metro station. Please try again.',
      );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <header className="w-full max-w-lg mx-auto mt-10">
        <SearchBar onSearch={handleSearch} />
        {errorMessage && (
          <p className="text-red-600 text-center mt-2">{errorMessage}</p>
        )}
      </header>
      <main className="w-full max-w-lg mx-auto mt-5">
        {typeof window !== 'undefined' && (
          <MapView userLocation={userLocation} metroStation={nearestMetro} />
        )}
      </main>
    </div>
  );
};

export default HomePage;
