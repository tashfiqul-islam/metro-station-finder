import { useId } from "react";
import type { ReactElement } from "react";

import "../styles/components/brand.css";
import { shellCopy } from "./copy";

/**
 * The mark's shapes on a 24 x 24 grid. `id` makes the gradient and mask ids unique per instance, so two marks
 * on one page never share a `url(#...)` target. Only word characters reach the markup (see `Brand`).
 */
const markShapes = (id: string): string =>
  `<defs><linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="5.5" y1="18.5" x2="18.5" y2="5.5">` +
  '<stop offset="0" class="mark__stop-a"/><stop offset="1" class="mark__stop-b"/></linearGradient>' +
  `<mask id="${id}k" maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">` +
  '<rect x="-4" y="-4" width="32" height="32" fill="white"/><circle cx="12" cy="12" r="2" fill="black"/></mask></defs>' +
  `<path class="mark__ping mark-anim-ping" d="M3.72 10.09A8.5 8.5 0 0 1 10.09 3.72" stroke="url(#${id}g)" stroke-width="2.25" stroke-linecap="round" fill="none"/>` +
  `<path class="mark__ping mark-anim-ping" d="M20.28 13.91A8.5 8.5 0 0 1 13.91 20.28" stroke="url(#${id}g)" stroke-width="2.25" stroke-linecap="round" fill="none"/>` +
  `<g mask="url(#${id}k)"><path class="mark__line mark-anim-line" pathLength="1" d="M5.5 18.5 18.5 5.5" stroke="url(#${id}g)" stroke-width="3" stroke-linecap="round" fill="none"/></g>` +
  '<circle class="mark__station mark-anim-station" cx="12" cy="12" r="3.5" stroke-width="3" fill="none"/>';

/**
 * The header brand: the Nearest mark on its gradient tile and the wordmark, as the Home link (handoff
 * `screens/*.html`; vector sources in `apps/web/brand/`). The mark is inline SVG so its line, station and ping
 * animate in CSS on every load (mark-draw, mark-pop, mark-ping-in; still under reduced motion) and its colours
 * come from tokens. The SVG body is a string built from fixed shapes and one id made of word characters
 * (from `useId`), never from data. The wordmark shows "Metro" on phones and the full name from 768 px; the
 * link's accessible name always holds the full visible name (WCAG 2.5.3). The link goes to `/`, a full page
 * load while there is no router.
 */
export function Brand(): ReactElement {
  const id = `brand${useId().replaceAll(/\W/gu, "")}`;
  return (
    <a className="brand" href="/" aria-label={shellCopy.home}>
      <span className="brand__tile">
        <svg
          className="mark mark--on-tile"
          width={24}
          height={24}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
          dangerouslySetInnerHTML={{ __html: markShapes(id) }}
        />
      </span>
      <span className="brand__name">
        <span className="brand__name-a">{shellCopy.brandName[0]}</span>{" "}
        <span className="brand__name-b brand__name-b--wide">{shellCopy.brandName[1]}</span>
      </span>
    </a>
  );
}
