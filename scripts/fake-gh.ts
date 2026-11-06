import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

/**
 * The real node binary among the lookup results. On Windows an installer may also leave an extensionless shim
 * (a script) that cannot be copied to `gh.exe`, so only `.exe` results qualify there. Throws with everything
 * that was found so a wrong PATH is easy to diagnose.
 */
export function pickNode(candidates: readonly string[], platform: string): string {
  const found = candidates.map((line) => line.trim()).filter((line) => line !== "");
  const node = platform === "win32" ? found.find((line) => /\.exe$/iu.test(line)) : found[0];
  if (node === undefined)
    throw new Error(
      `A real node binary is required on PATH to stand in for gh; the lookup found: ${found.length ? found.join(", ") : "nothing"}`,
    );
  return node;
}

/** Throws unless the stand-in printed what the preload prints, so a broken copy never reaches a test. */
export function assertStandIn(stdout: string, copy: string): void {
  if (!stdout.startsWith("listing "))
    throw new Error(
      `The stand-in gh at ${copy} did not run the preload (printed ${JSON.stringify(stdout)})`,
    );
}

/**
 * Test helper: runs `run` with a stand-in `gh` first on PATH, so code that spawns the real `gh` is exercised
 * without a network, a token or an installed gh. The stand-in is a copy of node that preloads a script
 * through NODE_OPTIONS, and it is probed once before `run` starts. Behaviour follows `process.env.FAKE_GH`,
 * which `run` may set: unset prints `listing <arguments>` and exits 0, `fail` prints `gh: denied ` on stderr
 * and `by policy` on stdout and exits 4, `silent` exits 5 with no output. PATH, NODE_OPTIONS and FAKE_GH are
 * restored in `finally`, and the probe gets its own environment, so nothing outside `run` sees them.
 */
export async function withFakeGh<T>(run: () => Promise<T> | T): Promise<T> {
  const node = pickNode(
    execFileSync(process.platform === "win32" ? "where.exe" : "which", ["node"], {
      encoding: "utf8",
    }).split(/\r?\n/u),
    process.platform,
  );
  const directory = await mkdtemp(join(tmpdir(), "metro-fake-gh-"));
  const saved = { PATH: process.env["PATH"], NODE_OPTIONS: process.env["NODE_OPTIONS"] };
  try {
    const copy = join(directory, process.platform === "win32" ? "gh.exe" : "gh");
    await copyFile(node, copy);
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
    const options = `--require ${JSON.stringify(preload.replaceAll("\\", "/"))}`;
    const probeEnv: Record<string, string | undefined> = { ...process.env, NODE_OPTIONS: options };
    delete probeEnv["FAKE_GH"];
    assertStandIn(spawnSync(copy, ["probe"], { encoding: "utf8", env: probeEnv }).stdout, copy);
    process.env["PATH"] = `${directory}${delimiter}${saved.PATH ?? ""}`;
    process.env["NODE_OPTIONS"] = options;
    return await run();
  } finally {
    delete process.env["FAKE_GH"];
    for (const [name, value] of Object.entries(saved))
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    await rm(directory, { recursive: true, force: true });
  }
}
