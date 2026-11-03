import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { gitleaksVersion } from "./tool-pins.ts";
import { cleanGitEnv } from "./git-env.ts";

const SYMLINK_MODE = "120000";
const GITLINK_MODE = "160000";

const history = process.argv[2] === "--history";
const root = resolve((history ? process.argv[3] : process.argv[2]) ?? ".");
if (history) {
  // Full Git history, redacted. Needs full clone depth (CI checks out with fetch-depth: 0).
  const version = await gitleaksVersion(fileURLToPath(new URL("..", import.meta.url)));
  const result = spawnSync(
    "mise",
    ["exec", `gitleaks@${version}`, "--", "gitleaks", "git", root, "--redact", "--no-banner"],
    { stdio: "inherit", shell: false, env: cleanGitEnv() },
  );
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
// Inherited GIT_* variables (hooks, linked worktrees) must not redirect `-C root`.
const listing = execFileSync("git", ["-C", root, "ls-files", "-s", "-z"], {
  encoding: "utf8",
  env: cleanGitEnv(),
})
  .split("\0")
  .filter(Boolean)
  .map((entry) => {
    const tab = entry.indexOf("\t");
    return { mode: entry.slice(0, entry.indexOf(" ")), path: entry.slice(tab + 1) };
  });
if (!listing.length) throw new Error("Secret scan requires tracked source");
const gitleaks = await gitleaksVersion(fileURLToPath(new URL("..", import.meta.url)));
const staging = await mkdtemp(join(tmpdir(), "metro-secrets-"));
try {
  for (const { mode, path: file } of listing) {
    if (mode === SYMLINK_MODE || mode === GITLINK_MODE)
      throw new Error(`Tracked symlink or submodule cannot be scanned safely: ${file}`);
    if (isAbsolute(file) || relative(root, resolve(root, file)).startsWith(".."))
      throw new Error(`Invalid tracked path: ${file}`);
    const target = join(staging, file);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(join(root, file)));
  }
  const result = spawnSync(
    "mise",
    ["exec", `gitleaks@${gitleaks}`, "--", "gitleaks", "dir", staging, "--redact", "--no-banner"],
    { stdio: "inherit", shell: false },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  await rm(staging, { recursive: true, force: true });
}
