/**
 * METRO-105 (ADR-0021): styling rules for `apps/web`, checked as text so they hold whatever the build does.
 *
 * - No inline style, ever: the CSP has no `'unsafe-inline'` (ADR-0011). A `style` attribute or prop, a
 *   `<style>` element, `setAttribute("style")`, `cssText`, `Object.assign(el.style, ...)`, direct
 *   `element.style.x = ...` and `element.style[x] = ...` writes, `insertRule` and `adoptedStyleSheets` are
 *   findings; the only dynamic styling is `style.setProperty` / `style.removeProperty` (CSSOM) and data
 *   attributes.
 * - Colours come from tokens: outside `tokens.css` a stylesheet holds no hex, `rgb()`, `hsl()`, `hwb()`, `lab()`,
 *   `lch()`, `oklab()`, `oklch()`, `color()` or `light-dark()` literal and no named colour (`red`, `white`, ...).
 *   `transparent`, `currentColor`, system colours such as `CanvasText`, `color-mix(in oklch, ...)` (it names a
 *   colour space) and `url(#id)` are fine. Source files hold no hex string.
 * - Load order: `styles/index.css` imports fonts, tokens, base, then components.
 */

export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly text: string;
}

const COLOUR_FUNCTION = /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|light-dark)\(/u;
const HEX_IN_CSS = /#[0-9a-f]{3,8}\b/iu;
const HEX_STRING = /["'`]#[0-9a-f]{3,8}["'`]/iu;

/** The CSS named colours (CSS Color Module Level 4), lower case. */
const NAMED_COLOURS: ReadonlySet<string> = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown " +
    "burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan " +
    "darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid " +
    "darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet " +
    "deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro " +
    "ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki " +
    "lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow " +
    "lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray " +
    "lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine " +
    "mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise " +
    "mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab " +
    "orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru " +
    "pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown " +
    "seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan " +
    "teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
  ).split(" "),
);

