"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/app/_components/shared/kibo-ui/theme-switcher";
import { useViewTransitions } from "@/lib/hooks/transitions/use-view-transitions";

type ThemeProps = {
  className?: string;
};

export const Theme = ({ className }: ThemeProps) => {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const { setTheme: applyTheme } = useTheme();
  const { startPageTransition } = useViewTransitions();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeSwitcher
      className={className ?? ""}
      defaultValue="system"
      onChange={(t) => {
        startPageTransition(() => {
          setTheme(t);
          applyTheme(t);
        });
      }}
      value={theme}
    />
  );
};
