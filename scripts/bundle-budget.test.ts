import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

import {
  FIRST_VISIT_CSS_BUDGET,
  FIRST_VISIT_JS_BUDGET,
  HEAD_SCRIPT_MISSING,
  LAZY_MODEL,
  LAZY_SCREEN_LIMITS,
  MANIFEST_FAILURE,
  MANIFEST_STALE,
  SHARED_LAZY_ALLOWANCE,
  bundleMain,
  collectAssets,
  evaluateBundle,
  firstVisitFiles,
  parseManifest,
  type Asset,
  type LazyModel,
} from "./bundle-budget.ts";

const sunk: string[] = [];
const asset = (path: string, raw: number, gzip: number): Asset => ({ path, raw, gzip });
const manifest = (value: unknown) => JSON.stringify(value);
const SCREEN = "src/features/nearby/Nearby.tsx";
const SCREEN_GZIP = LAZY_SCREEN_LIMITS.get(SCREEN)?.gzip ?? 0;
const SCREEN_RAW = LAZY_SCREEN_LIMITS.get(SCREEN)?.raw ?? 0;
const SHARED_GZIP = SHARED_LAZY_ALLOWANCE.gzip;
const SHARED_RAW = SHARED_LAZY_ALLOWANCE.raw;
const ROUTE = "src/features/route/Route.tsx";
/** Nearby and a second screen, to test what two screens share. */
const TWO_SCREENS: LazyModel = {
  ...LAZY_MODEL,
  screens: new Map([
    ...LAZY_SCREEN_LIMITS,
    [ROUTE, { name: "route", raw: SCREEN_RAW, gzip: SCREEN_GZIP }],
  ]),
};
const JS_OVER = `Bundle budget exceeded for the first visit JS: ${FIRST_VISIT_JS_BUDGET.raw} raw / ${FIRST_VISIT_JS_BUDGET.gzip} gzip bytes`;
const CSS_OVER = `Bundle budget exceeded for the first visit CSS: ${FIRST_VISIT_CSS_BUDGET.raw} raw / ${FIRST_VISIT_CSS_BUDGET.gzip} gzip bytes`;
const SCREEN_OVER = `Lazy screen limit exceeded for nearby: ${SCREEN_RAW} raw / ${SCREEN_GZIP} gzip bytes`;
const ROUTE_OVER = `Lazy screen limit exceeded for route: ${SCREEN_RAW} raw / ${SCREEN_GZIP} gzip bytes`;
const SHARED_OVER = `Shared lazy allowance exceeded: ${SHARED_RAW} raw / ${SHARED_GZIP} gzip bytes`;
const unclassified = (...keys: string[]) =>
  `Unclassified lazy chunk, add it to the per-screen limits or the shared allowance (ADR-0023): ${keys.join(", ")}`;

/**
 * index.html entry with one static chunk and CSS, a lazy screen (Nearby) with its own CSS, a lazy shared
 * dynamic entry (reveal) and a Rollup common chunk the screen imports.
 */
const SPLIT = manifest({
  "index.html": {
    file: "assets/index.js",
    isEntry: true,
    imports: ["_shared.js"],
    dynamicImports: [SCREEN, "src/theme/reveal.ts"],
    css: ["assets/index.css"],
  },
  "_shared.js": { file: "assets/shared.js", imports: [], css: ["assets/shared.css"] },
  [SCREEN]: {
    file: "assets/lazy.js",
    isDynamicEntry: true,
    imports: ["_shared.js", "_common.js"],
    css: ["assets/lazy.css"],
  },
  "src/theme/reveal.ts": {
    file: "assets/reveal.js",
    isDynamicEntry: true,
    imports: ["_common.js"],
  },
  "_common.js": { file: "assets/common.js", imports: [] },
});

