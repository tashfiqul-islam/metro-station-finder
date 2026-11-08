import type { ThemePreference } from "../theme/theme";
import type { Snap } from "./sheet";

/** All fixed text of the layout shell (English only). Slices keep their own copy in their feature `copy.ts`. */
export const shellCopy = {
  home: "Metro Station Finder, home",
  brandName: ["Metro", "Station Finder"] as const,
  navLabel: "Sections",
  toastRegion: "Notifications",
  themeName: { system: "System", light: "Light", dark: "Dark" } as const satisfies Record<
    ThemePreference,
    string
  >,
  themeButton: (current: string, next: string): string => `Theme: ${current}. Switch to ${next}`,
  snapName: {
    peek: "peek height",
    half: "half height",
    full: "full height",
  } as const satisfies Record<Snap, string>,
  gripLabel: (snap: string): string => `Resize panel. Now ${snap}. Drag, or use the arrow keys.`,
  snapStatus: (snap: string): string => `Panel ${snap}`,
  smaller: "Make panel smaller",
  larger: "Make panel larger",
} as const;
