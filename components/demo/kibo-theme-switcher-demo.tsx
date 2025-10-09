"use client";

import { useState } from "react";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";

/**
 * Demo component showing the Kibo UI theme switcher in controlled mode
 * This matches the exact pattern from Kibo UI documentation
 */
export function KiboThemeSwitcherDemo() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  return (
    <div className="space-y-4">
      <div className="text-muted-foreground text-sm">
        Current theme: <span className="font-medium">{theme}</span>
      </div>
      <ThemeSwitcher defaultValue="system" onChange={setTheme} value={theme} />
    </div>
  );
}