async function fixture(run: (root: string) => Promise<void>) {
  await mkdir(".local", { recursive: true });
  const root = await mkdtemp(resolve(".local/bundle-"));
  try {
    await mkdir(join(root, "assets"));
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

interface Sizes {
  readonly indexJs?: readonly [number, number];
  readonly indexCss?: readonly [number, number];
  readonly screenJsRaw?: number;
  readonly screenJsGzip?: number;
  readonly screenCssGzip?: number;
  readonly sharedRaw?: number;
  readonly sharedGzip?: number;
}

/** The SPLIT build with chosen sizes. Defaults are small and far under every limit. */
function build({
  indexJs = [1000, 400],
  indexCss = [10, 10],
  screenJsRaw = 2000,
  screenJsGzip = 100,
  screenCssGzip = 30,
  sharedRaw = 40,
  sharedGzip = 40,
}: Sizes = {}): Asset[] {
  return [
    asset("assets/index.js", ...indexJs),
    asset("assets/index.css", ...indexCss),
    asset("assets/shared.js", 500, 200),
    asset("assets/shared.css", 20, 20),
    asset("assets/lazy.js", screenJsRaw, screenJsGzip),
    asset("assets/lazy.css", 30, screenCssGzip),
    asset("assets/reveal.js", sharedRaw, sharedGzip),
    asset("assets/common.js", 50, 50),
  ];
}

const lineOf = (lines: readonly string[], start: string) => lines.find((l) => l.startsWith(start));

test("the limits are pinned: first-visit JS 250000 / 80000 (unchanged), CSS 20000 / 6000, screen 120000 / 30000, shared 27000 / 12000", () => {
  expect(FIRST_VISIT_JS_BUDGET).toEqual({ raw: 250_000, gzip: 80_000 });
  expect(FIRST_VISIT_CSS_BUDGET).toEqual({ raw: 20_000, gzip: 6_000 });
  expect([...LAZY_SCREEN_LIMITS]).toEqual([
    [SCREEN, { name: "nearby", raw: 120_000, gzip: 30_000 }],
  ]);
  expect(SHARED_LAZY_ALLOWANCE).toEqual({ raw: 27_000, gzip: 12_000 });
});

test("collectAssets lists nested JS and CSS largest first and ignores other files", () =>
  fixture(async (root) => {
    await writeFile(join(root, "assets", "small.js"), "a");
    await writeFile(join(root, "assets", "big.css"), "b".repeat(50));
    await writeFile(join(root, "index.html"), "<p></p>");
    const assets = await collectAssets(root);
    expect(assets.map((a) => [a.path, a.raw])).toEqual([
      ["assets/big.css", 50],
      ["assets/small.js", 1],
    ]);
    expect(assets[0]?.gzip).toBeGreaterThan(0);
  }));

test("parseManifest accepts the Vite shape and rejects everything else", () => {
  expect(parseManifest(SPLIT)?.get("index.html")?.isEntry).toBe(true);
  expect(parseManifest(manifest({ a: { file: "x.js" } }))?.get("a")).toEqual({
    file: "x.js",
    imports: [],
    css: [],
    isEntry: false,
  });
  for (const bad of [
    null,
    "not json",
    "[]",
    "null",
    manifest({ a: 1 }),
    manifest({ a: null }),
    manifest({ a: {} }),
    manifest({ a: { file: 3 } }),
    manifest({ a: { file: "x.js", imports: "b" } }),
    manifest({ a: { file: "x.js", imports: [1] } }),
    manifest({ a: { file: "x.js", css: {} } }),
  ])
    expect(parseManifest(bad), String(bad)).toBeNull();
});

test("firstVisitFiles is the entry, its static closure and their CSS, each file once", () => {
  const files = firstVisitFiles(parseManifest(SPLIT) ?? new Map());
  expect(files).toEqual(
    new Set(["assets/index.css", "assets/index.js", "assets/shared.css", "assets/shared.js"]),
  );
});

test("firstVisitFiles follows transitive imports, counts a shared chunk once and survives a cycle", () => {
  const files = firstVisitFiles(
    parseManifest(
      manifest({
        "index.html": { file: "e.js", isEntry: true, imports: ["_a.js", "_b.js"] },
        "_a.js": { file: "a.js", imports: ["_c.js", "_b.js"] },
        "_b.js": { file: "b.js", imports: ["_c.js"] },
        "_c.js": { file: "c.js", imports: ["_a.js", "index.html"] },
      }),
    ) ?? new Map(),
  );
  expect(files).toEqual(new Set(["a.js", "b.js", "c.js", "e.js"]));
});

test("firstVisitFiles is null without an index.html entry or with an import the manifest lacks", () => {
  for (const value of [
    {},
    { "index.html": { file: "e.js" } },
    { "other.html": { file: "e.js", isEntry: true } },
    { "index.html": { file: "e.js", isEntry: true, imports: ["_gone.js"] } },
  ])
    expect(firstVisitFiles(parseManifest(manifest(value)) ?? new Map())).toBeNull();
});

test("evaluateBundle marks each file with its class, prints every total and passes", () => {
  const report = evaluateBundle(build(), SPLIT);
  expect(report.problems).toEqual([]);
  expect(report.lines).toEqual([
    "Production JS/CSS files, largest first (raw / gzip bytes):",
    "  assets/lazy.js: 2000 raw; 100 gzip; lazy (nearby)",
    "  assets/index.js: 1000 raw; 400 gzip; first-visit",
    "  assets/shared.js: 500 raw; 200 gzip; first-visit",
    "  assets/common.js: 50 raw; 50 gzip; lazy (shared)",
    "  assets/reveal.js: 40 raw; 40 gzip; lazy (shared)",
    "  assets/lazy.css: 30 raw; 30 gzip; lazy (nearby)",
    "  assets/shared.css: 20 raw; 20 gzip; first-visit",
    "  assets/index.css: 10 raw; 10 gzip; first-visit",
    "First-visit JS: 1500 bytes raw; 600 bytes gzip (budget 250000 / 80000)",
    "First-visit CSS: 30 bytes raw; 30 bytes gzip (budget 20000 / 6000)",
    "Lazy screen nearby: 2030 bytes raw (limit 120000; 1.7 percent used); 130 bytes gzip (limit 30000; 0.4 percent used)",
    "Shared lazy: 90 bytes raw (allowance 27000; 0.3 percent used); 90 bytes gzip (allowance 12000; 0.8 percent used)",
  ]);
});

test("the listing order is deterministic whatever order the files arrive in", () => {
  const forward = evaluateBundle(build(), SPLIT).lines;
  const rotated = evaluateBundle([...build().slice(3), ...build().slice(0, 3)], SPLIT).lines;
  expect(rotated).toEqual(forward);
  // Equal sizes fall back to the path.
  const one = manifest({
    "index.html": { file: "assets/b.js", isEntry: true, dynamicImports: [SCREEN] },
    [SCREEN]: { file: "assets/a.js" },
  });
  const tie = [asset("assets/b.js", 5, 5), asset("assets/a.js", 5, 5)];
  expect(evaluateBundle(tie, one).lines.slice(1, 3)).toEqual([
    "  assets/a.js: 5 raw; 5 gzip; lazy (nearby)",
    "  assets/b.js: 5 raw; 5 gzip; first-visit",
  ]);
});

describe("first-visit JS limit", () => {
  test("over the raw limit fails with the JS message alone", () => {
    const report = evaluateBundle(build({ indexJs: [FIRST_VISIT_JS_BUDGET.raw, 400] }), SPLIT);
    expect(report.problems).toEqual([JS_OVER]);
  });

  test("over the gzip limit fails on its own", () => {
    const report = evaluateBundle(build({ indexJs: [1000, FIRST_VISIT_JS_BUDGET.gzip] }), SPLIT);
    expect(report.problems).toEqual([JS_OVER]);
  });

  test("exactly at both limits passes", () => {
    // index.js 1000 + shared.js 500 are the other JS bytes: fill the entry up to the limit.
    const raw = FIRST_VISIT_JS_BUDGET.raw - 500;
    const gzip = FIRST_VISIT_JS_BUDGET.gzip - 200;
    expect(evaluateBundle(build({ indexJs: [raw, gzip] }), SPLIT).problems).toEqual([]);
    expect(evaluateBundle(build({ indexJs: [raw + 1, gzip] }), SPLIT).problems).toEqual([JS_OVER]);
    expect(evaluateBundle(build({ indexJs: [raw, gzip + 1] }), SPLIT).problems).toEqual([JS_OVER]);
  });

  test("CSS bytes never count against it, and JS bytes never count against the CSS limit", () => {
    const cssHeavy = build({ indexCss: [FIRST_VISIT_CSS_BUDGET.raw - 20, 100] });
    expect(evaluateBundle(cssHeavy, SPLIT).problems).toEqual([]);
    const jsHeavy = build({ indexJs: [FIRST_VISIT_JS_BUDGET.raw - 500, 400] });
    expect(evaluateBundle(jsHeavy, SPLIT).problems).toEqual([]);
  });
});

describe("first-visit CSS limit", () => {
  test("over the raw limit fails with the CSS message alone", () => {
    const report = evaluateBundle(build({ indexCss: [FIRST_VISIT_CSS_BUDGET.raw, 10] }), SPLIT);
    expect(report.problems).toEqual([CSS_OVER]);
  });

  test("over the gzip limit fails on its own", () => {
    const report = evaluateBundle(build({ indexCss: [10, FIRST_VISIT_CSS_BUDGET.gzip] }), SPLIT);
    expect(report.problems).toEqual([CSS_OVER]);
  });

  test("exactly at both limits passes, one byte over either fails", () => {
    // shared.css adds 20 raw / 20 gzip to the first-visit CSS.
    const raw = FIRST_VISIT_CSS_BUDGET.raw - 20;
    const gzip = FIRST_VISIT_CSS_BUDGET.gzip - 20;
    expect(evaluateBundle(build({ indexCss: [raw, gzip] }), SPLIT).problems).toEqual([]);
    expect(evaluateBundle(build({ indexCss: [raw + 1, gzip] }), SPLIT).problems).toEqual([
      CSS_OVER,
    ]);
    expect(evaluateBundle(build({ indexCss: [raw, gzip + 1] }), SPLIT).problems).toEqual([
      CSS_OVER,
    ]);
  });

  test("the CSS of a lazy chunk is not in the first-visit CSS", () => {
    const lines = evaluateBundle(build({ screenCssGzip: 5000 }), SPLIT).lines;
    expect(lines).toContain("  assets/lazy.css: 30 raw; 5000 gzip; lazy (nearby)");
    expect(lineOf(lines, "First-visit CSS")).toContain("30 bytes raw");
  });
});

describe("per-screen limit", () => {
  // lazy.js plus lazy.css make the screen: 30 of the CSS gzip and raw is the default.
  test("a screen over its gzip limit fails with the screen message alone", () => {
    const report = evaluateBundle(build({ screenJsGzip: SCREEN_GZIP }), SPLIT);
    expect(report.problems).toEqual([SCREEN_OVER]);
  });

  test("a screen over its raw limit fails with the screen message alone, whatever its gzip", () => {
    const big = build({ screenJsRaw: 900_000 });
    expect(evaluateBundle(big, SPLIT).problems).toEqual([SCREEN_OVER]);
    const over = build({ screenJsRaw: SCREEN_RAW });
    expect(evaluateBundle(over, SPLIT).problems).toEqual([SCREEN_OVER]);
  });

  test("the screen's CSS counts toward its gzip and raw limits", () => {
    const report = evaluateBundle(build({ screenCssGzip: SCREEN_GZIP }), SPLIT);
    expect(report.problems).toEqual([SCREEN_OVER]);
    const css = build().map((a) =>
      a.path === "assets/lazy.css" ? asset(a.path, SCREEN_RAW, 30) : a,
    );
    expect(evaluateBundle(css, SPLIT).problems).toEqual([SCREEN_OVER]);
  });

  test("exactly at either limit passes, one byte over fails", () => {
    // lazy.css adds 30 raw / 30 gzip to lazy.js.
    const atGzip = build({ screenJsGzip: SCREEN_GZIP - 30 });
    expect(evaluateBundle(atGzip, SPLIT).problems).toEqual([]);
    expect(evaluateBundle(build({ screenJsGzip: SCREEN_GZIP - 29 }), SPLIT).problems).toEqual([
      SCREEN_OVER,
    ]);
    const atRaw = build({ screenJsRaw: SCREEN_RAW - 30 });
    expect(evaluateBundle(atRaw, SPLIT).problems).toEqual([]);
    expect(evaluateBundle(build({ screenJsRaw: SCREEN_RAW - 29 }), SPLIT).problems).toEqual([
      SCREEN_OVER,
    ]);
  });

  test("a lazy chunk leaves the first-visit lines unchanged", () => {
    const small = evaluateBundle(build(), SPLIT).lines;
    const grown = evaluateBundle(build({ screenJsRaw: SCREEN_RAW - 30 }), SPLIT).lines;
    expect(lineOf(grown, "First-visit JS")).toBe(lineOf(small, "First-visit JS"));
    expect(lineOf(grown, "First-visit CSS")).toBe(lineOf(small, "First-visit CSS"));
  });

  test("a screen and the shared allowance each fail alone and neither borrows from the other", () => {
    // Both exactly full (screen: lazy.css adds 30; shared: common.js adds 50 raw / 50 gzip).
    const full = build({
      screenJsRaw: SCREEN_RAW - 30,
      screenJsGzip: SCREEN_GZIP - 30,
      sharedRaw: SHARED_RAW - 50,
      sharedGzip: SHARED_GZIP - 50,
    });
    expect(evaluateBundle(full, SPLIT).problems).toEqual([]);
    const screenOver = full.map((a) =>
      a.path === "assets/lazy.js" ? asset(a.path, a.raw, a.gzip + 1) : a,
    );
    expect(evaluateBundle(screenOver, SPLIT).problems).toEqual([SCREEN_OVER]);
    const sharedOver = full.map((a) =>
      a.path === "assets/reveal.js" ? asset(a.path, a.raw + 1, a.gzip) : a,
    );
    expect(evaluateBundle(sharedOver, SPLIT).problems).toEqual([SHARED_OVER]);
    const both = evaluateBundle(
      full.map((a) => (a.path === "assets/reveal.js" ? asset(a.path, a.raw, a.gzip + 1) : a)),
      SPLIT,
    );
    expect(both.problems).toEqual([SHARED_OVER]);
  });

  test("a screen absent from the build reports zero use and passes", () => {
    const only = manifest({ "index.html": { file: "assets/index.js", isEntry: true } });
    const report = evaluateBundle([asset("assets/index.js", 100, 50)], only);
    expect(report.problems).toEqual([]);
    expect(report.lines).toContain(
      "Lazy screen nearby: 0 bytes raw (limit 120000; 0.0 percent used); 0 bytes gzip (limit 30000; 0.0 percent used)",
    );
  });

  test("each lazy line prints one decimal of percent used", () => {
    const lines = evaluateBundle(
      build({ screenJsRaw: 59_970, screenJsGzip: 14_970, sharedRaw: 13_450, sharedGzip: 5_950 }),
      SPLIT,
    ).lines;
    expect(lines).toContain(
      "Lazy screen nearby: 60000 bytes raw (limit 120000; 50.0 percent used); 15000 bytes gzip (limit 30000; 50.0 percent used)",
    );
    expect(lines).toContain(
      "Shared lazy: 13500 bytes raw (allowance 27000; 50.0 percent used); 6000 bytes gzip (allowance 12000; 50.0 percent used)",
    );
  });
});

const own = (extra: Record<string, readonly [number, number]> = {}): Asset[] => {
  const sizes: Record<string, readonly [number, number]> = {
    "assets/index.js": [100, 50],
    "assets/nearby.js": [100, 50],
    "assets/nearby.css": [10, 10],
    "assets/nearby-private.js": [100, 50],
    "assets/route.js": [100, 50],
    "assets/route-private.js": [100, 50],
    "assets/both.js": [100, 50],
    "assets/both.css": [10, 10],
    ...extra,
  };
  return Object.entries(sizes).map(([path, [raw, gzip]]) => asset(path, raw, gzip));
};

describe("a screen owns the chunks only it imports; shared is what two roots reach", () => {
  /** Nearby imports a private `_` chunk; Route imports a private one and one both import. */
  const OWN = manifest({
    "index.html": {
      file: "assets/index.js",
      isEntry: true,
      dynamicImports: [SCREEN, ROUTE],
    },
    [SCREEN]: {
      file: "assets/nearby.js",
      imports: ["_nearby-private.js", "_both.js"],
      css: ["assets/nearby.css"],
    },
    [ROUTE]: { file: "assets/route.js", imports: ["_route-private.js", "_both.js"] },
    "_nearby-private.js": { file: "assets/nearby-private.js" },
    "_route-private.js": { file: "assets/route-private.js" },
    "_both.js": { file: "assets/both.js", css: ["assets/both.css"] },
  });

  test("a heavy private chunk fails ITS screen's limit, not the shared allowance", () => {
    const heavy = own({ "assets/nearby-private.js": [100, SCREEN_GZIP] });
    expect(evaluateBundle(heavy, OWN, null, TWO_SCREENS).problems).toEqual([SCREEN_OVER]);
    const heavyRoute = own({ "assets/route-private.js": [SCREEN_RAW, 50] });
    expect(evaluateBundle(heavyRoute, OWN, null, TWO_SCREENS).problems).toEqual([ROUTE_OVER]);
  });

  test("each file is listed under its owner; a chunk both screens import is shared", () => {
    const lines = evaluateBundle(own(), OWN, null, TWO_SCREENS).lines;
    expect(lines).toContain("  assets/nearby-private.js: 100 raw; 50 gzip; lazy (nearby)");
    expect(lines).toContain("  assets/nearby.css: 10 raw; 10 gzip; lazy (nearby)");
    expect(lines).toContain("  assets/route-private.js: 100 raw; 50 gzip; lazy (route)");
    expect(lines).toContain("  assets/both.js: 100 raw; 50 gzip; lazy (shared)");
    expect(lines).toContain("  assets/both.css: 10 raw; 10 gzip; lazy (shared)");
  });

  test("a chunk both screens import fails the shared allowance, not either screen", () => {
    const heavy = own({ "assets/both.js": [100, SHARED_GZIP] });
    expect(evaluateBundle(heavy, OWN, null, TWO_SCREENS).problems).toEqual([SHARED_OVER]);
  });

  test("a chunk a screen and a shared root both import is shared", () => {
    const mixed = manifest({
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        dynamicImports: [SCREEN, "src/theme/reveal.ts"],
      },
      [SCREEN]: { file: "assets/nearby.js", imports: ["_x.js"] },
      "src/theme/reveal.ts": { file: "assets/reveal.js", imports: ["_x.js"] },
      "_x.js": { file: "assets/x.js" },
    });
    const files = [
      asset("assets/index.js", 100, 50),
      asset("assets/nearby.js", 100, 50),
      asset("assets/reveal.js", 100, 50),
      asset("assets/x.js", 100, 50),
    ];
    expect(evaluateBundle(files, mixed).lines).toContain(
      "  assets/x.js: 100 raw; 50 gzip; lazy (shared)",
    );
  });

  test("a file two screens list is shared, not won by the last screen", () => {
    const twice = manifest({
      "index.html": { file: "assets/index.js", isEntry: true, dynamicImports: [SCREEN, ROUTE] },
      [SCREEN]: { file: "assets/nearby.js", css: ["assets/both.css"] },
      [ROUTE]: { file: "assets/route.js", css: ["assets/both.css"] },
    });
    const files = [
      asset("assets/index.js", 100, 50),
      asset("assets/nearby.js", 100, 50),
      asset("assets/route.js", 100, 50),
      asset("assets/both.css", 10, SHARED_GZIP),
    ];
    const forward = evaluateBundle(files, twice, null, TWO_SCREENS);
    expect(forward.lines).toContain(
      `  assets/both.css: 10 raw; ${SHARED_GZIP} gzip; lazy (shared)`,
    );
    expect(forward.problems).toEqual([]);
    const reversed = manifest({
      "index.html": { file: "assets/index.js", isEntry: true, dynamicImports: [ROUTE, SCREEN] },
      [ROUTE]: { file: "assets/route.js", css: ["assets/both.css"] },
      [SCREEN]: { file: "assets/nearby.js", css: ["assets/both.css"] },
    });
    expect(evaluateBundle(files, reversed, null, TWO_SCREENS).lines).toContain(
      `  assets/both.css: 10 raw; ${SHARED_GZIP} gzip; lazy (shared)`,
    );
    const over = files.map((a) =>
      a.path === "assets/both.css" ? asset(a.path, 10, SHARED_GZIP + 1) : a,
    );
    expect(evaluateBundle(over, twice, null, TWO_SCREENS).problems).toEqual([SHARED_OVER]);
  });

  test("a shared chunk's own static imports are shared too", () => {
    const chain = manifest({
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        dynamicImports: ["src/theme/reveal.ts"],
      },
      "src/theme/reveal.ts": { file: "assets/reveal.js", imports: ["_a.js"] },
      "_a.js": { file: "assets/a.js", imports: ["_b.js"] },
      "_b.js": { file: "assets/b.js" },
    });
    const files = [
      asset("assets/index.js", 100, 50),
      asset("assets/reveal.js", 1, 1),
      asset("assets/a.js", 1, 1),
      asset("assets/b.js", 1, SHARED_GZIP),
    ];
    const report = evaluateBundle(files, chain);
    expect(report.lines).toContain("  assets/b.js: 1 raw; 12000 gzip; lazy (shared)");
    expect(report.problems).toEqual([SHARED_OVER]);
  });

  test("an import cycle among lazy chunks terminates", () => {
    const cycle = manifest({
      "index.html": { file: "assets/index.js", isEntry: true, dynamicImports: [SCREEN] },
      [SCREEN]: { file: "assets/nearby.js", imports: ["_a.js"] },
      "_a.js": { file: "assets/a.js", imports: ["_b.js"] },
      "_b.js": { file: "assets/b.js", imports: ["_a.js", SCREEN] },
    });
    const files = [
      asset("assets/index.js", 100, 50),
      asset("assets/nearby.js", 1, 1),
      asset("assets/a.js", 1, 1),
      asset("assets/b.js", 1, 1),
    ];
    expect(evaluateBundle(files, cycle).problems).toEqual([]);
  });

  test("a lazy chunk that lists a first-visit CSS file does not count it against its screen", () => {
    const lists = manifest({
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        css: ["assets/index.css"],
        dynamicImports: [SCREEN],
      },
      [SCREEN]: { file: "assets/lazy.js", imports: ["index.html"], css: ["assets/index.css"] },
    });
    const files = [
      asset("assets/index.js", 100, 50),
      asset("assets/index.css", 40, 20),
      asset("assets/lazy.js", 1, 1),
    ];
    const report = evaluateBundle(files, lists);
    expect(report.lines).toContain("  assets/index.css: 40 raw; 20 gzip; first-visit");
    expect(lineOf(report.lines, "Lazy screen nearby")).toContain("1 bytes raw");
    expect(lineOf(report.lines, "First-visit CSS")).toContain("40 bytes raw");
  });

  test("a lazy chunk reaching a first-visit chunk does not take it from the first visit", () => {
    const report = evaluateBundle(build(), SPLIT);
    expect(report.lines).toContain("  assets/shared.js: 500 raw; 200 gzip; first-visit");
    expect(lineOf(report.lines, "Lazy screen nearby")).toContain("2030 bytes raw");
  });
});

