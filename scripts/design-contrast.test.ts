import { readFileSync } from "node:fs";

import {
  PAIRS,
  composite,
  contrastRatio,
  evaluatePairs,
  extractTokens,
  luminance,
  parseColor,
  surfaces,
} from "./design-contrast.ts";
import type { PairRow } from "./design-contrast.ts";

const css = readFileSync("apps/web/src/styles/tokens.css", "utf8");
const tokens = extractTokens(css);

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

test("extractTokens finds nothing in a stylesheet without the three blocks", () => {
  const empty = extractTokens("body { color: red; }");
  expect(empty.light).toEqual({});
  expect(empty.darkOverrides).toEqual({});
  expect(empty.fallbackOverrides).toEqual({});
  expect(extractTokens(":root { --a: 1;").light).toEqual({});
});

test("the pair table is the handoff's 53 rows", () => {
  expect(PAIRS).toHaveLength(53);
  expect(PAIRS.filter(([kind]) => kind === "text")).toHaveLength(32);
  expect(new Set(PAIRS.map(([, use, fg, bg]) => `${use}|${fg}|${bg}`)).size).toBe(53);
});

for (const theme of ["light", "dark"] as const) {
  test(`every ${theme} pair meets its WCAG ratio (0 failing pairs)`, () => {
    const results = evaluatePairs(tokens[theme]);
    const failing = results.filter((result) => !result.pass);
    expect(
      failing.map((r) => `${r.use}: ${r.fg} on ${r.bg} ${r.ratio.toFixed(2)} < ${r.need}`),
    ).toEqual([]);
    expect(results).toHaveLength(53);
  });

  test(`every opaque ${theme} pair reproduces the figure the handoff published`, () => {
    const published = PAIRS.map((row) => (theme === "light" ? row[5] : row[6]));
    const compared = evaluatePairs(tokens[theme])
      .map((result, index) => ({ result, figure: published[index] ?? 0 }))
      .filter(({ result }) => result.exact);
    expect(compared.length).toBeGreaterThan(30);
    for (const { result, figure } of compared) {
      expect(Math.abs(result.ratio - figure), result.use).toBeLessThan(0.011);
    }
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
