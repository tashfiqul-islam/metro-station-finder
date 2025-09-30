import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

/**
 * Manages theme state with system preference detection.
 * Applies theme by toggling the "dark" class on the root element.
 * "system" mode respects prefers-color-scheme media query.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const root = document.documentElement;
    let resolved: "light" | "dark";

    // Resolve "system" to actual light/dark based on user preference
    if (theme === "system") {
      const prefersDark = window.matchMedia?.(
        "(prefers-color-scheme: dark)"
      ).matches;
      resolved = prefersDark ? "dark" : "light";
    } else {
      resolved = theme;
    }

    root.classList.toggle("dark", resolved === "dark");
  }, [theme]);

  return { theme, setTheme } as const;
}
