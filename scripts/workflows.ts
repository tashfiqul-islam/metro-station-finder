import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Lints GitHub workflow files with the mise-pinned actionlint (syntax and expressions) and zizmor
 * (unpinned actions, template injection, excessive permissions). zizmor runs offline so the result
 * depends only on the files, never on network state or a token.
 */
export function lintWorkflows(directory: string): { ok: boolean; output: string } {
  const files = readdirSync(directory)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => join(directory, name));
  if (!files.length) return { ok: false, output: `No workflow files in ${directory}` };
  let output = "";
  let ok = true;
  for (const [command, args] of [
    ["actionlint", ["-no-color", ...files]],
    [
      "zizmor",
      [
        "--offline",
        "--quiet",
        "--no-config",
        "--persona",
        "pedantic",
        "--min-severity",
        "low",
        ...files,
      ],
    ],
  ] as const) {
    const result = spawnSync(command, args, { encoding: "utf8", shell: false });
    if (result.error) throw result.error;
    output += `${result.stdout}${result.stderr}`;
    if (result.status !== 0) ok = false;
  }
  // Tool chatter on success ("No findings to report") is not signal.
  return { ok, output: ok ? "" : output };
}

if (import.meta.main) {
  const result = lintWorkflows(resolve(process.argv[2] ?? ".github/workflows"));
  if (result.output.trim()) console.error(result.output.trim());
  if (!result.ok) process.exitCode = 1;
}
