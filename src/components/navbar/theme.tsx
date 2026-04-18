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

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-[4.75rem] rounded-full opacity-0"
        style={{
          backgroundColor: "var(--color-background)",
          border: "1px solid var(--color-border)",
        }}
      />
    );
  }

  return (
    <div
      aria-label="Theme selector"
      className="relative isolate flex h-9 items-center justify-center rounded-full p-1"
      role="group"
      style={{
        backgroundColor: "var(--color-background)",
        border: "1px solid var(--color-border)",
      }}
    >
      {THEME_OPTIONS.map(({ icon: Icon, label, value }) => {
        const isActive = theme === value;
        return (
          <button
            aria-label={label}
            aria-pressed={isActive}
            className="group relative flex h-7 w-7 items-center justify-center rounded-full"
            key={value}
            onClick={() => handleTheme(value)}
            style={{ background: "none", border: "none", padding: 0 }}
            type="button"
          >
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-full shadow-sm"
                layoutId="activeTheme"
                style={{ backgroundColor: "var(--color-muted)" }}
                transition={
                  isFirstMount.current ? { duration: 0 } : { duration: 0.5, type: "spring" }
                }
              />
            )}
            <Icon
              aria-hidden="true"
              className={cn(
                "relative z-10 h-4 w-4 transition-all duration-200",
                isActive ? "scale-110" : "group-hover:scale-110",
              )}
              style={{
                color: isActive ? "var(--color-primary)" : "var(--color-muted-foreground)",
              }}
              weight={isActive ? "fill" : "regular"}
            />
          </button>
        );
      })}
    </div>
  );
};
