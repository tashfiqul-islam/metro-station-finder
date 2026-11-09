import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

import {
  FIRST_VISIT_CSS_BUDGET,
  FIRST_VISIT_JS_BUDGET,
  HEAD_SCRIPT_MISSING,
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
} from "./bundle-budget.ts";

const sunk: string[] = [];
const asset = (path: string, raw: number, gzip: number): Asset => ({ path, raw, gzip });
const manifest = (value: unknown) => JSON.stringify(value);
const SCREEN = "src/features/nearby/Nearby.tsx";
const SCREEN_GZIP = LAZY_SCREEN_LIMITS.get(SCREEN)?.gzip ?? 0;
const SHARED_GZIP = SHARED_LAZY_ALLOWANCE.gzip;
const JS_OVER = `Bundle budget exceeded for the first visit JS: ${FIRST_VISIT_JS_BUDGET.raw} raw / ${FIRST_VISIT_JS_BUDGET.gzip} gzip bytes`;
const CSS_OVER = `Bundle budget exceeded for the first visit CSS: ${FIRST_VISIT_CSS_BUDGET.raw} raw / ${FIRST_VISIT_CSS_BUDGET.gzip} gzip bytes`;
const SCREEN_OVER = `Lazy screen limit exceeded for nearby: ${SCREEN_GZIP} gzip bytes`;
const SHARED_OVER = `Shared lazy allowance exceeded: ${SHARED_GZIP} gzip bytes`;
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
  "src/theme/reveal.ts": { file: "assets/reveal.js", isDynamicEntry: true },
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
  readonly screenJsGzip?: number;
  readonly screenCssGzip?: number;
  readonly sharedGzip?: number;
}

/** The SPLIT build with chosen sizes. Defaults are small and far under every limit. */
function build({
  indexJs = [1000, 400],
  indexCss = [10, 10],
  screenJsGzip = 100,
  screenCssGzip = 30,
  sharedGzip = 40,
}: Sizes = {}): Asset[] {
  return [
    asset("assets/index.js", ...indexJs),
    asset("assets/index.css", ...indexCss),
    asset("assets/shared.js", 500, 200),
    asset("assets/shared.css", 20, 20),
    asset("assets/lazy.js", 2000, screenJsGzip),
    asset("assets/lazy.css", 30, screenCssGzip),
    asset("assets/reveal.js", 40, sharedGzip),
    asset("assets/common.js", 50, 50),
  ];
}

const lineOf = (lines: readonly string[], start: string) => lines.find((l) => l.startsWith(start));

test("the limits are pinned: first-visit JS 250000 / 80000 (unchanged), CSS 20000 / 6000, screen 30000, shared 12000", () => {
  expect(FIRST_VISIT_JS_BUDGET).toEqual({ raw: 250_000, gzip: 80_000 });
  expect(FIRST_VISIT_CSS_BUDGET).toEqual({ raw: 20_000, gzip: 6_000 });
  expect([...LAZY_SCREEN_LIMITS]).toEqual([[SCREEN, { name: "nearby", gzip: 30_000 }]]);
  expect(SHARED_LAZY_ALLOWANCE).toEqual({ gzip: 12_000 });
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
    "Lazy screen nearby: 130 bytes gzip (limit 30000; 0 percent used)",
    "Shared lazy: 90 bytes gzip (allowance 12000; 1 percent used)",
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
  // lazy.js plus lazy.css make the screen: 30 of the CSS gzip is the default.
  test("a screen over its gzip limit fails with the screen message alone", () => {
    const report = evaluateBundle(build({ screenJsGzip: SCREEN_GZIP }), SPLIT);
    expect(report.problems).toEqual([SCREEN_OVER]);
  });

  test("the screen's CSS counts toward its limit", () => {
    const report = evaluateBundle(build({ screenCssGzip: SCREEN_GZIP }), SPLIT);
    expect(report.problems).toEqual([SCREEN_OVER]);
  });

  test("exactly at the limit passes, one byte over fails", () => {
    const atLimit = build({ screenJsGzip: SCREEN_GZIP - 30 });
    expect(evaluateBundle(atLimit, SPLIT).problems).toEqual([]);
    const over = build({ screenJsGzip: SCREEN_GZIP - 29 });
    expect(evaluateBundle(over, SPLIT).problems).toEqual([SCREEN_OVER]);
  });

  test("raw size alone does not fail a lazy chunk: only its gzip is limited", () => {
    const big = build().map((a) => (a.path === "assets/lazy.js" ? asset(a.path, 900_000, 100) : a));
    const report = evaluateBundle(big, SPLIT);
    expect(report.problems).toEqual([]);
    // First-visit lines do not move when a lazy chunk grows.
    const small = evaluateBundle(build(), SPLIT).lines;
    expect(lineOf(report.lines, "First-visit JS")).toBe(lineOf(small, "First-visit JS"));
    expect(lineOf(report.lines, "First-visit CSS")).toBe(lineOf(small, "First-visit CSS"));
  });

  test("a screen does not borrow from the shared allowance or the other way round", () => {
    const sharedRoom = build({ sharedGzip: 0 });
    expect(evaluateBundle(sharedRoom, SPLIT).problems).toEqual([]);
    const both = build({ screenJsGzip: SCREEN_GZIP, sharedGzip: SHARED_GZIP });
    expect(evaluateBundle(both, SPLIT).problems).toEqual([SCREEN_OVER, SHARED_OVER]);
  });

  test("a screen absent from the build is simply not reported as over", () => {
    const only = manifest({ "index.html": { file: "assets/index.js", isEntry: true } });
    const report = evaluateBundle([asset("assets/index.js", 100, 50)], only);
    expect(report.problems).toEqual([]);
    expect(report.lines).toContain(
      "Lazy screen nearby: 0 bytes gzip (limit 30000; 0 percent used)",
    );
  });
});

