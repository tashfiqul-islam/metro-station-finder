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
    loadGoogleMapScript(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
      .then(() => setIsScriptLoaded(true))
      .catch(error => console.error('Error loading Google Maps:', error));
  }, []);

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
    <div
      className="flex justify-center items-center w-full py-4 bg-white shadow-md"
      style={{ width: 'calc(150%)', margin: '0 auto', marginLeft: '-150px' }}
    >
      <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl px-4">
        <div className="flex items-center border-b-2 border-teal-500">
          <input
            ref={autoCompleteRef}
            className="appearance-none bg-transparent border-none flex-grow text-gray-700 mr-3 py-2 px-4 leading-tight focus:outline-none"
            type="text"
            placeholder="Enter a location in Dhaka"
            aria-label="Location"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
          />
          <button
            className="flex-shrink-0 bg-teal-500 hover:bg-teal-700 border-teal-500 hover:border-teal-700 text-sm border-4 text-white py-2 px-4 rounded"
            type="submit"
            style={{ marginLeft: '10px', width: '90px' }}
          >
            Search
          </button>
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
