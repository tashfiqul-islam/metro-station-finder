import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const read = (): boolean => navigator.onLine;
// Rendered without a browser (no window), search is assumed available; the real app always has one.
const readServer = (): boolean => true;

/**
 * Whether the browser reports a connection (`navigator.onLine`), kept current by the `online` and `offline`
 * events. A browser that says online can still have no route to Google (the load then fails visibly), and
 * one that says offline is believed: place search is not offered.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, read, readServer);
}
