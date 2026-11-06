import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
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

test("METRO-45 every workflow that uses jdx/mise-action installs tools in locked mode", async () => {
  const dir = resolve(".github/workflows");
  const files = (await readdir(dir)).filter((file) => /\.ya?ml$/u.test(file));
  let withMise = 0;
  for (const file of files) {
    const text = await readFile(join(dir, file), "utf8");
    if (!text.includes("jdx/mise-action@")) continue;
    withMise += 1;
    const workflow = Bun.YAML.parse(text);
    const env = isRecord(workflow) ? workflow["env"] : undefined;
    if (!isRecord(env) || env["MISE_LOCKED"] !== "1")
      throw new Error(`${file}: workflow-level env MISE_LOCKED: "1" is required`);
    expect(text).not.toContain("--no-locked");
  }
  expect(withMise).toBeGreaterThanOrEqual(7);
});

test("METRO-45 every mise-action pins the mise version that wrote the lock", async () => {
  const lock = await readFile(resolve("mise.lock"), "utf8");
  expect(lock).toContain("lockfile_version = 3");
  const dir = resolve(".github/workflows");
  for (const file of await readdir(dir)) {
    const text = await readFile(join(dir, file), "utf8");
    for (const match of text.matchAll(/jdx\/mise-action@[^\n]*\n\s+with:\n\s+version: (\S+)/gu))
      expect(match[1]).toBe("2026.10.25");
  }
});

test("METRO-45 CODEOWNERS covers the lock and its sidecar", async () => {
  const owners = await readFile(resolve(".github/CODEOWNERS"), "utf8");
  expect(owners).toMatch(/^\/mise\.lock @tashfiqul-islam$/mu);
  expect(owners).toMatch(/^\/\.mise\/ @tashfiqul-islam$/mu);
});

const GOOD_HOSTS = "github.com or nodejs.org over https";

test("METRO-45 rejects a platform URL that does not contain the pinned version", async () => {
  await withFixture(
    {
      "mise.lock": (s) =>
        s.replace(
          "releases/download/v8.30.1/gitleaks_8.30.1_linux_x64",
          "releases/download/latest/gitleaks_linux_x64",
        ),
    },
    async (root) => {
      await expectRejection(validateConfiguration(root), "gitleaks linux-x64 url");
    },
  );
});

test(`METRO-45 rejects a platform URL that is not ${GOOD_HOSTS}`, async () => {
  for (const [from, to] of [
    [
      "https://nodejs.org/dist/v26.13.0/node-v26.13.0-linux-x64",
      "http://nodejs.org/dist/v26.13.0/node-v26.13.0-linux-x64",
    ],
    [
      "https://nodejs.org/dist/v26.13.0/node-v26.13.0-linux-x64",
      "https://evil.example/dist/v26.13.0/node-v26.13.0-linux-x64",
    ],
  ] as const) {
    await withFixture({ "mise.lock": (s) => s.replace(from, to) }, async (root) => {
      await expectRejection(validateConfiguration(root), "node linux-x64 url");
    });
  }
});

test("METRO-45 rejects a backend that differs from the reviewed one", async () => {
  await withFixture(
    { "mise.lock": (s) => s.replace('backend = "aqua:apple/pkl"', 'backend = "github:evil/pkl"') },
    async (root) => {
      await expectRejection(validateConfiguration(root), "pkl backend");
    },
  );
});

test("METRO-45 rejects a specifier that differs from the mise.toml pin", async () => {
  await withFixture(
    { "mise.lock": (s) => s.replace('specifiers = ["0.32.2"]', 'specifiers = ["latest"]') },
    async (root) => {
      await expectRejection(validateConfiguration(root), "pkl specifiers");
    },
  );
});

test("METRO-45 rejects a sidecar whose content does not match the recorded digest", async () => {
  await withFixture({}, async (root) => {
    const sidecar = join(root, ".mise/locks/npm-renovate/44.198.3~aa673d8d/aube-lock.yaml");
    await writeFile(sidecar, (await readFile(sidecar, "utf8")) + "# tampered\n");
    await expectRejection(validateConfiguration(root), "npm:renovate digest");
  });
});

