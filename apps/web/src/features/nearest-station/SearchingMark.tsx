import { useId } from "react";
import type { ReactElement } from "react";

import "../../styles/components/mark-searching.css";

/**
 * The logo mark with the looping ping, for the locating status (handoff `nearby-locating.light.html`). Decorative:
 * the status text beside it is the content. The mark's colours are in `brand.css` (in the entry). The SVG body is
 * built from fixed shapes and one id made of word characters (from `useId`), never from data. Under reduced motion
 * `mark-searching.css` shows the ping without moving.
 */
export function SearchingMark(): ReactElement {
  const id = `search${useId().replaceAll(/\W/gu, "")}`;
  const body =
    `<defs><linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="5.5" y1="18.5" x2="18.5" y2="5.5">` +
    '<stop offset="0" class="mark__stop-a"/><stop offset="1" class="mark__stop-b"/></linearGradient>' +
    `<mask id="${id}k" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">` +
    '<rect x="-4" y="-4" width="32" height="32" fill="white"/><circle cx="12" cy="12" r="2" fill="black"/></mask></defs>' +
    `<path class="mark__ping" d="M3.72 10.09A8.5 8.5 0 0 1 10.09 3.72" stroke="url(#${id}g)" stroke-width="2.25" stroke-linecap="round" fill="none"/>` +
    `<path class="mark__ping" d="M20.28 13.91A8.5 8.5 0 0 1 13.91 20.28" stroke="url(#${id}g)" stroke-width="2.25" stroke-linecap="round" fill="none"/>` +
    `<g mask="url(#${id}k)"><path class="mark__line" pathLength="1" d="M5.5 18.5 18.5 5.5" stroke="url(#${id}g)" stroke-width="3" stroke-linecap="round" fill="none"/></g>` +
    '<circle class="mark__station" cx="12" cy="12" r="3.5" stroke-width="3" fill="none"/>';
  return (
    <svg
      className="mark mark--searching"
      width={72}
      height={72}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
