/**
 * METRO-105 (ADR-0021): WCAG contrast of the design tokens, computed from `apps/web/src/styles/tokens.css`
 * for both themes. The pairs are the 53 rows of the design handoff's accessibility table (the same list is
 * checked in light and dark). A semi-transparent surface is composited over every backdrop it can sit on and the
 * lowest ratio counts: `glass` over the map background and the page (the map planes were removed in METRO-115; the line and labels the map draws behind a sheet when panned are not judged); `raised`, `muted`, `muted-2` and `accent-soft`
 * over the card, the page and the glass panel over each backdrop. This is stricter than the handoff, which
 * published one figure per pair; the published ratio is kept beside each pair for comparison.
 */

/** Red, green, blue (0 to 255) and alpha (0 to 1). */
export type Rgba = readonly [number, number, number, number];
export type Tokens = Readonly<Record<string, string>>;

export function parseColor(text: string): Rgba {
  const value = text.trim();
  const hex = /^#([0-9a-f]{6})$/iu.exec(value);
  if (hex?.[1] !== undefined) {
    const digits = hex[1];
    const pair = (at: number): number => Number.parseInt(digits.slice(at, at + 2), 16);
    return [pair(0), pair(2), pair(4), 1];
  }
  const rgb = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/u.exec(value);
  if (rgb !== null) {
    return [
      Number(rgb[1]),
      Number(rgb[2]),
      Number(rgb[3]),
      rgb[4] === undefined ? 1 : Number(rgb[4]),
    ];
  }
  throw new Error(`not a colour this check understands: ${value}`);
}

/** `top` painted over an opaque `bottom`. */
export function composite(top: Rgba, bottom: Rgba): Rgba {
  const mix = (at: 0 | 1 | 2): number => top[at] * top[3] + bottom[at] * (1 - top[3]);
  return [mix(0), mix(1), mix(2), 1];
}

const channel = (value: number): number => {
  const unit = value / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

/** Relative luminance (WCAG 2.2, sRGB). */
export function luminance(color: Rgba): number {
  return 0.2126 * channel(color[0]) + 0.7152 * channel(color[1]) + 0.0722 * channel(color[2]);
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** The text between the braces of the first rule that starts with `selector`, or null. */
function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(selector);
  if (start === -1) return null;
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let at = open; at < css.length; at += 1) {
    if (css[at] === "{") depth += 1;
    if (css[at] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, at);
    }
  }
  return null;
}

function declarations(body: string | null): Tokens {
  return Object.fromEntries(
    [...(body ?? "").matchAll(/(--[\w-]+)\s*:\s*([^;]+);/gu)].map((match) => [
      match[1] ?? "",
      (match[2] ?? "").replaceAll(/\s+/gu, " ").trim(),
    ]),
  );
}

export interface ThemeTokens {
  readonly light: Tokens;
  /** Light tokens with the dark overrides applied. */
  readonly dark: Tokens;
  /** The overrides the OS preference applies when `data-theme` is unset; must equal the dark overrides. */
  readonly darkOverrides: Tokens;
  readonly fallbackOverrides: Tokens;
}

/** The three theme blocks of one token file. */
function extractOne(css: string): Omit<ThemeTokens, "dark"> {
  const light = declarations(ruleBody(css, ":root {"));
  const darkOverrides = declarations(ruleBody(css, ':root[data-theme="dark"]'));
  const media = ruleBody(css, "@media (prefers-color-scheme: dark)");
  const fallbackOverrides = declarations(
    media === null ? null : ruleBody(media, ":root:not([data-theme])"),
  );
  return { light, darkOverrides, fallbackOverrides };
}

/**
 * The tokens of one or more token files (`tokens.css` and the files that hold the feedback and map colours),
 * merged: each file has the same three theme blocks.
 */
export function extractTokens(css: string, ...more: readonly string[]): ThemeTokens {
  const parts = [css, ...more].map(extractOne);
  const merge = (pick: (part: Omit<ThemeTokens, "dark">) => Tokens): Tokens =>
    Object.fromEntries(parts.flatMap((part) => Object.entries(pick(part))));
  const light = merge((part) => part.light);
  const darkOverrides = merge((part) => part.darkOverrides);
  return {
    light,
    dark: { ...light, ...darkOverrides },
    darkOverrides,
    fallbackOverrides: merge((part) => part.fallbackOverrides),
  };
}

export interface ReducedTransparency {
  /** The selectors of the `prefers-reduced-transparency` rule, trimmed. */
  readonly selectors: readonly string[];
  readonly overrides: Tokens;
  /** The rule comes after every theme block, so equal specificity resolves in its favour. */
  readonly lastInFile: boolean;
}

