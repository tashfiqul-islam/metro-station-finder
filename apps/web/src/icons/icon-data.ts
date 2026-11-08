/**
 * The 31 icons of the design handoff: Lucide, ISC licence (notice in public/licenses.txt). Each is a list of
 * SVG shapes on a 24 x 24 grid, drawn with a 2 px round stroke in currentColor by `Icon`. One named export
 * per icon, so the bundler keeps only the icons a build imports.
 */

/** One SVG shape: its element name and attributes. */
export type IconShape = readonly [
  tag: "path" | "circle" | "rect" | "line" | "polygon" | "polyline",
  attributes: Readonly<Record<string, string>>,
];
export type IconShapes = readonly IconShape[];

export const alert: IconShapes = [
  ["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }],
  ["path", { d: "M12 9v4" }],
  ["path", { d: "M12 17h.01" }],
];
export const arrowDown: IconShapes = [
  ["path", { d: "M12 5v14" }],
  ["path", { d: "m19 12-7 7-7-7" }],
];
export const arrowRight: IconShapes = [
  ["path", { d: "M5 12h14" }],
  ["path", { d: "m12 5 7 7-7 7" }],
];
export const arrowUp: IconShapes = [
  ["path", { d: "m5 12 7-7 7 7" }],
  ["path", { d: "M12 19V5" }],
];
export const check: IconShapes = [["path", { d: "M20 6 9 17l-5-5" }]];
export const chevronLeft: IconShapes = [["path", { d: "m15 18-6-6 6-6" }]];
export const chevronRight: IconShapes = [["path", { d: "m9 18 6-6-6-6" }]];
export const copy: IconShapes = [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }],
];
export const crosshair: IconShapes = [
  ["circle", { cx: "12", cy: "12", r: "10" }],
  ["path", { d: "M22 12h-4" }],
  ["path", { d: "M6 12H2" }],
  ["path", { d: "M12 6V2" }],
  ["path", { d: "M12 22v-4" }],
];
export const externalLink: IconShapes = [
  ["path", { d: "M15 3h6v6" }],
  ["path", { d: "M10 14 21 3" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }],
];
export const info: IconShapes = [
  ["circle", { cx: "12", cy: "12", r: "9" }],
  ["path", { d: "M12 16v-4" }],
  ["path", { d: "M12 8h.01" }],
];
export const line: IconShapes = [
  ["path", { d: "M12 3v6" }],
  ["circle", { cx: "12", cy: "12", r: "3" }],
  ["path", { d: "M12 15v6" }],
];
export const locate: IconShapes = [
  ["path", { d: "M2 12h3" }],
  ["path", { d: "M19 12h3" }],
  ["path", { d: "M12 2v3" }],
  ["path", { d: "M12 19v3" }],
  ["circle", { cx: "12", cy: "12", r: "7" }],
  ["circle", { cx: "12", cy: "12", r: "3" }],
];
export const locateOff: IconShapes = [
  ["path", { d: "M12 2v3" }],
  ["path", { d: "M12 19v3" }],
  ["path", { d: "M2 12h3" }],
  ["path", { d: "M19 12h3" }],
  ["path", { d: "M7.1 7.1A7 7 0 0 0 16.9 16.9" }],
  ["path", { d: "M9.5 5.4A7 7 0 0 1 18.6 14.5" }],
  ["path", { d: "m2 2 20 20" }],
];
export const mapOff: IconShapes = [
  ["path", { d: "M8.5 3.3 9 3l6 3 5.4-2.7A1 1 0 0 1 22 4.2v12.6" }],
  ["path", { d: "M15 6v4" }],
  ["path", { d: "M9 9v12l-5.4 2.7A1 1 0 0 1 2 22.8V8.4a1 1 0 0 1 .6-.9L5 6.3" }],
  ["path", { d: "m15 21-6-3" }],
  ["path", { d: "m2 2 20 20" }],
];
export const mapPin: IconShapes = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
    },
  ],
  ["circle", { cx: "12", cy: "10", r: "3" }],
];
export const maximize: IconShapes = [
  ["path", { d: "M8 3H5a2 2 0 0 0-2 2v3" }],
  ["path", { d: "M21 8V5a2 2 0 0 0-2-2h-3" }],
  ["path", { d: "M3 16v3a2 2 0 0 0 2 2h3" }],
  ["path", { d: "M16 21h3a2 2 0 0 0 2-2v-3" }],
];
export const minus: IconShapes = [["path", { d: "M5 12h14" }]];
export const monitor: IconShapes = [
  ["rect", { width: "20", height: "14", x: "2", y: "3", rx: "2" }],
  ["path", { d: "M8 21h8" }],
  ["path", { d: "M12 17v4" }],
];
export const moon: IconShapes = [["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" }]];
export const navigation: IconShapes = [["polygon", { points: "3 11 22 2 13 21 11 13 3 11" }]];
export const plus: IconShapes = [
  ["path", { d: "M5 12h14" }],
  ["path", { d: "M12 5v14" }],
];
export const refresh: IconShapes = [
  ["path", { d: "M3 12a9 9 0 0 1 15.4-6.4L21 8" }],
  ["path", { d: "M21 3v5h-5" }],
  ["path", { d: "M21 12a9 9 0 0 1-15.4 6.4L3 16" }],
  ["path", { d: "M3 21v-5h5" }],
];
export const search: IconShapes = [
  ["circle", { cx: "11", cy: "11", r: "8" }],
  ["path", { d: "m21 21-4.3-4.3" }],
];
export const settings: IconShapes = [
  ["path", { d: "M20 7h-9" }],
  ["path", { d: "M14 17H5" }],
  ["circle", { cx: "17", cy: "17", r: "3" }],
  ["circle", { cx: "7", cy: "7", r: "3" }],
];
export const sun: IconShapes = [
  ["circle", { cx: "12", cy: "12", r: "4" }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M12 20v2" }],
  ["path", { d: "m4.93 4.93 1.41 1.41" }],
  ["path", { d: "m17.66 17.66 1.41 1.41" }],
  ["path", { d: "M2 12h2" }],
  ["path", { d: "M20 12h2" }],
  ["path", { d: "m6.34 17.66-1.41 1.41" }],
  ["path", { d: "m19.07 4.93-1.41 1.41" }],
];
export const swap: IconShapes = [
  ["path", { d: "m21 16-4 4-4-4" }],
  ["path", { d: "M17 20V4" }],
  ["path", { d: "m3 8 4-4 4 4" }],
  ["path", { d: "M7 4v16" }],
];
export const ticket: IconShapes = [
  [
    "path",
    {
      d: "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z",
    },
  ],
  ["path", { d: "M13 5v2" }],
  ["path", { d: "M13 17v2" }],
  ["path", { d: "M13 11v2" }],
];
export const walk: IconShapes = [
  ["circle", { cx: "13", cy: "4", r: "2" }],
  ["path", { d: "m9 20 3-6 3 3 2 4" }],
  ["path", { d: "m6 12 3-3 4 1 3 3 3 1" }],
  ["path", { d: "M12 14 10 9" }],
];
export const wifiOff: IconShapes = [
  ["path", { d: "M12 20h.01" }],
  ["path", { d: "M8.5 16.429a5 5 0 0 1 7 0" }],
  ["path", { d: "M5 12.859a10 10 0 0 1 5.17-2.69" }],
  ["path", { d: "M19 12.859a10 10 0 0 0-2.007-1.523" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 4.177-2.643" }],
  ["path", { d: "M22 8.82a15 15 0 0 0-11.288-3.764" }],
  ["path", { d: "m2 2 20 20" }],
];
export const x: IconShapes = [
  ["path", { d: "M18 6 6 18" }],
  ["path", { d: "m6 6 12 12" }],
];
