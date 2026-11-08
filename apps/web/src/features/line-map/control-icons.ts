import type { IconShapes } from "../../icons/icon-data";

/**
 * The three zoom icons (Lucide, ISC licence, same shapes as `plus`, `minus` and `maximize` in `icon-data.ts`),
 * kept in this lazy chunk on purpose. Importing them from `icon-data.ts` made the bundler place them in the
 * entry chunk, which is shared with the theme button: +276 raw bytes of the first visit's 662-byte headroom
 * (measured, METRO-111). Move them to `icon-data.ts` when the first-visit budget has room or another entry
 * screen uses them.
 */
export const zoomInIcon: IconShapes = [
  ["path", { d: "M5 12h14" }],
  ["path", { d: "M12 5v14" }],
];
export const zoomOutIcon: IconShapes = [["path", { d: "M5 12h14" }]];
export const fitIcon: IconShapes = [
  ["path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }],
  ["path", { d: "M21 8V5a2 2 0 0 0-2-2h-3" }],
  ["path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }],
  ["path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" }],
];
