import { MonitorIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { startTransition, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ThemeValue = "light" | "dark" | "system";

const THEME_KEY = "theme";

const THEME_OPTIONS = [
  { icon: SunIcon, label: "Light theme", value: "light" as const },
  { icon: MonitorIcon, label: "System theme", value: "system" as const },
  { icon: MoonIcon, label: "Dark theme", value: "dark" as const },
] as const;

const THEME_CELL_SIZE = 28;
const THEME_GAP = 2;
const THEME_PADDING = 4;
const noop = () => void 0;

const getThemeIndex = (theme: ThemeValue): number =>
  THEME_OPTIONS.findIndex((option) => option.value === theme);

const getStoredTheme = (): ThemeValue => {
  /* v8 ignore next -- browserless guard */
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
  html.style.colorScheme = effective;
  html.classList.remove("light", "dark");
  html.classList.add(effective);
};

export const disableTransitionsTemporarily = (): (() => void) => {
  if (typeof document === "undefined") {
    return noop;
  }

  const style = document.createElement("style");
  style.dataset["themeTransition"] = "true";
  style.append(
    document.createTextNode(
      `*,*::before,*::after{-webkit-transition:none!important;transition:none!important}`,
    ),
  );

  document.head.append(style);

  if (typeof window !== "undefined") {
    window.getComputedStyle(document.body);
  }

  return () => {
    style.remove();
  };
};

export const transitionTheme = (theme: ThemeValue): void => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    applyTheme(theme);
    return;
  }

  const restoreTransitions = disableTransitionsTemporarily();
  applyTheme(theme);
  setTimeout(restoreTransitions, 0);
};

export const Theme = () => {
  const [theme, setTheme] = useState<ThemeValue>(() => getStoredTheme());
  const [mounted, setMounted] = useState(false);
  const activeIndex = getThemeIndex(theme);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    /* v8 ignore next -- browserless guard */
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
    startTransition(() => {
      setTheme(value);
    });
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch {
      // localStorage unavailable
    }
    transitionTheme(value);
  };

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="h-9 w-24 rounded-full border border-border/45 bg-background/72 opacity-0 backdrop-blur-sm dark:bg-background/48"
      />
    );
  }

  return (
    <div
      aria-label="Theme selector"
      className="relative isolate inline-flex h-9 items-center rounded-full border border-border/45 bg-background/72 backdrop-blur-sm dark:bg-background/48"
      role="group"
      style={{
        gap: `${THEME_GAP}px`,
        padding: `${THEME_PADDING}px`,
      }}
    >
      <div
        aria-hidden="true"
        className="absolute left-0 top-1/2 rounded-full border bg-background transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
        style={{
          borderColor: "var(--color-border)",
          height: `${THEME_CELL_SIZE}px`,
          transform: `translate3d(${THEME_PADDING + activeIndex * (THEME_CELL_SIZE + THEME_GAP)}px, -50%, 0)`,
          width: `${THEME_CELL_SIZE}px`,
        }}
      />
      {THEME_OPTIONS.map(({ icon: Icon, label, value }) => {
        const isActive = theme === value;
        return (
          <button
            aria-label={label}
            aria-pressed={isActive}
            className="group relative z-10 flex items-center justify-center rounded-full"
            key={value}
            onClick={() => handleTheme(value)}
            style={{
              background: "none",
              border: "none",
              height: `${THEME_CELL_SIZE}px`,
              padding: 0,
              width: `${THEME_CELL_SIZE}px`,
            }}
            type="button"
            data-theme-option={value}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                "relative z-10 h-3.75 w-3.75 transition-[transform,color,opacity] duration-200",
                isActive ? "scale-100" : "group-hover:scale-105",
              )}
              style={{
                color: isActive ? "var(--color-primary)" : "var(--color-muted-foreground)",
                opacity: isActive ? 1 : 0.68,
              }}
              weight={isActive ? "fill" : "regular"}
            />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