const alone = (key: string, file: string, size: readonly [number, number]) => {
  const one = manifest({
    "index.html": { file: "assets/index.js", isEntry: true, dynamicImports: [key] },
    [key]: { file, isDynamicEntry: true },
  });
  return evaluateBundle([asset("assets/index.js", 100, 50), asset(file, ...size)], one);
};

describe("shared lazy allowance", () => {
  test("over the raw allowance fails with the shared message alone", () => {
    expect(evaluateBundle(build({ sharedRaw: SHARED_RAW }), SPLIT).problems).toEqual([SHARED_OVER]);
  });

  test("over the gzip allowance fails with the shared message alone", () => {
    const report = evaluateBundle(build({ sharedGzip: SHARED_GZIP }), SPLIT);
    expect(report.problems).toEqual([SHARED_OVER]);
  });

  test("exactly at the allowance passes, one byte over either fails", () => {
    // common.js adds 50 raw / 50 gzip to reveal.js.
    const at = build({ sharedRaw: SHARED_RAW - 50, sharedGzip: SHARED_GZIP - 50 });
    expect(evaluateBundle(at, SPLIT).problems).toEqual([]);
    const gz = build({ sharedRaw: SHARED_RAW - 50, sharedGzip: SHARED_GZIP - 49 });
    expect(evaluateBundle(gz, SPLIT).problems).toEqual([SHARED_OVER]);
    const rw = build({ sharedRaw: SHARED_RAW - 49, sharedGzip: SHARED_GZIP - 50 });
    expect(evaluateBundle(rw, SPLIT).problems).toEqual([SHARED_OVER]);
  });

  test("the web-vitals chunk is shared whatever version or install layout its key names", () => {
    for (const key of [
      "../../node_modules/.bun/web-vitals@6.2.3/node_modules/web-vitals/dist/web-vitals.js",
      "../../node_modules/.bun/web-vitals@7.0.0/node_modules/web-vitals/dist/web-vitals.js",
      "node_modules/web-vitals/dist/web-vitals.js",
      "/abs/node_modules/web-vitals/dist/web-vitals.js",
    ]) {
      const report = alone(key, "assets/web-vitals.js", [8000, 3000]);
      expect(report.problems, key).toEqual([]);
      expect(report.lines, key).toContain(
        "  assets/web-vitals.js: 8000 raw; 3000 gzip; lazy (shared)",
      );
    }
  });

  test("the maps adapter and the reveal helper are shared roots, counted against the allowance", () => {
    expect(
      alone("src/adapters/maps/index.ts", "assets/m.js", [5800, SHARED_GZIP + 1]).problems,
    ).toEqual([SHARED_OVER]);
    expect(alone("src/theme/reveal.ts", "assets/r.js", [SHARED_RAW + 1, 10]).problems).toEqual([
      SHARED_OVER,
    ]);
  });
});

