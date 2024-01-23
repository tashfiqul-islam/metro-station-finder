// pages/route-fare.tsx
import React, { useState } from 'react';
import Layout from '../components/Layout';
import { calculateFare, stationNames } from '../services/fareCalculation';
import image from 'next/image';

const RouteFarePage: React.FC = () => {
  // State variables to track selected start and destination stations, and calculated fare
  const [startStation, setStartStation] = useState<string>('');
  const [destinationStation, setDestinationStation] = useState<string>('');
  const [fare, setFare] = useState<number | null>(null);

  // State variables to manage dropdown visibility
  const [startDropdownVisible, setStartDropdownVisible] =
    useState<boolean>(false);
  const [destinationDropdownVisible, setDestinationDropdownVisible] =
    useState<boolean>(false);

  // Function to handle the "Calculate Fare" button click
  const handleCalculateFare = () => {
    if (startStation && destinationStation) {
      // Call the calculateFare function from the fareCalculation service
      const calculatedFare = calculateFare(startStation, destinationStation);
      setFare(calculatedFare); // Update the state with the calculated fare
    }
  };

  return (
    <Layout>
      <div className="mt-20 px-4 md:px-5 flex flex-col items-center justify-center">
        <div
          className="w-1/2 bg-slate-700 p-5 rounded-xl bg-opacity-60 backdrop-filter backdrop-blur-lg flex flex-col items-center justify-start space-y-4"
          style={{ height: '450px' }}
        >
          {/* Start Station Dropdown */}
          <div className="w-2/3">
            <button
              className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring focus:ring-primary-300"
              onClick={() => setStartDropdownVisible(!startDropdownVisible)}
            >
              {startStation || 'Select Starting Station'}
            </button>
            {startDropdownVisible && (
              <ul className="absolute z-10 mt-1 w-full list-none overflow-hidden rounded-lg border-none bg-white text-left text-base shadow-lg dark:bg-neutral-700">
                {stationNames.map((option, index) => (
                  <li key={index} className="whitespace-nowrap">
                    <a
                      className="block w-full px-4 py-2 text-sm font-normal text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-600"
                      href="#"
                      onClick={() => {
                        setStartStation(option);
                        setStartDropdownVisible(false);
                      }}
                    >
                      {option}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Destination Station Dropdown */}
          <div className="w-2/3">
            <button
              className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring focus:ring-primary-300"
              onClick={() =>
                setDestinationDropdownVisible(!destinationDropdownVisible)
              }
            >
              {destinationStation || 'Select Destination Station'}
            </button>
            {destinationDropdownVisible && (
              <ul className="absolute z-10 mt-1 w-full list-none overflow-hidden rounded-lg border-none bg-white text-left text-base shadow-lg dark:bg-neutral-700">
                {stationNames.map((option, index) => (
                  <li key={index} className="whitespace-nowrap">
                    <a
                      className="block w-full px-4 py-2 text-sm font-normal text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-600"
                      href="#"
                      onClick={() => {
                        setDestinationStation(option);
                        setDestinationDropdownVisible(false);
                      }}
                    >
                      {option}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Fare Calculation Button */}
          <button
            className="w-2/3 bg-primary hover:bg-primary-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring focus:ring-primary-300"
            onClick={handleCalculateFare}
          >
            Calculate Fare
          </button>

          {/* Fare Display */}
          {fare !== null && (
            <div className="flex flex-col items-center w-2/3">
              <div className="bg-white/30 dark:bg-slate-800 rounded-lg py-3 ring-1 ring-slate-900/5 shadow-xl backdrop-blur-sm w-full">
                <div className="flex items-center justify-center">
                  <p className="text-slate-900 dark:text-white text-base">
                    <b>Fare:</b> {fare} Taka
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RouteFarePage;
