import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { isRecord } from "./guards";
import {
  DEFAULT_SMOKE_PORT,
  freePort,
  parsePort,
  portOf,
  resolveSmokePort,
  runSmoke,
  smokeMain,
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

function quietStderr() {
  return jest.spyOn(process.stderr, "write").mockImplementation(() => true);
}

/** A stand-in for the Playwright CLI, written to a temp file; its behaviour is chosen by the first argument. */
async function fakeCli(dir: string): Promise<string> {
  const cli = join(dir, "cli.mjs");
  await writeFile(
    cli,
    `const mode = process.argv[3];
if (mode === "--hang") setInterval(() => {}, 1000);
else process.exit(process.argv[2] === "test" && mode === "--x" && process.env.SMOKE_PORT === "4999" ? 0 : 3);`,
  );
  return cli;
}

test("METRO-130 parsePort accepts ports from 1024 to 65535 and rejects everything else", () => {
  expect(parsePort("1024")).toBe(1024);
  expect(parsePort("65535")).toBe(65_535);
  for (const bad of ["0", "80", "1023", "65536", "-1", "4173.5", "abc", "", "1e3", " 4173"]) {
    expect(() => parsePort(bad)).toThrow("SMOKE_PORT must be a whole number from 1024 to 65535");
  }
});

test("METRO-130 smokePort reads SMOKE_PORT and falls back to 4173 when it is unset or empty", () => {
  expect(smokePort({})).toBe(DEFAULT_SMOKE_PORT);
  expect(smokePort({ SMOKE_PORT: "" })).toBe(DEFAULT_SMOKE_PORT);
  expect(smokePort({ SMOKE_PORT: "5000" })).toBe(5000);
  expect(() => smokePort({ SMOKE_PORT: "nope" })).toThrow("SMOKE_PORT must");
});

test("METRO-130 portOf takes the port from an address and refuses a pipe, a string or nothing", () => {
  expect(portOf({ address: "127.0.0.1", family: "IPv4", port: 5555 })).toBe(5555);
  expect(() => portOf(null)).toThrow("did not report a free port");
  expect(() => portOf("/tmp/pipe")).toThrow("did not report a free port");
});

test("METRO-130 freePort returns an unprivileged port that is free until it is held", async () => {
  const port = await freePort();
  expect(port).toBeGreaterThanOrEqual(1024);
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  try {
    // A second server on the same port must fail: freePort handed out a port nobody held.
    const second = createServer();
    const clash = await new Promise<string>((resolve) => {
      second.once("error", (error: NodeJS.ErrnoException) => {
        resolve(error.code ?? "");
      });
      second.listen(port, "127.0.0.1", () => {
        resolve("bound");
      });
    });
    second.close();
    expect(clash).toBe("EADDRINUSE");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("METRO-130 resolveSmokePort honours an explicit port and otherwise picks a free one", async () => {
  expect(await resolveSmokePort({ SMOKE_PORT: "4999" })).toBe(4999);
  expect(await failure(resolveSmokePort({ SMOKE_PORT: "0" }))).toContain("SMOKE_PORT must");
  expect(await resolveSmokePort({})).toBeGreaterThanOrEqual(1024);
  expect(await resolveSmokePort({ SMOKE_PORT: "" })).toBeGreaterThanOrEqual(1024);
});

test("METRO-130 runSmoke hands the child the resolved port, prints it to stderr and returns the exit code", async () => {
  const dir = await mkdtemp(join(tmpdir(), "metro-smoke-port-"));
  const err = quietStderr();
  try {
    const cli = await fakeCli(dir);
    const env = { ...process.env, SMOKE_PORT: "4999" };
    expect(await runSmoke(["--x"], env, cli, process.execPath)).toBe(0);
    expect(await runSmoke(["--y"], env, cli, process.execPath)).toBe(3);
    expect(await runSmoke(["--x"], { ...env, SMOKE_PORT: undefined }, cli, process.execPath)).toBe(
      3,
    );
    expect(err).toHaveBeenCalledWith("smoke port 4999\n");
  } finally {
    err.mockRestore();
    await rm(dir, { recursive: true, force: true });
  }
});

test("METRO-130 runSmoke forwards SIGTERM and SIGINT to the child, waits for it and removes its listeners", async () => {
  const dir = await mkdtemp(join(tmpdir(), "metro-smoke-port-"));
  const err = quietStderr();
  try {
    const cli = await fakeCli(dir);
    const env = { ...process.env, SMOKE_PORT: "4999" };
    const before = [process.listenerCount("SIGTERM"), process.listenerCount("SIGINT")];
    for (const signal of ["SIGTERM", "SIGINT"] as const) {
      const run = runSmoke(["--hang"], env, cli, process.execPath);
      // Wait until the run has registered its listener, then give the child time to start.
      while (process.listenerCount(signal) === before[signal === "SIGTERM" ? 0 : 1]) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      process.emit(signal);
      // The child was killed by the forwarded signal, so the run ends (it would hang for good otherwise).
      expect(await run).toBe(1);
    }
    expect([process.listenerCount("SIGTERM"), process.listenerCount("SIGINT")]).toEqual(before);
  } finally {
    err.mockRestore();
    await rm(dir, { recursive: true, force: true });
  }
});

test("METRO-130 runSmoke rejects when the runner cannot be started", async () => {
  const err = quietStderr();
  try {
    const message = await failure(
      runSmoke([], { SMOKE_PORT: "4999" }, "cli.mjs", "metro-no-such-runner"),
    );
    expect(message).not.toBe("");
    expect(process.listenerCount("SIGTERM")).toBe(0);
  } finally {
    err.mockRestore();
  }
});

test("METRO-130 smokeMain returns the exit code and turns a failure into a fixed stderr line", async () => {
  const dir = await mkdtemp(join(tmpdir(), "metro-smoke-port-"));
  const err = quietStderr();
  try {
    const cli = await fakeCli(dir);
    expect(
      await smokeMain(["--x"], { ...process.env, SMOKE_PORT: "4999" }, cli, process.execPath),
    ).toBe(0);
    expect(await smokeMain([], { SMOKE_PORT: "80" }, cli)).toBe(1);
    expect(err).toHaveBeenCalledWith("SMOKE_PORT must be a whole number from 1024 to 65535\n");
    expect(await smokeMain([], { SMOKE_PORT: "4999" }, cli, "metro-no-such-runner")).toBe(1);
    expect(err).toHaveBeenCalledWith("the smoke run could not start\n");
  } finally {
    err.mockRestore();
    await rm(dir, { recursive: true, force: true });
  }
});

test("METRO-130 playwright.config.ts builds its origin from SMOKE_PORT", async () => {
  const saved = process.env["SMOKE_PORT"];
  try {
    process.env["SMOKE_PORT"] = "4999";
    const specifier = "../playwright.config.ts?port=4999";
    const loaded: unknown = await import(specifier);
    const config = JSON.stringify(isRecord(loaded) ? loaded["default"] : undefined);
    expect(config).toContain('"baseURL":"http://127.0.0.1:4999"');
    expect(config).toContain('"url":"http://127.0.0.1:4999"');
  } finally {
    if (saved === undefined) delete process.env["SMOKE_PORT"];
    else process.env["SMOKE_PORT"] = saved;
  }
});
