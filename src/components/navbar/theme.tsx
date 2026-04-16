import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ThemeValue = "light" | "dark" | "system";

const THEME_KEY = "theme";

const THEME_OPTIONS = [
  { icon: SunIcon, label: "Light", value: "light" as const },
  { icon: MonitorIcon, label: "System", value: "system" as const },
  { icon: MoonIcon, label: "Dark", value: "dark" as const },
] as const;

const getStoredTheme = (): ThemeValue => {
  if (typeof window === "undefined") {
    return "system";
  }
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return "system";
};

const getSystemTheme = (): "light" | "dark" =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

export const applyTheme = (theme: ThemeValue): void => {
  if (typeof document === "undefined") {
    return;
  }
  const effective = theme === "system" ? getSystemTheme() : theme;
  const html = document.documentElement;
  html.dataset["theme"] = effective;
  html.classList.remove("light", "dark");
  html.classList.add(effective);
};

// Runs synchronously before paint on the client, falls back to useEffect on server.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export const Theme = () => {
  const [theme, setTheme] = useState<ThemeValue>("system");
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    setMounted(true);
  }, []);

  // Re-apply when system preference changes while "system" mode is active.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const handleTheme = (value: ThemeValue) => {
    setTheme(value);
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      // localStorage unavailable
    }
    applyTheme(value);
  };

  return (
    <div
      aria-label="Theme selector"
      className="flex h-8 items-center gap-0.5 rounded-full border border-border/60 bg-background/60 p-0.5 shadow-sm backdrop-blur-sm"
      role="group"
      suppressHydrationWarning
    >
      {THEME_OPTIONS.map(({ icon: Icon, label, value }) => {
        const isActive = mounted && theme === value;
        return (
          <button
            aria-label={`${label} theme`}
            aria-pressed={isActive}
            className={cn(
              "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            key={value}
            onClick={() => handleTheme(value)}
            suppressHydrationWarning
            type="button"
          >
            <Icon
              aria-hidden="true"
              className="h-3.5 w-3.5"
              weight={isActive ? "fill" : "regular"}
            />
          </button>
        );
      })}
    </div>
  );
};
