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

/**
 * Points every `meta[name=theme-color]` at the chosen theme (METRO-119). Each tag names its scheme
 * (`data-scheme`) and keeps its own colour in `data-system`, which nothing overwrites, because a chosen theme
 * overwrites `content` (including in `public/theme-boot.js`, before this code runs). The tags carry one colour
 * per `prefers-color-scheme`, which follows the OS: a chosen Light or Dark gives every tag that scheme's
 * colour, and System, or a theme with no tag of its own, gives each tag its own colour back. The boot script
 * applies the same rule on load; keep them identical.
 */
export function syncThemeColor(preference: ThemePreference, doc: Document): void {
  const tags = [...doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
  const chosen = tags.find((tag) => tag.dataset["scheme"] === preference);
  for (const tag of tags)
    tag.content = chosen?.dataset["system"] ?? tag.dataset["system"] ?? tag.content;
}

/** Reading `window.localStorage` itself can throw (blocked site data), so the access is guarded too. */
function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
