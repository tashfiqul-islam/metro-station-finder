/** localStorage key. `public/theme-boot.js` reads the same key before first paint; keep them identical. */
export const THEME_KEY = "msf-theme";

export type ThemePreference = "system" | "light" | "dark";

/** The header button cycles in this order: System, Light, Dark, System. */
export const THEME_ORDER = [
  "system",
  "light",
  "dark",
] as const satisfies readonly ThemePreference[];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

const NEXT: Record<ThemePreference, ThemePreference> = {
  system: "light",
  light: "dark",
  dark: "system",
};

export const nextPreference = (current: ThemePreference): ThemePreference => NEXT[current];

/** The saved preference. Blocked or throwing storage, a missing key or a stray value all read as "system". */
export function readPreference(
  storage: Pick<Storage, "getItem"> | null = safeStorage(),
): ThemePreference {
  try {
    const saved = storage?.getItem(THEME_KEY);
    return isThemePreference(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

/** Saves the preference; a blocked store is ignored, the choice then lasts for this page only. */
export function savePreference(
  preference: ThemePreference,
  storage: Pick<Storage, "setItem"> | null = safeStorage(),
): void {
  try {
    storage?.setItem(THEME_KEY, preference);
  } catch {
    // Storage blocked or full: the theme still applies to this page.
  }
}

/** "light" and "dark" set `data-theme`; "system" removes it so `prefers-color-scheme` decides (tokens.css). */
export function applyPreference(preference: ThemePreference, root: HTMLElement): void {
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
  syncThemeColor(preference, root.ownerDocument);
}

/** A tag's own (System) colour, remembered on first sight because a chosen theme overwrites `content`. */
const own = (tag: HTMLMetaElement): string => (tag.dataset["system"] ??= tag.content);

/**
 * Points every `meta[name=theme-color]` at the chosen theme (METRO-119). The tags carry one colour per
 * `prefers-color-scheme`, which follows the OS; a chosen Light or Dark gives both tags that theme's colour, and
 * System gives each back its own. The page colours are read from the tags themselves, so no colour is repeated
 * here. `public/theme-boot.js` applies the same rule before first paint; keep them identical.
 */
export function syncThemeColor(preference: ThemePreference, doc: Document): void {
  const colours: Record<string, string> = {};
  const tags = [...doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  for (const tag of tags)
    colours[(tag.getAttribute("media") ?? "").includes("dark") ? "dark" : "light"] = own(tag);
  for (const tag of tags) tag.content = colours[preference] ?? own(tag);
}

/** Reading `window.localStorage` itself can throw (blocked site data), so the access is guarded too. */
function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
