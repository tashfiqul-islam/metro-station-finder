import { useRef, useState } from "react";
import type { ReactElement } from "react";

import { Icon } from "../icons/Icon";
import type { IconShapes } from "../icons/Icon";
import { monitor } from "../icons/shapes/monitor";
import { moon } from "../icons/shapes/moon";
import { sun } from "../icons/shapes/sun";
import { shellCopy } from "../shell/copy";
import { applyPreference, nextPreference, readPreference, savePreference } from "./theme";
import type { ThemePreference } from "./theme";

const ICONS: Record<ThemePreference, IconShapes> = { system: monitor, light: sun, dark: moon };

/** Applies, saves and shows a preference. Idempotent, so a reveal that fails after running it is harmless. */
function applyTheme(next: ThemePreference, show: (preference: ThemePreference) => void): void {
  applyPreference(next, document.documentElement);
  savePreference(next);
  show(next);
}

/** Loads the reveal module and runs the change inside it; a module that cannot load (offline) still changes the theme. */
async function reveal(
  next: ThemePreference,
  show: (preference: ThemePreference) => void,
  origin: { readonly x: number; readonly y: number },
): Promise<void> {
  try {
    const { revealTheme } = await import("./reveal");
    await revealTheme(() => applyTheme(next, show), origin);
  } catch {
    applyTheme(next, show);
  }
}

/**
 * Header button: System, Light, Dark, System. The preference is read once from storage (the boot script has
 * already applied it to `<html>`), saved on change, and revealed with a View Transition where available (loaded
 * on first use). Each press cycles from the latest choice, kept in a ref, so presses made before React
 * re-renders move one step each. Known limitation (METRO-119, Confirmed with Playwright 1.64 on WebKit 27.2,
 * Chromium and Firefox): while the ~560 ms reveal runs, the `::view-transition` overlay takes hit-testing
 * (`document.elementFromPoint` returns `<html>`), so a press in that window never reaches the button and is
 * lost. `pointer-events: none` on the pseudo-elements does not lift it in Chromium or WebKit. The owner
 * accepted this on 2026-11-11; revisit only if real users hit it. The overlap in `reveal.ts` (the first
 * reveal's `finally` removes `html.vt-theme` while a second transition runs) is unreachable while presses
 * cannot get through.
 */
export function ThemeToggle(): ReactElement {
  const [preference, setPreference] = useState<ThemePreference>(() => readPreference());
  const latest = useRef(preference);
  const next = nextPreference(preference);

  function change(event: { currentTarget: HTMLElement }): void {
    const target = nextPreference(latest.current);
    latest.current = target;
    // Without the API, or under reduced motion, the change is immediate and the reveal module is never fetched.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!("startViewTransition" in document) || reduced) {
      applyTheme(target, setPreference);
      return;
    }
    const box = event.currentTarget.getBoundingClientRect();
    const origin = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    void reveal(target, setPreference, origin);
  }

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={shellCopy.themeButton(shellCopy.themeName[preference], shellCopy.themeName[next])}
      onClick={change}
    >
      <Icon icon={ICONS[preference]} />
    </button>
  );
}
