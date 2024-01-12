// utils/loadGoogleMapScript.ts

/**
 * This flag is used to track the status of the Google Maps script loading.
 * It prevents redundant script loading and ensures consistent behavior.
 */
let isScriptLoaded = false;
let isScriptBeingLoaded = false;
/**
 * Dynamically loads the Google Maps JavaScript API script with the Places Library.
 * This function ensures efficient and consistent loading across components.
 * It uses a promise-based approach for better async handling.
 *
 * @param apiKey Your Google Maps API Key.
 * @returns A promise that resolves when the script has loaded.
 */
export const loadGoogleMapScript = (apiKey: string): Promise<void> =>
  new Promise((resolve, reject) => {
    // Early return if the script is already loaded, improving load efficiency.
    if (isScriptLoaded) {
      resolve();
      return;
    }

    // check if script is being loaded
    const checkIfScriptIsBeingLoaded = () => {
      if (isScriptBeingLoaded) {
        setTimeout(checkIfScriptIsBeingLoaded, 200);
      } else {
        if (isScriptLoaded) {
          resolve();
        } else {
          loadTheScript();
        }
      }
    };
    checkIfScriptIsBeingLoaded();

    function loadTheScript() {
      isScriptBeingLoaded = true;

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true; // Asynchronous loading for non-blocking behavior.
      script.defer = true; // Defer loading to improve page render time.

      // Append the script to the document head for immediate processing.
      document.head.appendChild(script);

      // Event listener for successful script loading.
      script.onload = () => {
        isScriptLoaded = true; // Update the flag upon successful loading.
        isScriptBeingLoaded = false;
        resolve(); // Resolve the promise, indicating script readiness.
      };

      // Error handling for script loading failures.
      script.onerror = () => {
        isScriptBeingLoaded = false;
        reject(new Error('Google Maps API script failed to load.')); // Reject the promise with an error message.
      };
    }

    // Create a script element for the Google Maps API, ensuring efficient loading.
  });
