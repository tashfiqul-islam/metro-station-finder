import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { isRecord } from "./guards";
import { checkVitestSync, type VitestSyncInput } from "./vitest-sync";

// METRO-77 / ADR-0016. The Cloudflare plugin brings its own wrangler, miniflare and workerd copies next to
// the repository's wrangler (the spike resolved three wrangler, three miniflare and two workerd). The
// workerd that runs the Worker tests must be one workerd, vitest and its istanbul coverage package must be
// one version, and Renovate must move them together. Each rejection below is proven on an edited copy.

const read = (file: string) => readFile(resolve(file), "utf8");

async function realInput(): Promise<VitestSyncInput> {
  const manifest: unknown = JSON.parse(await read("package.json"));
  const lock: unknown = Bun.JSONC.parse(await read("bun.lock"));
  const renovate: unknown = Bun.JSON5.parse(await read(".github/renovate.json5"));
  if (!isRecord(manifest) || !isRecord(lock) || !isRecord(renovate))
    throw new Error("expected objects");
  return structuredClone({ manifest, lock, renovate });
}

function packages(input: VitestSyncInput): Record<string, unknown> {
  const table = input.lock["packages"];
  if (!isRecord(table)) throw new Error("bun.lock has no packages");
  return table;
}

function setLockVersion(input: VitestSyncInput, key: string, version: string): void {
  const entry = packages(input)[key];
  if (!Array.isArray(entry)) throw new Error(`bun.lock has no ${key}`);
  const name = String(entry[0]).slice(0, String(entry[0]).lastIndexOf("@"));
  entry[0] = `${name}@${version}`;
}

function devDependencies(input: VitestSyncInput): Record<string, unknown> {
  const dev = input.manifest["devDependencies"];
  if (!isRecord(dev)) throw new Error("no devDependencies");
  return dev;
}

test("METRO-77 the repository's Vitest, coverage, plugin, miniflare and workerd versions are in sync", async () => {
  expect(checkVitestSync(await realInput())).toEqual([]);
});

test("METRO-77 control: the real lock really carries the plugin's own miniflare and wrangler", async () => {
  const table = packages(await realInput());
  for (const key of [
    "@cloudflare/vitest-plugin/miniflare/workerd",
    "@cloudflare/vitest-plugin/wrangler/workerd",
  ])
    expect(Object.hasOwn(table, key)).toBe(true);
});

test("METRO-77 rejects vitest and @vitest/coverage-istanbul at different versions", async () => {
  const input = await realInput();
  devDependencies(input)["@vitest/coverage-istanbul"] = "5.0.0";
  expect(checkVitestSync(input).join("\n")).toContain("@vitest/coverage-istanbul");
});

test("METRO-77 rejects a range instead of an exact pin", async () => {
  const input = await realInput();
  devDependencies(input)["vitest"] = "^5.1.0";
  expect(checkVitestSync(input).join("\n")).toContain("exact");
});

test("METRO-77 rejects a missing Vitest package", async () => {
  const input = await realInput();
  delete devDependencies(input)["@cloudflare/vitest-plugin"];
  expect(checkVitestSync(input).join("\n")).toContain("@cloudflare/vitest-plugin");
});

test("METRO-77 rejects a plugin miniflare and wrangler that resolve different workerd versions", async () => {
  const input = await realInput();
  setLockVersion(input, "@cloudflare/vitest-plugin/wrangler/workerd", "1.20260101.0");
  expect(checkVitestSync(input).join("\n")).toContain("workerd");
});

test("METRO-77 rejects a lock that has lost the plugin's workerd entries", async () => {
  const input = await realInput();
  delete packages(input)["@cloudflare/vitest-plugin/miniflare/workerd"];
  expect(checkVitestSync(input).join("\n")).toContain("workerd");
});

test("METRO-77 rejects a plugin wrangler on a different minor than the repository's wrangler", async () => {
  const input = await realInput();
  setLockVersion(input, "@cloudflare/vitest-plugin/wrangler", "4.99.0");
  expect(checkVitestSync(input).join("\n")).toContain("wrangler");
});

test("METRO-77 rejects a Renovate config that does not group vitest with its coverage package", async () => {
  const input = await realInput();
  const rules = input.renovate["packageRules"];
  if (!Array.isArray(rules)) throw new Error("no packageRules");
  input.renovate["packageRules"] = rules.filter(
    (rule) => !(isRecord(rule) && rule["groupName"] === "vitest"),
  );
  expect(checkVitestSync(input).join("\n")).toContain("Renovate");
});

test("METRO-77 rejects a Renovate vitest group that leaves out the coverage package", async () => {
  const input = await realInput();
  const rules = input.renovate["packageRules"];
  if (!Array.isArray(rules)) throw new Error("no packageRules");
  for (const rule of rules)
    if (isRecord(rule) && rule["groupName"] === "vitest") rule["matchPackageNames"] = ["vitest"];
  expect(checkVitestSync(input).join("\n")).toContain("Renovate");
});

test("METRO-77 rejects a plugin that Renovate would move apart from wrangler", async () => {
  const input = await realInput();
  const rules = input.renovate["packageRules"];
  if (!Array.isArray(rules)) throw new Error("no packageRules");
  for (const rule of rules)
    if (isRecord(rule) && rule["groupName"] === "cloudflare")
      rule["matchPackageNames"] = ["wrangler"];
  expect(checkVitestSync(input).join("\n")).toContain("Renovate");
});

// The Worker test config must stay in step with the real one, or the tests would exercise a different Worker.
async function configs() {
  const real: unknown = Bun.JSONC.parse(await read("apps/api/wrangler.jsonc"));
  const test: unknown = Bun.JSONC.parse(await read("apps/api/wrangler.vitest.jsonc"));
  if (!isRecord(real) || !isRecord(test)) throw new Error("expected objects");
  return { real, test };
}

test("METRO-77 the Worker test config has the real compatibility_date and the same entry", async () => {
  const { real, test: tested } = await configs();
  expect(tested["compatibility_date"]).toBe(real["compatibility_date"]);
  expect(tested["main"]).toBe(real["main"]);
});

test("METRO-77 the Worker test config routes assets exactly like the real config, with an explicit directory", async () => {
  const { real, test: tested } = await configs();
  const realAssets = real["assets"];
  const testAssets = tested["assets"];
  if (!isRecord(realAssets) || !isRecord(testAssets)) throw new Error("no assets");
  const { directory, ...routing } = testAssets;
  expect(typeof directory).toBe("string");
  expect(routing).toEqual(realAssets);
});

// Vitest runs inside `check`, and CI uploads its separate istanbul lcov beside Bun's.
test("METRO-77 check runs Vitest with coverage and CI uploads both lcov files", async () => {
  const manifest: unknown = JSON.parse(await read("package.json"));
  if (!isRecord(manifest) || !isRecord(manifest["scripts"])) throw new Error("no scripts");
  expect(manifest["scripts"]["test:vitest"]).toBe("vitest run --coverage");
  expect(String(manifest["scripts"]["check"])).toContain("bun test && bun run test:vitest");
  const workflow = await read(".github/workflows/quality.yml");
  expect(workflow).toMatch(
    /name: coverage-lcov[\s\S]*?path: \|\s+coverage\/lcov\.info\s+coverage\/vitest\/lcov\.info\s/u,
  );
});
