import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { isRecord } from "./guards";

const config = resolve(".dependency-cruiser.mts");
const parser = pathToFileURL(resolve("scripts/dependency-parser.ts")).href;
const cruiser = resolve("node_modules/dependency-cruiser/bin/dependency-cruiser.mjs");

/** Write `files` into a fresh workspace that mirrors the real one and run the real cruiser CLI on it. */
async function cruiseTree(
  files: Record<string, string>,
  outputType: "err" | "json",
): Promise<{ code: number; output: string }> {
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
        outputType,
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

/** One tree, one real CLI run: used by the end-to-end tests that check the exit code and the text report. */
const cruise = (files: Record<string, string>) => cruiseTree(files, "err");

/*
 * METRO-83. The scenarios below used to cost one tree and one cruiser process each. Every rule is a rule on
 * one edge (from a path pattern to a path pattern), so scenarios cannot disturb each other when each one
 * owns its importing file(s) and the imported targets are shared. All scenarios are written into one tree
 * and cruised once with the same CLI and config (`--output-type json`); a scenario's verdict is the
 * violations whose `from` is one of its own files. A scenario must also show that its importing file was
 * parsed and has at least one resolved dependency, so an unparsed file cannot pass as "no violations".
 * Two tests keep the single-scenario text-report path: the clean tree and "core importing contracts".
 */
const sharedTargets: Record<string, string> = {
  "packages/core/src/index.ts": "export const core = 1;\nexport type Core = number;\n",
  "packages/core/src/domain/station.ts": "export const s = 1;\nexport type S = number;\n",
  "packages/core/src/application/x.ts": "export const x = 1;\n",
  "packages/core/src/data/x.ts": "export const x = 1;\n",
  "packages/contracts/src/index.ts": "export const c = 1;\nexport type C = number;\n",
  "packages/contracts/src/internal.ts": "export const i = 1;\nexport type I = number;\n",
  "apps/api/src/app.ts": "export const app = 1;\n",
  "apps/api/src/index.ts": "export const a = 1;\n",
  "apps/web/src/main.ts": "export const m = 1;\n",
};

type Files = Record<string, string>;
const scenarioFiles = new Map<string, Files>();
let scenarioCount = 0;

/** Register a scenario; `build` receives `at(dir)`, a path in `dir` that only this scenario owns. */
function scenario(build: (at: (dir: string) => string) => Files): string {
  const id = `s${scenarioCount}`;
  scenarioCount += 1;
  scenarioFiles.set(
    id,
    build((dir) => `${dir}/${id}.ts`),
  );
  return id;
}

interface Verdict {
  readonly rules: readonly string[];
  readonly violations: readonly string[];
}

let batch: Promise<ReadonlyMap<string, Verdict>> | undefined;

function runBatch(): Promise<ReadonlyMap<string, Verdict>> {
  batch ??= (async () => {
    const files: Files = { ...sharedTargets };
    for (const own of scenarioFiles.values()) Object.assign(files, own);
    const result = await cruiseTree(files, "json");
    const parsed: unknown = JSON.parse(result.output);
    if (!isRecord(parsed) || !Array.isArray(parsed["modules"]) || !isRecord(parsed["summary"]))
      throw new Error(`unexpected cruiser report: ${result.output.slice(0, 500)}`);
    const modules = new Map<string, number>();
    for (const module of parsed["modules"]) {
      if (isRecord(module) && typeof module["source"] === "string")
        modules.set(
          module["source"],
          Array.isArray(module["dependencies"]) ? module["dependencies"].length : 0,
        );
    }
    const violations: { from: string; rule: string }[] = [];
    const reported = parsed["summary"]["violations"];
    if (!Array.isArray(reported)) throw new Error("the cruiser report has no violations list");
    for (const violation of reported) {
      if (!isRecord(violation) || !isRecord(violation["rule"])) continue;
      const { from } = violation;
      const { name } = violation["rule"];
      if (typeof from === "string" && typeof name === "string")
        violations.push({ from, rule: name });
    }
    const verdicts = new Map<string, Verdict>();
    for (const [id, own] of scenarioFiles) {
      const paths = Object.keys(own);
      for (const path of paths)
        if ((modules.get(path) ?? 0) === 0)
          throw new Error(`${path} was not parsed or has no dependency in the cruiser report`);
      const mine = violations.filter((violation) => paths.includes(violation.from));
      verdicts.set(id, {
        rules: [...new Set(mine.map((violation) => violation.rule))],
        violations: mine.map((violation) => `${violation.rule}: ${violation.from}`),
      });
    }
    return verdicts;
  })();
  return batch;
}

async function verdict(id: string): Promise<Verdict> {
  const found = (await runBatch()).get(id);
  if (found === undefined) throw new Error(`unknown scenario ${id}`);
  return found;
}

const LONG = 30000;

test("FND-R6 a clean layered tree passes", async () => {
  const result = await cruise({
    "packages/core/src/index.ts": "export const core = 1;\n",
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
    "packages/core/src/index.ts":
      'import "../../contracts/src/index.ts";\nexport const core = 1;\n',
    "packages/contracts/src/index.ts": "export const c = 1;\n",
  });
  expect(result.code).not.toBe(0);
  expect(result.output).toContain("core-imports-only-core");
});

const domainImports = ["application", "data"].map((layer) =>
  scenario((at) => ({
    [at("packages/core/src/domain")]:
      `import { x } from "../${layer}/x.ts";\nexport const s = x;\n`,
  })),
);
test(
  "METRO-40 core domain importing core application or data is rejected",
  async () => {
    for (const id of domainImports)
      expect((await verdict(id)).rules).toContain("core-domain-imports-only-domain");
  },
  LONG,
);

const layersImportDomain = ["application", "data"].map((layer) =>
  scenario((at) => ({
    [at(`packages/core/src/${layer}`)]:
      'import { s } from "../domain/station.ts";\nexport const f = s;\n',
  })),
);
test(
  "METRO-40 core application and data may import the domain",
  async () => {
    for (const id of layersImportDomain) expect((await verdict(id)).violations).toEqual([]);
  },
  LONG,
);

const coreImportsThirdParty = scenario((at) => ({
  [at("packages/core/src")]: 'import "valibot";\nexport const core = 1;\n',
}));
test(
  "FND-R6 core importing a third-party package is rejected",
  async () => {
    expect((await verdict(coreImportsThirdParty)).rules).toContain("core-imports-only-core");
  },
  LONG,
);

for (const dependency of ["hono", "react"]) {
  const id = scenario((at) => ({
    [at("packages/contracts/src")]: `import "${dependency}";\nexport const c = 1;\n`,
  }));
  test(
    `FND-R6 contracts importing ${dependency} is rejected`,
    async () => {
      expect((await verdict(id)).rules).toContain("contracts-imports-only-core-and-schema-library");
    },
    LONG,
  );
}

const contractsImportsApp = scenario((at) => ({
  [at("packages/contracts/src")]: 'import "../../../apps/api/src/index.ts";\nexport const c = 1;\n',
}));
test(
  "FND-R6 contracts importing an app is rejected",
  async () => {
    expect((await verdict(contractsImportsApp)).rules).toContain(
      "contracts-imports-only-core-and-schema-library",
    );
  },
  LONG,
);

const webImportsApi = scenario((at) => ({
  [at("apps/web/src")]: 'import { app } from "../../api/src/app.ts";\nexport const m = app;\n',
}));
test(
  "FND-R6 web importing an api internal module is rejected",
  async () => {
    expect((await verdict(webImportsApi)).rules).toContain("apps-never-import-each-other");
  },
  LONG,
);

const apiImportsWeb = scenario((at) => ({
  [at("apps/api/src")]: 'import { m } from "../../web/src/main.ts";\nexport const a = m;\n',
}));
test(
  "FND-R6 api importing web is rejected",
  async () => {
    expect((await verdict(apiImportsWeb)).rules).toContain("apps-never-import-each-other");
  },
  LONG,
);

// METRO-54. "contracts importing an app" is already covered by the FND-R6 test above.
// The cruiser drops imports TypeScript erases unless tsPreCompilationDeps is on, so these tests also
// guard that option: a type-only import of a contracts internal module must still be rejected, and
// type-only edges to core internals are only rejected with the option on.
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

// METRO-89 (ADR-0018 follow-up 1) replaces web-never-imports-core-runtime with
// web-imports-core-public-entry-only. Mapping of the old assertions:
//   web runtime import of core rejected   -> now allowed through the public entry (inverted on purpose)
//   web type-only import of core allowed  -> kept, still allowed through the public entry
//   (new) web import of a core internal   -> rejected naming web-imports-core-public-entry-only
for (const specifier of ["../../../packages/core/src/index.ts", "@metro/core"]) {
  for (const form of runtime) {
    const id = scenario((at) => ({ [at("apps/web/src")]: importSource(form, specifier, "core") }));
    test(
      `METRO-89 web ${form} of the core public entry ${specifier} is allowed`,
      async () => {
        expect((await verdict(id)).violations).toEqual([]);
      },
      LONG,
    );
  }
  for (const form of erased) {
    const id = scenario((at) => ({ [at("apps/web/src")]: forms[form](specifier, "Core") }));
    test(
      `METRO-54 web ${form} of ${specifier} is allowed (type-only)`,
      async () => {
        expect((await verdict(id)).violations).toEqual([]);
      },
      LONG,
    );
  }
}

for (const form of [...runtime, ...erased]) {
  const id = scenario((at) => ({
    [at("apps/web/src")]: importSource(form, "../../../packages/core/src/domain/station.ts", "s"),
  }));
  test(
    `METRO-89 web ${form} of a core internal module by relative path is rejected`,
    async () => {
      expect((await verdict(id)).rules).toContain("web-imports-core-public-entry-only");
    },
    LONG,
  );
}

const webDeepCore = scenario((at) => ({
  [at("apps/web/src")]: importSource("value", "@metro/core/src/domain/station.ts", "s"),
}));
test(
  "METRO-89 web deep import of a core internal path by package name is rejected",
  async () => {
    // The package exports map hides the path, so it surfaces as no-unresolved (as for contracts).
    expect((await verdict(webDeepCore)).rules).toContain("no-unresolved");
  },
  LONG,
);

const apiRunsCore = scenario((at) => ({
  [at("apps/api/src")]: importSource("value", "@metro/core", "core"),
}));
test(
  "METRO-54 api may import a runtime value from core",
  async () => {
    expect((await verdict(apiRunsCore)).violations).toEqual([]);
  },
  LONG,
);

for (const app of ["web", "api"]) {
  for (const form of [...runtime, ...erased]) {
    const id = scenario((at) => ({
      [at(`apps/${app}/src`)]: importSource(
        form,
        "../../../packages/contracts/src/internal.ts",
        "i",
      ),
    }));
    test(
      `METRO-54 ${app} ${form} of a contracts internal module is rejected`,
      async () => {
        expect((await verdict(id)).rules).toContain("contracts-public-entry-only");
      },
      LONG,
    );
  }

  const deep = scenario((at) => ({
    [at(`apps/${app}/src`)]: importSource("value", "@metro/contracts/src/internal.ts", "i"),
  }));
  test(
    `METRO-54 ${app} deep import of a contracts internal path by package name is rejected`,
    async () => {
      // The package exports map hides the path, so it surfaces as no-unresolved, not as the
      // contracts-public-entry-only rule (which covers relative paths that bypass the package).
      const { rules } = await verdict(deep);
      expect(rules).toContain("no-unresolved");
    },
    LONG,
  );

  const publicEntry = scenario((at) => ({
    [at(`apps/${app}/src`)]: importSource("value", "@metro/contracts", "c"),
  }));
  test(
    `METRO-54 ${app} may import the contracts public entry by package name`,
    async () => {
      expect((await verdict(publicEntry)).violations).toEqual([]);
    },
    LONG,
  );
}

const contractsInternal = scenario((at) => ({
  [at("packages/contracts/src")]: 'import { i } from "./internal.ts";\nexport const c = i;\n',
}));
test(
  "METRO-54 contracts modules may import each other internally",
  async () => {
    expect((await verdict(contractsInternal)).violations).toEqual([]);
  },
  LONG,
);
