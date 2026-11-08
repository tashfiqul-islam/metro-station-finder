import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactElement, ReactNode } from "react";

import { ThemeToggle } from "../theme/ThemeToggle";
import { shellCopy } from "./copy";
import {
  DRAG_THRESHOLD_PX,
  clampHeight,
  cycleSnap,
  keySnap,
  largerSnap,
  nearestSnap,
  smallerSnap,
} from "./sheet";
import type { Snap } from "./sheet";

interface Sheet {
  readonly snap: Snap;
  /** Slices apply the snap rules (typing in search: full; a result or error: half; "show on map": peek). */
  readonly setSnap: (snap: Snap) => void;
}

const SheetContext = createContext<Sheet | null>(null);

/** The sheet state for a slice. Throws outside `AppShell`, so a misplaced slice fails visibly. */
export function useSheet(): Sheet {
  const sheet = useContext(SheetContext);
  if (sheet === null) throw new Error("useSheet needs AppShell");
  return sheet;
}

interface AppShellProps {
  readonly children: ReactNode;
  /** Accessible name of the `main` landmark (the screen name). */
  readonly label?: string;
  /** Logo slot at the start of the header. */
  readonly brand?: ReactNode;
  /** Slot before the theme button, for the search / command-palette trigger. */
  readonly actions?: ReactNode;
  /** The section navigation (`SectionNav`). Left out, none is drawn (no router yet). */
  readonly nav?: ReactNode;
  /** Map region slot. */
  readonly map?: ReactNode;
  /** Toast region content. The region is always present so a polite announcement can reach it. */
  readonly toasts?: ReactNode;
  readonly initialSnap?: Snap;
}

/**
 * The layout shell (METRO-105, ADR-0021): header, optional section nav, one `main` panel that is a bottom sheet
 * below 768 px and a sidebar above, a map slot and a toast region. DOM order is header, nav, main, which is
 * also the focus order. It holds mechanism only; screens and their copy belong to the slices.
 */
export function AppShell({
  children,
  label,
  brand,
  actions,
  nav,
  map,
  toasts,
  initialSnap = "half",
}: AppShellProps): ReactElement {
  const [snap, setSnap] = useState<Snap>(initialSnap);
  const app = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const sheet = useMemo(() => ({ snap, setSnap }), [snap]);

  return (
    <SheetContext value={sheet}>
      <div className="app" data-snap={snap} ref={app}>
        <div className="app__map">
          {map === undefined ? null : <div className="app__map-frame">{map}</div>}
        </div>
        <header className="app-header">
          {brand}
          <span className="app-header__spacer" />
          {actions}
          <ThemeToggle />
        </header>
        {nav}
        <main
          className={nav === undefined ? "panel panel--plain" : "panel"}
          id="panel"
          ref={panel}
          {...(label === undefined ? {} : { "aria-label": label })}
        >
          <PanelHandle snap={snap} setSnap={setSnap} app={app} panel={panel} />
          <div className="panel__scroll" tabIndex={-1}>
            <div className="panel__body">{children}</div>
          </div>
        </main>
        <section className="toast-region" aria-label={shellCopy.toastRegion}>
          {toasts}
        </section>
      </div>
    </SheetContext>
  );
}

interface HandleProps {
  readonly snap: Snap;
  readonly setSnap: (snap: Snap) => void;
  readonly app: { readonly current: HTMLElement | null };
  readonly panel: { readonly current: HTMLElement | null };
}

/** A ref to an element of this shell; handlers only run while it is mounted. */
function mounted(ref: { readonly current: HTMLElement | null }): HTMLElement {
  if (ref.current === null) throw new Error("AppShell is not mounted");
  return ref.current;
}

interface Drag {
  readonly startY: number;
  readonly startHeight: number;
  moved: boolean;
  height: number;
}

/**
 * The 44 px handle row. Drag writes `--sheet-h` on `.app` with `style.setProperty` (CSSOM, never a `style`
 * attribute, so the CSP holds) and sets `data-dragging` on the panel; release removes both and sets the
 * nearest snap. A tap on the grip cycles peek, half, full. ArrowUp/ArrowDown on the grip, or the two text
 * buttons that show on focus, change the snap without a pointer.
 */
function PanelHandle({ snap, setSnap, app, panel }: HandleProps): ReactElement {
  const drag = useRef<Drag | null>(null);
  /** A drag ends with a click on the grip; it must not also cycle the snap. */
  const dragged = useRef(false);

  function finish(commit: boolean): void {
    const current = drag.current;
    drag.current = null;
    if (current === null) return;
    const shell = mounted(app);
    shell.style.removeProperty("--sheet-h");
    // removeProperty leaves an empty style attribute behind; drop it so the page has none at rest.
    if (shell.style.length === 0) shell.removeAttribute("style");
    mounted(panel).removeAttribute("data-dragging");
    if (current.moved) {
      dragged.current = true;
      if (commit) setSnap(nearestSnap(current.height, window.innerHeight));
    }
  }

  function down(event: PointerEvent<HTMLElement>): void {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    const height = mounted(panel).getBoundingClientRect().height;
    drag.current = { startY: event.clientY, startHeight: height, moved: false, height };
  }

  function move(event: PointerEvent<HTMLElement>): void {
    const current = drag.current;
    if (current === null) return;
    const delta = current.startY - event.clientY;
    if (!current.moved) {
      if (Math.abs(delta) <= DRAG_THRESHOLD_PX) return;
      current.moved = true;
      mounted(panel).setAttribute("data-dragging", "");
    }
    current.height = clampHeight(current.startHeight + delta, window.innerHeight);
    mounted(app).style.setProperty("--sheet-h", `${current.height}px`);
  }

  return (
    <div className="panel__handle">
      <button
        type="button"
        className="panel__snap panel__snap--down"
        onClick={() => setSnap(smallerSnap(snap))}
      >
        {shellCopy.smaller}
      </button>
      <button
        type="button"
        className="panel__grip"
        aria-label={shellCopy.gripLabel(shellCopy.snapName[snap])}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={() => finish(true)}
        onPointerCancel={() => finish(false)}
        onClick={() => {
          if (dragged.current) dragged.current = false;
          else setSnap(cycleSnap(snap));
        }}
        onKeyDown={(event) => {
          const next = keySnap(event.key, snap);
          if (next === null) return;
          event.preventDefault();
          setSnap(next);
        }}
      />
      <button
        type="button"
        className="panel__snap panel__snap--up"
        onClick={() => setSnap(largerSnap(snap))}
      >
        {shellCopy.larger}
      </button>
    </div>
  );
}
