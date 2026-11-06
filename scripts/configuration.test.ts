import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { validateConfiguration, validateRuntimes } from "./configuration";
import { isRecord } from "./guards";
import { expectRejection } from "./test-support";
import { gitleaksVersion } from "./tool-pins";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "metro-config-"));
  for (const file of ["package.json", "mise.toml", "mise.lock", "bunfig.toml"])
    await cp(resolve(file), join(root, file));
  await cp(resolve(".mise"), join(root, ".mise"), { recursive: true });
  await mkdir(join(root, ".github"));
  await mkdir(join(root, "apps/api"), { recursive: true });
  await mkdir(join(root, "apps/web"), { recursive: true });
  await cp(resolve("vitest.config.ts"), join(root, "vitest.config.ts"));
  await cp(resolve("vitest.shared.ts"), join(root, "vitest.shared.ts"));
  await cp(resolve("apps/api/vitest.config.ts"), join(root, "apps/api/vitest.config.ts"));
  await cp(resolve("apps/web/vitest.config.ts"), join(root, "apps/web/vitest.config.ts"));
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
    expect(await validateConfiguration(root)).toBeUndefined();
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
      // The lock still records 8.30.1, so the drift is caught too (METRO-45).
      await expectRejection(validateConfiguration(root), "gitleaks");
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
    expect(await validateConfiguration(root)).toBeUndefined();
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
}, 30000);

async function setTrusted(root: string, value: unknown): Promise<void> {
  const path = join(root, "package.json");
  const manifest: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!isRecord(manifest)) throw new Error("package.json is not an object");
  if (value === undefined) delete manifest["trustedDependencies"];
  else manifest["trustedDependencies"] = value;
  await writeFile(path, JSON.stringify(manifest));
}

test("METRO-46 the repository trusts no dependency install scripts", async () => {
  const manifest: unknown = JSON.parse(await readFile(resolve("package.json"), "utf8"));
  if (!isRecord(manifest)) throw new Error("package.json is not an object");
  expect(manifest["trustedDependencies"]).toEqual([]);
});

for (const [change, value] of [
  ["removed", undefined],
  ["widened", ["esbuild"]],
  ["not an array", "esbuild"],
  ["with a non-string entry", [1]],
] as const) {
  test(`METRO-46 rejects trustedDependencies ${change}`, async () => {
    const root = await fixture();
    try {
      await setTrusted(root, value);
      await expectRejection(validateConfiguration(root), "trustedDependencies");
    } finally {
      await rm(root, { recursive: true });
    }
  });
}

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

// ADR-0016: a Vitest config is held to the same ordering rule as bunfig.toml (shuffle on, no fixed seed).
// A project does not inherit the root `test.sequence`, so the rule lives in vitest.shared.ts and every
// Vitest config must spread it (proven in workerd: a root-only `shuffle` left in-file order fixed).
test("METRO-77 the real Vitest configs shuffle through the shared options without a fixed seed", async () => {
  await validateConfiguration(resolve("."));
  const shared = await readFile(resolve("vitest.shared.ts"), "utf8");
  expect(shared).toMatch(/shuffle: true/u);
  expect(shared).not.toMatch(/\bseed\s*:/u);
  for (const file of ["vitest.config.ts", "apps/api/vitest.config.ts", "apps/web/vitest.config.ts"])
    expect(await readFile(resolve(file), "utf8")).toContain("sharedTestOptions");
});

test("METRO-77 rejects shared options without sequence.shuffle naming it", async () => {
  const root = await fixture();
  try {
    await editFile(root, "vitest.shared.ts", (source) =>
      source.replace("sequence: { shuffle: true },", ""),
    );
    await expectRejection(validateConfiguration(root), "sequence.shuffle");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("METRO-77 rejects shuffle switched off", async () => {
  const root = await fixture();
  try {
    await editFile(root, "vitest.shared.ts", (source) =>
      source.replace("shuffle: true", "shuffle: false"),
    );
    await expectRejection(validateConfiguration(root), "sequence.shuffle");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("METRO-77 rejects a fixed seed in the shared options naming sequence.seed", async () => {
  const root = await fixture();
  try {
    await editFile(root, "vitest.shared.ts", (source) =>
      source.replace("shuffle: true", "shuffle: true, seed: 42"),
    );
    await expectRejection(validateConfiguration(root), "sequence.seed");
  } finally {
    await rm(root, { recursive: true });
  }
});

test("METRO-77 rejects a fixed seed or disabled shuffle in a project Vitest config", async () => {
  for (const file of ["apps/api/vitest.config.ts", "apps/web/vitest.config.ts"])
    for (const sequence of ["sequence: { seed: 7 }", "sequence: { shuffle: false }"]) {
      const root = await fixture();
      try {
        await editFile(root, file, (source) => source.replace("test: {", `test: { ${sequence},`));
        await expectRejection(validateConfiguration(root), file);
      } finally {
        await rm(root, { recursive: true });
      }
    }
});

test("METRO-77 rejects a Vitest config that does not spread the shared options", async () => {
  for (const file of [
    "vitest.config.ts",
    "apps/api/vitest.config.ts",
    "apps/web/vitest.config.ts",
  ]) {
    const root = await fixture();
    try {
      await editFile(root, file, (source) => source.replace("...sharedTestOptions,", ""));
      await expectRejection(validateConfiguration(root), `${file}: must spread sharedTestOptions`);
    } finally {
      await rm(root, { recursive: true });
    }
  }
});

test("METRO-77 rejects a missing shared options file or root Vitest config", async () => {
  for (const file of ["vitest.shared.ts", "vitest.config.ts"]) {
    const root = await fixture();
    try {
      await rm(join(root, file));
      await expectRejection(validateConfiguration(root), file);
    } finally {
      await rm(root, { recursive: true });
    }
  }
});

// ADR-0016: a file must run under exactly one runner. Every project the root Vitest config lists is a
// directory Bun must ignore, or its tests would run twice (and under Bun they would have no DOM).
test("METRO-79 Bun ignores every directory the root Vitest config lists as a project", async () => {
  const config = await readFile(resolve("vitest.config.ts"), "utf8");
  const projects = /projects:\s*\[([^\]]*)\]/u.exec(config)?.[1];
  expect(projects).toBeDefined();
  const directories = [...(projects ?? "").matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
  expect(directories).toEqual(["apps/api", "apps/web"]);
  const bunfig: unknown = Bun.TOML.parse(await readFile(resolve("bunfig.toml"), "utf8"));
  const section = isRecord(bunfig) ? bunfig["test"] : undefined;
  const ignored = isRecord(section) ? section["pathIgnorePatterns"] : undefined;
  expect(ignored).toEqual(directories.map((directory) => `${directory}/**`));
});
