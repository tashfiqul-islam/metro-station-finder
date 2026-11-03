import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";

const root = resolve(process.argv[2] ?? ".");
const files = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
if (!files.length) throw new Error("Secret scan requires tracked source");
const staging = await mkdtemp(join(tmpdir(), "metro-secrets-"));
try {
  for (const file of files) {
    if (isAbsolute(file) || relative(root, resolve(root, file)).startsWith(".."))
      throw new Error(`Invalid tracked path: ${file}`);
    const target = join(staging, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(join(root, file)));
  }
  const result = spawnSync(
    "mise",
    ["exec", "gitleaks@8.30.1", "--", "gitleaks", "dir", staging, "--redact", "--no-banner"],
    { stdio: "inherit", shell: false },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(staging, { recursive: true, force: true });
}