/** index.html, one lazy chunk under `key`, with its CSS. */
const withNew = (key: string) =>
  manifest({
    "index.html": {
      file: "assets/index.js",
      isEntry: true,
      dynamicImports: [key, "src/theme/reveal.ts"],
    },
    [key]: { file: "assets/new.js", isDynamicEntry: true, css: ["assets/new.css"] },
    "src/theme/reveal.ts": { file: "assets/reveal.js", isDynamicEntry: true },
  });

describe("fail closed on an unclassified chunk", () => {
  const files = [
    asset("assets/index.js", 100, 50),
    asset("assets/reveal.js", 40, 40),
    asset("assets/new.js", 10, 10),
    asset("assets/new.css", 10, 10),
  ];

  test("a lazy screen the limits do not name fails, whatever its size, with no listing", () => {
    expect(evaluateBundle(files, withNew(ROUTE))).toEqual({
      lines: [],
      problems: [unclassified(ROUTE)],
    });
  });

  test("a feature chunk is not shared just because it is lazy or looks like a shared root", () => {
    for (const key of [
      "lazy.js",
      "src/features/nearby/Nearby.test.tsx",
      "src/features/nearby/Nearby.tsx.map",
      "x/src/features/nearby/Nearby.tsx",
      "src/theme/reveal.tsx",
      "src/theme/reveal.ts.map",
      "x/src/theme/reveal.ts",
      "src/adapters/maps/index.tsx",
      "x/src/adapters/maps/index.ts",
      "src/adapters/maps/index.ts/extra",
      "src/adapters/maps/indexxts",
      "src/theme/revealxts",
      "node_modules/other/dist/web-vitals.js",
      "node_modules/other-web-vitals/dist/web-vitals.js",
      "xnode_modules/web-vitals/dist/web-vitals.js",
      "node_modules/web-vitals/dist/web-vitals.js.map",
      "node_modules/web-vitals/dist/web-vitals.mjs",
      "node_modules/web-vitals/lib/web-vitals.js",
      "src/_hidden.js",
      "_common.js",
    ])
      expect(evaluateBundle(files, withNew(key)).problems, key).toEqual([unclassified(key)]);
  });

  test("a Rollup common chunk no screen or shared root reaches is unclassified, not shared", () => {
    const orphan = manifest({
      "index.html": { file: "assets/index.js", isEntry: true, dynamicImports: [SCREEN] },
      [SCREEN]: { file: "assets/nearby.js" },
      "_lonely.js": { file: "assets/lonely.js" },
    });
    const three = [
      asset("assets/index.js", 100, 50),
      asset("assets/nearby.js", 1, 1),
      asset("assets/lonely.js", 1, 1),
    ];
    expect(evaluateBundle(three, orphan).problems).toEqual([unclassified("_lonely.js")]);
  });

  test("chunks only an unclassified chunk reaches are unclassified too, in manifest order", () => {
    const chain = manifest({
      "index.html": { file: "assets/index.js", isEntry: true, dynamicImports: [ROUTE] },
      [ROUTE]: { file: "assets/route.js", imports: ["_private.js"] },
      "_private.js": { file: "assets/private.js" },
    });
    const three = [
      asset("assets/index.js", 100, 50),
      asset("assets/route.js", 1, 1),
      asset("assets/private.js", 1, 1),
    ];
    expect(evaluateBundle(three, chain).problems).toEqual([unclassified(ROUTE, "_private.js")]);
    // Once the screen is named, its private chunk is its own.
    expect(evaluateBundle(three, chain, null, TWO_SCREENS).problems).toEqual([]);
  });

  test("every unclassified key is named, in manifest order", () => {
    const two = manifest({
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        dynamicImports: ["src/features/b/B.tsx", "src/features/a/A.tsx"],
      },
      "src/features/b/B.tsx": { file: "assets/b.js", isDynamicEntry: true },
      "src/features/a/A.tsx": { file: "assets/a.js", isDynamicEntry: true },
    });
    const three = [
      asset("assets/index.js", 100, 50),
      asset("assets/a.js", 1, 1),
      asset("assets/b.js", 1, 1),
    ];
    expect(evaluateBundle(three, two).problems).toEqual([
      unclassified("src/features/b/B.tsx", "src/features/a/A.tsx"),
    ]);
  });

  test("a classified screen does not hide an unclassified one", () => {
    const mixed = manifest({
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        dynamicImports: [SCREEN, "src/features/line/Line.tsx"],
      },
      [SCREEN]: { file: "assets/lazy.js", isDynamicEntry: true },
      "src/features/line/Line.tsx": { file: "assets/line.js", isDynamicEntry: true },
    });
    const three = [
      asset("assets/index.js", 100, 50),
      asset("assets/lazy.js", 1, 1),
      asset("assets/line.js", 1, 1),
    ];
    expect(evaluateBundle(three, mixed).problems).toEqual([
      unclassified("src/features/line/Line.tsx"),
    ]);
  });

  test("a build whose lazy chunks are all classified is not affected", () => {
    expect(evaluateBundle(build(), SPLIT).problems).toEqual([]);
  });

  test("non-code assets in the manifest (fonts) need no class", () => {
    const withFont = manifest({
      "index.html": { file: "assets/index.js", isEntry: true, assets: ["assets/f.woff2"] },
      "src/styles/fonts/f.woff2": { file: "assets/f.woff2", src: "src/styles/fonts/f.woff2" },
    });
    expect(evaluateBundle([asset("assets/index.js", 100, 50)], withFont).problems).toEqual([]);
  });

  test("a lazy chunk with only a CSS file is classified by its key like any other", () => {
    const cssOnly = manifest({
      "index.html": { file: "assets/index.js", isEntry: true, dynamicImports: [ROUTE] },
      [ROUTE]: { file: "assets/route.woff2", css: ["assets/route.css"] },
    });
    const two = [asset("assets/index.js", 100, 50), asset("assets/route.css", 1, 1)];
    expect(evaluateBundle(two, cssOnly).problems).toEqual([unclassified(ROUTE)]);
    expect(evaluateBundle(two, cssOnly, null, TWO_SCREENS).problems).toEqual([]);
  });
});

