import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMapScript } from '../utils/loadGoogleMapScript';
import { MetroStation } from '../types'; // Ensure this type is properly defined in your types file

interface MapViewProps {
  userLocation: { lat: number; lng: number } | null;
  metroStation: MetroStation | null;
}

const MapView: React.FC<MapViewProps> = ({ userLocation, metroStation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();

  // Effect for initializing the Google Map
  useEffect(() => {
    if (userLocation) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      loadGoogleMapScript(apiKey)
        .then(() => {
          // Initialize the Google Map
          const newMap = new google.maps.Map(mapRef.current!, {
            center: userLocation,
            zoom: 12,
          });
          setMap(newMap);
        })
        .catch(error => console.error('Error loading Google Maps:', error));
    }
  }, [userLocation]);

  // Effect for updating markers when the map, user location, or metro station change
  useEffect(() => {
    if (map && userLocation && metroStation) {
      // Create a marker for the user's location
      const userMarker = new google.maps.Marker({
        position: userLocation,
        map,
        title: 'Your Location',
      });

      // Create a marker for the metro station
      const metroMarker = new google.maps.Marker({
        position: { lat: metroStation.lat, lng: metroStation.lng },
        map,
        title: metroStation.name,
      });

      // Fit the map to show both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(userMarker.getPosition()!);
      bounds.extend(metroMarker.getPosition()!);
      map.fitBounds(bounds);
    }
  }, [map, userLocation, metroStation]);

  return (
    <div className="flex flex-col items-center">
      <div ref={mapRef} className="w-full h-96 mt-5" id="map" />
    </div>
  );
};

export default MapView;
