import { readFileSync } from "node:fs";

import {
  PAIRS,
  composite,
  contrastRatio,
  evaluatePairs,
  extractReducedTransparency,
  extractTokens,
  luminance,
  parseColor,
  surfaces,
  withReducedTransparency,
} from "./design-contrast.ts";
import type { PairRow } from "./design-contrast.ts";

const css = readFileSync("apps/web/src/styles/tokens.css", "utf8");
const partsCss = readFileSync("apps/web/src/styles/tokens-parts.css", "utf8");
const mapCss = readFileSync("apps/web/src/styles/tokens-map.css", "utf8");
const tokens = extractTokens(css, partsCss, mapCss);

test("parseColor reads six-digit hex, rgb() and rgb() with alpha, and rejects anything else", () => {
  expect(parseColor("#0B7A84")).toEqual([11, 122, 132, 1]);
  expect(parseColor(" rgb(11 122 132) ")).toEqual([11, 122, 132, 1]);
  expect(parseColor("rgb(255 255 255 / 0.92)")).toEqual([255, 255, 255, 0.92]);
  expect(() => parseColor("red")).toThrow("not a colour this check understands: red");
  expect(() => parseColor("#fff")).toThrow("not a colour");
});

test("composite blends by alpha over an opaque backdrop", () => {
  expect(composite([255, 255, 255, 0.5], [0, 0, 0, 1])).toEqual([127.5, 127.5, 127.5, 1]);
  expect(composite([10, 20, 30, 1], [200, 200, 200, 1])).toEqual([10, 20, 30, 1]);
});

test("luminance and contrast match the WCAG definitions", () => {
  expect(luminance([0, 0, 0, 1])).toBe(0);
  expect(luminance([255, 255, 255, 1])).toBeCloseTo(1, 10);
  expect(contrastRatio([0, 0, 0, 1], [255, 255, 255, 1])).toBeCloseTo(21, 10);
  expect(contrastRatio([255, 255, 255, 1], [0, 0, 0, 1])).toBeCloseTo(21, 10);
  expect(contrastRatio([120, 120, 120, 1], [120, 120, 120, 1])).toBe(1);
  // A published WCAG example: #767676 on white is 4.54:1.
  expect(contrastRatio([118, 118, 118, 1], [255, 255, 255, 1])).toBeCloseTo(4.54, 2);
});

test("tokens.css defines both themes with the same token names, and the OS fallback equals dark", () => {
  expect(Object.keys(tokens.light).length).toBeGreaterThan(100);
  for (const name of Object.keys(tokens.darkOverrides))
    expect(tokens.light[name], name).toBeDefined();
  expect(tokens.fallbackOverrides).toEqual(tokens.darkOverrides);
  expect(tokens.dark["--color-bg"]?.toLowerCase()).toBe("#060a0a");
  expect(tokens.light["--color-bg"]?.toLowerCase()).toBe("#f2f6f6");
});

test("the feedback and map token files hold their own colours, none of them also in tokens.css", () => {
  const core = extractTokens(css);
  for (const [file, source] of [
    ["tokens-parts.css", partsCss],
    ["tokens-map.css", mapCss],
  ] as const) {
    const part = extractTokens(source);
    expect(Object.keys(part.light).length, file).toBeGreaterThan(5);
    expect(part.fallbackOverrides, file).toEqual(part.darkOverrides);
    for (const name of Object.keys(part.light))
      expect(core.light[name], `${file} ${name}`).toBeUndefined();
  }
  // The shell paints the map background, so that one colour stays in the entry file.
  expect(core.light["--color-map-bg"]).toBeDefined();
  expect(core.light["--color-map-plane-1"]).toBeUndefined();
  expect(core.light["--color-warn"]).toBeUndefined();
});

test("extractTokens finds nothing in a stylesheet without the three blocks", () => {
  const empty = extractTokens("body { color: red; }");
  expect(empty.light).toEqual({});
  expect(empty.darkOverrides).toEqual({});
  expect(empty.fallbackOverrides).toEqual({});
  expect(extractTokens(":root { --a: 1;").light).toEqual({});
});

test("the pair table is the handoff's 81 rows (53 of revision 1 and 28 of revisions 2 and 3)", () => {
  expect(PAIRS).toHaveLength(81);
  expect(PAIRS.filter(([kind]) => kind === "text")).toHaveLength(52);
  expect(new Set(PAIRS.map(([, use, fg, bg]) => `${use}|${fg}|${bg}`)).size).toBe(81);
});