test("a dynamic import inside a static chunk is not followed", () => {
  const nested = manifest({
    "index.html": { file: "assets/index.js", isEntry: true, imports: ["_shared.js"] },
    "_shared.js": { file: "assets/shared.js", dynamicImports: [SCREEN] },
    [SCREEN]: { file: "assets/deep.js", css: ["assets/deep.css"] },
  });
  const assets = [
    asset("assets/index.js", 100, 50),
    asset("assets/shared.js", 100, 50),
    asset("assets/deep.js", 50_000, 9000),
    asset("assets/deep.css", 1000, 100),
  ];
  const report = evaluateBundle(assets, nested);
  expect(report.problems).toEqual([]);
  expect(report.lines).toContain("  assets/deep.js: 50000 raw; 9000 gzip; lazy (nearby)");
  expect(report.lines).toContain(
    "First-visit JS: 200 bytes raw; 100 bytes gzip (budget 250000 / 80000)",
  );
  expect(report.lines).toContain(
    "First-visit CSS: 0 bytes raw; 0 bytes gzip (budget 20000 / 6000)",
  );
});

test("gzip is computed per file and summed, as the totals do", () =>
  fixture(async (root) => {
    const a = "a".repeat(5000);
    const b = "b".repeat(3000) + "c".repeat(100);
    await writeFile(join(root, "assets", "index.js"), a);
    await writeFile(join(root, "assets", "shared.js"), b);
    await writeFile(join(root, "assets", "index.css"), "x");
    await writeFile(join(root, "assets", "shared.css"), "y");
    await writeFile(join(root, "assets", "lazy.js"), "z");
    await writeFile(join(root, "assets", "lazy.css"), "w");
    await writeFile(join(root, "assets", "reveal.js"), "r");
    await writeFile(join(root, "assets", "common.js"), "c");
    const assets = await collectAssets(root);
    const lines = evaluateBundle(assets, SPLIT).lines;
    expect(lineOf(lines, "First-visit JS")).toContain(
      `${5000 + 3100} bytes raw; ${gzipSync(a).length + gzipSync(b).length} bytes gzip`,
    );
    expect(lineOf(lines, "First-visit CSS")).toContain(
      `2 bytes raw; ${2 * gzipSync("x").length} bytes gzip`,
    );
    expect(lineOf(lines, "Lazy screen nearby")).toContain(`${2 * gzipSync("z").length} bytes gzip`);
  }));

