import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const wrangler = resolve("node_modules/.bin/wrangler");
const check = (cwd: string) =>
  Bun.spawnSync(
    [wrangler, "types", "--check", "worker-configuration.d.ts", "-c", "wrangler.jsonc"],
    {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    },
  );

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "metro-bindings-"));
  for (const file of ["wrangler.jsonc", "worker-configuration.d.ts"])
    await cp(resolve("apps/api", file), join(root, file));
  await cp(resolve("apps/api/src"), join(root, "src"), { recursive: true });
  return root;
}

test("FND-R5 the committed Worker binding types are up to date", () => {
  expect(check(resolve("apps/api")).exitCode).toBe(0);
}, 30000);

test("FND-R5 stale generated types fail naming worker-configuration.d.ts", async () => {
  const root = await fixture();
  try {
    const path = join(root, "wrangler.jsonc");
    await writeFile(
      path,
      (await readFile(path, "utf8")).replace(
        '"send_metrics": false,',
        '"send_metrics": false,\n  "vars": { "EXAMPLE": "1" },',
      ),
    );
    const result = check(root);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout.toString() + result.stderr.toString()).toContain(
      "worker-configuration.d.ts",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 60000);
