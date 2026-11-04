import { expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { validateConfiguration, validateRuntimes } from "./configuration";
import { isRecord } from "./guards";
import { expectRejection } from "./test-support";
import { gitleaksVersion } from "./tool-pins";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "metro-config-"));
  for (const file of ["package.json", "mise.toml", "bunfig.toml"])
    await cp(resolve(file), join(root, file));
  await mkdir(join(root, ".github"));
  await cp(resolve(".github/renovate.json5"), join(root, ".github/renovate.json5"));
  return root;
}

async function editFile(
  root: string,
  file: string,
  edit: (source: string) => string,
): Promise<void> {
  const path = join(root, file);
  await writeFile(path, edit(await readFile(path, "utf8")));
}

const spawnRenovate = (config: string) =>
  Bun.spawnSync(["renovate-config-validator", "--strict", config], {
    stdout: "pipe",
    stderr: "pipe",
  });

test("aligned required configuration passes", async () => {
  const root = await fixture();
  try {
    await validateConfiguration(root);
  } finally {
    await rm(root, { recursive: true });
  }
});

for (const file of ["package.json", "mise.toml", "bunfig.toml"]) {
  test(`malformed ${file} fails with filename`, async () => {
    const root = await fixture();
    try {
      await writeFile(join(root, file), "{ invalid [");
      await expectRejection(validateConfiguration(root), file);
    } finally {
      await rm(root, { recursive: true });
    }
  });
}

for (const change of [
  "missing engines",
  "wrong node",
  "wrong bun",
  "wrong packageManager",
  "missing install",
]) {
  test(`rejects ${change}`, async () => {
    const root = await fixture();
    try {
      const path = join(root, "package.json");
      const manifest: unknown = JSON.parse(await readFile(path, "utf8"));
      if (!isRecord(manifest)) throw new Error("package.json is not an object");
      const engines = manifest["engines"];
      if (!isRecord(engines)) throw new Error("package.json has no engines object");
      if (change === "missing engines") delete manifest["engines"];
      if (change === "wrong node") engines["node"] = "24.22.2";
      if (change === "wrong bun") engines["bun"] = "1.4.0";
      if (change === "wrong packageManager") manifest["packageManager"] = "bun@1.4.0";
      await writeFile(path, JSON.stringify(manifest));
      if (change === "missing install") await writeFile(join(root, "bunfig.toml"), "");
      await expectRejection(validateConfiguration(root));
    } finally {
      await rm(root, { recursive: true });
    }
  });
}
for (const file of ["package.json", "mise.toml", "bunfig.toml"]) {
  test(`missing ${file} fails visibly`, async () => {
    const root = await fixture();
    try {
      await rm(join(root, file));
      await expectRejection(validateConfiguration(root), file);
    } finally {
      await rm(root, { recursive: true });
    }
  });
}
for (const [field, value] of [
  ["exact", "false"],
  ["auto", '"auto"'],
  ["linker", '"hoisted"'],
  ["saveTextLockfile", "false"],
] as const) {
  test(`rejects bunfig policy drift: ${field}`, async () => {
    const root = await fixture();
    try {
      const path = join(root, "bunfig.toml");
      const source = await readFile(path, "utf8");
      await writeFile(
        path,
        source.replace(new RegExp(`${field} = [^\\r\\n]+`, "u"), `${field} = ${value}`),
      );
      await expectRejection(validateConfiguration(root), `install.${field}`);
    } finally {
      await rm(root, { recursive: true });
    }
  });
}

for (const actual of [
  { bun: "1.4.0", node: "26.13.0" },
  { bun: "1.4.4", node: "24.22.2" },
]) {
  test(`rejects effective runtime ${JSON.stringify(actual)}`, () => {
    expect(() => validateRuntimes({ bun: "1.4.4", node: "26.13.0" }, actual)).toThrow(
      "Runtime mismatch",
    );
  });
}
test("accepts effective pinned runtimes", () => {
  expect(() =>
    validateRuntimes({ bun: "1.4.4", node: "26.13.0" }, { bun: "1.4.4", node: "26.13.0" }),
  ).not.toThrow();
});

test("rejects missing secret scanner pin", async () => {
  const root = await fixture();
  try {
    const path = join(root, "mise.toml");
    await writeFile(path, (await readFile(path, "utf8")).replace('gitleaks = "8.30.1"', ""));
    await expectRejection(validateConfiguration(root), "tools.gitleaks");
  } finally {
    await rm(root, { recursive: true });
  }
});

async function withMise(edit: (source: string) => string, run: (root: string) => Promise<void>) {
  const root = await fixture();
  try {
    const path = join(root, "mise.toml");
    await writeFile(path, edit(await readFile(path, "utf8")));
    await run(root);
  } finally {
    await rm(root, { recursive: true });
  }
}

test("FND-H6 derives the Gitleaks version from mise.toml", async () => {
  await withMise(
    (source) => source.replace(/gitleaks = "[^"]+"/u, 'gitleaks = "9.1.2"'),
    async (root) => {
      expect(await gitleaksVersion(root)).toBe("9.1.2");
      await validateConfiguration(root);
    },
  );
});

test("FND-H6 rejects a missing Gitleaks pin naming tools.gitleaks", async () => {
  await withMise(
    (source) => source.replace(/gitleaks = "[^"]+"\n/u, ""),
    async (root) => {
      await expectRejection(validateConfiguration(root), "tools.gitleaks");
      await expectRejection(gitleaksVersion(root), "tools.gitleaks");
    },
  );
});

test("FND-H6 rejects a non-exact Gitleaks pin", async () => {
  await withMise(
    (source) => source.replace(/gitleaks = "[^"]+"/u, 'gitleaks = "latest"'),
    async (root) => {
      await expectRejection(validateConfiguration(root), "tools.gitleaks");
    },
  );
});

