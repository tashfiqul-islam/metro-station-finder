"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Available theme options for the application.
 * Includes explicit themes and system preference detection.
 */
type Theme = "light" | "dark" | "system";

/**
 * Human-readable labels for each theme option.
 * Used in the theme selection dropdown menu.
 */
const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
} as const;

/**
 * Icon components mapped to each theme option.
 * Used for visual representation in the theme toggle button.
 */
const THEME_ICONS: Record<
  Theme,
  React.ComponentType<{ className?: string }>
> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

/**
 * Theme toggle component supporting light, dark, and system preferences.
 * Persists user selection across sessions using next-themes.
 *
 * @example
 * ```tsx
 * <ThemeToggle />
 * ```
 */
export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Wait for client-side hydration to avoid mismatch between server and client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  // Show placeholder during initial render to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        aria-label="Toggle theme"
        className="h-9 w-9 rounded-lg"
        disabled
        size="icon"
        variant="ghost"
      >
        <Sun aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">Loading theme toggle...</span>
      </Button>
    );
  }

  const currentTheme = theme as Theme | undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Current theme: ${currentTheme ? THEME_LABELS[currentTheme] : "System"}. Click to change theme.`}
          className={cn(
            "relative h-9 w-9 rounded-lg border border-border/50 bg-background/50 backdrop-blur-sm",
            "transition-all duration-200 ease-out",
            "hover:border-border hover:bg-accent hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          size="icon"
          variant="ghost"
        >
          <Sun
            aria-hidden="true"
            className={cn(
              "h-4 w-4 rotate-0 scale-100 transition-all duration-300 ease-out",
              "dark:-rotate-90 dark:scale-0"
            )}
          />
          <Moon
            aria-hidden="true"
            className={cn(
              "absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 ease-out",
              "dark:rotate-0 dark:scale-100"
            )}
          />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          "min-w-[160px] rounded-xl border border-border/50 bg-background/95 shadow-lg backdrop-blur-sm",
          "fade-in slide-in-from-top-2 animate-in duration-200"
        )}
      >
        {(["light", "dark", "system"] as const).map((themeOption) => {
          const Icon = THEME_ICONS[themeOption];
          const isActive = currentTheme === themeOption;

          return (
            <DropdownMenuItem
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
                "transition-colors duration-200",
                "hover:bg-accent focus:bg-accent",
                isActive && "bg-accent/50 font-medium"
              )}
              key={themeOption}
              onClick={() => handleThemeChange(themeOption)}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span>{THEME_LABELS[themeOption]}</span>
              {isActive && (
                <div
                  aria-hidden="true"
                  className="zoom-in ml-auto h-2 w-2 animate-in rounded-full bg-primary duration-200"
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