/** The `@media (prefers-reduced-transparency: reduce)` rule of `tokens.css`; empty when it is absent. */
export function extractReducedTransparency(css: string): ReducedTransparency {
  const marker = "@media (prefers-reduced-transparency: reduce)";
  const media = ruleBody(css, marker);
  const inner = media ?? "";
  const open = inner.indexOf("{");
  const selectorText = open === -1 ? "" : inner.slice(0, open);
  // Text after the rule: no theme block may follow it (the rule's own selector list is inside `inner`).
  const after = media === null ? "" : css.slice(css.indexOf(marker) + marker.length + inner.length);
  const themeAfter =
    after.includes(':root[data-theme="dark"]') || after.includes(":root:not([data-theme])");
  return {
    selectors: selectorText
      .split(",")
      .map((selector) => selector.trim())
      .filter((selector) => selector !== ""),
    overrides: declarations(open === -1 ? null : inner.slice(open + 1)),
    lastInFile: media !== null && !themeAfter,
  };
}

/** The tokens as the browser computes them under reduced transparency: `var(--x)` overrides are resolved. */
export function withReducedTransparency(tokens: Tokens, overrides: Tokens): Tokens {
  const resolved = Object.entries(overrides).map(([name, value]) => {
    const reference = /^var\((--[\w-]+)\)$/u.exec(value)?.[1];
    return [name, reference === undefined ? value : (tokens[reference] ?? value)] as const;
  });
  return { ...tokens, ...Object.fromEntries(resolved) };
}

const BACKDROPS = ["map-bg", "bg"] as const;
const ON_PANEL = ["raised", "muted", "muted-2", "accent-soft"] as const;

const colorOf = (tokens: Tokens, name: string): Rgba => {
  const value = tokens[`--color-${name}`];
  if (value === undefined) throw new Error(`missing token --color-${name}`);
  return parseColor(value);
};

/** Every opaque colour the token can appear as on screen (see the file comment). */
export function surfaces(tokens: Tokens, name: string): Rgba[] {
  const color = colorOf(tokens, name);
  if (color[3] === 1) return [color];
  const backdrops = BACKDROPS.map((backdrop) => colorOf(tokens, backdrop));
  if (!(ON_PANEL as readonly string[]).includes(name))
    return backdrops.map((backdrop) => composite(color, backdrop));
  const panel = backdrops.map((backdrop) => composite(colorOf(tokens, "glass"), backdrop));
  return [...panel, colorOf(tokens, "card"), colorOf(tokens, "bg")].map((base) =>
    composite(color, base),
  );
}

export type PairRow = readonly [
  kind: "text" | "non-text",
  use: string,
  fg: string,
  bg: string,
  need: number,
  handoffLight: number,
  handoffDark: number,
];

export interface PairResult {
  readonly kind: "text" | "non-text";
  readonly use: string;
  readonly fg: string;
  readonly bg: string;
  readonly need: number;
  readonly ratio: number;
  readonly pass: boolean;
  /** Both colours are opaque, so the ratio is exact and comparable with the handoff figure. */
  readonly exact: boolean;
}

export function evaluatePairs(tokens: Tokens, pairs: readonly PairRow[] = PAIRS): PairResult[] {
  return pairs.map(([kind, use, fg, bg, need]) => {
    const foreground = colorOf(tokens, fg);
    const backgrounds = surfaces(tokens, bg);
    const ratios = backgrounds.map((background) =>
      contrastRatio(
        foreground[3] === 1 ? foreground : composite(foreground, background),
        background,
      ),
    );
    const ratio = Math.min(...ratios);
    return {
      kind,
      use,
      fg,
      bg,
      need,
      ratio,
      pass: ratio >= need,
      exact: backgrounds.length === 1 && foreground[3] === 1,
    };
  });
}

