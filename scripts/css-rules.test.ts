import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import {
  checkLoadOrder,
  checkSource,
  checkStylesheet,
  checkTokenUse,
  checkTree,
} from "./css-rules.ts";

/** Every file the rules govern: `index.html`, everything under src, and the scripts and styles in public/. */
function webFiles(): Record<string, string> {
  const files: Record<string, string> = {
    "apps/web/index.html": readFileSync("apps/web/index.html", "utf8"),
  };
  const roots: readonly [string, RegExp][] = [
    ["apps/web/src", /\.(css|html|tsx?)$/u],
    ["apps/web/public", /\.(css|html|js)$/u],
  ];
  for (const [root, pattern] of roots) {
    for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile() || !pattern.test(entry.name)) continue;
      const path = join(entry.parentPath, entry.name).replaceAll("\\", "/");
      files[path.slice(path.indexOf("apps/web/"))] = readFileSync(path, "utf8");
    }
  }
  return files;
}

const files = webFiles();

test("the web app has no inline style, no colour literal outside tokens.css and the right load order", () => {
  expect(Object.keys(files).length).toBeGreaterThan(40);
  expect(Object.keys(files)).toContain("apps/web/src/styles/tokens.css");
  expect(Object.keys(files)).toContain("apps/web/src/styles/components/button.css");
  expect(Object.keys(files)).toContain("apps/web/public/theme-boot.js");
  expect(checkTree(files)).toEqual([]);
});

