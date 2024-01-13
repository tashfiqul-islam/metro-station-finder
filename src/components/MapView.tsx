/* eslint-disable consistent-return */
/* eslint-disable node/no-missing-import */
// MapView.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapScript } from '../utils/loadGoogleMapScript';
import { MetroStation } from '../utils/constants';

// Custom google map style
const customMapStyle: google.maps.MapTypeStyle[] = [
  {
    featureType: 'all',
    stylers: [
      {
        saturation: 0,
      },
      {
        hue: '#e7ecf0',
      },
    ],
  },
  {
    featureType: 'road',
    stylers: [
      {
        saturation: -70,
      },
    ],
  },
  {
    featureType: 'transit',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'poi',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'water',
    stylers: [
      {
        visibility: 'simplified',
      },
      {
        saturation: -60,
      },
    ],
  },
];

interface MapViewProps {
  userLocation: google.maps.LatLngLiteral | null;
  metroStation: MetroStation | null;
  onDistanceCalculated: (distance: number, unit: 'km' | 'miles') => void; // Callback for distance and unit
}

const MapView: React.FC<MapViewProps> = ({
  userLocation,
  metroStation,
  onDistanceCalculated,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Function to determine the unit based on distance in meters
  const determineUnit = useCallback((distanceInMeters: number) => {
    const threshold = 1000; // Threshold to switch between km and miles
    return distanceInMeters >= threshold ? 'km' : 'miles';
  }, []);

  // Effect to load and initialize the Google Map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    loadGoogleMapScript(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
      .then(() => {
        const initialCenter = { lat: 23.8103, lng: 90.4125 };
        const newMap = new google.maps.Map(mapRef.current!, {
          center: initialCenter,
          zoom: 12,
          styles: customMapStyle,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: false,
          keyboardShortcuts: false,
        });
        setMap(newMap);
      })
      .catch(error => {
        console.error('Error loading Google Maps:', error);
        // Display a user-friendly error message to the user.
      });
  }, []);

  // Effect to update markers, directions, and calculate distance
  useEffect(() => {
    if (!map || !userLocation || !metroStation) return;

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    const userMarker = new google.maps.Marker({
      position: userLocation,
      map,
      title: 'Your Location',
    });

    const metroMarker = new google.maps.Marker({
      position: { lat: metroStation.lat, lng: metroStation.lng },
      map,
      title: 'Nearest Metro Station',
    });

    const request = {
      origin: userLocation,
      destination: { lat: metroStation.lat, lng: metroStation.lng },
      travelMode: google.maps.TravelMode.WALKING,
    };

    directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        directionsRenderer.setDirections(result);
        const distanceInMeters =
          google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(userLocation),
            new google.maps.LatLng({
              lat: metroStation.lat,
              lng: metroStation.lng,
            }),
          );
        const unit = determineUnit(distanceInMeters);
        onDistanceCalculated(distanceInMeters, unit);
      } else {
        const friendlyErrorMessage =
          'Unable to find directions. Please try again.';
        console.error('Directions request failed due to', status);
        setErrorMessage(friendlyErrorMessage);
      }
    });

    return () => {
      userMarker.setMap(null);
      metroMarker.setMap(null);
      directionsRenderer.setMap(null);
      directionsService.route(request, undefined); // Cleanup DirectionsService
      directionsRenderer.setDirections(null); // Cleanup DirectionsRenderer
    };
  }, [map, userLocation, metroStation, determineUnit, onDistanceCalculated]);

  // CSS media query to adjust the map size for desktop screens
  const desktopStyles = `
@media (min-width: 768px) {
  #map {
    width: calc(225%);
  }
}
`;

  // CSS to add padding on left and right sides for mobile screens
  const mobileStyles = `
@media (max-width: 767px) {
  #map {
    width: calc(100% - 30px); /* 5px padding on each side */
    margin: 0 30px; /* Add margin to center the map */
  }
}
`;

  return (
    <div className="flex flex-col items-center">
      <div
        ref={mapRef}
        className="w-full h-96 mt-5 border border-gray-500 rounded-lg"
        id="map"
        style={{ height: '450px' }}
      ></div>
      <style>
        {desktopStyles}
        {mobileStyles}
      </style>
    </div>
  );
};

export default MapView;
