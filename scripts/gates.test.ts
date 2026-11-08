import { randomBytes } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

import { cleanGitEnv } from "./git-env";

async function fixture(run: (root: string) => Promise<void>) {
  await mkdir(".local", { recursive: true });
  const root = await mkdtemp(resolve(".local/gates-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

for (const kind of ["cycle", "unresolved"]) {
  test(`import gate rejects ${kind}`, () =>
    fixture(async (root) => {
      await writeFile(
        join(root, "a.ts"),
        kind === "cycle" ? 'import "./b";' : 'import "./absent";',
      );
      if (kind === "cycle") await writeFile(join(root, "b.ts"), 'import "./a";');
      const result = Bun.spawnSync(["bun", "run", "imports", root]);
      expect(result.stdout.toString() + result.stderr.toString()).toContain(
        kind === "cycle" ? "no-cycles" : "no-unresolved",
      );
      expect(result.exitCode).not.toBe(0);
    }));
}

test("bundle gate rejects absent production artifacts", () =>
  fixture(async (root) => {
    const result = Bun.spawnSync(["node", resolve("scripts/bundle.ts"), root]);
    expect(result.stderr.toString()).toContain("No production JS/CSS artifacts found");
    expect(result.exitCode).not.toBe(0);
  }));

const git = (root: string, ...args: string[]) =>
  Bun.spawnSync(["git", "-C", root, ...args], { env: cleanGitEnv() });

test(
  "secret gate rejects a generated fake credential in tracked temporary source",
  () =>
    fixture(async (root) => {
      expect(Bun.spawnSync(["git", "init", root], { env: cleanGitEnv() }).exitCode).toBe(0);
      const token = ["gh", "p_", "Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4zAB7c"].join("");
      await writeFile(join(root, "fixture.ts"), `export const token = ${JSON.stringify(token)};`);
      expect(git(root, "add", "fixture.ts").exitCode).toBe(0);
      const result = Bun.spawnSync(["node", resolve("scripts/secrets.ts"), root], {
        env: cleanGitEnv(),
      });
      expect(result.stdout.toString() + result.stderr.toString()).toContain("leaks found");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);

test(
  "secret gate scans the requested repository even when GIT_DIR points elsewhere",
  () =>
    fixture(async (root) => {
      const decoy = `${root}-decoy`;
      try {
        expect(Bun.spawnSync(["git", "init", root], { env: cleanGitEnv() }).exitCode).toBe(0);
        expect(Bun.spawnSync(["git", "init", decoy], { env: cleanGitEnv() }).exitCode).toBe(0);
        const token = ["gh", "p_", "Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4zAB7c"].join("");
        await writeFile(join(root, "fixture.ts"), `export const token = ${JSON.stringify(token)};`);
        expect(git(root, "add", "fixture.ts").exitCode).toBe(0);
        const result = Bun.spawnSync(["node", resolve("scripts/secrets.ts"), root], {
          env: { ...cleanGitEnv(), GIT_DIR: join(decoy, ".git") },
        });
        expect(result.stdout.toString() + result.stderr.toString()).toContain("leaks found");
        expect(result.exitCode).not.toBe(0);
      } finally {
        await rm(decoy, { recursive: true, force: true });
      }
    }),
  30000,
);

test("secret gate rejects tracked symlinks instead of following them", () =>
  fixture(async (root) => {
    expect(Bun.spawnSync(["git", "init", root], { env: cleanGitEnv() }).exitCode).toBe(0);
    await writeFile(join(root, "target.txt"), "../outside-secret");
    const hash = git(root, "hash-object", "-w", "target.txt").stdout.toString().trim();
    expect(hash).toMatch(/^[0-9a-f]{40,64}$/u);
    expect(
      git(root, "update-index", "--add", "--cacheinfo", `120000,${hash},link.txt`).exitCode,
    ).toBe(0);
    const result = Bun.spawnSync(["node", resolve("scripts/secrets.ts"), root], {
      env: cleanGitEnv(),
    });
    expect(result.stderr.toString()).toContain("Tracked symlink or submodule");
    expect(result.exitCode).not.toBe(0);
  }));

test("type gate rejects malformed existing domain data", () =>
  fixture(async (root) => {
    await writeFile(
      join(root, "fixture.ts"),
      `import type { Coordinate } from ${JSON.stringify(resolve("packages/core/src/geo/coordinate").replaceAll("\\", "/"))}; export const data: Coordinate = { lat: 'north', lng: 90 };`,
    );
    await writeFile(
      join(root, "tsconfig.json"),
      JSON.stringify({
        extends: resolve("packages/core/tsconfig.json"),
        include: ["./fixture.ts"],
        exclude: [],
      }),
    );
    const result = Bun.spawnSync([
      "bun",
      "run",
      "tsc",
      "-p",
      join(root, "tsconfig.json"),
      "--pretty",
      "false",
    ]);
    expect(result.stdout.toString()).toContain("TS2322");
    expect(result.exitCode).not.toBe(0);
  }));

/** A Vite manifest naming `entry` as the index.html entry and every `lazy` file as a dynamic import. */
async function writeManifest(root: string, entry: string, lazy: string[] = []) {
  await mkdir(join(root, ".vite"), { recursive: true });
  const chunks = Object.fromEntries(lazy.map((file) => [file, { file, isDynamicEntry: true }]));
  await writeFile(
    join(root, ".vite", "manifest.json"),
    JSON.stringify({
      "index.html": { file: entry, isEntry: true, dynamicImports: lazy },
      ...chunks,
    }),
  );
}
const runBundle = (root: string) => Bun.spawnSync(["node", resolve("scripts/bundle.ts"), root]);

test("bundle gate rejects a first visit over the raw budget", () =>
  fixture(async (root) => {
    await writeFile(join(root, "large.js"), "x".repeat(250_001));
    await writeManifest(root, "large.js");
    const result = runBundle(root);
    expect(result.stderr.toString()).toContain("Bundle budget exceeded for the first visit");
    expect(result.stderr.toString()).not.toContain("First-visit set cannot be computed");
    expect(result.exitCode).not.toBe(0);
  }));

test("bundle gate rejects a first visit that exceeds only the gzip budget", () =>
  fixture(async (root) => {
    // Incompressible bytes: raw size stays under the raw cap while gzip exceeds its cap.
    await writeFile(join(root, "dense.js"), randomBytes(81_000));
    await writeManifest(root, "dense.js");
    const result = runBundle(root);
    expect(result.stderr.toString()).toContain("Bundle budget exceeded for the first visit");
    expect(result.stderr.toString()).not.toContain("First-visit set cannot be computed");
    expect(result.exitCode).not.toBe(0);
  }));

test("bundle gate accepts artifacts within budget and prints both totals", () =>
  fixture(async (root) => {
    await writeFile(join(root, "small.js"), "console.log(1);\n");
    await writeManifest(root, "small.js");
    const result = runBundle(root);
    expect(result.stdout.toString()).toContain("small.js: 16 raw;");
    expect(result.stdout.toString()).toContain("First-visit JS/CSS:");
    expect(result.stdout.toString()).toContain("All JS/CSS:");
    expect(result.exitCode).toBe(0);
  }));

test("bundle gate: a lazy chunk over the old 250,000 total leaves the first visit unchanged and passes", () =>
  fixture(async (root) => {
    await writeFile(join(root, "entry.js"), "x".repeat(1000));
    await writeFile(join(root, "lazy.js"), "y".repeat(250_000));
    await writeManifest(root, "entry.js", ["lazy.js"]);
    const result = runBundle(root);
    expect(result.stdout.toString()).toContain("lazy.js: 250000 raw;");
    expect(result.stdout.toString()).toContain("; lazy");
    expect(result.stdout.toString()).toContain("First-visit JS/CSS: 1000 bytes raw;");
    expect(result.stderr.toString()).toBe("");
    expect(result.exitCode).toBe(0);
  }));

test("bundle gate: lazy chunks beyond the all-files ceiling fail on the ceiling alone", () =>
  fixture(async (root) => {
    await writeFile(join(root, "entry.js"), "x".repeat(1000));
    await writeFile(join(root, "lazy.js"), "y".repeat(400_000));
    await writeManifest(root, "entry.js", ["lazy.js"]);
    const result = runBundle(root);
    expect(result.stderr.toString()).toContain("Bundle ceiling exceeded for all files");
    expect(result.stderr.toString()).not.toContain("Bundle budget exceeded");
    expect(result.exitCode).not.toBe(0);
  }));

test("bundle gate fails closed when the build has no manifest", () =>
  fixture(async (root) => {
    await writeFile(join(root, "small.js"), "console.log(1);\n");
    const result = runBundle(root);
    expect(result.stderr.toString()).toContain("First-visit set cannot be computed");
    expect(result.exitCode).not.toBe(0);
  }));

const FAKE_TOKEN = ["gh", "p_", "Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4zAB7c"].join("");
const secretScan = (root: string) =>
  Bun.spawnSync(["node", resolve("scripts/secrets.ts"), root], { env: cleanGitEnv() });

/** Track `path` as a git symlink with the given target text, without touching the file system. */
async function trackLink(root: string, path: string, target: string, scratch: string) {
  await writeFile(join(root, scratch), target);
  const hash = git(root, "hash-object", "-w", scratch).stdout.toString().trim();
  expect(git(root, "update-index", "--add", "--cacheinfo", `120000,${hash},${path}`).exitCode).toBe(
    0,
  );
}

async function trackFile(root: string, path: string, content: string) {
  await mkdir(join(root, path, ".."), { recursive: true });
  await writeFile(join(root, path), content);
  expect(git(root, "add", path).exitCode).toBe(0);
}

test(
  "secret gate accepts a symlink to a tracked regular file",
  () =>
    fixture(async (root) => {
      expect(Bun.spawnSync(["git", "init", root], { env: cleanGitEnv() }).exitCode).toBe(0);
      await trackFile(root, "AGENTS.md", "plain instructions\n");
      await trackLink(root, "CLAUDE.md", "AGENTS.md", "scratch-link.txt");
      const result = secretScan(root);
      expect(result.stderr.toString()).not.toContain("Tracked symlink");
      expect(result.exitCode).toBe(0);
    }),
  30000,
);

test(
  "secret gate still finds a credential behind an accepted symlink",
  () =>
    fixture(async (root) => {
      expect(Bun.spawnSync(["git", "init", root], { env: cleanGitEnv() }).exitCode).toBe(0);
      await trackFile(root, "AGENTS.md", `export const token = ${JSON.stringify(FAKE_TOKEN)};\n`);
      await trackLink(root, "CLAUDE.md", "AGENTS.md", "scratch-link.txt");
      const result = secretScan(root);
      expect(result.stdout.toString() + result.stderr.toString()).toContain("leaks found");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);

test(
  "secret gate resolves a symlink target relative to the link's directory",
  () =>
    fixture(async (root) => {
      expect(Bun.spawnSync(["git", "init", root], { env: cleanGitEnv() }).exitCode).toBe(0);
      await trackFile(root, "docs/guide.md", "guide\n");
      await trackLink(root, "docs/alias.md", "guide.md", "scratch-link.txt");
      expect(secretScan(root).exitCode).toBe(0);
    }),
  30000,
);

for (const target of [
  "/etc/passwd",
  "../outside",
  "sub/../AGENTS.md",
  "./AGENTS.md",
  "..\\outside",
  "C:\\secret",
  "missing.md",
  "other-link",
  "AGENTS.md\nsecond",
  "AGENTS.md\n",
  "",
]) {
  test(
    `secret gate rejects an unsafe symlink target ${JSON.stringify(target)}`,
    () =>
      fixture(async (root) => {
        expect(Bun.spawnSync(["git", "init", root], { env: cleanGitEnv() }).exitCode).toBe(0);
        await trackFile(root, "AGENTS.md", "plain\n");
        await trackLink(root, "other-link", "AGENTS.md", "scratch-a.txt");
        await trackLink(root, "bad-link", target, "scratch-b.txt");
        const result = secretScan(root);
        expect(result.stderr.toString()).toContain("Tracked symlink or submodule");
        expect(result.stderr.toString()).toContain("bad-link");
        expect(result.exitCode).not.toBe(0);
      }),
    30000,
  );
}

test(
  "secret gate still rejects a submodule entry",
  () =>
    fixture(async (root) => {
      expect(Bun.spawnSync(["git", "init", root], { env: cleanGitEnv() }).exitCode).toBe(0);
      await trackFile(root, "AGENTS.md", "plain\n");
      expect(
        git(
          root,
          "update-index",
          "--add",
          "--cacheinfo",
          "160000,0123456789abcdef0123456789abcdef01234567,vendor/sub",
        ).exitCode,
      ).toBe(0);
      const result = secretScan(root);
      expect(result.stderr.toString()).toContain("Tracked symlink or submodule");
      expect(result.exitCode).not.toBe(0);
    }),
  30000,
);
