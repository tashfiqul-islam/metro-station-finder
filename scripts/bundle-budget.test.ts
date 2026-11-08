import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";

import {
  ALL_FILES_CEILING,
  FIRST_VISIT_BUDGET,
  MANIFEST_FAILURE,
  MANIFEST_STALE,
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
const FIRST_OVER = `Bundle budget exceeded for the first visit: ${FIRST_VISIT_BUDGET.raw} raw / ${FIRST_VISIT_BUDGET.gzip} gzip bytes`;
const CEILING_OVER = `Bundle ceiling exceeded for all files: ${ALL_FILES_CEILING.raw} raw / ${ALL_FILES_CEILING.gzip} gzip bytes`;

/** index.html entry with one static chunk and CSS, plus a lazy chunk with its own CSS. */
const SPLIT = manifest({
  "index.html": {
    file: "assets/index.js",
    isEntry: true,
    imports: ["_shared.js"],
    dynamicImports: ["lazy.js"],
    css: ["assets/index.css"],
  },
  "_shared.js": { file: "assets/shared.js", imports: [], css: ["assets/shared.css"] },
  "lazy.js": {
    file: "assets/lazy.js",
    isDynamicEntry: true,
    imports: ["_shared.js"],
    css: ["assets/lazy.css"],
  },
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

const split = (lazyRaw: number, indexRaw = 1000, lazyGzip = 100): Asset[] => [
  asset("assets/index.js", indexRaw, 400),
  asset("assets/index.css", 10, 10),
  asset("assets/shared.js", 500, 200),
  asset("assets/shared.css", 20, 20),
  asset("assets/lazy.js", lazyRaw, lazyGzip),
  asset("assets/lazy.css", 30, 30),
];

test("the first-visit limits are the unchanged 250000 / 80000 and the ceiling is 400000 / 125000", () => {
  expect(FIRST_VISIT_BUDGET).toEqual({ raw: 250_000, gzip: 80_000 });
  expect(ALL_FILES_CEILING).toEqual({ raw: 400_000, gzip: 125_000 });
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

test("evaluateBundle marks each file first-visit or lazy, prints both totals and passes", () => {
  const report = evaluateBundle(split(2000), SPLIT);
  expect(report.problems).toEqual([]);
  expect(report.lines).toEqual([
    "Production JS/CSS files, largest first (raw / gzip bytes):",
    "  assets/lazy.js: 2000 raw; 100 gzip; lazy",
    "  assets/index.js: 1000 raw; 400 gzip; first-visit",
    "  assets/shared.js: 500 raw; 200 gzip; first-visit",
    "  assets/lazy.css: 30 raw; 30 gzip; lazy",
    "  assets/shared.css: 20 raw; 20 gzip; first-visit",
    "  assets/index.css: 10 raw; 10 gzip; first-visit",
    `First-visit JS/CSS: 1530 bytes raw; 630 bytes gzip (budget 250000 / 80000)`,
    `All JS/CSS: 3560 bytes raw; 760 bytes gzip (ceiling 400000 / 125000)`,
    "Ceiling used: 1 percent raw; 1 percent gzip",
  ]);
});

test("the listing order is deterministic whatever order the files arrive in", () => {
  const forward = evaluateBundle(split(2000), SPLIT).lines;
  const rotated = evaluateBundle(
    [...split(2000).slice(3), ...split(2000).slice(0, 3)],
    SPLIT,
  ).lines;
  expect(rotated).toEqual(forward);
  // Equal sizes fall back to the path.
  const one = manifest({
    "index.html": { file: "assets/b.js", isEntry: true, dynamicImports: ["a.js"] },
    "a.js": { file: "assets/a.js" },
  });
  const tie = [asset("assets/b.js", 5, 5), asset("assets/a.js", 5, 5)];
  expect(evaluateBundle(tie, one).lines.slice(1, 3)).toEqual([
    "  assets/a.js: 5 raw; 5 gzip; lazy",
    "  assets/b.js: 5 raw; 5 gzip; first-visit",
  ]);
});

test("first-visit over the raw budget fails while all files stay under the ceiling", () => {
  const report = evaluateBundle(split(2000, FIRST_VISIT_BUDGET.raw), SPLIT);
  expect(report.problems).toEqual([FIRST_OVER]);
});

test("first-visit over the gzip budget fails on its own", () => {
  const assets = split(2000).map((a) =>
    a.path === "assets/index.js" ? asset(a.path, 1000, 80_000) : a,
  );
  expect(evaluateBundle(assets, SPLIT).problems).toEqual([FIRST_OVER]);
});

test("first-visit exactly at the budget passes", () => {
  const assets = [
    asset("assets/index.js", FIRST_VISIT_BUDGET.raw - 30, FIRST_VISIT_BUDGET.gzip - 30),
    asset("assets/index.css", 10, 10),
    asset("assets/shared.js", 10, 10),
    asset("assets/shared.css", 10, 10),
    asset("assets/lazy.js", 1, 1),
    asset("assets/lazy.css", 1, 1),
  ];
  expect(evaluateBundle(assets, SPLIT).problems).toEqual([]);
});

test("all files over the ceiling fail while the first visit stays under its budget", () => {
  const report = evaluateBundle(split(ALL_FILES_CEILING.raw), SPLIT);
  expect(report.problems).toEqual([CEILING_OVER]);
  const gzipOnly = evaluateBundle(split(2000, 1000, ALL_FILES_CEILING.gzip), SPLIT);
  expect(gzipOnly.problems).toEqual([CEILING_OVER]);
});

test("a lazy chunk leaves the first-visit figure unchanged: all files over the old 250000 but under the ceiling passes", () => {
  const small = evaluateBundle(split(2000), SPLIT).lines.find((l) => l.startsWith("First-visit"));
  const big = evaluateBundle(split(300_000), SPLIT);
  expect(big.problems).toEqual([]);
  expect(big.lines.find((l) => l.startsWith("First-visit"))).toBe(small);
  expect(big.lines.find((l) => l.startsWith("All JS/CSS"))).toContain("301560 bytes raw");
});

test("the CSS of a lazy chunk is not in the first-visit set", () => {
  const lines = evaluateBundle(split(2000), SPLIT).lines;
  expect(lines).toContain("  assets/lazy.css: 30 raw; 30 gzip; lazy");
  expect(lines.find((l) => l.startsWith("First-visit"))).toContain("1530 bytes raw");
});

test("a dynamic import inside a static chunk is not followed", () => {
  const nested = manifest({
    "index.html": { file: "assets/index.js", isEntry: true, imports: ["_shared.js"] },
    "_shared.js": { file: "assets/shared.js", dynamicImports: ["deep.js"] },
    "deep.js": { file: "assets/deep.js", css: ["assets/deep.css"] },
  });
  const assets = [
    asset("assets/index.js", 100, 50),
    asset("assets/shared.js", 100, 50),
    asset("assets/deep.js", 50_000, 9000),
    asset("assets/deep.css", 1000, 100),
  ];
  const report = evaluateBundle(assets, nested);
  expect(report.problems).toEqual([]);
  expect(report.lines).toContain("  assets/deep.js: 50000 raw; 9000 gzip; lazy");
  expect(report.lines).toContain(
    "First-visit JS/CSS: 200 bytes raw; 100 bytes gzip (budget 250000 / 80000)",
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
    const assets = await collectAssets(root);
    const expected = gzipSync(a).length + gzipSync(b).length + 2 * gzipSync("x").length;
    const line = evaluateBundle(assets, SPLIT).lines.find((l) => l.startsWith("First-visit"));
    expect(line).toContain(`${5000 + 3100 + 2} bytes raw; ${expected} bytes gzip`);
  }));

test("a missing, unparsable, entry-less or dangling manifest fails closed with the one fixed message", () => {
  const files = split(2000);
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
    expect(lines.at(-3)).toMatch(
      /^First-visit JS\/CSS: \d+ bytes raw; \d+ bytes gzip \(budget \d+ \/ \d+\)$/u,
    );
    expect(lines.at(-2)).toMatch(
      /^All JS\/CSS: \d+ bytes raw; \d+ bytes gzip \(ceiling \d+ \/ \d+\)$/u,
    );
    // Highly compressible, so only raw is exceeded.
    await writeFile(join(root, "assets", "index.js"), "x".repeat(FIRST_VISIT_BUDGET.raw + 1));
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
    expect(errors).toEqual([FIRST_OVER]);
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

test("an emitted JS or CSS file the manifest does not list fails closed with the stale-manifest message", () => {
  const files = split(2000);
  for (const orphan of ["assets/orphan.js", "assets/orphan.css"])
    expect(evaluateBundle([...files, asset(orphan, 10, 10)], SPLIT), orphan).toEqual({
      lines: [],
      problems: [MANIFEST_STALE],
    });
});

test("a file the manifest names but the disk lacks fails with the missing-file message", () => {
  // The lazy chunk is only dynamic, so it is not in the first-visit set; the entry is.
  const noLazy = split(2000).filter((a) => a.path !== "assets/lazy.js");
  expect(evaluateBundle(noLazy, SPLIT).problems).toEqual([]);
  const noEntry = split(2000).filter((a) => a.path !== "assets/index.js");
  expect(evaluateBundle(noEntry, SPLIT).problems).toEqual([MANIFEST_FAILURE]);
});

test("the ceiling use is printed, and a note appears above half of it without failing", () => {
  const low = evaluateBundle(split(2000), SPLIT).lines.join("\n");
  expect(low).toContain("Ceiling used: 1 percent raw; 1 percent gzip");
  expect(low).not.toContain("Growth tripwire");
  const rawHalf = evaluateBundle(split(200_000), SPLIT);
  expect(rawHalf.problems).toEqual([]);
  expect(rawHalf.lines).toContain("Ceiling used: 50 percent raw; 1 percent gzip");
  expect(rawHalf.lines.join("\n")).toContain("Growth tripwire: revisit the ceiling");
  const gzipHalf = evaluateBundle(split(2000, 1000, 70_000), SPLIT);
  expect(gzipHalf.problems).toEqual([]);
  expect(gzipHalf.lines.join("\n")).toContain("Growth tripwire");
});

test("a diamond: a static chunk with CSS shared by the entry's chain and a lazy importer counts once", () => {
  const diamond = manifest({
    "index.html": {
      file: "assets/index.js",
      isEntry: true,
      imports: ["_left.js", "_right.js"],
      dynamicImports: ["lazy.js"],
    },
    "_left.js": { file: "assets/left.js", imports: ["_shared.js"] },
    "_right.js": { file: "assets/right.js", imports: ["_shared.js"] },
    "_shared.js": { file: "assets/shared.js", css: ["assets/shared.css"] },
    "lazy.js": {
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
    "First-visit JS/CSS: 1050 bytes raw; 105 bytes gzip (budget 250000 / 80000)",
  );
  expect(report.lines).toContain("  assets/lazy.css: 7000 raw; 700 gzip; lazy");
  expect(report.lines).toContain("  assets/shared.css: 50 raw; 5 gzip; first-visit");
});