for (const theme of ["light", "dark"] as const) {
  test(`every ${theme} pair meets its WCAG ratio (0 failing pairs)`, () => {
    const results = evaluatePairs(tokens[theme]);
    const failing = results.filter((result) => !result.pass);
    expect(
      failing.map((r) => `${r.use}: ${r.fg} on ${r.bg} ${r.ratio.toFixed(2)} < ${r.need}`),
    ).toEqual([]);
    expect(results).toHaveLength(81);
  });

  test(`every opaque ${theme} pair reproduces the figure the handoff published`, () => {
    const published = PAIRS.map((row) => (theme === "light" ? row[5] : row[6]));
    const compared = evaluatePairs(tokens[theme])
      .map((result, index) => ({ result, figure: published[index] ?? 0 }))
      // A figure of 0 is one the handoff did not publish for this theme.
      .filter(({ result, figure }) => result.exact && figure > 0);
    expect(compared.length).toBeGreaterThan(30);
    for (const { result, figure } of compared) {
      expect(Math.abs(result.ratio - figure), result.use).toBeLessThan(0.011);
    }
  });

  test(`every revision 2 and 3 ${theme} pair on a translucent surface reproduces the published figure over the handoff's backdrop`, () => {
    // The gate judges these rows at their worst backdrop (map background and page); the handoff published one
    // figure, measured over the map background, so that single backdrop is recomputed and compared.
    let compared = 0;
    for (const [index, row] of PAIRS.entries()) {
      const figure = theme === "light" ? row[5] : row[6];
      const [result] = evaluatePairs(tokens[theme], [row]);
      if (index < FIRST_REVISION_2_ROW || figure === 0 || result?.exact !== false) continue;
      const backdrop = HANDOFF_BACKDROP[row[3]];
      expect(backdrop, row[1]).toBeDefined();
      const [one] = evaluatePairs(tokens[theme], [
        [row[0], row[1], row[2], backdrop ?? "", row[4], 0, 0],
      ]);
      expect(Math.abs((one?.ratio ?? 0) - figure), row[1]).toBeLessThan(0.011);
      compared += 1;
    }
    expect(compared).toBe(16);
  });

  test(`translucent ${theme} surfaces are judged at their worst backdrop, never better than any one of them`, () => {
    for (const name of ["glass", "raised", "muted", "muted-2", "accent-soft"]) {
      const candidates = surfaces(tokens[theme], name);
      expect(candidates.length, name).toBeGreaterThan(1);
      const fg = parseColor(tokens[theme]["--color-fg"] ?? "");
      const [row] = evaluatePairs(tokens[theme], [["text", name, "fg", name, 4.5, 0, 0]]);
      expect(row?.ratio, name).toBe(Math.min(...candidates.map((c) => contrastRatio(fg, c))));
      expect(row?.exact, name).toBe(false);
    }
  });
}

/** Rows 0 to 52 are revision 1; the rest are revision 2 and 3 (METRO-157). */
const FIRST_REVISION_2_ROW = 53;

/**
 * The single backdrop the handoff measured each translucent family over: the map background, under the glass panel
 * (`glass-thick`, what `.panel` paints), the raised card on that panel, and the palette box (`pop`).
 */
const HANDOFF_BACKDROP: Readonly<Record<string, string>> = {
  "glass-thick": "glass-thick on map-bg",
  raised: "raised on glass-thick on map-bg",
  "accent-soft on raised on glass-thick": "accent-soft on raised on glass-thick on map-bg",
  "muted on glass-thick": "muted on glass-thick on map-bg",
  "thumb on muted on glass-thick": "thumb on muted on glass-thick on map-bg",
  pop: "pop on map-bg",
  "accent-soft on pop": "accent-soft on pop on map-bg",
  "muted on pop": "muted on pop on map-bg",
};

test("the only revision 2 and 3 row without a published figure is dark panel over a white road tile", () => {
  const unpublished = PAIRS.flatMap((row, index) =>
    index < FIRST_REVISION_2_ROW
      ? []
      : (["light", "dark"] as const)
          .filter((theme) => (theme === "light" ? row[5] : row[6]) === 0)
          .map((theme) => `${theme}: ${row[1]}`),
  );
  expect(unpublished).toEqual(["dark: Search field outline, panel over a white road tile"]);
});

test('"a on b" paints token a over every surface b can be, and chains read right to left', () => {
  const light = tokens.light;
  const card = parseColor(light["--color-card"] ?? "");
  const soft = parseColor(light["--color-accent-soft"] ?? "");
  expect(surfaces(light, "accent-soft on card")).toEqual([composite(soft, card)]);
  expect(surfaces(light, "muted on glass-thick")).toHaveLength(2);
  expect(surfaces(light, "accent-soft on pop")).toHaveLength(2);
});

