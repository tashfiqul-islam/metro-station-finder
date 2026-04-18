import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ThemeValue = "light" | "dark" | "system";

const THEME_KEY = "theme";

const THEME_OPTIONS = [
  { icon: SunIcon, label: "Light theme", value: "light" as const },
  { icon: MonitorIcon, label: "System theme", value: "system" as const },
  { icon: MoonIcon, label: "Dark theme", value: "dark" as const },
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

export const Theme = () => {
  const [theme, setTheme] = useState<ThemeValue>("system");
  const [mounted, setMounted] = useState(false);
  const isFirstMount = useRef(true);

  useEffect(() => {
    setTheme(getStoredTheme());
    setMounted(true);
  }, []);

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
    isFirstMount.current = false;
    setTheme(value);
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      // localStorage unavailable
    }
    applyTheme(value);
  };

  // Stable placeholder — same size as the real control, invisible.
  // Prevents navbar layout shift while the component hydrates.
  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="flex h-9 w-24 rounded-full border border-border/60 bg-muted/50 opacity-0"
      />
    );
  }

  return (
    <div
      aria-label="Theme selector"
      className="relative flex h-9 items-center gap-0.5 rounded-full border border-border/60 bg-muted/50 p-1 shadow-inner"
      role="group"
    >
      {THEME_OPTIONS.map(({ icon: Icon, label, value }) => {
        const isActive = theme === value;
        return (
          <button
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
              "group relative flex h-7 w-7 items-center justify-center rounded-full",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            )}
            key={value}
            onClick={() => handleTheme(value)}
            type="button"
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full bg-background shadow-md"
                layoutId="activeTheme"
                transition={
                  isFirstMount.current
                    ? { duration: 0 }
                    : { damping: 20, duration: 0.4, stiffness: 300, type: "spring" }
                }
              />
            )}
            <Icon
              aria-hidden="true"
              className={cn(
                "relative z-10 h-4 w-4 transition-all duration-200",
                isActive
                  ? "scale-110"
                  : "text-muted-foreground/60 group-hover:scale-105 group-hover:text-muted-foreground",
              )}
              style={isActive ? { color: "var(--color-primary)" } : undefined}
              weight={isActive ? "fill" : "regular"}
            />
          </button>
        );
      })}
    </div>
  );
};
