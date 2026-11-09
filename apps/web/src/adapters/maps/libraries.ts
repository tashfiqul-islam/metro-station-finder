import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

import { MAPS_VERSION } from "./config";

/** The parts of `@googlemaps/js-api-loader` v2 that are used, so a test can supply a fake. */
export interface LoaderDeps<Places, Routes> {
  readonly setOptions: (options: { key: string; v: string }) => void;
  readonly places: () => Promise<Places>;
  readonly routes: () => Promise<Routes>;
}

export interface Loader<Places, Routes> {
  readonly load: (apiKey: string) => Promise<{ readonly places: Places; readonly routes: Routes }>;
  /**
   * Forgets a failed load so the next `load` tries again. Called only when the connection returns (METRO-114);
   * options are set once, because the Google loader ignores a second `setOptions`.
   */
  readonly reset: () => void;
}

/**
 * Loads the Maps JavaScript API once, when the first caller asks (METRO-114: never at page load). The first call sets the options (key and pinned version) and imports
 * the `places` and `routes` libraries together, so one script request serves both; every later call, a
 * StrictMode re-run or a remount returns the same promise. A failure is kept, not retried: a page reload is
 * the retry, because each attempt is another request to Google.
 */
export function createLoader<Places, Routes>(
  deps: LoaderDeps<Places, Routes>,
): Loader<Places, Routes> {
  let loading: Promise<{ readonly places: Places; readonly routes: Routes }> | undefined;
  let optionsSet = false;
  return {
    load: (apiKey) => {
      loading ??= (async () => {
        if (!optionsSet) {
          optionsSet = true;
          deps.setOptions({ key: apiKey, v: MAPS_VERSION });
        }
        const [places, routes] = await Promise.all([deps.places(), deps.routes()]);
        return { places, routes };
      })();
      return loading;
    },
    reset: () => {
      loading = undefined;
    },
  };
}

const loader = createLoader({
  setOptions,
  places: () => importLibrary("places"),
  routes: () => importLibrary("routes"),
});

export const loadLibraries = loader.load;
export const resetLibraries = loader.reset;
