import { readdir, readFile } from "node:fs/promises";
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

test("METRO-80 rejects a vitest outside the peer range the plugin declares", async () => {
  const input = await realInput();
  devDependencies(input)["vitest"] = "6.0.0";
  devDependencies(input)["@vitest/coverage-istanbul"] = "6.0.0";
  const message = checkVitestSync(input).join("\n");
  expect(message).toContain("^4.1.0 || ^5.0.0");
  expect(message).toContain("vitest 6.0.0");
});

test("METRO-80 rejects a lock whose plugin entry has lost its vitest peer range", async () => {
  const input = await realInput();
  const entry = packages(input)["@cloudflare/vitest-plugin"];
  if (!Array.isArray(entry) || !isRecord(entry[2])) throw new Error("no plugin entry");
  delete entry[2]["peerDependencies"];
  expect(checkVitestSync(input)).toContain(
    "bun.lock lists no vitest peer range for @cloudflare/vitest-plugin",
  );
});

test("METRO-80 rejects a lock entry for a different plugin version than the manifest pin", async () => {
  const input = await realInput();
  setLockVersion(input, "@cloudflare/vitest-plugin", "1.4.0");
  expect(checkVitestSync(input)).toContain(
    "bun.lock resolves @cloudflare/vitest-plugin 1.4.0 but package.json pins 1.5.0",
  );
});

for (const [version, accepted] of [
  ["5.0.1", true],
  ["5.1.0", true],
  ["5.1.0-beta.1", false],
  ["4.0.9", false],
] as const)
  test(`METRO-80 peer range boundary: vitest ${version} is ${accepted ? "accepted" : "rejected"}`, async () => {
    const input = await realInput();
    devDependencies(input)["vitest"] = version;
    devDependencies(input)["@vitest/coverage-istanbul"] = version;
    const peer = checkVitestSync(input).filter((problem) => problem.includes("peer range"));
    expect(peer.length === 0).toBe(accepted);
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

// The Worker tests must exercise the real Worker config, not a copy of it that drifts: the Vitest project
// reads apps/api/wrangler.jsonc itself, and only the assets directory (which @cloudflare/vite-plugin fills in
// the real build) comes from the Vitest config.
test("METRO-77 the API Vitest project reads the real wrangler.jsonc and no second Worker config exists", async () => {
  const config = await read("apps/api/vitest.config.ts");
  expect(config).toContain('configPath: "./wrangler.jsonc"');
  const entries = await readdir(resolve("apps/api"));
  expect(entries.filter((name) => /^wrangler\..+\.jsonc?$/u.test(name))).toEqual([]);
});

// Vitest runs inside `check`, and CI uploads its separate istanbul lcov beside Bun's.
test("METRO-77 check runs Vitest with coverage and CI uploads both lcov files", async () => {
  const manifest: unknown = JSON.parse(await read("package.json"));
  if (!isRecord(manifest) || !isRecord(manifest["scripts"])) throw new Error("no scripts");
  expect(manifest["scripts"]["test:vitest"]).toBe("vitest run --coverage");
  // METRO-82: `bun test` carries flags (`--parallel=N`) but still runs right before Vitest.
  expect(String(manifest["scripts"]["check"])).toMatch(
    /(?:^| && )bun test(?: --\S+)* && bun run test:vitest(?: && |$)/u,
  );
  const workflow = await read(".github/workflows/quality.yml");
  expect(workflow).toMatch(
    /name: coverage-lcov[\s\S]*?path: \|\s+coverage\/lcov\.info\s+coverage\/vitest\/lcov\.info\s/u,
  );
});
