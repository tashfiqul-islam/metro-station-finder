/* eslint-disable node/no-missing-import */
// SearchBar.tsx
// This component provides an input field with Google Places Autocomplete functionality.

import React, { useState, useEffect, useRef } from 'react';
import { loadGoogleMapScript } from '../utils/loadGoogleMapScript';
import { dhakaBounds } from '../utils/constants';

interface SearchBarProps {
  onSearch: (location: google.maps.LatLngLiteral) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [inputValue, setInputValue] = useState<string>('');
  const autoCompleteRef = useRef<HTMLInputElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // Effect to load the Google Maps script
  useEffect(() => {
    if (!isScriptLoaded) {
      loadGoogleMapScript(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
        .then(() => setIsScriptLoaded(true))
        .catch(error => console.error('Error loading Google Maps:', error));
    }
  }, [isScriptLoaded]);

  // Effect to initialize Google Places Autocomplete
  useEffect(() => {
    if (!isScriptLoaded || !autoCompleteRef.current) return;

    // Create bounds for the autocomplete suggestions
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(
        dhakaBounds.southwest.lat,
        dhakaBounds.southwest.lng,
      ),
      new google.maps.LatLng(
        dhakaBounds.northeast.lat,
        dhakaBounds.northeast.lng,
      ),
    );

    // Initialize Autocomplete
    const autoComplete = new google.maps.places.Autocomplete(
      autoCompleteRef.current,
      {
        bounds,
        componentRestrictions: { country: 'BD' },
      },
    );

    autoComplete.addListener('place_changed', () => {
      const place = autoComplete.getPlace();
      if (place.geometry?.location) {
        setInputValue(place.formatted_address || '');
        onSearch(place.geometry.location.toJSON());
      }
    });
  }, [isScriptLoaded, onSearch]);

  // Handle manual search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const place =
      autoCompleteRef.current &&
      new google.maps.places.Autocomplete(autoCompleteRef.current).getPlace();
    if (place && place.geometry?.location) {
      setInputValue(place.formatted_address || '');
      onSearch(place.geometry.location.toJSON());
    }
  };

  return (
    <div className="flex justify-center w-full">
      <form onSubmit={handleSearchSubmit} className="w-full">
        <div className="flex items-center w-full">
          {/* Bangladesh abbreviation (non-dropdown) */}
          <div className="flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center text-gray-500 bg-gray-100 border border-gray-300 rounded-s-lg hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-700 dark:text-white dark:border-gray-600">
            <span>BD</span>
          </div>

          {/* Search input */}
          <div className="relative flex-grow">
            <input
              ref={autoCompleteRef}
              id="location-search"
              type="search"
              className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-e-lg border-s-gray-50 border-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-s-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500"
              placeholder="Enter a city or address in Dhaka city"
              aria-label="Location"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              required
            />
            <button
              type="submit"
              className="absolute top-0 end-0 h-full p-2.5 text-sm font-medium text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
            >
              <svg
                className="w-4 h-4"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 20 20"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                />
              </svg>
              <span className="sr-only">Search</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
