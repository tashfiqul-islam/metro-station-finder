import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  ENTRY_BUDGET,
  TOTAL_BUDGET,
  bundleMain,
  collectAssets,
  entryScript,
  evaluateBundle,
  type Asset,
} from "./bundle-budget.ts";

const page = (src: string) =>
  `<!doctype html><link rel="stylesheet" href="/assets/a.css"><script type="module" crossorigin src="${src}"></script>`;
const sunk: string[] = [];
const asset = (path: string, raw: number, gzip: number): Asset => ({ path, raw, gzip });

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

test("the total thresholds are unchanged and the entry budget is tighter", () => {
  expect(TOTAL_BUDGET).toEqual({ raw: 250_000, gzip: 80_000 });
  expect(ENTRY_BUDGET.raw).toBeLessThan(TOTAL_BUDGET.raw);
  expect(ENTRY_BUDGET.gzip).toBeLessThan(TOTAL_BUDGET.gzip);
});

test("entryScript returns the first module script without the leading slash", () => {
  expect(entryScript(page("/assets/index-x.js"))).toBe("assets/index-x.js");
  expect(
    entryScript('<script src="/a.js"></script><script type="module" src="b.js"></script>'),
  ).toBe("b.js");
  expect(entryScript('<script type="module" src="./assets/a.js?v=2#x"></script>')).toBe(
    "assets/a.js",
  );
  expect(entryScript("<script type='module' src='/assets/q.js'></script>")).toBe("assets/q.js");
  // `data-src` is not `src`, and a non-module script is not the entry.
  expect(entryScript('<script type="module" data-src="/assets/x.js"></script>')).toBeNull();
  expect(entryScript('<script type="text/javascript" src="/assets/x.js"></script>')).toBeNull();
  expect(entryScript('<script type="module" src=""></script>')).toBeNull();
  expect(entryScript('<script type="module">run()</script>')).toBeNull();
  expect(entryScript("<p>none</p>")).toBeNull();
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

test("evaluateBundle prints every file, the totals and the entry line, and passes", () => {
  const report = evaluateBundle(
    [asset("assets/index.js", 1000, 400), asset("assets/a.css", 100, 50)],
    page("/assets/index.js"),
  );
  expect(report.problems).toEqual([]);
  expect(report.lines).toEqual([
    "Production JS/CSS files, largest first (raw / gzip bytes):",
    "  assets/index.js: 1000 raw; 400 gzip",
    "  assets/a.css: 100 raw; 50 gzip",
    "Production JS/CSS: 1100 bytes raw; 450 bytes gzip",
    `Entry chunk assets/index.js: 1000 bytes raw; 400 bytes gzip (budget ${ENTRY_BUDGET.raw} / ${ENTRY_BUDGET.gzip})`,
  ]);
});

test("an entry chunk over the raw budget fails alone", () => {
  const raw = ENTRY_BUDGET.raw + 1;
  const report = evaluateBundle([asset("assets/index.js", raw, 100)], page("/assets/index.js"));
  expect(report.problems).toEqual([
    `Entry chunk budget exceeded: ${ENTRY_BUDGET.raw} raw / ${ENTRY_BUDGET.gzip} gzip bytes`,
  ]);
});

test("an entry chunk over the gzip budget fails alone", () => {
  const report = evaluateBundle(
    [asset("assets/index.js", 1000, ENTRY_BUDGET.gzip + 1)],
    page("/assets/index.js"),
  );
  expect(report.problems).toEqual([
    `Entry chunk budget exceeded: ${ENTRY_BUDGET.raw} raw / ${ENTRY_BUDGET.gzip} gzip bytes`,
  ]);
});

test("an entry chunk at the budget passes", () =>
  expect(
    evaluateBundle(
      [asset("assets/index.js", ENTRY_BUDGET.raw, ENTRY_BUDGET.gzip)],
      page("/assets/index.js"),
    ).problems,
  ).toEqual([]));

test("the totals still fail on their own, with the entry within budget", () => {
  const report = evaluateBundle(
    [asset("assets/index.js", 1000, 400), asset("assets/extra.js", TOTAL_BUDGET.raw, 400)],
    page("/assets/index.js"),
  );
  expect(report.problems).toEqual([
    `Bundle budget exceeded: ${TOTAL_BUDGET.raw} raw / ${TOTAL_BUDGET.gzip} gzip bytes`,
  ]);
});

test("a missing or unmatched entry fails closed", () => {
  const files = [asset("assets/index.js", 1000, 400)];
  for (const html of [null, "<p></p>", page("/assets/other.js")]) {
    expect(evaluateBundle(files, html).problems).toEqual([
      "Entry chunk not found: index.html names no module script among the built assets",
    ]);
  }
});

test("no artifacts fail with the existing message", () =>
  expect(evaluateBundle([], null).problems).toEqual(["No production JS/CSS artifacts found"]));

test("bundleMain exits 0 within budget and 1 over the entry budget (output is parseable)", () =>
  fixture(async (root) => {
    await writeFile(join(root, "index.html"), page("/assets/index.js"));
    await writeFile(join(root, "assets", "index.js"), "console.log(1);\n");
    const lines: string[] = [];
    const log = console.log;
    console.log = (line: string) => void lines.push(line);
    try {
      expect(await bundleMain([root])).toBe(0);
    } finally {
      console.log = log;
    }
    expect(lines.at(-1)).toMatch(
      /^Entry chunk assets\/index\.js: \d+ bytes raw; \d+ bytes gzip \(budget \d+ \/ \d+\)$/u,
    );
    // Highly compressible, so only the entry raw budget is exceeded: the totals stay within their limits.
    await writeFile(join(root, "assets", "index.js"), "x".repeat(ENTRY_BUDGET.raw + 1));
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
    expect(errors).toEqual([
      `Entry chunk budget exceeded: ${ENTRY_BUDGET.raw} raw / ${ENTRY_BUDGET.gzip} gzip bytes`,
    ]);
  }));

test("bundleMain fails closed when index.html is missing", () =>
  fixture(async (root) => {
    await writeFile(join(root, "assets", "index.js"), "console.log(1);\n");
    const log = console.log;
    const error = console.error;
    console.log = (line: string) => void sunk.push(line);
    console.error = (line: string) => void sunk.push(line);
    try {
      expect(await bundleMain([root])).toBe(1);
    } finally {
      console.log = log;
      console.error = error;
    }
  }));
