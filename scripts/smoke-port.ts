import { spawn } from "node:child_process";
import { createServer } from "node:net";

/** The port every smoke consumer used before METRO-130; still the fallback when nothing resolved one. */
export const DEFAULT_SMOKE_PORT = 4173;

type Env = Readonly<Record<string, string | undefined>>;

/** A TCP port from text, or an Error naming the variable (never the offending value). */
export function parsePort(raw: string): number {
  const port = Number(raw);
  if (!/^\d+$/u.test(raw) || port < 1 || port > 65_535) {
    throw new Error("SMOKE_PORT must be a whole number from 1 to 65535");
  }
  return port;
}

/** The port the preview server, Playwright and the headers spec share: SMOKE_PORT, else the old default. */
export function smokePort(env: Env): number {
  const raw = env["SMOKE_PORT"];
  return raw === undefined || raw === "" ? DEFAULT_SMOKE_PORT : parsePort(raw);
}

/** Asks the OS for a free loopback port. Another process may take it before the caller binds it. */
export async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
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

/** Runs `<runner> <cli> test ...args` with the resolved port in its environment; resolves with the exit code. */
export async function runSmoke(
  args: readonly string[],
  env: Env,
  cli: string,
  runner = "node",
): Promise<number> {
  const port = await resolveSmokePort(env);
  process.stdout.write(`smoke port ${port}\n`);
  return new Promise<number>((resolve, reject) => {
    const child = spawn(runner, [cli, "test", ...args], {
      env: { ...env, SMOKE_PORT: String(port) },
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve(code ?? 1);
    });
  });
}
