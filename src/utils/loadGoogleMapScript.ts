// utils/loadGoogleMapScript.ts

// This flag will be set to true once the script is loaded to avoid reloading.
let isScriptLoaded = false;

/**
 * Dynamically loads the Google Maps JavaScript API script with the Places Library.
 * @param apiKey Your Google Maps API Key.
 * @returns A promise that resolves when the script has loaded.
 */
export const loadGoogleMapScript = (apiKey: string): Promise<void> =>
  new Promise((resolve, reject) => {
    // Check if the script is already loaded
    if (isScriptLoaded) {
      resolve();
      return;
    }

    // Create a script element for Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true; // Load script asynchronously
    script.defer = true; // Defer script loading until HTML parsing is complete

    // Append the script to the document head
    document.head.appendChild(script);

    // Handle script load event
    script.onload = () => {
      isScriptLoaded = true; // Set the flag to true as the script is loaded
      resolve(); // Resolve the promise indicating successful loading
    };

    // Handle script error event
    script.onerror = () => {
      reject(new Error('Google Maps API script failed to load.')); // Reject the promise on error
    };
  });
