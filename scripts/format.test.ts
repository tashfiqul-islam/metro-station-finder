import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

for (const [extension, source] of [
  ["json", '{"value":1}'],
  ["jsonc", '{/* comment */"value":1}'],
  ["toml", '[tools]\nbun="1.4.4"'],
] as const) {
  test(`formatter ${extension}: rejects, writes, checks without writes, idempotent`, async () => {
    await mkdir(resolve(".local"), { recursive: true });
    const root = await mkdtemp(resolve(".local/format-"));
    const path = join(root, `config.${extension}`);
    const run = (mode: string) => Bun.spawnSync(["bun", "run", "oxfmt", mode, path]);
    try {
      await writeFile(path, source);
      expect(run("--check").exitCode).not.toBe(0);
      expect(await readFile(path, "utf8")).toBe(source);
      expect(run("--write").exitCode).toBe(0);
      const formatted = await readFile(path, "utf8");
      expect(run("--check").exitCode).toBe(0);
      expect(await readFile(path, "utf8")).toBe(formatted);
      expect(run("--write").exitCode).toBe(0);
      expect(await readFile(path, "utf8")).toBe(formatted);
      await writeFile(path, extension === "toml" ? "[broken" : "{ broken");
      expect(run("--check").exitCode).not.toBe(0);
    } finally {
      await rm(root, { recursive: true });
    }
  });
}
