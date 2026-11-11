import { createElement } from "react";
import type { ReactElement } from "react";

/** One SVG shape: its element name and attributes. */
type IconShape = readonly [
  tag: "path" | "circle" | "rect" | "line" | "polygon" | "polyline",
  attributes: Readonly<Record<string, string>>,
];
/**
 * An icon of the design handoff (Lucide, ISC licence, notice in `public/licenses.txt`): SVG shapes on a 24 x 24
 * grid. One module per icon in `shapes/` imports this type (erased at build), so a lazy chunk takes only the
 * icons it imports.
 */
export type IconShapes = readonly IconShape[];

interface IconProps {
  /** The export of one module in `shapes/`, so a chunk bundles only the icons it imports. */
  readonly icon: IconShapes;
  /** Width and height in CSS px. The handoff uses 14, 16, 18 and 20. */
  readonly size?: number;
  /**
   * A text alternative. Left out, the icon is decorative: `aria-hidden`, not focusable. Give a label only for
   * an icon that stands alone; an icon inside a button is hidden and the button carries `aria-label`.
   */
  readonly label?: string;
}

/**
 * Inline SVG icon (Lucide, ISC licence, see `public/licenses.txt`). Strokes use `currentColor`, so colour comes
 * from CSS; the `icon` class carries the forced-colours rule in `base.css`.
 */
export function Icon({ icon, size = 20, label }: IconProps): ReactElement {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(label === undefined ? { "aria-hidden": true } : { role: "img", "aria-label": label })}
    >
      {icon.map(([tag, attributes], index) => createElement(tag, { ...attributes, key: index }))}
    </svg>
  );
}
