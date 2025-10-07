import { useEffect, useState } from "react";
import { DHAKA_SERVICE_AREA } from "@/lib/constants";
import { GeolocationResultSchema } from "@/lib/schemas";
import type { Coordinates, Latitude, Longitude, Meters } from "@/lib/types";
import { calculateDistance } from "@/lib/utils/distance";

/**
 * Discriminated union for geolocation state.
 * Ensures type-safe handling of loading, success, and error states.
 */
type GeoState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | {
      readonly status: "success";
      readonly coords: Coordinates;
      readonly accuracy: number;
    }
  | { readonly status: "error"; readonly message: string };

/**
 * Requests user's current location via browser Geolocation API.
 * Validates results against schema and provides proximity checking utility.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ status: "error", message: "Geolocation unsupported" });
      return;
    }
    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Cast raw coordinates to branded types for type safety
        const coords = {
          lat: pos.coords.latitude as unknown as Latitude,
          lng: pos.coords.longitude as unknown as Longitude,
        } as Coordinates;
        // Validate geolocation result shape at runtime
        const parsed = GeolocationResultSchema.safeParse({
          id: "local",
          coordinates: coords,
          accuracy: Math.max(
            0,
            Number(pos.coords.accuracy ?? 0)
          ) as number as unknown as Meters,
          timestamp: Date.now() as unknown as number & {
            readonly __brand: "Milliseconds";
          },
          source: "geolocation",
          status: "success",
          processingTime: 0 as unknown as number & {
            readonly __brand: "Milliseconds";
          },
        });
        if (!parsed.success) {
          setState({ status: "error", message: "Invalid geolocation result" });
          return;
        }
        setState({
          status: "success",
          coords,
          accuracy: Number(parsed.data.accuracy),
        });
      },
      () => setState({ status: "error", message: "Permission denied" }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
    );
    return () => {
      // No explicit clear for getCurrentPosition
    };
  }, []);

  const isCloseTo = (target: Coordinates, radiusMeters: number) => {
    if (state.status !== "success") {
      return false;
    }
    const result = calculateDistance(state.coords, target);
    return result.success && result.distanceMeters <= radiusMeters;
  };

  return { state, isCloseTo } as const;
}

/**
 * Validate if coordinates are within the Dhaka service area (25 km radius).
 */
export function isWithinServiceArea(coords: Coordinates): boolean {
  const result = calculateDistance(coords, DHAKA_SERVICE_AREA.centroid);
  return (
    result.success && result.distanceMeters <= DHAKA_SERVICE_AREA.radiusMeters
  );
}