describe("shared lazy allowance", () => {
  test("over the allowance fails with the shared message alone", () => {
    const report = evaluateBundle(build({ sharedGzip: SHARED_GZIP }), SPLIT);
    expect(report.problems).toEqual([SHARED_OVER]);
  });

  test("exactly at the allowance passes, one byte over fails", () => {
    // common.js adds 50 gzip to reveal.js.
    expect(evaluateBundle(build({ sharedGzip: SHARED_GZIP - 50 }), SPLIT).problems).toEqual([]);
    expect(evaluateBundle(build({ sharedGzip: SHARED_GZIP - 49 }), SPLIT).problems).toEqual([
      SHARED_OVER,
    ]);
  });

  test("the web-vitals chunk is shared whatever version its manifest key names", () => {
    for (const version of ["6.2.3", "7.0.0"]) {
      const key = `../../node_modules/.bun/web-vitals@${version}/node_modules/web-vitals/dist/web-vitals.js`;
      const vitals = manifest({
        "index.html": { file: "assets/index.js", isEntry: true, dynamicImports: [key] },
        [key]: { file: "assets/web-vitals.js", isDynamicEntry: true },
      });
      const files = [asset("assets/index.js", 100, 50), asset("assets/web-vitals.js", 8000, 3000)];
      const report = evaluateBundle(files, vitals);
      expect(report.problems, version).toEqual([]);
      expect(report.lines, version).toContain(
        "  assets/web-vitals.js: 8000 raw; 3000 gzip; lazy (shared)",
      );
    }
  });

  test("the maps adapter chunk is shared", () => {
    const maps = manifest({
      "index.html": {
        file: "assets/index.js",
        isEntry: true,
        dynamicImports: ["src/adapters/maps/index.ts"],
      },
      "src/adapters/maps/index.ts": { file: "assets/maps.js", isDynamicEntry: true },
    });
    const report = evaluateBundle(
      [asset("assets/index.js", 100, 50), asset("assets/maps.js", 5800, SHARED_GZIP + 1)],
      maps,
    );
    expect(report.problems).toEqual([SHARED_OVER]);
  });
});

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
    expect(evaluateBundle(files, withNew("src/features/route/Route.tsx"))).toEqual({
      lines: [],
      problems: [unclassified("src/features/route/Route.tsx")],
    });
  });

  test("a feature chunk is not shared just because it is lazy or looks like a shared one", () => {
    for (const key of [
      "lazy.js",
      "src/features/nearby/Nearby.test.tsx",
      "src/features/nearby/Nearby.tsx.map",
      "src/theme/reveal.tsx",
      "node_modules/other/dist/web-vitals.js",
      "src/_hidden.js",
    ])
      expect(evaluateBundle(files, withNew(key)).problems, key).toEqual([unclassified(key)]);
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
      /^Lazy screen nearby: \d+ bytes gzip \(limit \d+; \d+ percent used\)$/u,
    );
    expect(lines.at(-1)).toMatch(
      /^Shared lazy: \d+ bytes gzip \(allowance \d+; \d+ percent used\)$/u,
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

test("each lazy line prints the percent of its limit used, rounded", () => {
  const lines = evaluateBundle(build({ screenJsGzip: 14_970, sharedGzip: 5_950 }), SPLIT).lines;
  expect(lines).toContain("Lazy screen nearby: 15000 bytes gzip (limit 30000; 50 percent used)");
  expect(lines).toContain("Shared lazy: 6000 bytes gzip (allowance 12000; 50 percent used)");
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

test("a file two lazy chunks list is counted once, in the screen's bucket", () => {
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
  expect(lines).toContain("  assets/both.css: 10 raw; 7 gzip; lazy (nearby)");
  expect(lines).toContain("Lazy screen nearby: 8 bytes gzip (limit 30000; 0 percent used)");
  expect(lines).toContain("Shared lazy: 1 bytes gzip (allowance 12000; 0 percent used)");
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
