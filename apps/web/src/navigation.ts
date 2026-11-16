import { useSyncExternalStore } from "react";

/**
 * Client-side navigation on the History API, no library (METRO-159). The pathname is the one piece of
 * state: it is read from `location`, changed by the browser's Back and Forward (`popstate`); in-app links arrive with the tab bar (planning#160).
 */
function subscribe(listener: () => void): () => void {
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener("popstate", listener);
  };
}

const pathname = (): string => window.location.pathname;

/** The current pathname; re-renders its component when it changes. */
export function usePathname(): string {
  return useSyncExternalStore(subscribe, pathname);
}