test("a missing, unparsable, entry-less or dangling manifest fails closed with the one fixed message", () => {
  const files = build();
  const dangling = manifest({ "index.html": { file: "assets/gone.js", isEntry: true } });
  for (const text of [
    null,
    "{garbage",
    "[]",
    manifest({}),
    manifest({ x: { file: "a.js" } }),
    dangling,
  ])
    expect(evaluateBundle(files, text), String(text)).toEqual({
      lines: [],
      problems: [MANIFEST_FAILURE],
    });
  // A CSS file named by the manifest but not on disk also fails.
  const noCss = files.filter((a) => a.path !== "assets/shared.css");
  expect(evaluateBundle(noCss, SPLIT).problems).toEqual([MANIFEST_FAILURE]);
  // An import key the manifest lacks fails too.
  const lacking = manifest({
    "index.html": { file: "assets/index.js", isEntry: true, imports: ["_x"] },
  });
  expect(evaluateBundle(files, lacking).problems).toEqual([MANIFEST_FAILURE]);
});

test("no artifacts fail with the existing message", () => {
  expect(evaluateBundle([], SPLIT).problems).toEqual(["No production JS/CSS artifacts found"]);
  expect(evaluateBundle([asset("a.js", 0, 20)], SPLIT).problems).toEqual([
    "No production JS/CSS artifacts found",
  ]);
});

