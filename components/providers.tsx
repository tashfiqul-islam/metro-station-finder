"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Root providers wrapper for the application.
 * Only includes theme provider to avoid blocking bfcache with Google Maps.
 * Google Maps is loaded lazily when needed.
 *
 * @param children - The application content to wrap
 */
export function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}
