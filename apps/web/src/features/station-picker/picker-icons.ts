import type { IconShapes } from "../../icons/icon-data";

/**
 * The picker's icons (Lucide, ISC licence): the same shapes as `search`, `x`, `chevronRight`, `navigation`,
 * `externalLink` and `mapPin` in `icon-data.ts`, kept in this lazy chunk on purpose. A lazy chunk that imports
 * from `icon-data.ts` pulls those exports into the entry chunk, which has only a few hundred bytes of budget
 * (METRO-111). `picker-icons.test.ts` fails if a shape drifts. Move them when the budget has room.
 */
export const searchIcon: IconShapes = [
  ["circle", { cx: "11", cy: "11", r: "8" }],
  ["path", { d: "m21 21-4.3-4.3" }],
];
export const clearIcon: IconShapes = [
  ["path", { d: "M18 6 6 18" }],
  ["path", { d: "m6 6 12 12" }],
];
export const chevronIcon: IconShapes = [["path", { d: "m9 18 6-6-6-6" }]];
export const directionsIcon: IconShapes = [["polygon", { points: "3 11 22 2 13 21 11 13 3 11" }]];
export const externalIcon: IconShapes = [
  ["path", { d: "M15 3h6v6" }],
  ["path", { d: "M10 14 21 3" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }],
];
export const pinIcon: IconShapes = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
    },
  ],
  ["circle", { cx: "12", cy: "10", r: "3" }],
];
