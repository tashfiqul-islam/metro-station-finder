import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactElement, ReactNode } from "react";

import { Icon } from "../icons/Icon";
import { alert } from "../icons/shapes/alert";
import { check } from "../icons/shapes/check";
import { x } from "../icons/shapes/x";
import { shellCopy } from "./copy";

import "../styles/components/toast.css";

/** How long a toast stays (handoff, Toast): 4 s, 6 s with Undo, 2.5 s for "Change undone". */
const PLAIN_MS = 4000;
const UNDO_MS = 6000;
const UNDONE_MS = 2500;
/** The leaving fade (toast.css `transition: opacity 180ms`); removal waits for it unless motion is reduced. */
const LEAVE_MS = 180;

type ToastTone = "ok" | "error";

interface ToastOptions {
  /** Fixed catalogue text. Never an error message or anything that can carry a position. */
  readonly text: string;
  /** `error` is announced through `role="alert"`, the default through the polite status region. */
  readonly tone?: ToastTone;
  /** Reverts the change. Run at most once; the toast is then replaced by "Change undone". */
  readonly undo?: () => void;
}

export interface ToastApi {
  /** Shows a toast, replacing the one on screen: never two at once. */
  readonly show: (options: ToastOptions) => void;
  /** Starts closing the toast on screen, if any. */
  readonly dismiss: () => void;
}

interface Current {
  readonly id: number;
  readonly text: string;
  readonly tone: ToastTone;
  readonly undo: (() => void) | undefined;
  readonly ms: number;
  readonly leaving: boolean;
}

interface State {
  readonly current: Current | null;
  readonly show: (options: ToastOptions, ms?: number) => void;
  readonly leave: () => void;
  readonly gone: () => void;
}

/**
 * Two contexts, so a screen that calls `useToast` is not re-rendered by every toast change: the API (stable for
 * the life of the shell) is what `useToast` returns, and the state (the toast on screen) is read only by
 * `ToastLive` and `ToastRegion`.
 */
const ApiContext = createContext<ToastApi | null>(null);
const StateContext = createContext<State | null>(null);

/** The toast API for a screen. Throws outside `AppShell`, so a misplaced caller fails visibly. */
export function useToast(): ToastApi {
  const api = useContext(ApiContext);
  if (api === null) throw new Error("useToast needs AppShell");
  return api;
}

const reducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The toast provider (METRO-158): one toast at a time, owned by `AppShell`; the region is `ToastRegion`.
 * "Never two at once" covers provider toasts only. The service-worker update prompt (`sw/register.ts`) is KEPT as
 * its own DOM, not moved onto this provider (it has no timer, an "Updating..." state and must outlive a later
 * toast), and shares the `.toast-region` element with it: React owns only its own child there.
 */
export function ToastProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [current, setCurrent] = useState<Current | null>(null);
  const seq = useRef(0);

  const show = useCallback((options: ToastOptions, ms?: number): void => {
    seq.current += 1;
    setCurrent({
      id: seq.current,
      text: options.text,
      tone: options.tone ?? "ok",
      undo: options.undo,
      ms: ms ?? (options.undo === undefined ? PLAIN_MS : UNDO_MS),
      leaving: false,
    });
  }, []);
  /**
   * Starts leaving: at once under reduced motion. Only the toast on screen can call it (a replaced toast's timers
   * are cleared when it unmounts), so it needs no id.
   */
  const leave = useCallback((): void => {
    setCurrent((now) => {
      if (now === null || now.leaving) return now;
      return reducedMotion() ? null : { ...now, leaving: true };
    });
  }, []);
  const gone = useCallback((): void => setCurrent(null), []);

  const api = useMemo<ToastApi>(
    () => ({ show: (options) => show(options), dismiss: leave }),
    [show, leave],
  );
  const state = useMemo<State>(
    () => ({ current, show, leave, gone }),
    [current, show, leave, gone],
  );
  return (
    <ApiContext value={api}>
      <StateContext value={state}>{children}</StateContext>
    </ApiContext>
  );
}

/**
 * The polite announcement. This empty `<output>` (implicit `role="status"`) region is always in the page, so assistive technology is
 * already watching when text arrives. The text is a new element each time, so the same words shown twice are
 * announced twice. The visible copy of such a toast is `aria-hidden`, so it is not read a second time (the buttons
 * stay in the accessibility tree). An error toast is not spoken here: its visible text is `role="alert"`.
 */
export function ToastLive(): ReactElement {
  const state = useContext(StateContext);
  const current = state === null ? null : state.current;
  const spoken = current !== null && !current.leaving && current.tone === "ok";
  return (
    <output className="toast-live visually-hidden">
      {spoken ? <span key={current.id}>{current.text}</span> : null}
    </output>
  );
}

/** The content of the shell's toast region: the one toast on screen, if any. */
export function ToastRegion(): ReactElement | null {
  const state = useContext(StateContext);
  if (state === null || state.current === null) return null;
  return <Toast key={state.current.id} toast={state.current} state={state} />;
}

/**
 * Keyboard focus was on a toast control that is about to go. The panel takes it, except while the sheet peeks:
 * focus entering the panel's content opens a peeking sheet to half (AppShell), which a toast must not do, so the
 * sheet's grip takes it (the handle controls do not open the sheet, ADR-0021).
 */
function handOffFocus(): void {
  const peeking = document.querySelector(".app")?.getAttribute("data-snap") === "peek";
  document.querySelector<HTMLElement>(peeking ? ".panel__grip" : ".panel__scroll")?.focus();
}

function Toast({ toast, state }: { readonly toast: Current; readonly state: State }): ReactElement {
  const { show, leave, gone } = state;
  const root = useRef<HTMLDivElement>(null);
  const used = useRef(false);
  const left = useRef(toast.ms);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const { leaving } = toast;

  // The timer runs while nothing holds the toast. Pausing banks what is left, leaving resumes with it.
  useEffect(() => {
    if (paused || leaving) return () => {};
    const started = Date.now();
    const timer = setTimeout(() => leave(), left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - started;
    };
  }, [paused, leaving, leave]);
  useEffect(() => {
    if (!leaving) return () => {};
    const timer = setTimeout(() => gone(), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving, gone]);

  /** The pressed button is about to go; keep keyboard focus in the page, not on the body. */
  const close = (action: () => void): void => {
    const hadFocus = root.current?.contains(document.activeElement) === true;
    action();
    if (hadFocus) handOffFocus();
  };
  const undo = toast.undo;
  return (
    <div
      className="toast"
      ref={root}
      data-tone={toast.tone}
      data-leaving={leaving ? "" : undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <span className="toast__chip" aria-hidden="true">
        <Icon icon={toast.tone === "error" ? alert : check} size={14} />
      </span>
      {toast.tone === "error" ? (
        <span className="toast__text" role="alert">
          {toast.text}
        </span>
      ) : (
        <span className="toast__text" aria-hidden="true">
          {toast.text}
        </span>
      )}
      {undo === undefined ? null : (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            // A double tap presses the same button twice before the screen re-renders: only the first counts.
            if (used.current) return;
            used.current = true;
            close(() => {
              try {
                undo();
              } catch (error) {
                // A callback that throws leaves the change in place: the button must work again.
                used.current = false;
                throw error;
              }
              show({ text: shellCopy.undone }, UNDONE_MS);
            });
          }}
        >
          {shellCopy.undo}
        </button>
      )}
      <button
        type="button"
        className="toast__close"
        aria-label={shellCopy.dismiss}
        onClick={() => close(leave)}
      >
        <Icon icon={x} size={16} />
      </button>
    </div>
  );
}
