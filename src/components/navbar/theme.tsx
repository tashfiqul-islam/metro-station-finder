import { Menu } from "@base-ui/react";
import { Moon, Monitor, Sun } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type ThemeValue = "light" | "dark" | "system";

const THEME_KEY = "theme";

const THEME_OPTIONS = [
  { icon: Sun, label: "Light", value: "light" as const },
  { icon: Moon, label: "Dark", value: "dark" as const },
  { icon: Monitor, label: "System", value: "system" as const },
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
  const [theme, setTheme] = useState<ThemeValue>(getStoredTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    applyTheme(theme);
  }, [theme]);

  const handleChange = (newValue: ThemeValue | null) => {
    if (!newValue) {
      return;
    }
    setTheme(newValue);
    try {
      localStorage.setItem(THEME_KEY, newValue);
    } catch {
      // localStorage unavailable
    }
    applyTheme(newValue);
  };

  if (!mounted) {
    return null;
  }

  const CurrentIcon = THEME_OPTIONS.find((o) => o.value === theme)?.icon ?? Monitor;

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Change theme"
        className={cn(
          "group relative flex h-9 w-9 items-center justify-center rounded-full",
          "border border-input bg-background",
          "transition-all duration-200 hover:bg-accent/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        style={{
          backgroundColor: "var(--color-background)",
          borderColor: "var(--color-border)",
        }}
      >
        <CurrentIcon
          aria-hidden="true"
          className="h-4 w-4 transition-all duration-200 group-hover:scale-110"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner>
          <Menu.Popup
            className={cn(
              "min-w-[7rem] rounded-lg border border-border p-1 shadow-md",
              "bg-background text-foreground",
              "z-[9999]",
            )}
            style={{
              backgroundColor: "var(--color-background)",
              borderColor: "var(--color-border)",
            }}
          >
            <Menu.RadioGroup value={theme} onValueChange={handleChange}>
              {THEME_OPTIONS.map(({ label, value, icon: Icon }) => (
                <Menu.RadioItem
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                    "transition-colors duration-150 hover:bg-accent/50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "data-[highlighted]:bg-accent/50",
                  )}
                  key={value}
                  value={value}
                >
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                  {label}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
};