const INLINE_STYLE: readonly (readonly [rule: string, pattern: RegExp])[] = [
  ["inline-style-attribute", /\bstyle=/u],
  ["style-element", /<style[\s>]/iu],
  ["set-style-attribute", /setAttribute\(\s*["'`]style["'`]/u],
  ["css-text", /\.cssText\b/u],
  ["style-property-write", /\.style\.[a-zA-Z]+\s*=(?!=)/u],
  ["style-index-write", /\.style\[[^\]]+\]\s*=(?!=)/u],
  ["style-object-assign", /Object\.assign\([^)]*\bstyle\b/u],
  ["insert-rule", /\binsertRule\s*\(/u],
  ["adopted-style-sheets", /\badoptedStyleSheets\b/u],
  ["style-prop", /\bstyle\s*:\s*\{/u],
];

/** Replaces matches by spaces, so later passes keep the same lines and columns. */
const blank = (text: string, pattern: RegExp): string =>
  text.replaceAll(pattern, (match) => match.replaceAll(/[^\n]/gu, " "));

/** CSS with comments, strings, `url(...)` and `var(...)` blanked: what is left can hold a colour literal. */
const colourText = (text: string): string =>
  [/\/\*[\s\S]*?\*\//gu, /"[^"\n]*"|'[^'\n]*'/gu, /url\([^)]*\)/gu, /var\([^)]*\)/gu].reduce(
    blank,
    text,
  );

function scan(
  file: string,
  text: string,
  rules: readonly (readonly [string, RegExp])[],
): Finding[] {
  const found: Finding[] = [];
  text.split("\n").forEach((line, index) => {
    for (const [rule, pattern] of rules) {
      if (pattern.test(line))
        found.push({ file, line: index + 1, rule, text: line.trim().slice(0, 120) });
    }
  });
  return found;
}

/** Named colours used as a value: each declaration's text after its `:`, whole words only. */
function namedColours(file: string, css: string): Finding[] {
  const found: Finding[] = [];
  for (const match of css.matchAll(/([^{};]*)([{};])/gu)) {
    const [, segment = "", delimiter = ""] = match;
    // A segment closed by `{` is a selector or an at-rule prelude, not a declaration.
    if (delimiter === "{" || !segment.includes(":")) continue;
    const value = segment.slice(segment.indexOf(":") + 1);
    const word = [...value.matchAll(/(?<![\w-])[a-z]+(?![\w-])/giu)].find((candidate) =>
      NAMED_COLOURS.has(candidate[0].toLowerCase()),
    );
    if (word === undefined) continue;
    const at = (match.index ?? 0) + segment.indexOf(":") + 1 + (word.index ?? 0);
    found.push({
      file,
      line: css.slice(0, at).split("\n").length,
      rule: "named-colour",
      text: segment.trim().replaceAll(/\s+/gu, " ").slice(0, 120),
    });
  }
  return found;
}

/** Rules for one stylesheet. `tokens.css` is where colour literals live, so it is exempt from them. */
export function checkStylesheet(file: string, text: string): Finding[] {
  const css = colourText(text);
  if (/\/styles\/tokens(?:-[a-z]+)?\.css$/u.test(file)) return [];
  return [
    ...scan(file, css, [
      ["colour-literal", COLOUR_FUNCTION],
      ["colour-literal", HEX_IN_CSS],
    ]),
    ...namedColours(file, css),
  ];
}

/** Rules for HTML, JavaScript, TypeScript and TSX: no inline style; no hex string in non-test source. */
export function checkSource(file: string, text: string): Finding[] {
  const rules: (readonly [string, RegExp])[] = [...INLINE_STYLE];
  if (!/\.test\.tsx?$/u.test(file) && !file.endsWith(".html"))
    rules.push(["colour-literal", HEX_STRING]);
  return scan(file, text, rules);
}

const rank = (name: string): number => {
  if (name === "fonts.css") return 0;
  if (name === "tokens.css") return 1;
  if (name === "base.css") return 2;
  return name.startsWith("components/") ? 3 : -1;
};

/** `styles/index.css` must import fonts, tokens, base, then components, in that order. */
export function checkLoadOrder(file: string, text: string): Finding[] {
  const imports = [...blank(text, /\/\*[\s\S]*?\*\//gu).matchAll(/@import\s+"\.\/([^"]+)"/gu)].map(
    (match) => match[1] ?? "",
  );
  const ranks = imports.map(rank);
  const ordered = ranks.every(
    (value, index) => value >= 0 && (index === 0 || value >= (ranks[index - 1] ?? 0)),
  );
  const complete = [0, 1, 2].every((needed) => ranks.includes(needed));
  return ordered && complete
    ? []
    : [
        {
          file,
          line: 1,
          rule: "load-order",
          text: "imports must be fonts.css, tokens.css, base.css, then components/*",
        },
      ];
}

/**
 * Custom properties that are written at run time (CSSOM `setProperty`) or per state by data attributes, so no
 * token file declares them as a value.
 */
const DYNAMIC_PROPERTIES: ReadonlySet<string> = new Set(["--sheet-h", "--pos", "--a", "--b"]);

/** Stylesheets of the entry set: they load on every first visit, so they may use no lazily loaded token. */
const ENTRY_STYLESHEETS = /\/styles\/(?:base|components\/shell|components\/brand)\.css$/u;

const PARTS_FILE = /\/styles\/tokens-parts\.css$/u;
const MAP_FILE = /\/styles\/tokens-map\.css$/u;
const IS_TOKEN_FILE = /\/styles\/tokens(?:-[a-z]+)?\.css$/u;

const declaredIn = (css: string): string[] =>
  [...blank(css, /\/\*[\s\S]*?\*\//gu).matchAll(/(--[\w-]+)\s*:/gu)].map((match) => match[1] ?? "");

const usesIn = (css: string): { name: string; line: number }[] => {
  const text = blank(css, /\/\*[\s\S]*?\*\//gu);
  return [...text.matchAll(/var\(\s*(--[\w-]+)/gu)].map((match) => ({
    name: match[1] ?? "",
    line: text.slice(0, match.index).split(String.fromCharCode(10)).length,
  }));
};

const importsFile = (css: string, name: string): boolean =>
  [...css.matchAll(/@import\s+(?:url\()?["']?([^"')]+)/gu)].some((match) =>
    (match[1] ?? "").endsWith(`/${name}.css`),
  );

/**
 * Every `var(--x)` in a stylesheet (and in non-test TypeScript) has a declaration somewhere under `apps/web/src`
 * or is a run-time property. A component stylesheet that uses a token declared in `tokens-parts.css` or
 * `tokens-map.css` imports that file itself, so it never depends on which other stylesheet loaded first; the
 * entry stylesheets use neither file, since they load on every visit. Found in review: dropping five tokens as
 * "unused" broke the ticket mask, because the use sat in another file.
 */
export function checkTokenUse(files: Readonly<Record<string, string>>): Finding[] {
  const sources = Object.entries(files).filter(
    ([file]) => file.endsWith(".css") || (/\.tsx?$/u.test(file) && !/\.test\.tsx?$/u.test(file)),
  );
  const declared = new Set<string>(DYNAMIC_PROPERTIES);
  const parts = new Set<string>();
  const map = new Set<string>();
  for (const [file, text] of sources) {
    if (!file.endsWith(".css")) continue;
    for (const name of declaredIn(text)) {
      declared.add(name);
      if (PARTS_FILE.test(file)) parts.add(name);
      if (MAP_FILE.test(file)) map.add(name);
    }
  }
  const found: Finding[] = [];
  for (const [file, text] of sources) {
    const own = new Set(file.endsWith(".css") ? declaredIn(text) : []);
    for (const { name, line } of usesIn(text)) {
      const where = { file, line, text: `var(${name})` };
      if (!declared.has(name)) found.push({ ...where, rule: "undefined-token" });
      if (!file.endsWith(".css") || IS_TOKEN_FILE.test(file) || own.has(name)) continue;
      for (const [set, id] of [
        [parts, "tokens-parts"],
        [map, "tokens-map"],
      ] as const) {
        if (!set.has(name)) continue;
        if (ENTRY_STYLESHEETS.test(file)) found.push({ ...where, rule: "entry-uses-lazy-token" });
        else if (!importsFile(text, id)) found.push({ ...where, rule: "token-import" });
      }
    }
  }
  return found;
}

/** All rules over a set of files (path with forward slashes, to its text). */
export function checkTree(files: Readonly<Record<string, string>>): Finding[] {
  const found: Finding[] = [];
  for (const [file, text] of Object.entries(files)) {
    if (file.endsWith(".css")) found.push(...checkStylesheet(file, text));
    else found.push(...checkSource(file, text));
    if (file.endsWith("/styles/index.css")) found.push(...checkLoadOrder(file, text));
  }
  if (Object.keys(files).some((file) => file.endsWith("/styles/tokens.css")))
    found.push(...checkTokenUse(files));
  return found;
}
