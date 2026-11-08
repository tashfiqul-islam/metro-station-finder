import { useState } from "react";
import type { ReactElement } from "react";

import { Icon } from "../icons/Icon";
import { monitor, moon, sun } from "../icons/icon-data";
import type { IconShapes } from "../icons/icon-data";
import { shellCopy } from "../shell/copy";
import {
  applyPreference,
  nextPreference,
  readPreference,
  revealTheme,
  savePreference,
} from "./theme";
import type { ThemePreference } from "./theme";

const ICONS: Record<ThemePreference, IconShapes> = { system: monitor, light: sun, dark: moon };

/**
 * Header button: System, Light, Dark, System. The preference is read once from storage (the boot script has
 * already applied it to `<html>`), saved on change, and revealed with a View Transition where available.
 */
export function ThemeToggle(): ReactElement {
  const [preference, setPreference] = useState<ThemePreference>(() => readPreference());
  const next = nextPreference(preference);

  function change(event: { currentTarget: HTMLElement }): void {
    const box = event.currentTarget.getBoundingClientRect();
    const origin = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    void revealTheme(() => {
      applyPreference(next, document.documentElement);
      savePreference(next);
      setPreference(next);
    }, origin);
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
