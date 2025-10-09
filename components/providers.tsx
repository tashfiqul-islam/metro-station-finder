"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

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
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        disableTransitionOnChange
        enableSystem
      >
        {children}
      </NextThemesProvider>
    </APIProvider>
  );
}
