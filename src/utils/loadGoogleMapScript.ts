// This flag will be set to true once the script is loaded to avoid reloading.
let isScriptLoaded = false;

/**
 * Dynamically loads the Google Maps JavaScript API script.
 * @param apiKey Your Google Maps API Key.
 * @returns A promise that resolves when the script has loaded.
 */
export const loadGoogleMapScript = (apiKey: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If the script is already loaded, resolve immediately
    if (isScriptLoaded) {
      resolve();
      return;
    }

    // Create a script element and set its attributes for Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;

    // Append the script to the document head
    document.head.appendChild(script);

    // Resolve the promise once the script is loaded
    script.onload = () => {
      isScriptLoaded = true;
      resolve();
    };

    // Reject the promise if there is an error loading the script
    script.onerror = error => {
      reject(new Error('Google Maps API script failed to load.'));
    };
  });
};
