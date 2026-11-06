import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

import { MAPS_VERSION } from "./config";

/** The parts of `@googlemaps/js-api-loader` v2 that are used, so a test can supply a fake. */
export interface LoaderDeps<Places, Routes> {
  readonly setOptions: (options: { key: string; v: string }) => void;
  readonly places: () => Promise<Places>;
  readonly routes: () => Promise<Routes>;
}

/**
 * Loads the Maps JavaScript API once. The first call sets the options (key and pinned version) and imports
 * the `places` and `routes` libraries together, so one script request serves both; every later call, a
 * StrictMode re-run or a remount returns the same promise. A failure is kept, not retried: a page reload is
 * the retry, because each attempt is another request to Google.
 */
export function createLoader<Places, Routes>(
  deps: LoaderDeps<Places, Routes>,
): (apiKey: string) => Promise<{ readonly places: Places; readonly routes: Routes }> {
  let loading: Promise<{ readonly places: Places; readonly routes: Routes }> | undefined;
  return (apiKey) => {
    loading ??= (async () => {
      deps.setOptions({ key: apiKey, v: MAPS_VERSION });
      const [places, routes] = await Promise.all([deps.places(), deps.routes()]);
      return { places, routes };
    })();
    return loading;
  };
}

export const loadLibraries = createLoader({
  setOptions,
  places: () => importLibrary("places"),
  routes: () => importLibrary("routes"),
});
