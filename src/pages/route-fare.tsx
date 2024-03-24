import React, { useState, useEffect } from 'react';
import { stationNames, calculateFare } from '../services/fareCalculation';
import Layout from '../components/Layout';
import CustomDropdown from '../components/CustomDropdown';

const RouteFare: React.FC = () => {
  // State for selected starting and destination stations with empty strings as defaults
  const [startStation, setStartStation] = useState<string>('');
  const [destinationStation, setDestinationStation] = useState<string>('');

  // State for calculated fare
  const [fare, setFare] = useState<number | null>(null);

  // Function to handle starting station selection
  const handleStartStationChange = (selectedStation: string) => {
    setStartStation(selectedStation);
  };

  // Function to handle destination station selection
  const handleDestinationStationChange = (selectedStation: string) => {
    setDestinationStation(selectedStation);
  };

  // Filter the options for starting and destination stations
  const filteredStartStations = stationNames.filter(
    station => station !== destinationStation,
  );

  const filteredDestinationStations = stationNames.filter(
    station => station !== startStation,
  );

  // Use useEffect to calculate fare when stations change
  useEffect(() => {
    const calculateRouteFare = () => {
      if (startStation && destinationStation) {
        const fareResult = calculateFare(startStation, destinationStation);
        setFare(fareResult);
      } else {
        setFare(null);
      }
    };

    calculateRouteFare(); // Call the function immediately
  }, [startStation, destinationStation]);

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-60 bg-gray-800 bg-opacity-50 backdrop-blur-lg text-white p-5 rounded-lg shadow-md text-center">
        {/* Header */}
        <h2 className="text-3xl font-semibold mb-12">Route Fare Calculator</h2>
        <div className="mb-10">
          {/* Starting Station Dropdown */}
          <label
            htmlFor="startStation"
            className="block text-gray-300 font-medium mb-2 text-left"
          >
            Starting Station:
          </label>
          <CustomDropdown
            label="Choose starting station"
            options={filteredStartStations}
            value={startStation}
            onChange={handleStartStationChange}
          />
        </div>
        <div className="mb-10">
          {/* Destination Station Dropdown */}
          <label
            htmlFor="destinationStation"
            className="block text-gray-300 font-medium mb-2 text-left"
          >
            Destination Station:
          </label>
          <CustomDropdown
            label="Choose destination station"
            options={filteredDestinationStations}
            value={destinationStation}
            onChange={handleDestinationStationChange}
          />
        </div>
        {fare !== null && startStation && destinationStation && (
          <div className="mt-8 text-left">
            {/* Fare Information */}
            <h3 className="text-lg font-semibold">Station Route Fare:</h3>
            <p>
              Fare from {startStation} to {destinationStation} is BDT {fare}.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RouteFare;