test("bundleMain reads the manifest from disk: exit 0 within budget, 1 over (output is parseable)", () =>
  fixture(async (root) => {
    await mkdir(join(root, ".vite"));
    await writeFile(
      join(root, ".vite", "manifest.json"),
      manifest({ "index.html": { file: "assets/index.js", isEntry: true } }),
    );
    await writeFile(join(root, "assets", "index.js"), "console.log(1);\n");
    const lines: string[] = [];
    const log = console.log;
    console.log = (line: string) => void lines.push(line);
    try {
      expect(await bundleMain([root])).toBe(0);
    } finally {
      console.log = log;
    }
    expect(lines.at(-4)).toMatch(
      /^First-visit JS: \d+ bytes raw; \d+ bytes gzip \(budget \d+ \/ \d+\)$/u,
    );
    expect(lines.at(-3)).toMatch(
      /^First-visit CSS: \d+ bytes raw; \d+ bytes gzip \(budget \d+ \/ \d+\)$/u,
    );
    expect(lines.at(-2)).toMatch(
      /^Lazy screen nearby: \d+ bytes raw \(limit \d+; \d+\.\d percent used\); \d+ bytes gzip \(limit \d+; \d+\.\d percent used\)$/u,
    );
    expect(lines.at(-1)).toMatch(
      /^Shared lazy: \d+ bytes raw \(allowance \d+; \d+\.\d percent used\); \d+ bytes gzip \(allowance \d+; \d+\.\d percent used\)$/u,
    );
    // Highly compressible, so only raw is exceeded.
    await writeFile(join(root, "assets", "index.js"), "x".repeat(FIRST_VISIT_JS_BUDGET.raw + 1));
    const error = console.error;
    const errors: string[] = [];
    console.error = (line: string) => void errors.push(line);
    console.log = (line: string) => void sunk.push(line);
    try {
      expect(await bundleMain([root])).toBe(1);
    } finally {
      console.log = log;
      console.error = error;
    }
    expect(errors).toEqual([JS_OVER]);
  }));

test("bundleMain fails closed when the manifest file is missing", () =>
  fixture(async (root) => {
    await writeFile(join(root, "assets", "index.js"), "console.log(1);\n");
    const log = console.log;
    const error = console.error;
    const errors: string[] = [];
    console.log = (line: string) => void sunk.push(line);
    console.error = (line: string) => void errors.push(line);
    try {
      expect(await bundleMain([root])).toBe(1);
    } finally {
      console.log = log;
      console.error = error;
    }
    expect(errors).toEqual([MANIFEST_FAILURE]);
  }));

test("bundleMain fails closed on an unclassified lazy chunk read from disk", () =>
  fixture(async (root) => {
    await mkdir(join(root, ".vite"));
    await writeFile(
      join(root, ".vite", "manifest.json"),
      manifest({
        "index.html": {
          file: "assets/index.js",
          isEntry: true,
          dynamicImports: ["src/features/station/Station.tsx"],
        },
        "src/features/station/Station.tsx": { file: "assets/station.js", isDynamicEntry: true },
      }),
    );
    await writeFile(join(root, "assets", "index.js"), "console.log(1);\n");
    await writeFile(join(root, "assets", "station.js"), "console.log(2);\n");
    const log = console.log;
    const error = console.error;
    const errors: string[] = [];
    console.log = (line: string) => void sunk.push(line);
    console.error = (line: string) => void errors.push(line);
    try {
      expect(await bundleMain([root])).toBe(1);
    } finally {
      console.log = log;
      console.error = error;
    }
    expect(errors).toEqual([unclassified("src/features/station/Station.tsx")]);
  }));

test("an emitted JS or CSS file the manifest does not list fails closed with the stale-manifest message", () => {
  const files = build();
  for (const orphan of ["assets/orphan.js", "assets/orphan.css"])
    expect(evaluateBundle([...files, asset(orphan, 10, 10)], SPLIT), orphan).toEqual({
      lines: [],
      problems: [MANIFEST_STALE],
    });
});

