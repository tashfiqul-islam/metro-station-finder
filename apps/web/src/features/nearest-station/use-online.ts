import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  return () => window.removeEventListener("online", onChange);
}

const read = (): boolean => navigator.onLine;

/**
 * Whether the browser reports a connection (`navigator.onLine`), read at every render and re-read when the
 * `online` event fires, so the plain input comes back when the connection does (METRO-114). It listens for
 * nothing else: losing the connection later is seen at the next render, and a failed load covers the rest. (The
 * built-output test of METRO-112 forbids the word for the opposite event in any shipped script, until the cache
 * of METRO-106 exists.) A browser that says online can still have no route to Google (the load then fails
 * visibly); one that says it has no connection is believed: place search is not offered.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, read);
}
