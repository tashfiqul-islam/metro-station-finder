import { afterEach, expect, spyOn, test } from "bun:test";

import {
  checkCloudflareToken,
  cloudflareTokenCheckMain,
  EXPIRY_WARNING_DAYS,
  type TokenCheckConfig,
} from "./cloudflare-token-check";
import type { Deps, FetchedResponse } from "./release-sync";
import { expectRejection } from "./test-support";

const SECRET = "cfat_super-secret-token-value";
const ACCOUNT = "0123456789abcdef0123456789abcdef";
const NOW = new Date("2026-11-04T00:00:00Z");
const DAY = 86_400_000;
const ACCOUNT_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/tokens/verify`;
const USER_URL = "https://api.cloudflare.com/client/v4/user/tokens/verify";

const config: TokenCheckConfig = { token: SECRET, accountId: ACCOUNT, now: NOW };

const reply = (status: number, body: unknown = {}): FetchedResponse => ({
  status,
  ok: status >= 200 && status < 300,
  json: () => Promise.resolve(body),
  text: () => Promise.resolve(""),
});
const verified = (status: string, expiresInDays?: number): unknown => ({
  success: true,
  errors: [],
  messages: [],
  result: {
    id: "ed17574386854bf78a67040be0a770b0",
    status,
    ...(expiresInDays === undefined
      ? {}
      : { expires_on: new Date(NOW.getTime() + expiresInDays * DAY).toISOString() }),
  },
});

interface Harness {
  deps: Deps;
  logs: string[];
  calls: { url: string; auth: string | undefined }[];
}
function harness(routes: Record<string, () => FetchedResponse>): Harness {
  const logs: string[] = [];
  const calls: Harness["calls"] = [];
  return {
    logs,
    calls,
    deps: {
      log: (m) => logs.push(m),
      fetch: (url, init) => {
        calls.push({ url, auth: init?.headers?.["authorization"] });
        const route = routes[url];
        if (route === undefined) throw new Error(`unexpected request ${url}`);
        return Promise.resolve(route());
      },
    },
  };
}
const accountOnly = (res: () => FetchedResponse): Harness => harness({ [ACCOUNT_URL]: res });

async function failureOf(promise: Promise<unknown>): Promise<string> {
  const reason = await promise.then(
    () => null,
    (r: unknown) => r,
  );
  if (!(reason instanceof Error)) throw new Error("Expected an Error rejection");
  return reason.message;
}

afterEach(() => {
  process.exitCode = 0;
});

test("METRO-33 a valid token with a far expiry passes and reports the days left, not the token", async () => {
  const h = accountOnly(() => reply(200, verified("active", 29)));
  const result = await checkCloudflareToken(config, h.deps);
  expect(result).toEqual({ status: "active", daysRemaining: 29 });
  expect(h.calls).toEqual([{ url: ACCOUNT_URL, auth: `Bearer ${SECRET}` }]);
  expect(h.logs.join("\n")).toContain("29 days");
  expect(h.logs.join("\n")).not.toContain(SECRET);
});

test("METRO-33 a token with no expiry passes and says so", async () => {
  const h = accountOnly(() => reply(200, verified("active")));
  expect(await checkCloudflareToken(config, h.deps)).toEqual({
    status: "active",
    daysRemaining: null,
  });
  expect(h.logs.join("\n")).toContain("no expiry");
});

test("METRO-33 the warning window is 14 days and the boundary fails", async () => {
  expect(EXPIRY_WARNING_DAYS).toBe(14);
  const fifteen = accountOnly(() => reply(200, verified("active", 15)));
  await checkCloudflareToken(config, fifteen.deps);
  for (const days of [14, 13.5, 1]) {
    const h = accountOnly(() => reply(200, verified("active", days)));
    await expectRejection(checkCloudflareToken(config, h.deps), "within 14 days");
  }
});

test("METRO-33 an expiry date in the past fails even if the status says active", async () => {
  const h = accountOnly(() => reply(200, verified("active", -2)));
  await expectRejection(checkCloudflareToken(config, h.deps), "already expired");
});

test("METRO-33 expired and disabled tokens fail naming the status", async () => {
  for (const status of ["expired", "disabled"]) {
    const h = accountOnly(() => reply(200, verified(status, 100)));
    await expectRejection(checkCloudflareToken(config, h.deps), `status is "${status}"`);
  }
});

test("METRO-33 401 and 403 fail with the status code and without the secret", async () => {
  for (const status of [401, 403]) {
    const leaky = () => reply(status, { errors: [{ code: 1000, message: SECRET }] });
    const h = harness({ [ACCOUNT_URL]: leaky, [USER_URL]: leaky });
    const message = await failureOf(checkCloudflareToken(config, h.deps));
    expect(message).toContain(String(status));
    expect(message).not.toContain(SECRET);
    expect(h.logs.join("\n")).not.toContain(SECRET);
  }
});

test("METRO-33 a user-owned token that the account endpoint rejects is verified on the user endpoint", async () => {
  const h = harness({
    [ACCOUNT_URL]: () => reply(403),
    [USER_URL]: () => reply(200, verified("active", 60)),
  });
  expect(await checkCloudflareToken(config, h.deps)).toEqual({
    status: "active",
    daysRemaining: 60,
  });
  expect(h.calls.map((c) => c.url)).toEqual([ACCOUNT_URL, USER_URL]);
});

test("METRO-33 a server error does not fall back and fails with the status", async () => {
  const h = accountOnly(() => reply(503));
  await expectRejection(checkCloudflareToken(config, h.deps), "503");
  expect(h.calls).toHaveLength(1);
});

test("METRO-33 malformed responses fail visibly", async () => {
  const bodies: unknown[] = [
    null,
    "text",
    {},
    { success: false, errors: [{ code: 1000, message: "x" }], result: {} },
    { success: true },
    { success: true, result: { status: 5 } },
    { success: true, result: { status: "active", expires_on: "not a date" } },
    { success: true, result: { status: "active", expires_on: 5 } },
  ];
  for (const body of bodies) {
    const h = accountOnly(() => reply(200, body));
    await expectRejection(checkCloudflareToken(config, h.deps), "Cloudflare token verify");
  }
  const notJson = accountOnly(() => ({
    ...reply(200),
    json: () => Promise.reject(new Error(`bad json near ${SECRET}`)),
  }));
  const message = await failureOf(checkCloudflareToken(config, notJson.deps));
  expect(message).toContain("not JSON");
  expect(message).not.toContain(SECRET);
});

test("METRO-33 a network failure is reported without the secret", async () => {
  const deps: Deps = {
    log: () => {},
    fetch: () => Promise.reject(new Error(`connect failed with ${SECRET}`)),
  };
  const message = await failureOf(checkCloudflareToken(config, deps));
  expect(message).toContain("request failed");
  expect(message).not.toContain(SECRET);
  const odd: Deps = { log: () => {}, fetch: () => Promise.reject(new Error("plain")) };
  await expectRejection(checkCloudflareToken(config, odd), "request failed");
});

test("METRO-33 the entry point names a missing variable and sets a failing exit code", async () => {
  const errors = spyOn(console, "error").mockImplementation(() => {});
  try {
    for (const name of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]) {
      const env: Record<string, string | undefined> = {
        CLOUDFLARE_API_TOKEN: SECRET,
        CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
        [name]: "  ",
      };
      process.exitCode = 0;
      await cloudflareTokenCheckMain(env, accountOnly(() => reply(200)).deps, NOW);
      expect(process.exitCode).toBe(1);
      const text = errors.mock.calls.flat().join("\n");
      expect(text).toContain(`${name} is required`);
      expect(text).not.toContain(SECRET);
    }
  } finally {
    errors.mockRestore();
  }
});

test("METRO-33 the entry point defaults to the real fetch and console", async () => {
  const requests: string[] = [];
  const logs = spyOn(console, "log").mockImplementation(() => {});
  const fake = Object.assign(
    (input: string | Request | URL) => {
      requests.push(typeof input === "string" ? input : "non-string request");
      return Promise.resolve(Response.json(verified("active", 90)));
    },
    { preconnect: () => {} },
  );
  const network = spyOn(globalThis, "fetch").mockImplementation(fake);
  try {
    await cloudflareTokenCheckMain({
      CLOUDFLARE_API_TOKEN: SECRET,
      CLOUDFLARE_ACCOUNT_ID: ACCOUNT,
    });
    expect(process.exitCode).toBe(0);
    expect(requests).toEqual([ACCOUNT_URL]);
    expect(logs.mock.calls.flat().join("\n")).toContain("expires in");
  } finally {
    network.mockRestore();
    logs.mockRestore();
  }
});

test("METRO-33 the entry point passes on a good token and fails with a clear message on a bad one", async () => {
  const errors = spyOn(console, "error").mockImplementation(() => {});
  try {
    const env = { CLOUDFLARE_API_TOKEN: SECRET, CLOUDFLARE_ACCOUNT_ID: ACCOUNT };
    const ok = accountOnly(() => reply(200, verified("active", 90)));
    await cloudflareTokenCheckMain(env, ok.deps, NOW);
    expect(process.exitCode).toBe(0);
    const bad = accountOnly(() => reply(200, verified("active", 3)));
    await cloudflareTokenCheckMain(env, bad.deps, NOW);
    expect(process.exitCode).toBe(1);
    expect(errors.mock.calls.flat().join("\n")).toContain("3 days");
    expect(errors.mock.calls.flat().join("\n")).not.toContain(SECRET);
    const down: Deps = { log: () => {}, fetch: () => Promise.reject(new Error("x")) };
    await cloudflareTokenCheckMain(env, down, NOW);
    expect(process.exitCode).toBe(1);
  } finally {
    errors.mockRestore();
  }
});
