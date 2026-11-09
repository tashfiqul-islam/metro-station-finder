import type { IconShapes } from "../../icons/icon-data";

/**
 * The location flow's icons (Lucide, ISC licence): the same shapes as `locate`, `locateOff`, `alert` and
 * `refresh` in `icon-data.ts`, kept in this lazy chunk on purpose. A lazy chunk that imports from `icon-data.ts`
 * pulls those exports into the entry chunk, which has only a few hundred bytes of budget (METRO-111, METRO-112).
 * `location-icons.test.ts` fails if a shape drifts. The chevron, search and directions icons are in
 * `station-picker/picker-icons.ts`.
 */
export const locateIcon: IconShapes = [
  ["path", { d: "M2 12h3" }],
  ["path", { d: "M19 12h3" }],
  ["path", { d: "M12 2v3" }],
  ["path", { d: "M12 19v3" }],
  ["circle", { cx: "12", cy: "12", r: "7" }],
  ["circle", { cx: "12", cy: "12", r: "3" }],
];
export const locateOffIcon: IconShapes = [
  ["path", { d: "M12 2v3" }],
  ["path", { d: "M12 19v3" }],
  ["path", { d: "M2 12h3" }],
  ["path", { d: "M19 12h3" }],
  ["path", { d: "M7.1 7.1A7 7 0 0 0 16.9 16.9" }],
  ["path", { d: "M9.5 5.4A7 7 0 0 1 18.6 14.5" }],
  ["path", { d: "m2 2 20 20" }],
];
export const alertIcon: IconShapes = [
  ["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }],
  ["path", { d: "M12 9v4" }],
  ["path", { d: "M12 17h.01" }],
];
export const refreshIcon: IconShapes = [
  ["path", { d: "M3 12a9 9 0 0 1 15.4-6.4L21 8" }],
  ["path", { d: "M21 3v5h-5" }],
  ["path", { d: "M21 12a9 9 0 0 1-15.4 6.4L3 16" }],
  ["path", { d: "M3 21v-5h5" }],
];
