import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

/**
 * Test helper: runs `run` with a stand-in `gh` first on PATH, so code that spawns the real `gh` is exercised
 * without a network, a token or an installed gh. The stand-in is a copy of node that preloads a script
 * through NODE_OPTIONS. Behaviour follows `process.env.FAKE_GH`, which `run` may set:
 * unset prints `listing <arguments>` and exits 0, `fail` prints `gh: denied ` on stderr and `by policy` on
 * stdout and exits 4, `silent` exits 5 with no output. The environment is restored afterwards.
 */
export async function withFakeGh<T>(run: () => Promise<T> | T): Promise<T> {
  const node = execFileSync(process.platform === "win32" ? "where.exe" : "which", ["node"], {
    encoding: "utf8",
  })
    .split(/\r?\n/u)
    .find((line) => line.trim() !== "");
  if (node === undefined) throw new Error("node is required on PATH to stand in for gh");
  const directory = await mkdtemp(join(tmpdir(), "metro-fake-gh-"));
  const saved = { PATH: process.env["PATH"], NODE_OPTIONS: process.env["NODE_OPTIONS"] };
  try {
    await copyFile(node, join(directory, process.platform === "win32" ? "gh.exe" : "gh"));
    const preload = join(directory, "preload.cjs");
    await writeFile(
      preload,
      [
        'if (process.env.FAKE_GH === "fail") {',
        '  process.stderr.write("gh: denied ");',
        '  process.stdout.write("by policy");',
        "  process.exit(4);",
        '} else if (process.env.FAKE_GH === "silent") process.exit(5);',
        'process.stdout.write("listing " + process.argv.slice(1).join(" "));',
        "process.exit(0);",
      ].join("\n"),
    );
    process.env["PATH"] = `${directory}${delimiter}${saved.PATH ?? ""}`;
    process.env["NODE_OPTIONS"] = `--require ${JSON.stringify(preload.replaceAll("\\", "/"))}`;
    return await run();
  } finally {
    delete process.env["FAKE_GH"];
    for (const [name, value] of Object.entries(saved))
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    await rm(directory, { recursive: true, force: true });
  }
}
