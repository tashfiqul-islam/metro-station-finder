import { execFileSync, spawnSync } from "node:child_process";

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter((file) => /\.(ts|tsx|js|mjs|css|html|md|json|jsonc|toml|yaml|yml)$/u.test(file));
if (files.length === 0) throw new Error("No supported source/configuration files found");
const mode = process.argv[2];
if (mode !== "--check" && mode !== "--write") throw new Error("Expected --check or --write");
const result = spawnSync("bun", ["run", "oxfmt", mode, ...files], {
  stdio: "inherit",
  shell: false,
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
