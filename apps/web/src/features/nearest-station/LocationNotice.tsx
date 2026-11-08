import { useEffect, useRef } from "react";
import type { ReactElement, ReactNode } from "react";

import { Icon } from "../../icons/Icon";
import type { IconShapes } from "../../icons/icon-data";

interface LocationNoticeProps {
  /** `bad` for a refusal, `warn` for a position that could not be used. */
  readonly tone: "bad" | "warn";
  readonly icon: IconShapes;
  readonly text: string;
  /** Buttons or links; the first one takes focus when `takeFocus` is set. */
  readonly actions: ReactNode;
  /**
   * True when the notice moves focus to its first action (or to itself with no action). Then it is a labelled
   * group, because focus already brings the user to it. False when the notice appears without moving focus (a
   * late outcome while the user types elsewhere): then it is `role="alert"` so it is announced.
   */
  readonly takeFocus: boolean;
}

/**
 * A location notice of the handoff (denied, unavailable, rough). The parent mounts a new one per outcome.
 * Never given an error object: the text is fixed copy.
 */
export function LocationNotice({
  tone,
  icon,
  text,
  actions,
  takeFocus,
}: LocationNoticeProps): ReactElement {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!takeFocus) return;
    const first = box.current?.querySelector<HTMLElement>("a[href], button");
    (first ?? box.current)?.focus();
  }, [takeFocus]);
  return (
    <div
      ref={box}
      className="notice"
      data-tone={tone}
      {...(takeFocus
        ? { role: "group", "aria-labelledby": "location-notice-text" }
        : { role: "alert" })}
      tabIndex={-1}
    >
      <span className="notice__chip" aria-hidden="true">
        <Icon icon={icon} size={16} />
      </span>
      <div className="notice__body">
        <p className="notice__text" id="location-notice-text">
          {text}
        </p>
        <div className="notice__actions">{actions}</div>
      </div>
    </div>
  );
}
