import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { isRecord } from "./guards";
import { formatSeconds, formatTable, splitChain, timedCheckMain, type Deps } from "./timed-check";

/** A fake runner: exit codes come from `codes` by command text (default 0); the clock moves 1.5 s per command. */
function fake(codes: Record<string, number | null> = {}) {
  const ran: string[] = [];
  const out: string[] = [];
  const err: string[] = [];
  let clock = 0;
  const deps: Deps = {
    run(argv) {
      const command = argv.join(" ");
      ran.push(command);
      clock += 1500;
      const status = command in codes ? (codes[command] ?? null) : 0;
      return { status, signal: status === null ? "SIGKILL" : null };
    },
    now: () => clock,
    log: (line) => out.push(line),
    error: (line) => err.push(line),
  };
  return { deps, ran, out, err };
}

function manifestDir(check: string | undefined): string {
  const dir = mkdtempSync(join(tmpdir(), "metro-timed-"));
  const scripts = check === undefined ? {} : { check };
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts }));
  return dir;
}

test("METRO-81 splitChain splits on && and keeps each command's words", () => {
  expect(splitChain("bun run a && node scripts/b.ts --flag=1 && bun test")).toEqual([
    "bun run a",
    "node scripts/b.ts --flag=1",
    "bun test",
  ]);
  expect(splitChain("  bun   test  ")).toEqual(["bun test"]);
});

test("METRO-81 splitChain rejects syntax it cannot split faithfully, loudly", () => {
  for (const bad of [
    "a || b",
    "a ; b",
    "a | b",
    "a & b",
    "a&&b",
    "a > out.txt",
    "a < in.txt",
    'echo "x && y"',
    "echo 'x'",
    "echo $HOME",
    "echo `x`",
    "echo $(x)",
    "echo *.ts",
    "FOO=1 bun test",
    "bun test &&",
    "&& bun test",
    "a && && b",
    "",
    "   ",
    "a\\b",
    "a\nb",
    "a\r\nb",
    "a\tb",
    "a &&\nb",
    "a # note",
    "(a)",
  ]) {
    expect(() => splitChain(bad)).toThrow(/timed-check/u);
  }
});

test("METRO-81 a passing chain runs every command in order and prints the table", () => {
  const { deps, ran, out } = fake();
  const dir = manifestDir("bun run a && node b.ts && bun test");
  try {
    expect(timedCheckMain({}, deps, dir)).toBe(0);
  } finally {
    rmSync(dir, { recursive: true });
  }
  expect(ran).toEqual(["bun run a", "node b.ts", "bun test"]);
  const table = out.join("\n");
  expect(table).toContain("| 1 | `bun run a` | 1.5 s | pass |");
  expect(table).toContain("| 3 | `bun test` | 1.5 s | pass |");
  expect(table).toContain("Total: 4.5 s");
});

test("METRO-81 the first failure stops the chain, keeps its exit code and still prints the table", () => {
  const { deps, ran, out } = fake({ "node b.ts": 7 });
  const dir = manifestDir("bun run a && node b.ts && bun test && bun run z");
  try {
    expect(timedCheckMain({}, deps, dir)).toBe(7);
  } finally {
    rmSync(dir, { recursive: true });
  }
  expect(ran).toEqual(["bun run a", "node b.ts"]);
  const table = out.join("\n");
  expect(table).toContain("| 2 | `node b.ts` | 1.5 s | fail (exit 7) |");
  expect(table).toContain("| 3 | `bun test` | - | not run |");
  expect(table).toContain("| 4 | `bun run z` | - | not run |");
});

test("METRO-81 a command killed by a signal fails the chain with exit code 1", () => {
  const { deps, err, out } = fake({ "bun test": null });
  const dir = manifestDir("bun test && bun run z");
  try {
    expect(timedCheckMain({}, deps, dir)).toBe(1);
  } finally {
    rmSync(dir, { recursive: true });
  }
  expect(err.join("\n")).toContain("SIGKILL");
  expect(out.join("\n")).toContain("fail (SIGKILL)");
});