test("tokens.css is the one stylesheet with colour literals, and it has them", () => {
  const tokens = files["apps/web/src/styles/tokens.css"] ?? "";
  expect(tokens).toMatch(/#[0-9A-F]{6}/iu);
  expect(tokens).toMatch(/rgb\(/u);
  expect(checkStylesheet("apps/web/src/styles/tokens.css", tokens)).toEqual([]);
});

test("a stylesheet outside tokens.css fails on hex and on colour functions, not on comments or color-mix", () => {
  const css = [
    "/* a comment with #FFF and rgb(1 2 3) is fine */",
    ".a { color: #0B7A84; }",
    ".b { background: rgb(0 0 0 / 0.5); }",
    ".c { color: hsl(10 10% 10%); }",
    ".d { color: oklch(0.5 0.1 200); }",
    ".e { color: color-mix(in oklch, var(--color-accent) 40%, transparent); }",
    ".f { color: var(--color-fg); outline: 2px solid CanvasText; fill: url(#map-line); }",
  ].join("\n");
  const found = checkStylesheet("apps/web/src/styles/components/x.css", css);
  expect(found.map((finding) => finding.line)).toEqual([2, 3, 4, 5]);
  expect(found.every((finding) => finding.rule === "colour-literal")).toBe(true);
});

test("a comment spanning lines keeps the line numbers of what follows", () => {
  const css = "/* one\ntwo #FFF */\n.a { color: #fff; }";
  expect(checkStylesheet("x.css", css).map((finding) => finding.line)).toEqual([3]);
});

test("every inline-style route is a finding in source", () => {
  const samples: Record<string, string> = {
    "inline-style-attribute": '<div style="color:red"></div>',
    "style-element": "<style>a{}</style>",
    "set-style-attribute": 'el.setAttribute("style", "x")',
    "css-text": "el.style.cssText = ''",
    "style-property-write": "el.style.width = '3px'",
    "style-prop": "const props = { style: { width: 3 } }",
  };
  for (const [rule, line] of Object.entries(samples)) {
    expect(
      checkSource("apps/web/src/x.tsx", line).map((finding) => finding.rule),
      rule,
    ).toContain(rule);
  }
  expect(checkSource("apps/web/index.html", '<p style="x">')[0]?.rule).toBe(
    "inline-style-attribute",
  );
});

test("CSSOM setProperty and removeProperty, reads and comparisons are allowed", () => {
  const ok = [
    'app.style.setProperty("--sheet-h", "3px");',
    'app.style.removeProperty("--sheet-h");',
    'const value = app.style.getPropertyValue("--sheet-h");',
    "if (el.style.width === '') return;",
    "const style = 1;",
    "const hidden = container.querySelector('[style]');",
  ].join("\n");
  expect(checkSource("apps/web/src/x.tsx", ok)).toEqual([]);
});

test("a hex string in source is a finding, except in HTML meta tags and in tests", () => {
  expect(checkSource("apps/web/src/x.tsx", 'const c = "#0B7A84";').map((f) => f.rule)).toEqual([
    "colour-literal",
  ]);
  expect(checkSource("apps/web/src/x.test.tsx", 'expect(c).toBe("#0B7A84");')).toEqual([]);
  expect(
    checkSource("apps/web/index.html", '<meta name="theme-color" content="#0f172a" />'),
  ).toEqual([]);
  expect(checkSource("apps/web/src/x.tsx", 'href="#panel"')).toEqual([]);
});

test("the load order is fonts, tokens, base, components and nothing may precede or be missing", () => {
  const good =
    '@import "./fonts.css";\n@import "./tokens.css";\n@import "./base.css";\n@import "./components/shell.css";';
  expect(checkLoadOrder("styles/index.css", good)).toEqual([]);
  const wrong = [
    '@import "./tokens.css";\n@import "./fonts.css";\n@import "./base.css";',
    '@import "./fonts.css";\n@import "./tokens.css";\n@import "./components/shell.css";\n@import "./base.css";',
    '@import "./fonts.css";\n@import "./base.css";',
    '@import "./fonts.css";\n@import "./tokens.css";\n@import "./base.css";\n@import "./other.css";',
    "",
  ];
  for (const text of wrong) {
    expect(
      checkLoadOrder("styles/index.css", text).map((finding) => finding.rule),
      text,
    ).toEqual(["load-order"]);
  }
  expect(checkLoadOrder("styles/index.css", "/* @import './x'; */" + good)).toEqual([]);
});

test("checkTree applies stylesheet, source and load-order rules by file kind", () => {
  const found = checkTree({
    "apps/web/src/styles/index.css": '@import "./base.css";',
    "apps/web/src/styles/components/a.css": ".a{color:#fff}",
    "apps/web/src/a.tsx": '<i style="x" />',
  });
  expect(new Set(found.map((finding) => finding.rule))).toEqual(
    new Set(["colour-literal", "inline-style-attribute", "load-order"]),
  );
});

test("named colours are findings in a stylesheet, but not in selectors, strings, ids, names or allowed keywords", () => {
  const css = [
    ".white { color: white; }",
    ".b { background: linear-gradient(135deg, var(--color-red), tan); }",
    ".c { border: 1px solid Red; }",
    ".d { content: 'white'; fill: url(#red); }",
    ".e { white-space: nowrap; animation: ping-ring 2s; font-family: Menlo, sans-serif; }",
    ".f { color: transparent; outline-color: CanvasText; fill: currentColor; color-scheme: light; }",
    ".g { box-shadow:",
    "    0 0 0 1px var(--color-hair),",
    "    0 0 1px gold; }",
    "@media (min-width: 768px) { .h { transition: background-color 1s; } }",
  ].join(String.fromCharCode(10));
  const found = checkStylesheet("apps/web/src/styles/components/x.css", css);
  expect(found.map((finding) => [finding.line, finding.rule])).toEqual([
    [1, "named-colour"],
    [2, "named-colour"],
    [3, "named-colour"],
    [9, "named-colour"],
  ]);
  expect(found[3]?.text).toContain("gold");
});

test("color(), light-dark() and the other colour functions are findings; color-mix() and url(#id) are not", () => {
  const css = [
    ".a { color: color(display-p3 1 0 0); }",
    ".b { color: light-dark(var(--x), var(--y)); }",
    ".c { color: color-mix(in oklch, var(--a) 40%, transparent); }",
    ".d { mask: url(#abc) center; background: url(#fade); }",
    ".e { color: hwb(0 0% 0%); }",
  ].join(String.fromCharCode(10));
  const found = checkStylesheet("apps/web/src/styles/components/x.css", css);
  expect(found.map((finding) => finding.line)).toEqual([1, 2, 5]);
});

test("a hex-like id inside url() is not a colour, and tokens.css stays exempt from named colours too", () => {
  expect(
    checkStylesheet("apps/web/src/styles/components/x.css", ".a { fill: url(#fade); }"),
  ).toEqual([]);
  for (const name of ["tokens.css", "tokens-parts.css", "tokens-map.css"]) {
    expect(
      checkStylesheet(`apps/web/src/styles/${name}`, ".a { color: white; background: #fff; }"),
    ).toEqual([]);
  }
  // Only the token files are exempt: a component file that merely starts with "tokens" is not.
  expect(
    checkStylesheet("apps/web/src/styles/components/tokens-x.css", ".a { color: white; }"),
  ).toHaveLength(1);
});

test("the new style-writing routes are findings in source", () => {
  const samples: Record<string, string> = {
    "style-index-write": "el.style[name] = value;",
    "style-object-assign": "Object.assign(el.style, { width: '3px' });",
    "insert-rule": "sheet.insertRule('a{}');",
    "adopted-style-sheets": "document.adoptedStyleSheets = [sheet];",
  };
  for (const [rule, line] of Object.entries(samples)) {
    expect(
      checkSource("apps/web/src/x.ts", line).map((finding) => finding.rule),
      rule,
    ).toContain(rule);
    expect(
      checkSource("apps/web/public/boot.js", line).map((finding) => finding.rule),
      rule,
    ).toContain(rule);
  }
  expect(checkSource("apps/web/src/x.ts", "Object.assign(event, { pointerId: 1 });")).toEqual([]);
  expect(checkSource("apps/web/src/x.ts", "if (el.style[name] === '') return;")).toEqual([]);
});

test("a fixture tree with one of each violation fails, so the real-tree check above can go red", () => {
  const found = checkTree({
    "apps/web/src/a.css": ".a { color: red; }",
    "apps/web/public/boot.js": "el.style.width = '1px';",
    "apps/web/src/b.ts": "document.adoptedStyleSheets = [];",
  });
  expect(new Set(found.map((finding) => finding.rule))).toEqual(
    new Set(["named-colour", "style-property-write", "adopted-style-sheets"]),
  );
});

const S = "apps/web/src/styles/";
/** A small tree with the three token files and a component that uses tokens from each. */
const tokenTree = (
  component: string,
  extra: Record<string, string> = {},
): Record<string, string> => ({
  [`${S}tokens.css`]: ":root { --color-fg: #000; --color-map-bg: #eee; }",
  [`${S}tokens-parts.css`]: ":root { --color-warn: #a15f00; --mask-ink: #000; }",
  [`${S}tokens-map.css`]: ":root { --color-map-pin: #fff; }",
  [`${S}components/x.css`]: component,
  ...extra,
});

test("a var() with no declaration anywhere is a finding, as the ticket mask was when its token was dropped", () => {
  const found = checkTokenUse(
    tokenTree(
      '@import "../tokens-parts.css";\n.t { mask: radial-gradient(var(--mask-ink-gone)); }',
    ),
  );
  expect(found.map((finding) => [finding.rule, finding.text])).toEqual([
    ["undefined-token", "var(--mask-ink-gone)"],
  ]);
  expect(found[0]?.line).toBe(2);
});

test("run-time properties, a local declaration and a fallback are not findings", () => {
  const css = [
    ".a { height: var(--sheet-h); left: var(--pos); width: var(--a); top: var(--b); }",
    ".b { --tone: var(--color-fg); color: var(--tone); }",
    "/* var(--commented-out) */",
  ].join(String.fromCharCode(10));
  expect(checkTokenUse(tokenTree(css))).toEqual([]);
});

test("a component using a parts or map token must import that file itself", () => {
  const missingParts = checkTokenUse(tokenTree(".a { color: var(--color-warn); }"));
  expect(missingParts.map((finding) => finding.rule)).toEqual(["token-import"]);
  const missingMap = checkTokenUse(tokenTree(".a { fill: var(--color-map-pin); }"));
  expect(missingMap.map((finding) => finding.rule)).toEqual(["token-import"]);
  // Another stylesheet importing the file does not help: each file loads it itself.
  const other = { [`${S}components/common.css`]: '@import "../tokens-parts.css";' };
  expect(
    checkTokenUse(tokenTree(".a { color: var(--color-warn); }", other)).map((f) => f.rule),
  ).toEqual(["token-import"]);
  const ok = tokenTree(
    '@import "../tokens-parts.css";\n@import "../tokens-map.css";\n.a { color: var(--color-warn); fill: var(--color-map-pin); }',
  );
  expect(checkTokenUse(ok)).toEqual([]);
  // A slice outside styles/ imports it by its own relative path.
  const slice = tokenTree("", {
    "apps/web/src/features/f/f.css":
      '@import "../../styles/tokens-parts.css";\n.a { color: var(--color-warn); }',
  });
  expect(checkTokenUse(slice)).toEqual([]);
});

test("an entry stylesheet may not use a lazily loaded token, and token files and tokens used by tokens.css are exempt", () => {
  const entry = checkTokenUse(
    tokenTree("", {
      [`${S}components/shell.css`]:
        '@import "../tokens-parts.css";\n.a { color: var(--color-warn); }',
    }),
  );
  expect(entry.map((finding) => finding.rule)).toEqual(["entry-uses-lazy-token"]);
  const base = checkTokenUse(
    tokenTree("", { [`${S}base.css`]: "a { fill: var(--color-map-pin); }" }),
  );
  expect(base.map((finding) => finding.rule)).toEqual(["entry-uses-lazy-token"]);
  // The map background lives in tokens.css, so the shell may use it.
  expect(
    checkTokenUse(
      tokenTree("", { [`${S}components/shell.css`]: ".a { background: var(--color-map-bg); }" }),
    ),
  ).toEqual([]);
  // A token file may refer to another token.
  expect(
    checkTokenUse(
      tokenTree("", { [`${S}tokens-parts.css`]: ":root { --color-warn: var(--color-fg); }" }),
    ),
  ).toEqual([]);
});

test("TypeScript sources are checked for undefined tokens, tests are not", () => {
  const tree = tokenTree("", {
    "apps/web/src/a.tsx": 'const c = "var(--nope)";',
    "apps/web/src/a.test.tsx": 'const c = "var(--also-nope)";',
  });
  expect(checkTokenUse(tree).map((finding) => finding.text)).toEqual(["var(--nope)"]);
});

test("checkTree runs the token-use rules only when the tree has a tokens.css", () => {
  const bad = { [`${S}components/x.css`]: ".a { color: var(--nope); }" };
  expect(checkTree(bad)).toEqual([]);
  expect(
    checkTree({ ...bad, [`${S}tokens.css`]: ":root { --color-fg: #000; }" }).map((f) => f.rule),
  ).toEqual(["undefined-token"]);
});
