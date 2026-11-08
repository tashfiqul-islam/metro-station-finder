import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { HEAD_SCRIPTS } from "./bundle-budget.ts";
import { checklistProblems, kindOf, parseKindMap } from "./docs-structure.ts";
import { checkLinks } from "./links.ts";

// METRO-110: docs/design/handoff/ is a frozen reference snapshot. These tests prove how each tool treats
// it, so a later config edit cannot silently re-enable one.
const FOLDER = "docs/design/handoff";

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object");
  }
  return Object.fromEntries(Object.entries(value));
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("Expected an array");
  return value.map(String);
}

function files(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).replaceAll("\\", "/"));
}

function oxfmtCheck(...paths: string[]): { code: number; output: string } {
  const result = Bun.spawnSync(["bun", "run", "oxfmt", "--check", ...paths]);
  return { code: result.exitCode, output: result.stdout.toString() + result.stderr.toString() };
}

test("the formatter config ignores the folder", () => {
  const config = record(JSON.parse(readFileSync(".oxfmtrc.json", "utf8")));
  expect(strings(config["ignorePatterns"])).toContain(`${FOLDER}/**`);
});

test("the formatter skips handoff files that it would otherwise reformat", () => {
  // scripts/format.ts runs `bun run oxfmt --check <files>`. An ignored target is dropped; with nothing
  // left oxfmt exits 2 and says so.
  const skipped = oxfmtCheck(`${FOLDER}/index.html`, `${FOLDER}/components.css`);
  expect(skipped.code).toBe(2);
  expect(skipped.output).toContain("excluded by ignore rules");

  // Control: the same bytes outside the folder are rejected, so the skip above is the ignore at work.
  mkdirSync(".local", { recursive: true });
  const directory = mkdtempSync(join(".local", "handoff-control-"));
  try {
    const copy = join(directory, "index.html");
    writeFileSync(copy, readFileSync(`${FOLDER}/index.html`));
    const control = oxfmtCheck(copy);
    expect(control.code).toBe(1);
    expect(control.output).toContain("Format issues");
  } finally {
    rmSync(directory, { recursive: true });
  }
});

test(".gitattributes keeps the snapshot byte-exact", () => {
  const lines = readFileSync(".gitattributes", "utf8").split("\n");
  expect(lines).toContain(`${FOLDER}/** -text`);
  expect(lines).toContain(`${FOLDER}/**/*.woff2 binary`);
  // The folder rule comes after the global `* text=auto eol=lf`, so it wins.
  expect(lines.indexOf(`${FOLDER}/** -text`)).toBeGreaterThan(lines.indexOf("* text=auto eol=lf"));
});

test("docs map lists the folder as reference, and its Markdown passes the docs checks", async () => {
  const readme = readFileSync("docs/README.md", "utf8");
  const map = parseKindMap(readme);
  expect(map.get(`${FOLDER}/`)).toBe("reference");
  const all = files(FOLDER);
  for (const file of all) expect(kindOf(file, map)).toBe("reference");
  const markdown = all.filter((file) => file.endsWith(".md"));
  expect(markdown.length).toBeGreaterThanOrEqual(3);
  for (const file of markdown) {
    expect(checklistProblems(readFileSync(file, "utf8"))).toEqual([]);
  }
  expect(await checkLinks(".", markdown)).toEqual([]);
});

test("lint, imports, knip and css-rules scopes exclude docs", () => {
  const manifest = record(JSON.parse(readFileSync("package.json", "utf8")));
  const scripts = record(manifest["scripts"]);
  for (const name of ["lint", "imports:check"]) {
    const command = String(scripts[name]);
    expect(command.split(/\s+/u).some((word) => word === "docs" || word.startsWith("docs/"))).toBe(
      false,
    );
  }
  const knip = JSON.stringify(JSON.parse(readFileSync("knip.json", "utf8")));
  expect(knip).not.toContain("docs");
  // css-rules.test.ts reads only these roots.
  const cssRules = readFileSync("scripts/css-rules.test.ts", "utf8");
  expect(cssRules).toContain('"apps/web/src"');
  expect(cssRules).toContain('"apps/web/public"');
  expect(cssRules).not.toContain("docs/");
});

test("the app and the Worker serve nothing from the folder", () => {
  expect(existsSync(`${FOLDER}/theme-boot.js`)).toBe(true);
  const served = files("apps/web/public");
  expect(served.some((file) => file.includes("handoff"))).toBe(false);
  expect(served.some((file) => file.endsWith("/theme-boot.js"))).toBe(true);
  const wrangler = record(Bun.JSONC.parse(readFileSync("apps/api/wrangler.jsonc", "utf8")));
  const assets = record(wrangler["assets"]);
  // The assets directory is supplied by @cloudflare/vite-plugin from the client build output.
  expect(assets["directory"]).toBeUndefined();
  expect(JSON.stringify(wrangler)).not.toContain("design");
  expect(readFileSync("apps/web/vite.config.ts", "utf8")).not.toContain("docs");
  // The bundle gate looks for head scripts by name in the build output, never in docs/.
  expect(HEAD_SCRIPTS).toEqual(["theme-boot.js"]);
  expect(readFileSync("scripts/bundle-budget.ts", "utf8")).not.toContain("docs/");
});
