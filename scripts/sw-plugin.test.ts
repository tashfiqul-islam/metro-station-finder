import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  SHELL_MISMATCH,
  listFiles,
  manifestPaths,
  serviceWorkerPlugin,
  shellPaths,
  versionOf,
  writeWorker,
  type WorkerConfig,
} from "./sw-plugin.ts";

const MANIFEST = JSON.stringify({
  "index.html": { file: "assets/index-a1.js", css: ["assets/index-a1.css"], isEntry: true },
  "src/x.ts": { file: "assets/x-b2.js", assets: ["assets/font-c3.woff2"] },
});

async function fixture(
  manifest: string | null = MANIFEST,
  changes: Record<string, string> = {},
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "metro-sw-"));
  const files: Record<string, string> = {
    "index.html": "<html></html>",
    "assets/index-a1.js": "a",
    "assets/index-a1.css": "b",
    "assets/x-b2.js": "c",
    "assets/font-c3.woff2": "d",
    "icons/icon-192.png": "e",
    "theme-boot.js": "f",
    "manifest.webmanifest": "{}",
    _headers: "/*",
    ".assetsignore": ".vite",
    "robots.txt": "User-agent: *",
    "licenses.txt": "OFL",
    "assets/index-a1.js.map": "{}",
    ...changes,
  };
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(root, name, ".."), { recursive: true });
    await writeFile(join(root, name), text);
  }
  if (manifest !== null) {
    await mkdir(join(root, ".vite"));
    await writeFile(join(root, ".vite", "manifest.json"), manifest);
  }
  return root;
}

const failureOf = (work: Promise<unknown>): Promise<string> =>
  work.then(
    () => "resolved",
    (error: unknown) => (error instanceof Error ? error.message : "not an error"),
  );

const bundle = (config: WorkerConfig): Promise<string> =>
  Promise.resolve(`// worker\nconst SW_CONFIG=${JSON.stringify(config)};`);

test("METRO-106 shellPaths: the page first as /, then built and public files, never the rest", async () => {
  const root = await fixture();
  try {
    expect(shellPaths(await listFiles(root))).toEqual([
      "/",
      "/assets/font-c3.woff2",
      "/assets/index-a1.css",
      "/assets/index-a1.js",
      "/assets/x-b2.js",
      "/icons/icon-192.png",
      "/manifest.webmanifest",
      "/theme-boot.js",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("METRO-106 shellPaths without a page lists files only, and never sw.js itself", () => {
  expect(shellPaths(["sw.js", "a.txt"])).toEqual(["/a.txt"]);
});

test("METRO-106 manifestPaths reads file, css and assets, and rejects other shapes", () => {
  expect(manifestPaths(MANIFEST)).toEqual([
    "/assets/index-a1.js",
    "/assets/index-a1.css",
    "/assets/x-b2.js",
    "/assets/font-c3.woff2",
  ]);
  expect(manifestPaths("not json")).toBeNull();
  expect(manifestPaths("[]")).toBeNull();
  expect(manifestPaths('{"a": 1}')).toBeNull();
  expect(manifestPaths('{"a": {"file": "x.js", "css": [1]}}')).toBeNull();
  expect(manifestPaths('{"a": {"file": "x.js", "dynamicImports": ["b"]}}')).toEqual(["/x.js"]);
});

test("METRO-106 versionOf changes with any path or byte and ignores nothing", () => {
  const base = versionOf([["/a", new Uint8Array([1])]]);
  expect(base).toMatch(/^[0-9a-f]{12}$/u);
  expect(versionOf([["/a", new Uint8Array([1])]])).toBe(base);
  expect(versionOf([["/a", new Uint8Array([2])]])).not.toBe(base);
  expect(versionOf([["/b", new Uint8Array([1])]])).not.toBe(base);
  // Length is part of the input, so moving a byte between neighbours cannot collide.
  expect(
    versionOf([
      ["/a", new Uint8Array([1, 2])],
      ["/b", new Uint8Array([3])],
    ]),
  ).not.toBe(
    versionOf([
      ["/a", new Uint8Array([1])],
      ["/b", new Uint8Array([2, 3])],
    ]),
  );
});

test("METRO-106 writeWorker writes sw.js with the list and a content version, kill off", async () => {
  const root = await fixture();
  try {
    const config = await writeWorker(root, { bundle, kill: false });
    expect(config.kill).toBe(false);
    expect(config.precache[0]).toBe("/");
    expect(config.precache).not.toContain("/sw.js");
    const written = await readFile(join(root, "sw.js"), "utf8");
    expect(written).toContain(`"version":"${config.version}"`);
    // A rebuild with identical content gives the same version; a changed shell file gives another.
    expect((await writeWorker(root, { bundle, kill: false })).version).toBe(config.version);
    await writeFile(join(root, "theme-boot.js"), "changed");
    expect((await writeWorker(root, { bundle, kill: false })).version).not.toBe(config.version);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("METRO-106 writeWorker passes the kill flag through", async () => {
  const root = await fixture();
  try {
    expect((await writeWorker(root, { bundle, kill: true })).kill).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.each([
  ["a missing manifest", null],
  ["an unreadable manifest", "nope"],
  [
    "a manifest naming a file the build lacks",
    JSON.stringify({ a: { file: "assets/gone-z9.js" } }),
  ],
])("METRO-106 writeWorker fails the build on %s", async (_name, manifest) => {
  const root = await fixture(manifest);
  try {
    expect(await failureOf(writeWorker(root, { bundle, kill: false }))).toBe(SHELL_MISMATCH);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("METRO-106 the plugin runs for the client environment only and needs an output directory", async () => {
  const plugin = serviceWorkerPlugin({ bundle, kill: false });
  expect(plugin.apply).toBe("build");
  expect(plugin.applyToEnvironment({ name: "client" })).toBe(true);
  expect(plugin.applyToEnvironment({ name: "metro_scaffold" })).toBe(false);
  expect(await failureOf(plugin.writeBundle.handler({}))).toBe(SHELL_MISMATCH);
  const root = await fixture();
  try {
    await plugin.writeBundle.handler({ dir: root });
    expect(await readFile(join(root, "sw.js"), "utf8")).toContain("SW_CONFIG");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