test("METRO-45 rejects a digest that is not sha256", async () => {
  await withFixture(
    { "mise.lock": (s) => s.replace('digest = "sha256:', 'digest = "blake3:') },
    async (root) => {
      await expectRejection(validateConfiguration(root), "npm:renovate digest");
    },
  );
});

for (const path of ["../outside", "/etc/passwd", "C:/Windows", ".mise/locks/../../etc"]) {
  test(`METRO-45 rejects a dependency graph path that leaves .mise/locks: ${path}`, async () => {
    await withFixture(
      { "mise.lock": (s) => s.replace(/path = "[^"]+"/u, `path = "${path}"`) },
      async (root) => {
        await expectRejection(validateConfiguration(root), "npm:renovate path");
      },
    );
  });
}

test("METRO-45 rejects a trust exception that mise.toml and mise.lock do not share", async () => {
  await withFixture(
    { "mise.lock": (s) => s.replace("@yarnpkg/libzip@3.2.2", "@yarnpkg/libzip@3.2.3") },
    async (root) => {
      await expectRejection(validateConfiguration(root), "trust_policy_excludes");
    },
  );
  await withFixture(
    {
      "mise.lock": (s) =>
        s.replace(
          /\[tools\."npm:renovate"\.options\]\r?\ntrust_policy_excludes = [^\r\n]*\r?\n/u,
          "",
        ),
    },
    async (root) => {
      await expectRejection(validateConfiguration(root), "trust_policy_excludes");
    },
  );
});

test("METRO-45 garbage lock content fails closed with the file name", async () => {
  await withFixture({ "mise.lock": () => "{ this is not toml [" }, async (root) => {
    await expectRejection(validateConfiguration(root), "mise.lock");
  });
});

test("METRO-45 rejects duplicate sections in mise.lock", async () => {
  await withFixture(
    {
      "mise.lock": (s) =>
        s.replace(
          '[[tools.pkl]]\nversion = "0.32.2"',
          '[[tools.pkl]]\nversion = "0.32.2"\nbackend = "aqua:apple/pkl"\nspecifiers = ["0.32.2"]\n\n[[tools.pkl]]\nversion = "0.32.2"',
        ),
    },
    async (root) => {
      await expectRejection(validateConfiguration(root), "pkl");
    },
  );
  await withFixture(
    {
      "mise.lock": (s) =>
        s.replace(
          '[tools.pkl."platforms.linux-x64"]',
          '[tools.pkl."platforms.linux-x64"]\n[tools.pkl."platforms.linux-x64"]',
        ),
    },
    async (root) => {
      await expectRejection(validateConfiguration(root), "mise.lock");
    },
  );
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

test("METRO-92 rejects a platform URL that cannot be parsed", async () => {
  await withFixture(
    {
      "mise.lock": (s) =>
        s.replace(
          "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64",
          "not a url",
        ),
    },
    async (root) => {
      await expectRejection(validateConfiguration(root), "gitleaks linux-x64 url: not a URL");
    },
  );
});

test("METRO-92 rejects recorded trust exceptions that are not JSON", async () => {
  await withFixture(
    {
      "mise.lock": (s) =>
        s.replace(
          `trust_policy_excludes = '["@yarnpkg/libzip@3.2.2"]'`,
          "trust_policy_excludes = '[nope'",
        ),
    },
    async (root) => {
      await expectRejection(validateConfiguration(root), "trust_policy_excludes is not JSON");
    },
  );
});

test("METRO-92 rejects a tool whose backend has not been reviewed", async () => {
  await withFixture(
    {
      "mise.toml": (s) => s.replace('pkl = "0.32.2"', 'pkl = "0.32.2"\nsyft = "1.44.0"'),
      "mise.lock": (s) =>
        `${s}\n[[tools.syft]]\nversion = "1.44.0"\nspecifiers = ["1.44.0"]\nbackend = "aqua:anchore/syft"\n`,
    },
    async (root) => {
      await expectRejection(validateConfiguration(root), "syft backend is not reviewed");
    },
  );
});

test("METRO-92 rejects a lock entry for a tool that mise.toml no longer pins", async () => {
  await withFixture(
    { "mise.toml": (s) => s.replace(/^pkl = "[^"]+"\r?\n/mu, "") },
    async (root) => {
      await expectRejection(validateConfiguration(root), "mise.lock records pkl");
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