/** The header brand (METRO-105): not in the handoff table, so checked here with the same rules. */
const BRAND_PAIRS: readonly PairRow[] = [
  ["non-text", "Mark ink on the tile gradient start", "brand-tile-ink", "brand-tile-a", 3, 0, 0],
  ["non-text", "Mark ink on the tile gradient end", "brand-tile-ink", "brand-tile-b", 3, 0, 0],
  ["text", "Wordmark on the phone brand pill", "fg", "glass-thick", 4.5, 0, 0],
  ["text", "Second word of the wordmark in the header", "muted-fg", "glass-thick", 4.5, 0, 0],
];

for (const theme of ["light", "dark"] as const) {
  test(`the ${theme} header brand meets its ratios: mark ink on the tile, wordmark on the pill`, () => {
    const results = evaluatePairs(tokens[theme], BRAND_PAIRS);
    expect(results).toHaveLength(4);
    expect(
      results.filter((result) => !result.pass).map((r) => `${r.use} ${r.ratio.toFixed(2)}`),
    ).toEqual([]);
  });
}

test("a token that loses contrast makes its pair fail (the check can go red)", () => {
  const weak = { ...tokens.light, "--color-muted-fg": "#C0C4CC" };
  const failing = evaluatePairs(weak).filter((result) => !result.pass);
  expect(failing.length).toBeGreaterThan(5);
  expect(failing.every((result) => result.fg === "muted-fg")).toBe(true);
});

test("a translucent foreground is composited over the background it sits on", () => {
  const rows: readonly PairRow[] = [["text", "veil", "map-dot", "bg", 1, 0, 0]];
  const [result] = evaluatePairs(tokens.light, rows);
  expect(result?.exact).toBe(false);
  expect(result?.ratio).toBeGreaterThan(1);
});

test("a missing token is a loud error, not a skipped pair", () => {
  expect(() => evaluatePairs({}, [["text", "x", "fg", "bg", 4.5, 0, 0]])).toThrow(
    "missing token --color-fg",
  );
});

const reduced = extractReducedTransparency(css);

test("reduced transparency overrides the glass tokens under every theme selector, after all of them", () => {
  // The dark selectors are more specific than a bare :root, so each needs its own entry (METRO-105 review).
  expect(reduced.selectors).toEqual([
    ":root",
    ':root[data-theme="dark"]',
    ":root:not([data-theme])",
  ]);
  expect(reduced.overrides).toEqual({
    "--color-glass": "var(--color-glass-solid)",
    "--color-glass-thick": "var(--color-glass-solid)",
    "--color-pop": "var(--color-glass-solid)",
    "--blur": "none",
  });
  expect(reduced.lastInFile).toBe(true);
});

test("extractReducedTransparency reports a missing rule, and a rule placed before the dark blocks", () => {
  const none = extractReducedTransparency("body { color: red; }");
  expect(none.selectors).toEqual([]);
  expect(none.overrides).toEqual({});
  const early = extractReducedTransparency(
    [
      "@media (prefers-reduced-transparency: reduce) { :root { --blur: none; } }",
      ':root[data-theme="dark"] { --a: 1; }',
    ].join(" "),
  );
  expect(early.selectors).toEqual([":root"]);
  expect(early.lastInFile).toBe(false);
  expect(
    extractReducedTransparency("@media (prefers-reduced-transparency: reduce) { }").selectors,
  ).toEqual([]);
});

for (const theme of ["light", "dark"] as const) {
  test(`under reduced transparency the ${theme} glass is solid and every pair still passes`, () => {
    const solid = withReducedTransparency(tokens[theme], reduced.overrides);
    expect(solid["--color-glass"]).toBe(tokens[theme]["--color-glass-solid"]);
    expect(solid["--color-glass-thick"]).toBe(tokens[theme]["--color-glass-solid"]);
    expect(solid["--blur"]).toBe("none");
    expect(surfaces(solid, "glass")).toHaveLength(1);
    const failing = evaluatePairs(solid).filter((result) => !result.pass);
    expect(failing.map((r) => `${r.use}: ${r.ratio.toFixed(2)} < ${r.need}`)).toEqual([]);
  });
}

test("withReducedTransparency keeps a literal override and a reference to a missing token as written", () => {
  const result = withReducedTransparency(
    { "--a": "1" },
    { "--b": "none", "--c": "var(--missing)" },
  );
  expect(result).toEqual({ "--a": "1", "--b": "none", "--c": "var(--missing)" });
});