test("METRO-81 a command that cannot start fails the chain with exit code 127", () => {
  const dir = manifestDir("nonexistent-tool-metro81 && bun test");
  const { deps, err } = fake();
  const failing: Deps = {
    ...deps,
    run: () => ({ status: null, signal: null, error: new Error("spawn ENOENT") }),
  };
  try {
    expect(timedCheckMain({}, failing, dir)).toBe(127);
  } finally {
    rmSync(dir, { recursive: true });
  }
  expect(err.join("\n")).toContain("spawn ENOENT");
});

test("METRO-81 unsupported syntax or a missing check script runs nothing and exits 2", () => {
  for (const check of ["a || b", "a && b ; c", undefined, ""]) {
    const { deps, ran, err } = fake();
    const dir = manifestDir(check);
    try {
      expect(timedCheckMain({}, deps, dir)).toBe(2);
    } finally {
      rmSync(dir, { recursive: true });
    }
    expect(ran).toEqual([]);
    expect(err.join("\n")).toContain("timed-check");
  }
});

test("METRO-81 an unreadable package.json exits 2 without running anything", () => {
  const { deps, ran, err } = fake();
  const dir = mkdtempSync(join(tmpdir(), "metro-timed-"));
  try {
    expect(timedCheckMain({}, deps, dir)).toBe(2);
  } finally {
    rmSync(dir, { recursive: true });
  }
  expect(ran).toEqual([]);
  expect(err.join("\n")).toContain("package.json");
});

