import { spawn } from "node:child_process";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";

/** The port every smoke consumer used before METRO-130; still the fallback when nothing resolved one. */
export const DEFAULT_SMOKE_PORT = 4173;

type Env = Readonly<Record<string, string | undefined>>;

/** A TCP port from 1024 to 65535 (no privileged ports) from text, or an Error that never echoes the value. */
export function parsePort(raw: string): number {
  const port = Number(raw);
  if (!/^\d+$/u.test(raw) || port < 1024 || port > 65_535) {
    throw new Error("SMOKE_PORT must be a whole number from 1024 to 65535");
  }
  return port;
}

/** The port the preview server, Playwright and the headers spec share: SMOKE_PORT, else the old default. */
export function smokePort(env: Env): number {
  const raw = env["SMOKE_PORT"];
  return raw === undefined || raw === "" ? DEFAULT_SMOKE_PORT : parsePort(raw);
}

/** The port of a listening server's address; a pipe, a string or nothing means the OS gave no port. */
export function portOf(address: string | AddressInfo | null): number {
  if (typeof address !== "object" || address === null) {
    throw new Error("the operating system did not report a free port");
  }
  return address.port;
}

/** Asks the OS for a free loopback port. Another process may take it before the caller binds it. */
export async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    return portOf(server.address());
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

/**
 * Resolves the run's port once: an explicit SMOKE_PORT wins, otherwise a free one is picked. The caller puts
 * the result in the children's environment, so they all see the same value. The window between picking and
 * binding is small, and the preview server uses strictPort: a clash fails the run loudly, never silently.
 */
export async function resolveSmokePort(env: Env): Promise<number> {
  const raw = env["SMOKE_PORT"];
  return raw === undefined || raw === "" ? freePort() : parsePort(raw);
}

/**
 * Runs `<runner> <cli> test ...args` with the resolved port in its environment; resolves with the exit code.
 * SIGINT and SIGTERM are forwarded to the child, and the parent waits for it, so a killed parent does not
 * leave Playwright and its preview server running on the port.
 */
export async function runSmoke(
  args: readonly string[],
  env: Env,
  cli: string,
  runner = "node",
): Promise<number> {
  const port = await resolveSmokePort(env);
  process.stderr.write(`smoke port ${port}\n`);
  return new Promise<number>((resolve, reject) => {
    const child = spawn(runner, [cli, "test", ...args], {
      env: { ...env, SMOKE_PORT: String(port) },
      stdio: "inherit",
    });
    const forward = (signal: NodeJS.Signals): void => {
      child.kill(signal);
    };
    const onInt = (): void => {
      forward("SIGINT");
    };
    const onTerm = (): void => {
      forward("SIGTERM");
    };
    const release = (): void => {
      process.off("SIGINT", onInt);
      process.off("SIGTERM", onTerm);
    };
    process.on("SIGINT", onInt);
    process.on("SIGTERM", onTerm);
    child.once("error", (error) => {
      release();
      reject(error);
    });
    child.once("close", (code) => {
      release();
      resolve(code ?? 1);
    });
  });
}

/** The CLI body: the exit code, with only a fixed message on stderr (anything else could carry a path or URL). */
export async function smokeMain(
  args: readonly string[],
  env: Env,
  cli: string,
  runner = "node",
): Promise<number> {
  try {
    return await runSmoke(args, env, cli, runner);
  } catch (error) {
    const known = error instanceof Error && error.message.startsWith("SMOKE_PORT must");
    process.stderr.write(`${known ? error.message : "the smoke run could not start"}\n`);
    return 1;
  }
}
