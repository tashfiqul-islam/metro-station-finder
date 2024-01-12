/* eslint-disable consistent-return */
/* eslint-disable node/no-missing-import */
// MapView.tsx
// This component displays a Google Map and manages rendering of locations and directions.

import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapScript } from '../utils/loadGoogleMapScript';
import { MetroStation } from '../utils/constants';

interface MapViewProps {
  userLocation: google.maps.LatLngLiteral | null;
  metroStation: MetroStation | null;
}

const MapView: React.FC<MapViewProps> = ({ userLocation, metroStation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();

  // Effect to load and initialize the Google Map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    loadGoogleMapScript(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
      .then(() => {
        const initialCenter = { lat: 23.8103, lng: 90.4125 }; // Dhaka's coordinates
        const newMap = new google.maps.Map(mapRef.current!, {
          center: initialCenter,
          zoom: 12,
        });

        setMap(newMap);
      })
      .catch(error => console.error('Error loading Google Maps:', error));
  }, []);

  // Effect to update markers and directions
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

    // Request and render directions
    directionsService.route(
      {
        origin: userLocation,
        destination: { lat: metroStation.lat, lng: metroStation.lng },
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(result);
        } else {
          console.error('Directions request failed due to ', status);
        }
      },
    );

    // Cleanup markers and directions renderer
    return () => {
      userMarker.setMap(null);
      metroMarker.setMap(null);
      directionsRenderer.setMap(null);
    };
  }, [map, userLocation, metroStation]);

  return (
    <div className="flex flex-col items-center">
      <div
        ref={mapRef}
        className="w-full h-96 mt-5 border border-gray-500 rounded-lg"
        id="map"
        style={{ width: 'calc(250%)' }}
      ></div>
    </div>
  );
};

export default MapView;
