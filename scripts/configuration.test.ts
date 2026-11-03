import { expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { validateConfiguration, validateRuntimes } from "./configuration";

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "metro-config-"));
  for (const file of ["package.json", "mise.toml", "bunfig.toml"])
    await cp(resolve(file), join(root, file));
  return root;
}

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
      await expect(validateConfiguration(root)).rejects.toThrow(file);
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
      const manifest = JSON.parse(await readFile(path, "utf8"));
      if (change === "missing engines") delete manifest.engines;
      if (change === "wrong node") manifest.engines.node = "24.22.2";
      if (change === "wrong bun") manifest.engines.bun = "1.4.0";
      if (change === "wrong packageManager") manifest.packageManager = "bun@1.4.0";
      await writeFile(path, JSON.stringify(manifest));
      if (change === "missing install") await writeFile(join(root, "bunfig.toml"), "");
      await expect(validateConfiguration(root)).rejects.toThrow();
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
      await expect(validateConfiguration(root)).rejects.toThrow(file);
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
        source.replace(new RegExp(`${field} = [^\\r\\n]+`), `${field} = ${value}`),
      );
      await expect(validateConfiguration(root)).rejects.toThrow(`install.${field}`);
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
    await expect(validateConfiguration(root)).rejects.toThrow("tools.gitleaks");
  } finally {
    await rm(root, { recursive: true });
  }
});