/** kind, use, foreground token, background token, ratio needed, handoff ratio in light, handoff ratio in dark. */
export const PAIRS: readonly PairRow[] = [
  ["text", "Body text on page", "fg", "bg", 4.5, 17.63, 17.92],
  ["text", "Body text on card / ticket", "fg", "card", 4.5, 19.19, 16.33],
  ["text", "Body text on glass panel (over map)", "fg", "glass", 4.5, 18.19, 17.01],
  ["text", "Body text on raised card in panel", "fg", "raised", 4.5, 19.11, 15.41],
  ["text", "Secondary text on page", "muted-fg", "bg", 4.5, 5.81, 7.57],
  ["text", "Secondary text / placeholder on card", "muted-fg", "card", 4.5, 6.32, 6.9],
  ["text", "Secondary text on glass panel", "muted-fg", "glass", 4.5, 5.99, 7.19],
  ["text", "Secondary text on raised card", "muted-fg", "raised", 4.5, 6.3, 6.51],
  ["text", "Inactive tab / hint on muted surface", "muted-fg", "muted", 4.5, 5.81, 5.63],
  ["text", "Tag text on muted-2", "muted-fg", "muted-2", 4.5, 5.43, 4.99],
  ["text", "Selected option text on muted", "fg", "muted", 4.5, 17.63, 13.32],
  ["text", "Eyebrow (accent text) on glass panel", "accent", "glass", 4.5, 4.82, 10.4],
  ["text", "Eyebrow (accent text) on raised card", "accent", "raised", 4.5, 5.06, 9.42],
  ["text", "Accent text on page", "accent", "bg", 4.5, 4.67, 10.95],
  [
    "text",
    "Heading gradient end (accent-2) on glass (large text (30–40px bold))",
    "accent-2",
    "glass",
    3,
    4.95,
    10.63,
  ],
  ["text", "Button label on accent", "on-accent", "accent", 4.5, 5.08, 10.4],
  [
    "text",
    'Label on gradient end (accent-2): location tile, active tab, "To" flag',
    "on-accent",
    "accent-2",
    4.5,
    5.23,
    10.64,
  ],
  ["text", "Primary hover: label on accent-hover", "on-accent", "accent-hover", 4.5, 7.08, 12.55],
  ["text", "Chip text on accent-soft", "on-soft", "accent-soft", 4.5, 7.22, 11.3],
  ["text", "Notice title (info) on info fill", "info-ink", "info-soft", 4.5, 7.32, 11.53],
  ["text", "Notice text on info fill", "fg", "info-soft", 4.5, 16.99, 12.67],
  ["text", "Notice title (ok) on ok fill", "ok-ink", "ok-soft", 4.5, 6.04, 9.99],
  ["text", "Notice text on ok fill", "fg", "ok-soft", 4.5, 17.07, 12.63],
  ["text", "Notice title (warn) on warn fill", "warn-ink", "warn-soft", 4.5, 5.74, 9.92],
  ["text", "Notice text on warn fill", "fg", "warn-soft", 4.5, 17.09, 12.64],
  ["text", "Notice title (bad) on bad fill", "bad-ink", "bad-soft", 4.5, 6.32, 8.79],
  ["text", "Notice text on bad fill", "fg", "bad-soft", 4.5, 16.7, 13.45],
  ["text", "Toast text on inverse", "on-inverse", "inverse", 4.5, 17.29, 17.29],
  ["text", 'Toast "Undo" on inverse', "accent-inverse", "inverse", 4.5, 10.57, 6.38],
  [
    "text",
    "Map station label on map background (plus a 3.5u halo in map-bg)",
    "map-label",
    "map-bg",
    4.5,
    16.47,
    17.5,
  ],
  [
    "text",
    "Map pill label (halo colour on label colour)",
    "map-halo",
    "map-label",
    4.5,
    16.47,
    17.5,
  ],
  ["text", '"From" scrub flag: page bg on fg', "bg", "fg", 4.5, 17.63, 17.92],
  ["non-text", "Focus ring on page", "focus", "bg", 3, 4.67, 10.95],
  ["non-text", "Focus ring on glass panel", "focus", "glass", 3, 4.82, 10.4],
  ["non-text", "Focus ring on card", "focus", "card", 3, 5.08, 9.98],
  ["non-text", "Field and radio boundary (ctl-line) on card", "ctl-line", "card", 3, 3.67, 3.93],
  ["non-text", "Map line start on map background", "mark-a", "map-bg", 3, 4.36, 10.7],
  ["non-text", "Map line end on map background", "mark-b", "map-bg", 3, 4.49, 10.94],
  ["non-text", "Station pin ring on map background", "map-pin-ring", "map-bg", 3, 4.36, 10.7],
  [
    "non-text",
    "Highlighted pin (label colour) on map background",
    "map-label",
    "map-bg",
    3,
    16.47,
    17.5,
  ],
  ["non-text", "Roundel ring start / end on card", "accent", "card", 3, 5.08, 9.98],
  ["non-text", "Roundel ring end on card", "accent-2", "card", 3, 5.23, 10.2],
  ["non-text", "Active tab pill (accent-2 end) on glass", "accent-2", "glass", 3, 4.95, 10.63],
  ["non-text", "Selected theme card ring (accent) on glass", "accent", "glass", 3, 4.82, 10.4],
  ["non-text", "Scrub handle ring on muted", "accent", "muted", 3, 4.67, 8.14],
  ["non-text", "Notice icon chip (info) on info fill", "info", "info-soft", 3, 4.5, 7.74],
  ["non-text", "Notice icon chip (ok) on ok fill", "ok", "ok-soft", 3, 4.46, 8.05],
  ["non-text", "Notice icon chip (warn) on warn fill", "warn", "warn-soft", 3, 4.5, 7.75],
  ["non-text", "Notice icon chip (bad) on bad fill", "bad", "bad-soft", 3, 4.91, 5.87],
  ["non-text", "Notice icon glyph on chip", "warn-fg", "warn", 3, 5.06, 10.07],
  ["non-text", "Toast close icon on inverse", "on-inverse-2", "inverse", 3, 10.15, 7.33],
  ["non-text", "Toast chip on inverse", "accent-inverse", "inverse", 3, 10.57, 6.38],
  ["non-text", "Mark station ring on page", "mark-station", "bg", 3, 17.63, 17.92],
];
