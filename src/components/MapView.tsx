/* eslint-disable consistent-return */
/* eslint-disable node/no-missing-import */
// MapView.tsx
// This component displays a Google Map and manages rendering of locations,
// directions, and calculates the distance from the user's location to the nearest metro station.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadGoogleMapScript } from '../utils/loadGoogleMapScript';
import { MetroStation } from '../utils/constants';

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
        });
        setMap(newMap);
      })
      .catch(error => console.error('Error loading Google Maps:', error));
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

    directionsService.route(
      {
        origin: userLocation,
        destination: { lat: metroStation.lat, lng: metroStation.lng },
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
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
          console.error('Directions request failed due to ', status);
        }
      },
    );

    return () => {
      userMarker.setMap(null);
      metroMarker.setMap(null);
      directionsRenderer.setMap(null);
    };
  }, [map, userLocation, metroStation, determineUnit, onDistanceCalculated]);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={mapRef}
        className="w-full h-96 mt-5 border border-gray-500 rounded-lg"
        id="map"
        style={{ width: 'calc(225%)', height: '450px' }}
      ></div>
    </div>
  );
};

export default MapView;
