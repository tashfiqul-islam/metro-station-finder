import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import type { Rasteriser } from "./brand-chromium.ts";
import {
  BRAND_DIR,
  COPY_JOBS,
  ICO_JOBS,
  LOCK_FILE,
  MANIFEST,
  MANIFEST_JSON,
  PNG_JOBS,
  PUBLIC_DIR,
  ROBOTS_TXT,
  STATIC_FILES,
  brandMain,
  buildAssets,
  cliMain,
  listMasters,
  lockProblems,
  lockText,
  manifestFiles,
  manifestProblems,
  packIco,
  sameOutput,
  samePixels,
  sha256,
  sized,
  unpackIco,
} from "./build-brand-assets.ts";
import { isRecord } from "./guards.ts";
import { imageSize } from "./image-size.ts";
import { expectRejection } from "./test-support.ts";

const encode = (value: string): Uint8Array => new TextEncoder().encode(value);
const quiet = (): void => {};

/** The shipped manifest with one change applied, for the cases a valid manifest cannot show. */
function mutated(change: (draft: Record<string, unknown>) => void): unknown {
  const draft: unknown = JSON.parse(MANIFEST_JSON);
  if (!isRecord(draft)) throw new Error("the manifest constant is not an object");
  change(draft);
  return draft;
}

/** A fake renderer: the "PNG" is the SVG text with its size, so output depends on the master and the size. */
function fakeRasteriser(difference = 0): Rasteriser & { closed: number; rendered: string[] } {
  const state = {
    closed: 0,
    rendered: [] as string[],
    render(svg: string, size: number): Promise<Uint8Array> {
      state.rendered.push(`${size}:${svg}`);
      return Promise.resolve(encode(`png|${size}|${svg}`));
    },
    largestDifference(a: Uint8Array, b: Uint8Array): Promise<number> {
      if (a.length !== b.length) return Promise.resolve(-1);
      return Promise.resolve(sha256(a) === sha256(b) ? 0 : difference);
    },
    close(): Promise<void> {
      state.closed += 1;
      return Promise.resolve();
    },
  };
  return state;
}

const svgFor = (name: string): string => `<svg width="24" height="24"><!--${name}--></svg>`;

