import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

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

/**
 * The longest a hold can last, from the first pointer down. Longer than any real press, short enough that a lost
 * release (a pointer whose up and cancel never came: a detached target, a scrollbar press) cannot freeze the list.
 * When it passes, the hold ends whatever pointers are thought to be down, with the deferred close.
 */
export const HOLD_MAX_MS = 3000;

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
 * What ends a hold: the click (listened to after the click handlers ran, so the list changes only after the press
 * has done its work); a mouse release without a click (a drag off the control) or a pointer that ended with no mouse
 * events at all (touch, pen) after `TOUCH_FALLBACK_MS`; a cancelled pointer; and, whatever else is going on, at once
 * on a context menu, a key that is not a modifier, the window losing focus, the page being hidden and `release()`,
 * and after `HOLD_MAX_MS` as an absolute bound. A mouse release or a click proves the gesture is over, so it also
 * forgets pointers whose up never came. Only the first pointer down takes the snapshot; a second finger never
 * retakes it, and one finger lifting while another is down does not end the hold. Every end runs the deferred close.
 */
export function usePressHold<T>(live: T, onClose: () => void): PressHold<T> {
  const [held, setHeld] = useState<T | null>(null);
  const liveRef = useRef(live);
  const closeRef = useRef(onClose);
  // Layout effect: a pointer down right after a render must see that render, never a stale one.
  useLayoutEffect(() => {
    liveRef.current = live;
    closeRef.current = onClose;
  });
  const pointers = useRef(new Set<number>());
  const active = useRef(false);
  const closing = useRef(false);
  const fallback = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** The one place a hold ends: every timer, every pointer and the snapshot go, and the deferred close runs. */
  const finish = useCallback((): void => {
    clearTimeout(fallback.current);
    clearTimeout(cap.current);
    pointers.current.clear();
    active.current = false;
    setHeld(null);
    if (!closing.current) return;
    closing.current = false;
    closeRef.current();
  }, []);

  useEffect(() => {
    const armFallback = (): void => {
      clearTimeout(fallback.current);
      fallback.current = setTimeout(finish, TOUCH_FALLBACK_MS);
    };
    const down = (event: PointerEvent): void => {
      pointers.current.add(event.pointerId);
      clearTimeout(fallback.current);
      if (active.current) return;
      active.current = true;
      cap.current = setTimeout(finish, HOLD_MAX_MS);
      setHeld(liveRef.current);
    };
    const up = (event: PointerEvent): void => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size === 0) armFallback();
    };
    const cancel = (event: PointerEvent): void => {
      pointers.current.delete(event.pointerId);
      if (pointers.current.size === 0) finish();
    };
    const mouseUp = (): void => {
      pointers.current.clear();
      armFallback();
    };
    const click = (): void => {
      pointers.current.clear();
      finish();
    };
    const key = (event: KeyboardEvent): void => {
      if (!MODIFIERS.has(event.key)) finish();
    };
    const away = (): void => {
      if (document.visibilityState === "hidden") finish();
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", cancel, true);
    document.addEventListener("mouseup", mouseUp, true);
    document.addEventListener("click", click);
    document.addEventListener("contextmenu", finish, true);
    document.addEventListener("keydown", key, true);
    document.addEventListener("visibilitychange", away);
    window.addEventListener("blur", finish);
    return () => {
      clearTimeout(fallback.current);
      clearTimeout(cap.current);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", cancel, true);
      document.removeEventListener("mouseup", mouseUp, true);
      document.removeEventListener("click", click);
      document.removeEventListener("contextmenu", finish, true);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("visibilitychange", away);
      window.removeEventListener("blur", finish);
    };
  }, [finish]);

  return {
    shown: held ?? live,
    isPressed: () => active.current,
    release: finish,
    closeWhenReleased: () => {
      closing.current = true;
    },
    cancelClose: () => {
      closing.current = false;
    },
  };
}
