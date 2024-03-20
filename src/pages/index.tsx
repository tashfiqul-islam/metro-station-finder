import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import SearchBar from '../components/SearchBar';
import MetroInfoCard from '../components/MetroInfoCard';
import Layout from '../components/Layout';
import { findNearestMetro } from '../services/metroServices';
import { MetroStation } from '../utils/constants';
import AuthModal from '@/components/AuthModal/AuthModal';

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

  // State to control the visibility of the modal
  const [showModal, setShowModal] = useState(false);

  // Function to toggle the modal visibility
  const toggleModal = () => {
    setShowModal(!showModal);
  };

  return (
    <>
      <Layout>
        {/* Main Content Section */}
        <div className="flex-grow">
          <header className="w-full max-w-lg mx-auto mt-14">
            {/* Button to open the modal */}
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={toggleModal}
            >
              Modal
            </button>
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
        {/* Render the modal only if showModal state is true */}
      {showModal && <AuthModal isOpen={true} onClose={toggleModal}>
        </AuthModal>}
      </Layout>
    </>
  );
};

export default HomePage;