async function withProject<T>(run: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(join(tmpdir(), "brand-"));
  try {
    const sources = new Set([
      ...PNG_JOBS.map((job) => job.source),
      ...ICO_JOBS.map((job) => job.source),
      ...COPY_JOBS.map((job) => job.source),
    ]);
    for (const name of sources) {
      await mkdir(join(root, BRAND_DIR), { recursive: true });
      await writeFile(join(root, BRAND_DIR, name), svgFor(name));
    }
    await writeFile(join(root, BRAND_DIR, "notes.txt"), "not a master");
    for (const name of STATIC_FILES) {
      await mkdir(dirname(join(root, PUBLIC_DIR, name)), { recursive: true });
      await writeFile(join(root, PUBLIC_DIR, name), `static ${name}`);
    }
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("packIco and unpackIco", () => {
  const pngs = [encode("one"), encode("second"), encode("3")];

  test("pack three images and read the directory and the images back", () => {
    const ico = packIco([
      { size: 16, png: pngs[0] ?? new Uint8Array() },
      { size: 32, png: pngs[1] ?? new Uint8Array() },
      { size: 48, png: pngs[2] ?? new Uint8Array() },
    ]);
    expect(imageSize(ico)?.sizes).toEqual([
      { width: 16, height: 16 },
      { width: 32, height: 32 },
      { width: 48, height: 48 },
    ]);
    expect(unpackIco(ico)).toEqual(pngs);
  });

  test("unpack refuses a non-ICO and an ICO whose entry points past the end", () => {
    expect(unpackIco(encode("not an icon"))).toBeNull();
    const ico = packIco([{ size: 16, png: encode("abcdef") }]);
    expect(unpackIco(ico.subarray(0, ico.length - 1))).toBeNull();
  });
});

describe("sized", () => {
  test("sets the first width and height pair and leaves the rest", () => {
    expect(sized('<svg width="24" height="24"><rect width="3" height="3"/></svg>', 192)).toBe(
      '<svg width="192" height="192"><rect width="3" height="3"/></svg>',
    );
    expect(sized('<svg width="16.5" height="16.5"/>', 32)).toBe('<svg width="32" height="32"/>');
  });
});

describe("buildAssets", () => {
  test("renders every job at its size from its master and adds the text files", async () => {
    const rasteriser = fakeRasteriser();
    const files = await buildAssets(rasteriser, (name) => Promise.resolve(svgFor(name)));
    expect(new Set(files.keys())).toEqual(
      new Set([
        "apple-touch-icon.png",
        "favicon.ico",
        "favicon.svg",
        "icons/icon-192.png",
        "icons/icon-512.png",
        "icons/icon-maskable-192.png",
        "icons/icon-maskable-512.png",
        "icons/icon-monochrome-512.png",
        "manifest.webmanifest",
        "robots.txt",
      ]),
    );
    expect(new TextDecoder().decode(files.get("manifest.webmanifest"))).toBe(MANIFEST_JSON);
    expect(new TextDecoder().decode(files.get("robots.txt"))).toBe(ROBOTS_TXT);
    expect(new TextDecoder().decode(files.get("favicon.svg"))).toBe(svgFor("favicon.svg"));
    expect(rasteriser.rendered).toContain(`180:${sized(svgFor("apple-touch-icon.svg"), 180)}`);
    expect(rasteriser.rendered).toHaveLength(PNG_JOBS.length + ICO_JOBS.length);
    const ico = files.get("favicon.ico") ?? new Uint8Array();
    expect(imageSize(ico)?.sizes.map((size) => size.width)).toEqual([16, 32, 48]);
  });
});

describe("the manifest", () => {
  test("the shipped manifest is valid and parses back to the constant", () => {
    expect(manifestProblems(JSON.parse(MANIFEST_JSON))).toEqual([]);
    expect(JSON.parse(MANIFEST_JSON)).toEqual(MANIFEST);
  });

  test("lists every file it names with size and type", () => {
    expect(manifestFiles(MANIFEST).map((file) => file.src)).toEqual([
      "/icons/icon-192.png",
      "/icons/icon-512.png",
      "/icons/icon-maskable-192.png",
      "/icons/icon-maskable-512.png",
      "/icons/icon-monochrome-512.png",
      "/screenshots/wide.webp",
      "/screenshots/narrow.webp",
    ]);
    expect(manifestFiles(null)).toEqual([]);
    expect(manifestFiles({ icons: [{ src: "/a.png" }, 7] })).toEqual([
      { src: "/a.png", sizes: "undefined", type: "undefined" },
    ]);
  });

  test("rejects a manifest that is not an object", () => {
    expect(manifestProblems(null)).toEqual(["manifest is not an object"]);
    expect(manifestProblems([])).toEqual(["manifest is not an object"]);
  });

  test("rejects missing required members, bad colours and a non-standalone display", () => {
    const problems = manifestProblems(
      mutated((draft) => {
        delete draft["name"];
        draft["theme_color"] = "teal";
        draft["background_color"] = 5;
        draft["display"] = "browser";
      }),
    );
    expect(problems).toEqual([
      "name is missing",
      "theme_color is not a #RRGGBB colour",
      "background_color is not a #RRGGBB colour",
      "display is not standalone",
    ]);
  });

  test("rejects a service worker member and any offline claim", () => {
    expect(
      manifestProblems(mutated((draft) => (draft["serviceworker"] = { src: "/sw.js" }))),
    ).toContain("manifest names a service worker (METRO-106)");
    expect(
      manifestProblems(mutated((draft) => (draft["description"] = "Works Offline"))),
    ).toContain("manifest makes an offline claim");
  });

  test("rejects bad icons: path, shape, type, purpose and the missing required ones", () => {
    const problems = manifestProblems(
      mutated((draft) => {
        draft["icons"] = [
          { src: "icons/a.png", sizes: "192x96", type: "image/webp", purpose: "any maskable" },
          { src: "/icons/b.png", sizes: "big", type: "image/png" },
        ];
      }),
    );
    expect(problems).toEqual([
      "icon src is not a root path",
      "icon icons/a.png sizes is not square",
      "icon icons/a.png is not image/png",
      "icon icons/a.png purpose is not exactly one of any, maskable, monochrome",
      "icon /icons/b.png sizes is not square",
      "icon /icons/b.png purpose is not exactly one of any, maskable, monochrome",
      "no any icon at 192x192",
      "no any icon at 512x512",
      "no maskable icon at 192x192",
      "no maskable icon at 512x512",
      "no monochrome icon at 512x512",
    ]);
  });

  test("rejects bad screenshots and tolerates a manifest with no icon or screenshot lists", () => {
    const problems = manifestProblems(
      mutated((draft) => {
        draft["screenshots"] = [{ src: "x.webp", form_factor: "tall", label: "" }];
      }),
    );
    expect(problems).toEqual([
      "screenshot src is not a root path",
      "screenshot form_factor is not wide or narrow",
      "screenshot has no label",
    ]);
    expect(
      manifestProblems(
        mutated((draft) => {
          delete draft["icons"];
          delete draft["screenshots"];
        }),
      ),
    ).toHaveLength(5);
  });
});

describe("the lock", () => {
  const sources = new Map([["a.svg", encode("a")]]);
  const outputs = new Map([["b.png", encode("b")]]);
  const statics = new Map([["c.webp", encode("c")]]);

  test("hashes sorted by name in three sections, and agrees with itself", () => {
    const lock = lockText(sources, outputs, statics);
    expect(JSON.parse(lock)).toEqual({
      sources: { "a.svg": sha256(encode("a")) },
      outputs: { "b.png": sha256(encode("b")) },
      static: { "c.webp": sha256(encode("c")) },
    });
    expect(lockProblems(lock, sources, outputs, statics)).toEqual([]);
  });

  test("reports an edited master, an edited output, an added and a removed file", () => {
    const lock = lockText(sources, outputs, statics);
    const problems = lockProblems(
      lock,
      new Map([["a.svg", encode("edited")]]),
      new Map([
        ["b.png", encode("b")],
        ["extra.png", encode("x")],
      ]),
      new Map(),
    );
    expect(problems).toEqual([
      "sources/a.svg differs from assets.lock.json",
      "outputs/extra.png differs from assets.lock.json",
      "static/c.webp differs from assets.lock.json",
    ]);
  });

  test("reports an unreadable lock and one with a missing section", () => {
    expect(lockProblems("{", sources, outputs, statics)).toEqual([
      "assets.lock.json is not valid JSON",
    ]);
    expect(lockProblems("[]", sources, outputs, statics)).toHaveLength(3);
    expect(lockProblems('{"sources":{},"outputs":{}}', new Map(), new Map(), new Map())).toEqual([
      'assets.lock.json has no "static" section',
    ]);
  });
});

describe("pixel comparison", () => {
  test("samePixels accepts a difference up to the tolerance and rejects more or a size change", async () => {
    const a = encode("aaaa");
    expect(await samePixels(fakeRasteriser(0), a, encode("aaaa"))).toBe(true);
    expect(await samePixels(fakeRasteriser(2), a, encode("bbbb"))).toBe(true);
    expect(await samePixels(fakeRasteriser(3), a, encode("bbbb"))).toBe(false);
    expect(await samePixels(fakeRasteriser(0), a, encode("bb"))).toBe(false);
  });

  test("sameOutput compares text by bytes, PNG by pixels and ICO image by image", async () => {
    const rasteriser = fakeRasteriser(3);
    expect(await sameOutput(rasteriser, "robots.txt", encode("x"), null)).toBe(false);
    expect(await sameOutput(rasteriser, "robots.txt", encode("x"), encode("x"))).toBe(true);
    expect(await sameOutput(rasteriser, "robots.txt", encode("x"), encode("y"))).toBe(false);
    expect(await sameOutput(rasteriser, "a.png", encode("x"), encode("x"))).toBe(true);
    expect(await sameOutput(rasteriser, "a.png", encode("x"), encode("y"))).toBe(false);
    const ico = (...names: string[]) =>
      packIco(names.map((name, index) => ({ size: 16 + index, png: encode(name) })));
    expect(await sameOutput(rasteriser, "a.ico", ico("one", "two"), ico("one", "two"))).toBe(true);
    expect(await sameOutput(rasteriser, "a.ico", ico("one", "two"), ico("one", "xxx"))).toBe(false);
    expect(await sameOutput(rasteriser, "a.ico", ico("one", "two"), ico("one"))).toBe(false);
    expect(await sameOutput(rasteriser, "a.ico", encode("junk"), ico("one"))).toBe(false);
    expect(await sameOutput(rasteriser, "a.ico", ico("one"), encode("junk"))).toBe(false);
  });
});

describe("brandMain", () => {
  test("needs --write or --check", async () => {
    const lines: string[] = [];
    const code = await brandMain([], {
      root: "/nowhere",
      rasteriser: fakeRasteriser(),
      log: (line) => lines.push(line),
    });
    expect([code, lines]).toEqual([2, ["Usage: build-brand-assets.ts --write | --check"]]);
  });

  test("lists only the SVG masters", async () => {
    await withProject(async (root) => {
      expect(await listMasters(root)).toEqual([
        "app-icon-maskable.svg",
        "app-icon.svg",
        "apple-touch-icon.svg",
        "favicon.svg",
        "icon-monochrome.svg",
        "mark-micro.svg",
        "mark-small.svg",
      ]);
    });
  });

  test("--write creates the files and the lock, and --check then passes", async () => {
    await withProject(async (root) => {
      const lines: string[] = [];
      const deps = { root, rasteriser: fakeRasteriser(), log: (line: string) => lines.push(line) };
      expect(await brandMain(["--write"], deps)).toBe(0);
      expect(lines).toEqual([`Wrote 10 files to ${PUBLIC_DIR} and ${LOCK_FILE}`]);
      expect(imageSize(await readFile(join(root, PUBLIC_DIR, "favicon.ico")))?.format).toBe("ico");
      lines.length = 0;
      expect(await brandMain(["--check"], deps)).toBe(0);
      expect(lines).toEqual(["10 generated files match the masters"]);
    });
  });

  test("--check fails on an edited output, an edited master and a missing file", async () => {
    await withProject(async (root) => {
      const deps = { root, rasteriser: fakeRasteriser(), log: quiet };
      await brandMain(["--write"], deps);
      await writeFile(join(root, PUBLIC_DIR, "robots.txt"), "edited");
      await writeFile(join(root, BRAND_DIR, "app-icon.svg"), svgFor("changed"));
      await rm(join(root, PUBLIC_DIR, "favicon.ico"));
      const lines: string[] = [];
      expect(await brandMain(["--check"], { ...deps, log: (line) => lines.push(line) })).toBe(1);
      expect(lines).toContain(`${PUBLIC_DIR}/robots.txt differs from the regenerated output`);
      expect(lines).toContain(`${PUBLIC_DIR}/favicon.ico differs from the regenerated output`);
      expect(lines).toContain(
        `${PUBLIC_DIR}/icons/icon-192.png differs from the regenerated output`,
      );
      expect(lines).toContain("sources/app-icon.svg differs from assets.lock.json");
    });
  });

  test("--check fails closed when the lock is missing", async () => {
    await withProject(async (root) => {
      const deps = { root, rasteriser: fakeRasteriser(), log: quiet };
      await brandMain(["--write"], deps);
      await rm(join(root, BRAND_DIR, LOCK_FILE));
      const lines: string[] = [];
      expect(await brandMain(["--check"], { ...deps, log: (line) => lines.push(line) })).toBe(1);
      expect(lines).toEqual(["assets.lock.json is not valid JSON"]);
    });
  });
});

describe("cliMain", () => {
  test("opens the rasteriser, runs the mode and closes it", async () => {
    const rasteriser = fakeRasteriser();
    const code = await cliMain(["--bad"], () => Promise.resolve(rasteriser), {
      root: "/nowhere",
      log: quiet,
    });
    expect([code, rasteriser.closed]).toEqual([2, 1]);
  });

  test("closes the rasteriser even when the run throws", async () => {
    const rasteriser = fakeRasteriser();
    const run = cliMain(["--check"], () => Promise.resolve(rasteriser), {
      root: join(tmpdir(), "brand-does-not-exist"),
      log: quiet,
    });
    await expectRejection(run, "ENOENT");
    expect(rasteriser.closed).toBe(1);
  });
});
