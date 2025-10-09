"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";

type ThemeProps = {
  className?: string;
};

export const Theme = ({ className }: ThemeProps) => {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const { setTheme: applyTheme } = useTheme();

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
        setTheme(t);
        applyTheme(t);
      }}
      value={theme}
    />
  );
};
