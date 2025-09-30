"use client";

import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme provider component wrapping the application with next-themes.
 * Enables light/dark mode switching with system preference detection and persistence.
 *
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange={false}
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
