import { useEffect, useState } from "react";

export type GeolocationPermissionState = "prompt" | "granted" | "denied" | "unsupported";

/**
 * Monitors geolocation permission state and reacts to changes.
 * Automatically updates when the user grants or denies permission.
 */
export function useGeolocationPermission(): GeolocationPermissionState {
  const [state, setState] = useState<GeolocationPermissionState>("prompt");

  useEffect(() => {
    if (typeof navigator === "undefined" || !("permissions" in navigator)) {
      setState("unsupported");
      return;
    }
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    // Query permission API and listen for state changes
    (async () => {
      try {
        const status = await (
          navigator as Navigator & {
            permissions: {
              query: (opts: {
                name: PermissionName | "geolocation";
              }) => Promise<PermissionStatus & { state: GeolocationPermissionState }>;
            };
          }
        ).permissions.query({ name: "geolocation" });
        if (cancelled) {
          return;
        }
        setState(status.state as GeolocationPermissionState);
        const listener = () => setState(status.state as GeolocationPermissionState);
        status.addEventListener("change", listener);
        cleanup = () => status.removeEventListener("change", listener);
      } catch {
        if (!cancelled) {
          setState("unsupported");
        }
      }
    })();
    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return state;
}
