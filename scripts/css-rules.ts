/**
 * METRO-105 (ADR-0021): styling rules for `apps/web`, checked as text so they hold whatever the build does.
 *
 * - No inline style, ever: the CSP has no `'unsafe-inline'` (ADR-0011). A `style` attribute or prop, a
 *   `<style>` element, `setAttribute("style")`, `cssText` and direct `element.style.x = ...` writes are
 *   findings; the only dynamic styling is `style.setProperty` / `style.removeProperty` (CSSOM) and data
 *   attributes.
 * - Colours come from tokens: outside `tokens.css` a stylesheet holds no hex, `rgb()`, `hsl()`, `hwb()`, `lab()`,
 *   `lch()`, `oklab()` or `oklch()` colour literal (`color-mix(in oklch, ...)` names a colour space and is
 *   fine), and source files hold no hex string.
 * - Load order: `styles/index.css` imports fonts, tokens, base, then components.
 */

export interface Finding {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly text: string;
}

const COLOUR_FUNCTION = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/u;
const HEX_IN_CSS = /#[0-9a-f]{3,8}\b/iu;
const HEX_STRING = /["'`]#[0-9a-f]{3,8}["'`]/iu;

const INLINE_STYLE: readonly (readonly [rule: string, pattern: RegExp])[] = [
  ["inline-style-attribute", /\bstyle=/u],
  ["style-element", /<style[\s>]/iu],
  ["set-style-attribute", /setAttribute\(\s*["'`]style["'`]/u],
  ["css-text", /\.cssText\b/u],
  ["style-property-write", /\.style\.[a-zA-Z]+\s*=(?!=)/u],
  ["style-prop", /\bstyle\s*:\s*\{/u],
];

const stripCssComments = (text: string): string =>
  text.replaceAll(/\/\*[\s\S]*?\*\//gu, (comment) => comment.replaceAll(/[^\n]/gu, " "));

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

/** Rules for one stylesheet. `tokens.css` is where colour literals live, so it is exempt from them. */
export function checkStylesheet(file: string, text: string): Finding[] {
  const css = stripCssComments(text);
  const rules: (readonly [string, RegExp])[] = [];
  if (!file.endsWith("/tokens.css")) {
    rules.push(["colour-literal", COLOUR_FUNCTION], ["colour-literal", HEX_IN_CSS]);
  }
  return scan(file, css, rules);
}

/** Rules for HTML, TypeScript and TSX: no inline style; no hex string in non-test source. */
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
  const imports = [...stripCssComments(text).matchAll(/@import\s+"\.\/([^"]+)"/gu)].map(
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

/** All rules over a set of files (path with forward slashes, to its text). */
export function checkTree(files: Readonly<Record<string, string>>): Finding[] {
  const found: Finding[] = [];
  for (const [file, text] of Object.entries(files)) {
    if (file.endsWith(".css")) found.push(...checkStylesheet(file, text));
    else found.push(...checkSource(file, text));
    if (file.endsWith("/styles/index.css")) found.push(...checkLoadOrder(file, text));
  }
  return found;
}
