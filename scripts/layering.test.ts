import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const config = resolve(".dependency-cruiser.mts");
const parser = pathToFileURL(resolve("scripts/dependency-parser.ts")).href;
const cruiser = resolve("node_modules/dependency-cruiser/bin/dependency-cruiser.mjs");

async function cruise(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "metro-layering-"));
  try {
    for (const [file, source] of Object.entries(files)) {
      await mkdir(dirname(join(root, file)), { recursive: true });
      await writeFile(join(root, file), source);
    }
    await mkdir(join(root, "apps"), { recursive: true });
    await mkdir(join(root, "packages"), { recursive: true });
    // Mirror the real workspace: node_modules/@metro/<name> links to packages/<name>, whose exports
    // map exposes only src/index.ts, so bare specifiers resolve the way they do in the real tree.
    for (const name of ["core", "contracts"]) {
      if (!existsSync(join(root, "packages", name))) continue;
      await writeFile(
        join(root, "packages", name, "package.json"),
        `{"name":"@metro/${name}","type":"module","exports":{".":"./src/index.ts"}}`,
      );
      await mkdir(join(root, "node_modules", "@metro"), { recursive: true });
      await symlink(
        join(root, "packages", name),
        join(root, "node_modules", "@metro", name),
        "junction",
      );
    }
    // Stand-in third-party packages so resolution succeeds and only layering rules can fire.
    for (const name of ["hono", "react", "valibot"]) {
      await mkdir(join(root, "node_modules", name), { recursive: true });
      await writeFile(
        join(root, "node_modules", name, "package.json"),
        `{"name":"${name}","main":"index.js"}`,
      );
      await writeFile(join(root, "node_modules", name, "index.js"), "module.exports = {};\n");
    }
    const result = Bun.spawnSync(
      [
        "node",
        "--import",
        parser,
        cruiser,
        "--config",
        config,
        "--output-type",
        "err",
        "packages",
        "apps",
      ],
      { cwd: root, stdout: "pipe", stderr: "pipe" },
    );
    return { code: result.exitCode, output: result.stdout.toString() + result.stderr.toString() };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const core = { "packages/core/src/index.ts": "export const core = 1;\n" };
const contractsBase = { ...core };

test("FND-R6 a clean layered tree passes", async () => {
  const result = await cruise({
    ...core,
    "packages/contracts/src/index.ts":
      'import { core } from "../../core/src/index.ts";\nimport "valibot";\nexport const c = core;\n',
    "apps/web/src/main.ts":
      'import { c } from "../../../packages/contracts/src/index.ts";\nimport "react";\nexport const m = c;\n',
    "apps/api/src/index.ts":
      'import { c } from "../../../packages/contracts/src/index.ts";\nimport "hono";\nexport const a = c;\n',
  });
  expect(result.output).not.toContain("error");
  expect(result.code).toBe(0);
});

test("FND-R6 core importing contracts is rejected", async () => {
  const result = await cruise({
    ...contractsBase,
    "packages/core/src/index.ts":
      'import "../../contracts/src/index.ts";\nexport const core = 1;\n',
    "packages/contracts/src/index.ts": "export const c = 1;\n",
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("core-imports-only-core");
});

test("METRO-40 core domain importing core application or data is rejected", async () => {
  for (const layer of ["application", "data"]) {
    const result = await cruise({
      [`packages/core/src/${layer}/x.ts`]: "export const x = 1;\n",
      "packages/core/src/domain/station.ts": `import { x } from "../${layer}/x.ts";\nexport const s = x;\n`,
    });
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("core-domain-imports-only-domain");
  }
});

test("METRO-40 core application and data may import the domain", async () => {
  const result = await cruise({
    "packages/core/src/domain/station.ts": "export const s = 1;\n",
    "packages/core/src/application/find.ts":
      'import { s } from "../domain/station.ts";\nexport const f = s;\n',
    "packages/core/src/data/set.ts":
      'import { s } from "../domain/station.ts";\nexport const d = s;\n',
  });
  expect(result.output).not.toContain("error");
  expect(result.code).toBe(0);
});

test("FND-R6 core importing a third-party package is rejected", async () => {
  const result = await cruise({
    "packages/core/src/index.ts": 'import "valibot";\nexport const core = 1;\n',
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("core-imports-only-core");
});

for (const dependency of ["hono", "react"]) {
  test(`FND-R6 contracts importing ${dependency} is rejected`, async () => {
    const result = await cruise({
      ...core,
      "packages/contracts/src/index.ts": `import "${dependency}";\nexport const c = 1;\n`,
    });
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("contracts-imports-only-core-and-schema-library");
  });
}

test("FND-R6 contracts importing an app is rejected", async () => {
  const result = await cruise({
    ...core,
    "apps/api/src/index.ts": "export const a = 1;\n",
    "packages/contracts/src/index.ts":
      'import "../../../apps/api/src/index.ts";\nexport const c = 1;\n',
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("contracts-imports-only-core-and-schema-library");
});

test("FND-R6 web importing an api internal module is rejected", async () => {
  const result = await cruise({
    ...core,
    "apps/api/src/app.ts": "export const app = 1;\n",
    "apps/web/src/main.ts": 'import { app } from "../../api/src/app.ts";\nexport const m = app;\n',
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("apps-never-import-each-other");
});

test("FND-R6 api importing web is rejected", async () => {
  const result = await cruise({
    ...core,
    "apps/web/src/main.ts": "export const m = 1;\n",
    "apps/api/src/index.ts": 'import { m } from "../../web/src/main.ts";\nexport const a = m;\n',
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("apps-never-import-each-other");
});

// METRO-54. "contracts importing an app" is already covered by the FND-R6 test above.
// The cruiser drops imports TypeScript erases unless tsPreCompilationDeps is on, so these tests also
// guard that option: a type-only import of a contracts internal module must still be rejected, and
// the type-only carve-out of web-never-imports-core-runtime is only meaningful with the option on.
const typedCore = {
  "packages/core/src/index.ts": "export const core = 1;\nexport type Core = number;\n",
};
const typedContracts = {
  "packages/contracts/src/index.ts": "export const c = 1;\nexport type C = number;\n",
  "packages/contracts/src/internal.ts": "export const i = 1;\nexport type I = number;\n",
};

const forms = {
  value: (s: string, name: string) =>
    `import { ${name} } from "${s}";\nexport const used = ${name};\n`,
  "import type": (s: string, name: string) =>
    `import type { ${name} } from "${s}";\nexport type Used = ${name};\n`,
  "inline type": (s: string, name: string) =>
    `import { type ${name} } from "${s}";\nexport type Used = ${name};\n`,
  "export star": (s: string) => `export * from "${s}";\n`,
  "dynamic import": (s: string) => `export const load = () => import("${s}");\n`,
};
type Form = keyof typeof forms;
const erased: readonly Form[] = ["import type", "inline type"];
const runtime: readonly Form[] = ["value", "export star", "dynamic import"];

function importSource(form: Form, specifier: string, name: string): string {
  return forms[form](specifier, erased.includes(form) ? name.toUpperCase() : name);
}

for (const specifier of ["../../../packages/core/src/index.ts", "@metro/core"]) {
  for (const form of runtime) {
    test(`METRO-54 web ${form} of ${specifier} is rejected`, async () => {
      const result = await cruise({
        ...typedCore,
        "apps/web/src/main.ts": importSource(form, specifier, "core"),
      });
      expect(result.code).not.toBe(0);
      expect(result.output).toContain("web-never-imports-core-runtime");
    });
  }
  for (const form of erased) {
    test(`METRO-54 web ${form} of ${specifier} is allowed (type-only carve-out)`, async () => {
      const result = await cruise({
        ...typedCore,
        "apps/web/src/main.ts": forms[form](specifier, "Core"),
      });
      expect(result.output).not.toContain("error");
      expect(result.code).toBe(0);
    });
  }
}

test("METRO-54 api may import a runtime value from core", async () => {
  const result = await cruise({
    ...typedCore,
    "apps/api/src/main.ts": importSource("value", "@metro/core", "core"),
  });
  expect(result.output).not.toContain("error");
  expect(result.code).toBe(0);
});

for (const app of ["web", "api"]) {
  for (const form of [...runtime, ...erased]) {
    test(`METRO-54 ${app} ${form} of a contracts internal module is rejected`, async () => {
      const result = await cruise({
        ...core,
        ...typedContracts,
        [`apps/${app}/src/main.ts`]: importSource(
          form,
          "../../../packages/contracts/src/internal.ts",
          "i",
        ),
      });
      expect(result.code).not.toBe(0);
      expect(result.output).toContain("contracts-public-entry-only");
    });
  }

  test(`METRO-54 ${app} deep import of a contracts internal path by package name is rejected`, async () => {
    const result = await cruise({
      ...core,
      ...typedContracts,
      [`apps/${app}/src/main.ts`]: importSource("value", "@metro/contracts/src/internal.ts", "i"),
    });
    // The package exports map hides the path, so it surfaces as no-unresolved, not as the
    // contracts-public-entry-only rule (which covers relative paths that bypass the package).
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("no-unresolved");
  });

  test(`METRO-54 ${app} may import the contracts public entry by package name`, async () => {
    const result = await cruise({
      ...core,
      ...typedContracts,
      [`apps/${app}/src/main.ts`]: importSource("value", "@metro/contracts", "c"),
    });
    expect(result.output).not.toContain("error");
    expect(result.code).toBe(0);
  });
}

test("METRO-54 contracts modules may import each other internally", async () => {
  const result = await cruise({
    "packages/contracts/src/index.ts": 'import { i } from "./internal.ts";\nexport const c = i;\n',
    "packages/contracts/src/internal.ts": "export const i = 1;\n",
  });
  expect(result.output).not.toContain("error");
  expect(result.code).toBe(0);
});
