/* eslint-disable node/no-missing-import */
import { MetroStation, metroStations } from '../types'; // Import the MetroStation type and predefined stations

/**
 * Geocode an address using Google Maps Geocoding API
 * @param address - The address to be geocoded
 * @returns A promise that resolves to the geocoded location (latitude and longitude)
 */
export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number }> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address,
  )}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK' && data.results.length > 0) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } else {
    throw new Error('Geocoding failed or no results found');
  }
}

/**
 * Find the nearest metro station to a given location
 * @param location - The user's current location
 * @returns The nearest metro station
 */
export function findNearestMetro(location: {
  lat: number;
  lng: number;
}): MetroStation {
  let nearestStation: MetroStation | null = null;
  let shortestDistance = Number.MAX_VALUE;

  metroStations.forEach(station => {
    const distance = calculateDistance(location, {
      lat: station.lat,
      lng: station.lng,
    });
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestStation = station;
    }
  });

  if (!nearestStation) {
    throw new Error('No metro stations found');
  }

  return nearestStation;
}

/**
 * Calculate the distance between two locations using the Haversine formula
 * @param location1 - First location
 * @param location2 - Second location
 * @returns The distance in kilometers
 */
function calculateDistance(
  location1: { lat: number; lng: number },
  location2: { lat: number; lng: number },
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = degreesToRadians(location2.lat - location1.lat);
  const dLng = degreesToRadians(location2.lng - location1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(location1.lat)) *
      Math.cos(degreesToRadians(location2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Convert degrees to radians
 * @param degrees - The angle in degrees
 * @returns The angle in radians
 */
function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