test("METRO-81 GITHUB_STEP_SUMMARY gets the table as markdown, on failure too", () => {
  const dir = manifestDir("bun run a && bun test");
  const summary = join(dir, "summary.md");
  try {
    const { deps } = fake({ "bun test": 3 });
    expect(timedCheckMain({ GITHUB_STEP_SUMMARY: summary }, deps, dir)).toBe(3);
    const text = readFileSync(summary, "utf8");
    expect(text).toContain("### Check chain timing");
    expect(text).toContain("| # | Command | Duration | Result |");
    expect(text).toContain("| 2 | `bun test` | 1.5 s | fail (exit 3) |");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("METRO-81 an unwritable summary file warns but never changes the verdict", () => {
  const dir = manifestDir("bun run a");
  const { deps, err } = fake();
  try {
    const missing = join(dir, "no-such-dir", "summary.md");
    expect(timedCheckMain({ GITHUB_STEP_SUMMARY: missing }, deps, dir)).toBe(0);
  } finally {
    rmSync(dir, { recursive: true });
  }
  expect(err.join("\n")).toContain("GITHUB_STEP_SUMMARY");
});

test("METRO-81 real processes: fail-fast, exit code and table (no shell, no mocks)", () => {
  const dir = mkdtempSync(join(tmpdir(), "metro-timed-"));
  try {
    writeFileSync(join(dir, "ok.js"), 'require("node:fs").writeFileSync("ok.flag", "1");\n');
    writeFileSync(join(dir, "fail.js"), "process.exit(9);\n");
    writeFileSync(join(dir, "never.js"), 'require("node:fs").writeFileSync("never.flag", "1");\n');
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ scripts: { check: "node ok.js && node fail.js && node never.js" } }),
    );
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    let code: number;
    let out: string[];
    try {
      code = timedCheckMain({}, {}, dir);
      out = log.mock.calls.map((call) => String(call[0]));
    } finally {
      log.mockRestore();
    }
    expect(code).toBe(9);
    expect(existsSync(join(dir, "ok.flag"))).toBe(true);
    expect(existsSync(join(dir, "never.flag"))).toBe(false);
    expect(out.join("\n")).toContain("| 2 | `node fail.js` |");
    expect(out.join("\n")).toContain("| 3 | `node never.js` | - | not run |");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("METRO-81 the default error output reports a refused chain", () => {
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const dir = manifestDir("a || b");
  try {
    expect(timedCheckMain({}, {}, dir)).toBe(2);
    expect(String(error.mock.calls[0]?.[0])).toContain("timed-check");
  } finally {
    error.mockRestore();
    rmSync(dir, { recursive: true });
  }
});

test("METRO-81 formatSeconds and formatTable render stable text", () => {
  expect(formatSeconds(0)).toBe("0.0 s");
  expect(formatSeconds(1234)).toBe("1.2 s");
  expect(formatSeconds(75_000)).toBe("1 m 15.0 s");
  const table = formatTable([{ command: "a", ms: 2000, result: "pass" }]);
  expect(table).toBe(
    "| # | Command | Duration | Result |\n| --- | --- | --- | --- |\n| 1 | `a` | 2.0 s | pass |\n\nTotal: 2.0 s",
  );
});

// package.json stays the one source of truth: the wrapper runs exactly the commands of `check`, in order,
// and the Checks job calls the wrapper instead of repeating the chain.
test("METRO-81 the wrapper runs exactly the commands in package.json check, so they cannot drift", () => {
  const manifest: unknown = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  if (!isRecord(manifest) || !isRecord(manifest["scripts"])) throw new Error("no scripts");
  const check = String(manifest["scripts"]["check"]);
  const { deps, ran } = fake();
  expect(timedCheckMain({}, deps, resolve("."))).toBe(0);
  expect(ran.join(" && ")).toBe(check.split(/\s+/u).join(" "));
  expect(ran.length).toBeGreaterThan(5);
  expect(manifest["scripts"]["check:timed"]).toBe("node scripts/timed-check.ts");
  expect(check).not.toContain("timed");
});

test("METRO-81 the Checks job runs the timed chain; the hooks run only the fast check (METRO-134)", () => {
  const workflow = readFileSync(resolve(".github/workflows/quality.yml"), "utf8");
  expect(workflow).toContain("      - name: Run all checks with per-command timing\n");
  expect(workflow).toContain("        run: bun run check:timed\n");
  expect(workflow).not.toMatch(/run: bun run check\s*$/mu);
  const hk = readFileSync(resolve("hk.pkl"), "utf8");
  // The full chain is CI-only now: no hook step may run it (METRO-134 D1).
  expect(hk).not.toContain('check = "bun run check"');
  expect(hk).toContain('check = "bun run check:fast"');
});

// The entrypoint and the `check:timed` wiring: run the real script with node against a temp package.json.
const CLI = resolve("scripts/timed-check.ts");
function runCli(check: string, files: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "metro-timed-cli-"));
  try {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { check } }));
    for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
    const result = Bun.spawnSync(["node", CLI], { cwd: dir });
    return {
      code: result.exitCode,
      out: result.stdout.toString(),
      err: result.stderr.toString(),
      never: existsSync(join(dir, "never.flag")),
    };
  } finally {
    rmSync(dir, { recursive: true });
  }
}

test("METRO-81 CLI: a passing chain exits 0 and prints the table", () => {
  const run = runCli("node ok.js", { "ok.js": "" });
  expect(run.code).toBe(0);
  expect(run.out).toContain("| 1 | `node ok.js` |");
});

test("METRO-81 CLI: a failing command's exit code is propagated, later commands do not run", () => {
  const run = runCli("node fail.js && node never.js", {
    "fail.js": "process.exit(5);",
    "never.js": 'require("node:fs").writeFileSync("never.flag", "1");',
  });
  expect(run.code).toBe(5);
  expect(run.never).toBe(false);
  expect(run.out).toContain("fail (exit 5)");
  expect(run.out).toContain("| 2 | `node never.js` | - | not run |");
});

test("METRO-81 CLI: unsupported syntax exits 2 and runs nothing", () => {
  const run = runCli("node ok.js || node never.js", {
    "ok.js": "",
    "never.js": 'require("node:fs").writeFileSync("never.flag", "1");',
  });
  expect(run.code).toBe(2);
  expect(run.never).toBe(false);
  expect(run.err).toContain("timed-check");
});
