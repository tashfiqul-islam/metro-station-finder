"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { lazy, type ReactNode, Suspense } from "react";

/**
 * Lazy-loaded Google Maps provider to avoid blocking bfcache.
 * Only loads when actually needed for map functionality.
 */
const LazyMapProvider = lazy(() =>
  Promise.resolve({
    default: ({ children }: { readonly children: ReactNode }) => (
      <APIProvider
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
        language="en"
        libraries={["places"]}
        region="BD"
      >
        {children}
      </APIProvider>
    ),
  })
);

/**
 * Lazy map provider with fallback for better bfcache compatibility.
 */
export function LazyMapProviderWrapper({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <Suspense fallback={<div>{children}</div>}>
      <LazyMapProvider>{children}</LazyMapProvider>
    </Suspense>
  );
}
