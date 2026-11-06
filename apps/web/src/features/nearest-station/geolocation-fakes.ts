/** Test doubles for the browser Geolocation API, shared by this feature's tests. Synthetic values only. */

export function fakePosition(latitude: number, longitude: number): GeolocationPosition {
  const coords: GeolocationCoordinates = {
    latitude,
    longitude,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON: () => ({}),
  };
  return { coords, timestamp: 0, toJSON: () => ({}) };
}

/** `code` 1 is permission denied, 2 position unavailable, 3 timeout. */
export function fakePositionError(code: 1 | 2 | 3): GeolocationPositionError {
  return {
    code,
    message: "synthetic",
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  };
}
