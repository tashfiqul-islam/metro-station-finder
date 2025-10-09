"use client";

import { useState } from "react";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";

/**
 * Demo component showcasing the Kibo UI ThemeSwitcher component.
 * Demonstrates both controlled and uncontrolled usage patterns.
 */
export function ThemeSwitcherDemo() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Uncontrolled Theme Switcher</h3>
        <p className="text-muted-foreground text-sm">
          Uses system default and manages its own state internally.
        </p>
        <ThemeSwitcher />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Controlled Theme Switcher</h3>
        <p className="text-muted-foreground text-sm">
          Controlled by parent component state. Current theme:{" "}
          <strong>{theme}</strong>
        </p>
        <ThemeSwitcher
          className="ring-2 ring-primary/20"
          onChange={setTheme}
          value={theme}
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Custom Styled Theme Switcher</h3>
        <p className="text-muted-foreground text-sm">
          Custom styling with larger size and different colors.
        </p>
        <ThemeSwitcher className="h-12 bg-gradient-to-r from-blue-500/10 to-purple-500/10 ring-2 ring-blue-500/20" />
      </div>
    </div>
  );
}
