import { useCallback, useEffect, useRef, useState } from "react";

/** Keys that change how a press is read but do not end it. */
const MODIFIERS: ReadonlySet<string> = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "AltGraph",
  "CapsLock",
  "Fn",
]);

/**
 * How long a touch or pen press waits, after its pointer ended, for the mouse events that browsers send after it
 * (mouseup, click) before it lets go on its own. Those events release the hold themselves when they come; this
 * only ends a press that has none. It is longer than a task on purpose: on some touch browsers the compatibility
 * mouse events follow later than the next timer, and letting go before them would bring back the lost click.
 * Real touch ordering is Unverified (no device test runs here).
 */
export const TOUCH_FALLBACK_MS = 500;

export interface PressHold<T> {
  /** The state to draw: the one of the moment a press began while one is on, else the live one. */
  readonly shown: T;
  /** True from a pointer going down until the hold ends. */
  readonly isPressed: () => boolean;
  /** Ends any hold at once (new text). */
  readonly release: () => void;
  /** Asks for `onClose` to run when the hold ends (a blur that came with the press). */
  readonly closeWhenReleased: () => void;
  /** Withdraws that request (focus came back). */
  readonly cancelClose: () => void;
}

/**
 * Keeps `live` still while a pointer press is in progress (METRO-124, METRO-163). Content that arrives between a
 * press on a control and its release would move the control from under the pointer and the release would land
 * elsewhere, so what is drawn stays as it was when the press began and the newest state shows when it ends.
 *
 * One rule ends a hold, in every path: a hold ends when no pointer is down and one of these comes: the mouse
 * release or click, a cancelled pointer, or the fallback timer after a touch or pen pointer ended. A hold also
 * ends at once, whatever pointers are down, on a context menu, a key that is not a modifier, the window losing
 * focus, the page being hidden, and `release()`. Only the first pointer down takes the snapshot; a second finger
 * never retakes it and its release never ends the first finger's hold.
 */
export function usePressHold<T>(live: T, onClose: () => void): PressHold<T> {
  const [held, setHeld] = useState<T | null>(null);
  const liveRef = useRef(live);
  const closeRef = useRef(onClose);
  useEffect(() => {
    liveRef.current = live;
    closeRef.current = onClose;
  });
  const pointers = useRef(new Set<number>());
  const active = useRef(false);
  const closing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const end = useCallback((force: boolean): void => {
    clearTimeout(timer.current);
    if (force) pointers.current.clear();
    if (pointers.current.size > 0) return;
    active.current = false;
    setHeld(null);
    if (!closing.current) return;
    closing.current = false;
    closeRef.current();
  }, []);

  useEffect(() => {
    const down = (event: PointerEvent): void => {
      pointers.current.add(event.pointerId);
      clearTimeout(timer.current);
      if (active.current) return;
      active.current = true;
      setHeld(liveRef.current);
    };
    const up = (event: PointerEvent): void => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size > 0) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => end(false), TOUCH_FALLBACK_MS);
    };
    const cancel = (event: PointerEvent): void => {
      pointers.current.delete(event.pointerId);
      end(false);
    };
    const soft = (): void => end(false);
    const hard = (): void => end(true);
    const key = (event: KeyboardEvent): void => {
      if (!MODIFIERS.has(event.key)) end(true);
    };
    const away = (): void => {
      if (document.visibilityState === "hidden") end(true);
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("mouseup", soft, true);
    document.addEventListener("click", soft, true);
    document.addEventListener("contextmenu", hard, true);
    document.addEventListener("keydown", key, true);
    document.addEventListener("visibilitychange", away);
    window.addEventListener("blur", hard);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("mouseup", soft, true);
      document.removeEventListener("click", soft, true);
      document.removeEventListener("contextmenu", hard, true);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("visibilitychange", away);
      window.removeEventListener("blur", hard);
    };
  }, [end]);

  return {
    shown: held ?? live,
    isPressed: () => active.current,
    release: () => end(true),
    closeWhenReleased: () => {
      closing.current = true;
    },
    cancelClose: () => {
      closing.current = false;
    },
  };
}
