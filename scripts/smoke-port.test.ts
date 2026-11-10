import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_SMOKE_PORT,
  freePort,
  parsePort,
  resolveSmokePort,
  runSmoke,
  smokePort,
} from "./smoke-port";

/** The message a promise rejects with; an empty string means it did not reject. */
async function failure(work: Promise<unknown>): Promise<string> {
  try {
    await work;
    return "";
  } catch (error) {
    return error instanceof Error ? error.message : "not an Error";
  }
}

test("METRO-130 parsePort accepts whole ports and rejects everything else", () => {
  expect(parsePort("1")).toBe(1);
  expect(parsePort("65535")).toBe(65_535);
  for (const bad of ["0", "65536", "-1", "4173.5", "abc", "", "1e3", " 80"]) {
    expect(() => parsePort(bad)).toThrow("SMOKE_PORT must be a whole number from 1 to 65535");
  }
});

test("METRO-130 smokePort reads SMOKE_PORT and falls back to 4173 when it is unset or empty", () => {
  expect(smokePort({})).toBe(DEFAULT_SMOKE_PORT);
  expect(smokePort({ SMOKE_PORT: "" })).toBe(DEFAULT_SMOKE_PORT);
  expect(smokePort({ SMOKE_PORT: "5000" })).toBe(5000);
  expect(() => smokePort({ SMOKE_PORT: "nope" })).toThrow("SMOKE_PORT must");
});

test("METRO-130 freePort returns a bindable port, and not one that is held", async () => {
  const port = await freePort();
  expect(port).toBeGreaterThan(0);
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  try {
    expect(await freePort()).not.toBe(port);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("METRO-130 resolveSmokePort honours an explicit port and otherwise picks a free one", async () => {
  expect(await resolveSmokePort({ SMOKE_PORT: "4999" })).toBe(4999);
  expect(await failure(resolveSmokePort({ SMOKE_PORT: "0" }))).toContain("SMOKE_PORT must");
  expect(await resolveSmokePort({})).toBeGreaterThan(0);
  expect(await resolveSmokePort({ SMOKE_PORT: "" })).toBeGreaterThan(0);
});

test("METRO-130 runSmoke hands the child the resolved port and returns its exit code", async () => {
  const dir = await mkdtemp(join(tmpdir(), "metro-smoke-port-"));
  const out = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    const cli = join(dir, "cli.mjs");
    // Exit 0 only when run as `<cli> test --x` with SMOKE_PORT=4999; exit 3 otherwise; die by signal on --kill.
    await writeFile(
      cli,
      `if (process.argv[3] === "--kill") process.kill(process.pid, "SIGKILL");
process.exit(process.argv[2] === "test" && process.argv[3] === "--x" && process.env.SMOKE_PORT === "4999" ? 0 : 3);`,
    );
    const env = { ...process.env, SMOKE_PORT: "4999" };
    expect(await runSmoke(["--x"], env, cli, process.execPath)).toBe(0);
    expect(await runSmoke(["--y"], env, cli, process.execPath)).toBe(3);
    expect(await runSmoke(["--x"], { ...env, SMOKE_PORT: undefined }, cli, process.execPath)).toBe(
      3,
    );
    expect(out).toHaveBeenCalledWith("smoke port 4999\n");
    expect(await runSmoke(["--kill"], env, cli, process.execPath)).not.toBe(0);
  } finally {
    out.mockRestore();
    await rm(dir, { recursive: true, force: true });
  }
});

test("METRO-130 runSmoke rejects when the runner cannot be started", async () => {
  const out = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    expect(
      await failure(runSmoke([], { SMOKE_PORT: "4999" }, "cli.mjs", "metro-no-such-runner")),
    ).not.toBe("");
  } finally {
    out.mockRestore();
  }
});
