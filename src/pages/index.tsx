import React, { useState } from 'react';
import SearchBar from '../components/SearchBar';
import MapView from '../components/MapView';
import { findNearestMetro, geocodeAddress } from '../services/metroServices';
import { MetroStation } from '../types'; // Assuming a type definition for MetroStation

const HomePage: React.FC = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [nearestMetro, setNearestMetro] = useState<MetroStation | null>(null);

  // Function to handle address search and geocoding
  const handleSearch = async (address: string) => {
    try {
      // Convert address to coordinates using Google Geocoding API
      const geocodedLocation = await geocodeAddress(address);
      setUserLocation(geocodedLocation); // Update user location

      // Find and update nearest metro station using your service
      const nearest = await findNearestMetro(geocodedLocation);
      setNearestMetro(nearest);
    } catch (error) {
      console.error('Error in search:', error);
      // Handle error appropriately (show a message to the user, etc.)
    }
  };

  return (
    // Use Tailwind CSS to apply styling
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <header className="w-full max-w-lg mx-auto mt-10">
        <SearchBar onSearch={handleSearch} />
      </header>
      <main className="w-full max-w-lg mx-auto mt-5">
        {userLocation && nearestMetro && (
          <MapView userLocation={userLocation} metroStation={nearestMetro} />
        )}
      </main>
    </div>
  );
};

export default HomePage;
