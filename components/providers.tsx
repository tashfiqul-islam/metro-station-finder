"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";

/**
 * Root providers wrapper for the application.
 * Combines Google Maps API and theme providers in a single Client Component.
 *
 * @param children - The application content to wrap
 */
export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <APIProvider
      apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}
      language="en"
      libraries={["places", "geometry", "marker"]}
      region="BD"
    >
      <ThemeProvider>{children}</ThemeProvider>
    </APIProvider>
  );
}