test("a file the manifest names but the disk lacks fails with the missing-file message", () => {
  // The lazy chunk is only dynamic, so it is not in the first-visit set; the entry is.
  const noLazy = build().filter((a) => a.path !== "assets/lazy.js");
  expect(evaluateBundle(noLazy, SPLIT).problems).toEqual([]);
  const noEntry = build().filter((a) => a.path !== "assets/index.js");
  expect(evaluateBundle(noEntry, SPLIT).problems).toEqual([MANIFEST_FAILURE]);
});

test("a diamond: a static chunk with CSS shared by the entry's chain and a lazy importer counts once", () => {
  const diamond = manifest({
    "index.html": {
      file: "assets/index.js",
      isEntry: true,
      imports: ["_left.js", "_right.js"],
      dynamicImports: [SCREEN],
    },
    "_left.js": { file: "assets/left.js", imports: ["_shared.js"] },
    "_right.js": { file: "assets/right.js", imports: ["_shared.js"] },
    "_shared.js": { file: "assets/shared.js", css: ["assets/shared.css"] },
    [SCREEN]: {
      file: "assets/lazy.js",
      imports: ["_shared.js", "_right.js"],
      css: ["assets/lazy.css"],
    },
  });
  const assets = [
    asset("assets/index.js", 100, 10),
    asset("assets/left.js", 200, 20),
    asset("assets/right.js", 300, 30),
    asset("assets/shared.js", 400, 40),
    asset("assets/shared.css", 50, 5),
    asset("assets/lazy.js", 60_000, 6000),
    asset("assets/lazy.css", 7000, 700),
  ];
  const report = evaluateBundle(assets, diamond);
  expect(report.problems).toEqual([]);
  expect(report.lines).toContain(
    "First-visit JS: 1000 bytes raw; 100 bytes gzip (budget 250000 / 80000)",
  );
  expect(report.lines).toContain(
    "First-visit CSS: 50 bytes raw; 5 bytes gzip (budget 20000 / 6000)",
  );
  expect(report.lines).toContain("  assets/lazy.css: 7000 raw; 700 gzip; lazy (nearby)");
  expect(report.lines).toContain("  assets/shared.css: 50 raw; 5 gzip; first-visit");
});

test("a file a screen and a shared root both list is counted once, in shared", () => {
  const twice = manifest({
    "index.html": {
      file: "assets/index.js",
      isEntry: true,
      dynamicImports: ["src/theme/reveal.ts", SCREEN],
    },
    "src/theme/reveal.ts": { file: "assets/reveal.js", css: ["assets/both.css"] },
    [SCREEN]: { file: "assets/lazy.js", css: ["assets/both.css"] },
  });
  const assets = [
    asset("assets/index.js", 100, 50),
    asset("assets/reveal.js", 1, 1),
    asset("assets/lazy.js", 1, 1),
    asset("assets/both.css", 10, 7),
  ];
  const lines = evaluateBundle(assets, twice).lines;
  expect(lines).toContain("  assets/both.css: 10 raw; 7 gzip; lazy (shared)");
  expect(lineOf(lines, "Lazy screen nearby")).toContain("1 bytes raw");
  expect(lineOf(lines, "Shared lazy")).toContain("11 bytes raw");
});

test("METRO-105 a classic head script from public/ counts as first-visit JS and is not an orphan", () => {
  const withHead = [...build(), asset("theme-boot.js", 400, 250)];
  const report = evaluateBundle(withHead, SPLIT);
  expect(report.problems).toEqual([]);
  expect(report.lines).toContain("  theme-boot.js: 400 raw; 250 gzip; first-visit");
  expect(report.lines).toContain(
    `First-visit JS: ${1000 + 500 + 400} bytes raw; ${400 + 200 + 250} bytes gzip (budget 250000 / 80000)`,
  );
  expect(report.lines).toContain(
    `First-visit CSS: ${10 + 20} bytes raw; ${10 + 20} bytes gzip (budget 20000 / 6000)`,
  );
  const without = evaluateBundle(build(), SPLIT);
  expect(without.problems).toEqual([]);
  expect(without.lines.some((line) => line.includes("theme-boot.js"))).toBe(false);
});

test("METRO-105 the head script counts against the first-visit JS limit", () => {
  const nearlyFull = build({ indexJs: [FIRST_VISIT_JS_BUDGET.raw - 800, 400] });
  expect(evaluateBundle(nearlyFull, SPLIT).problems).toEqual([]);
  expect(evaluateBundle([...nearlyFull, asset("theme-boot.js", 400, 200)], SPLIT).problems).toEqual(
    [JS_OVER],
  );
});

const HTML_WITH_BOOT = '<head><script src="/theme-boot.js"></script></head>';

test("METRO-105 the gate fails closed when index.html loads theme-boot.js and the build lacks it", () => {
  expect(evaluateBundle(build(), SPLIT, HTML_WITH_BOOT).problems).toEqual([HEAD_SCRIPT_MISSING]);
  expect(evaluateBundle(build(), SPLIT, HTML_WITH_BOOT).lines).toEqual([]);
});

test("METRO-105 a present head script, or one index.html does not load, passes", () => {
  const withBoot = [...build(), asset("theme-boot.js", 400, 250)];
  expect(evaluateBundle(withBoot, SPLIT, HTML_WITH_BOOT).problems).toEqual([]);
  expect(evaluateBundle(build(), SPLIT, "<head></head>").problems).toEqual([]);
  expect(evaluateBundle(build(), SPLIT, null).problems).toEqual([]);
});

test("METRO-105 bundleMain reads index.html: a loaded head script missing from the build exits 1", () =>
  fixture(async (root) => {
    await mkdir(join(root, ".vite"));
    await writeFile(
      join(root, ".vite", "manifest.json"),
      manifest({ "index.html": { file: "assets/index.js", isEntry: true } }),
    );
    await writeFile(join(root, "assets", "index.js"), "console.log(1);\n");
    await writeFile(join(root, "index.html"), HTML_WITH_BOOT);
    const errors: string[] = [];
    const error = console.error;
    console.error = (line: string) => void errors.push(line);
    try {
      expect(await bundleMain([root])).toBe(1);
    } finally {
      console.error = error;
    }
    expect(errors).toEqual([HEAD_SCRIPT_MISSING]);
    await writeFile(join(root, "theme-boot.js"), "void 0;\n");
    const log = console.log;
    console.log = (line: string) => void sunk.push(line);
    try {
      expect(await bundleMain([root])).toBe(0);
    } finally {
      console.log = log;
    }
  }));
