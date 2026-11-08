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
}

/** Reading `window.localStorage` itself can throw (blocked site data), so the access is guarded too. */
function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export interface RevealOrigin {
  readonly x: number;
  readonly y: number;
}

export const REVEAL_MS = 560;

/** The part of `Document` the reveal uses; a test can pass a plain object. */
export interface TransitionHost {
  readonly documentElement: HTMLElement;
  readonly startViewTransition?: (update: () => void) => {
    readonly ready: Promise<unknown>;
    readonly finished: Promise<unknown>;
  };
}

/**
 * Runs `change` (which flips the theme). Where the View Transitions API exists and motion is allowed, the new
 * theme is revealed as a circle growing from `origin` over 560 ms; `html.vt-theme` pauses the page's own
 * animations meanwhile (base.css). Anywhere else the theme switches at once. Web-verified 2026-11-08 (MDN):
 * `startViewTransition` is Baseline 2025 (newly available) and feature-detected here; the callback runs
 * even when the transition is skipped (MDN is silent, the spec says so: Unverified here). Animating the
 * `::view-transition-new(root)` pseudo-element through `pseudoElement` is the standard WAAPI form.
 */
export async function revealTheme(
  change: () => void,
  origin: RevealOrigin,
  doc: TransitionHost = document,
): Promise<void> {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = doc.startViewTransition;
  if (typeof start !== "function" || reduced) {
    change();
    return;
  }
  const root = doc.documentElement;
  let applied = false;
  const apply = (): void => {
    applied = true;
    change();
  };
  root.classList.add("vt-theme");
  try {
    const transition = start.call(doc, apply);
    await transition.ready;
    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    );
    root.animate(
      {
        clipPath: [
          `circle(0px at ${origin.x}px ${origin.y}px)`,
          `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
        ],
      },
      {
        duration: REVEAL_MS,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
        pseudoElement: "::view-transition-new(root)",
      },
    );
    await transition.finished;
  } catch {
    // The transition was skipped or aborted (a second toggle, a hidden tab). Make sure the change ran.
    if (!applied) change();
  } finally {
    root.classList.remove("vt-theme");
  }
}