test("FND-H6 secrets script no longer hardcodes a Gitleaks version", async () => {
  const source = await readFile(resolve("scripts/secrets.ts"), "utf8");
  expect(source).not.toMatch(/gitleaks@\d/u);
  expect(source).toContain("gitleaksVersion");
});

test("FND-H6 every mise task has a description", async () => {
  await withMise(
    (source) => source.replace(/\[tasks\.scan\]\ndescription = "[^"]+"\n/u, "[tasks.scan]\n"),
    async (root) => {
      await expectRejection(validateConfiguration(root), "tasks.scan.description");
    },
  );
});

test("FND-S3 rejects a bunfig without minimumReleaseAge naming install.minimumReleaseAge", async () => {
  const root = await fixture();
  try {
    await editFile(root, "bunfig.toml", (source) =>
      source.replace(/minimumReleaseAge = \d+\r?\n/u, ""),
    );
    await expectRejection(validateConfiguration(root), "install.minimumReleaseAge");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("FND-S3 rejects a shorter Bun cooldown", async () => {
  const root = await fixture();
  try {
    await editFile(root, "bunfig.toml", (source) =>
      source.replace(/minimumReleaseAge = \d+/u, "minimumReleaseAge = 86400"),
    );
    await expectRejection(validateConfiguration(root), "install.minimumReleaseAge");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("FND-S2 rejects a Renovate cooldown that differs from bunfig", async () => {
  const root = await fixture();
  try {
    await editFile(root, ".github/renovate.json5", (source) =>
      source.replace('minimumReleaseAge: "3 days"', 'minimumReleaseAge: "2 days"'),
    );
    await expectRejection(validateConfiguration(root), "minimumReleaseAge");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("FND-S2 accepts an equivalent Renovate duration in other units", async () => {
  const root = await fixture();
  try {
    await editFile(root, ".github/renovate.json5", (source) =>
      source.replace('minimumReleaseAge: "3 days"', 'minimumReleaseAge: "72 hours"'),
    );
    await validateConfiguration(root);
  } finally {
    await rm(root, { recursive: true });
  }
});

test("FND-S2 rejects a missing Renovate configuration", async () => {
  const root = await fixture();
  try {
    await rm(join(root, ".github/renovate.json5"));
    await expectRejection(validateConfiguration(root), "renovate.json5");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("FND-S2 rejects a Renovate configuration without minimumReleaseAge", async () => {
  const root = await fixture();
  try {
    await editFile(root, ".github/renovate.json5", (source) =>
      source.replace(/^\s*minimumReleaseAge: "3 days",\r?\n/mu, ""),
    );
    await expectRejection(validateConfiguration(root), "minimumReleaseAge");
  } finally {
    await rm(root, { recursive: true });
  }
});

for (const tool of ["actionlint", "zizmor"]) {
  test(`rejects a missing or non-exact ${tool} pin`, async () => {
    await withMise(
      (source) => source.replace(new RegExp(`${tool} = "[^"]+"`, "u"), `${tool} = "latest"`),
      async (root) => {
        await expectRejection(validateConfiguration(root), `tools.${tool}`);
      },
    );
  });
}

test("FND-S2 the real Renovate configuration passes the pinned strict validator", () => {
  const result = spawnRenovate(resolve(".github/renovate.json5"));
  expect(result.exitCode).toBe(0);
});

test("FND-S2 a Renovate fixture with an unknown option fails the pinned validator", async () => {
  const root = await fixture();
  try {
    const file = join(root, ".github/renovate.json5");
    await editFile(root, ".github/renovate.json5", (source) =>
      source.replace(
        "dependencyDashboard: true,",
        "dependencyDashboard: true,\n  bogusOption: true,",
      ),
    );
    const result = spawnRenovate(file);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout.toString() + result.stderr.toString()).toContain("bogusOption");
  } finally {
    await rm(root, { recursive: true });
  }
}, 60000);

test("METRO-35 the real bunfig enables randomized test order without a fixed seed", async () => {
  await validateConfiguration(resolve("."));
  const parsed: unknown = Bun.TOML.parse(await readFile(resolve("bunfig.toml"), "utf8"));
  if (!isRecord(parsed) || !isRecord(parsed["test"])) throw new Error("bunfig.toml has no [test]");
  expect(parsed["test"]["randomize"]).toBe(true);
  expect(parsed["test"]["seed"]).toBeUndefined();
});

test("METRO-35 rejects a bunfig without randomize naming test.randomize", async () => {
  const root = await fixture();
  try {
    await editFile(root, "bunfig.toml", (source) => source.replace(/randomize = true\r?\n/u, ""));
    await expectRejection(validateConfiguration(root), "test.randomize");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("METRO-35 rejects randomize switched off", async () => {
  const root = await fixture();
  try {
    await editFile(root, "bunfig.toml", (source) =>
      source.replace("randomize = true", "randomize = false"),
    );
    await expectRejection(validateConfiguration(root), "test.randomize");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("METRO-35 rejects a fixed seed in bunfig naming test.seed", async () => {
  const root = await fixture();
  try {
    await editFile(root, "bunfig.toml", (source) =>
      source.replace("randomize = true", "randomize = true\nseed = 2444615283"),
    );
    await expectRejection(validateConfiguration(root), "test.seed");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("METRO-35 rejects a bunfig without a [test] table", async () => {
  const root = await fixture();
  try {
    await editFile(root, "bunfig.toml", (source) => source.slice(0, source.indexOf("[test]")));
    await expectRejection(validateConfiguration(root), "bunfig.toml test");
  } finally {
    await rm(root, { recursive: true });
  }
});
