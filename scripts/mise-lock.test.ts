import { expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { validateConfiguration } from "./configuration";
import { isRecord } from "./guards";
import { expectRejection } from "./test-support";

async function withFixture(
  edits: { "mise.toml"?: (s: string) => string; "mise.lock"?: (s: string) => string },
  run: (root: string) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), "metro-lock-"));
  try {
    for (const file of ["package.json", "mise.toml", "mise.lock", "bunfig.toml"])
      await cp(resolve(file), join(root, file));
    await cp(resolve(".mise"), join(root, ".mise"), { recursive: true });
    await mkdir(join(root, ".github"));
    await cp(resolve(".github/renovate.json5"), join(root, ".github/renovate.json5"));
    for (const [file, edit] of Object.entries(edits)) {
      const path = join(root, file);
      const next = edit(await readFile(path, "utf8"));
      await writeFile(path, next);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("METRO-45 the tracked mise.lock covers exactly the tools in mise.toml", async () => {
  const lock = Bun.TOML.parse(await readFile(resolve("mise.lock"), "utf8"));
  const mise = Bun.TOML.parse(await readFile(resolve("mise.toml"), "utf8"));
  if (!isRecord(lock) || !isRecord(lock["tools"]) || !isRecord(mise) || !isRecord(mise["tools"]))
    throw new Error("mise.lock or mise.toml has no tools table");
  expect(new Set(Object.keys(lock["tools"]))).toEqual(new Set(Object.keys(mise["tools"])));
  await validateConfiguration(resolve("."));
});

test("METRO-45 the quality workflow installs tools in locked mode", async () => {
  const text = await readFile(resolve(".github/workflows/quality.yml"), "utf8");
  const workflow = Bun.YAML.parse(text);
  if (!isRecord(workflow) || !isRecord(workflow["env"])) throw new Error("quality.yml has no env");
  expect(workflow["env"]["MISE_LOCKED"]).toBe("1");
  expect(text).not.toContain("--no-locked");
  expect(text).not.toMatch(/MISE_LOCKED:\s*["']?(0|false)/u);
});

test("METRO-45 rejects a missing mise.lock", async () => {
  await withFixture({}, async (root) => {
    await rm(join(root, "mise.lock"));
    await expectRejection(validateConfiguration(root), "mise.lock");
  });
});

test("METRO-45 rejects a mise.toml pin that differs from mise.lock", async () => {
  await withFixture(
    { "mise.toml": (s) => s.replace('gitleaks = "8.30.1"', 'gitleaks = "8.30.0"') },
    async (root) => {
      await expectRejection(validateConfiguration(root), "gitleaks");
    },
  );
});

test("METRO-45 rejects a mise.lock version that differs from mise.toml", async () => {
  await withFixture(
    { "mise.lock": (s) => s.replace(/^version = "0\.32\.2"/mu, 'version = "0.32.1"') },
    async (root) => {
      await expectRejection(validateConfiguration(root), "pkl");
    },
  );
});

test("METRO-45 rejects a tool in mise.toml that mise.lock does not record", async () => {
  await withFixture(
    { "mise.toml": (s) => s.replace('pkl = "0.32.2"', 'pkl = "0.32.2"\nsyft = "1.44.0"') },
    async (root) => {
      await expectRejection(validateConfiguration(root), "syft");
    },
  );
});

test("METRO-45 rejects a mise.lock tool that mise.toml no longer pins", async () => {
  await withFixture(
    { "mise.toml": (s) => s.replace(/^zizmor = "[^"]+"\r?\n/mu, "") },
    async (root) => {
      await expectRejection(validateConfiguration(root), "zizmor");
    },
  );
});

for (const platform of ["windows-x64", "linux-x64"]) {
  test(`METRO-45 rejects an actionlint ${platform} entry that is missing`, async () => {
    await withFixture(
      {
        "mise.lock": (s) =>
          s.replace(
            new RegExp(`\\[tools\\.actionlint\\."platforms\\.${platform}"\\][^\\[]*`, "u"),
            "",
          ),
      },
      async (root) => {
        await expectRejection(validateConfiguration(root), `actionlint ${platform}`);
      },
    );
  });
  test(`METRO-45 rejects a pkl ${platform} entry without a checksum`, async () => {
    await withFixture(
      {
        "mise.lock": (s) =>
          s.replace(
            new RegExp(
              `(\\[tools\\.pkl\\."platforms\\.${platform}"\\]\\r?\\n)checksum = [^\\r\\n]+\\r?\\n`,
              "u",
            ),
            "$1",
          ),
      },
      async (root) => {
        await expectRejection(validateConfiguration(root), `pkl ${platform}`);
      },
    );
  });
}

test("METRO-45 rejects an npm tool whose dependency graph sidecar is missing", async () => {
  await withFixture({}, async (root) => {
    await rm(join(root, ".mise"), { recursive: true });
    await expectRejection(validateConfiguration(root), "npm:renovate");
  });
});

test("METRO-45 rejects an npm tool without a recorded dependency graph", async () => {
  await withFixture(
    { "mise.lock": (s) => s.replace(/^aube = [^\r\n]+\r?\n/mu, "") },
    async (root) => {
      await expectRejection(validateConfiguration(root), "npm:renovate");
    },
  );
});

test("METRO-45 rejects mise.toml without the lockfile setting", async () => {
  await withFixture({ "mise.toml": (s) => s.replace("lockfile = true\n", "") }, async (root) => {
    await expectRejection(validateConfiguration(root), "settings.lockfile");
  });
});

test("METRO-45 rejects mise.toml that does not lock both supported platforms", async () => {
  await withFixture(
    { "mise.toml": (s) => s.replace(/lockfile_platforms = [^\r\n]+\r?\n/u, "") },
    async (root) => {
      await expectRejection(validateConfiguration(root), "lockfile_platforms");
    },
  );
});
