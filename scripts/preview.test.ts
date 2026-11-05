import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  countDeployments,
  extractWorkerUrl,
  missingSecrets,
  previewMain,
  previewWorkerName,
  runPreviewCli,
  secretsMessage,
  smokePreview,
} from "./preview";
import { expectRejection } from "./test-support";

const SHA = "0123456789abcdef0123456789abcdef01234567";
const base = "https://metro-scaffold-pr-7.example.workers.dev";

interface Routes {
  page?: Response;
  status?: Response;
  missing?: Response;
}
const headersOf = (extra: Record<string, string> = {}): Record<string, string> => ({
  "content-type": "application/json",
  "x-request-id": "request-id-1",
  "x-preview-sha": SHA,
  ...extra,
});
const urlOf = (input: string | URL | Request): string =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
const down = () => Promise.reject(new TypeError("ENOTFOUND"));
const good = (): Required<Routes> => ({
  page: new Response("<html></html>", { headers: { "content-type": "text/html" } }),
  status: new Response(JSON.stringify({ kind: "synthetic-scaffold", ready: true }), {
    headers: headersOf(),
  }),
  missing: new Response(JSON.stringify({ error: { code: "not_found", message: "x" } }), {
    status: 404,
    headers: headersOf(),
  }),
});
const serve = (routes: Routes) => {
  const table = { ...good(), ...routes };
  return (input: string) =>
    Promise.resolve(
      input.endsWith("/api/scaffold/status")
        ? table.status.clone()
        : input.endsWith("/api/does-not-exist")
          ? table.missing.clone()
          : table.page.clone(),
    );
};
const fast = { attempts: 1, delayMs: 0 };

test("METRO-13 worker names accept only positive integers", () => {
  expect(previewWorkerName("7")).toBe("metro-scaffold-pr-7");
  for (const bad of ["", "0", "07", "-1", "1; rm", "1.5", "abc", "1234567890"])
    expect(() => previewWorkerName(bad)).toThrow("positive integer");
});

test("METRO-13 missing or blank secrets are named in an actionable message", () => {
  expect(missingSecrets({ CLOUDFLARE_API_TOKEN: "a", CLOUDFLARE_ACCOUNT_ID: "b" })).toEqual([]);
  const missing = missingSecrets({ CLOUDFLARE_API_TOKEN: "  ", CLOUDFLARE_ACCOUNT_ID: undefined });
  expect(missing).toEqual(["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID"]);
  expect(secretsMessage(missing)).toContain('environment "preview"');
  expect(secretsMessage(["CLOUDFLARE_ACCOUNT_ID"])).toContain("CLOUDFLARE_ACCOUNT_ID");
});

test("METRO-13 the URL must belong to the Worker that was deployed", () => {
  const output = `Uploaded\nhttps://other.acct.workers.dev\nhttps://metro-scaffold-pr-7.acct.workers.dev\n`;
  expect(extractWorkerUrl(output, "metro-scaffold-pr-7")).toBe(
    "https://metro-scaffold-pr-7.acct.workers.dev",
  );
  expect(() => extractWorkerUrl("no url here", "metro-scaffold-pr-7")).toThrow(
    "No workers.dev URL",
  );
  expect(() => extractWorkerUrl("https://other.acct.workers.dev", "metro-scaffold-pr-7")).toThrow(
    "No workers.dev URL",
  );
});

test("METRO-13 smoke passes for a healthy preview serving the checked commit", async () => {
  const requested: string[] = [];
  const recording = (input: string) => {
    requested.push(input);
    return serve({})(input);
  };
  await smokePreview(base, SHA, { ...fast, fetch: recording });
  expect(requested).toEqual([
    `${base}/`,
    `${base}/api/scaffold/status`,
    `${base}/api/does-not-exist`,
  ]);
  requested.length = 0;
  await smokePreview(`${base}/`, undefined, { ...fast, fetch: recording });
  expect(requested).toEqual([
    `${base}/`,
    `${base}/api/scaffold/status`,
    `${base}/api/does-not-exist`,
  ]);
});

test("METRO-13 smoke fails visibly for each broken observation", async () => {
  const cases: [string, Routes, string][] = [
    ["page 500", { page: new Response("", { status: 500 }) }, "GET / returned 500"],
    [
      "page not HTML",
      { page: new Response("{}", { headers: { "content-type": "application/json" } }) },
      "did not return HTML",
    ],
    ["status 503", { status: new Response("", { status: 503 }) }, "returned 503"],
    [
      "contract drift",
      {
        status: new Response(JSON.stringify({ kind: "synthetic-scaffold", ready: false }), {
          headers: headersOf(),
        }),
      },
      "",
    ],
    [
      "no request id",
      {
        status: new Response(JSON.stringify({ kind: "synthetic-scaffold", ready: true }), {
          headers: { "content-type": "application/json", "x-preview-sha": SHA },
        }),
      },
      "no x-request-id",
    ],
    [
      "wrong sha",
      {
        status: new Response(JSON.stringify({ kind: "synthetic-scaffold", ready: true }), {
          headers: headersOf({ "x-preview-sha": "f".repeat(40) }),
        }),
      },
      "expected the checked commit",
    ],
    ["unknown route 200", { missing: new Response("{}", { status: 200 }) }, "not 404"],
    ["404 without envelope", { missing: new Response('{"x":1}', { status: 404 }) }, ""],
  ];
  for (const [, routes, message] of cases)
    await expectRejection(
      smokePreview(base, SHA, { ...fast, fetch: serve(routes) }),
      message === "" ? "Smoke failed after 1 attempts" : message,
    );
});

test("METRO-13 smoke retries a not-yet-resolvable hostname and then succeeds", async () => {
  let calls = 0;
  const healthy = serve({});
  const flaky = (input: string) => {
    calls += 1;
    return calls <= 2 ? Promise.reject(new TypeError("ENOTFOUND")) : healthy(input);
  };
  await smokePreview(base, SHA, { attempts: 3, delayMs: 0, fetch: flaky });
  expect(calls).toBeGreaterThan(3);
});

test("METRO-13 smoke gives up after the attempts and keeps the cause", async () => {
  await expectRejection(
    smokePreview(base, SHA, { attempts: 2, delayMs: 0, fetch: down }),
    "after 2 attempts",
  );
});

test("METRO-13 previewMain prints, records step outputs and fails the step on error", async () => {
  const log = jest.spyOn(console, "log").mockImplementation(() => {});
  const error = jest.spyOn(console, "error").mockImplementation(() => {});
  const directory = await mkdtemp(join(tmpdir(), "metro-preview-main-"));
  const previous = process.exitCode;
  process.exitCode = 0;
  try {
    const output = join(directory, "output");
    await previewMain(["name"], { PR_NUMBER: "9", GITHUB_OUTPUT: output });
    expect(await readFile(output, "utf8")).toBe("name=metro-scaffold-pr-9\n");
    await previewMain(["secrets"], { CLOUDFLARE_API_TOKEN: "a", CLOUDFLARE_ACCOUNT_ID: "b" });
    expect(process.exitCode).toBe(0);
    await previewMain(["secrets"], {});
    expect(process.exitCode).toBe(1);
    expect(String(error.mock.calls[0]?.[0])).toContain("Missing");
    await previewMain(["bogus"], {});
    expect(error).toHaveBeenLastCalledWith('Unknown command "bogus"');
    expect(log).toHaveBeenCalledWith("metro-scaffold-pr-9");
  } finally {
    process.exitCode = previous ?? 0;
    log.mockRestore();
    error.mockRestore();
    await rm(directory, { recursive: true, force: true });
  }
});

test("METRO-13 the smoke command uses the network fetch and reports the URL", async () => {
  const realFetch = globalThis.fetch;
  // Reflect.set: Bun's and Node's Response types differ, and this stub only needs to behave like fetch.
  Reflect.set(
    globalThis,
    "fetch",
    Object.assign((input: string | URL | Request) => serve({})(urlOf(input)), {
      preconnect: () => {},
    }),
  );
  try {
    expect(await runPreviewCli(["smoke", base, SHA], {})).toContain(base);
  } finally {
    Reflect.set(globalThis, "fetch", realFetch);
  }
});

test("METRO-13 the CLI runs each command and rejects unknown ones", async () => {
  await expectRejection(runPreviewCli(["secrets"], {}), "Missing");
  expect(
    await runPreviewCli(["secrets"], { CLOUDFLARE_API_TOKEN: "a", CLOUDFLARE_ACCOUNT_ID: "b" }),
  ).toContain("present");
  expect(await runPreviewCli(["name"], { PR_NUMBER: "12" })).toBe("metro-scaffold-pr-12");
  await expectRejection(runPreviewCli(["name"], {}), "positive integer");
  await expectRejection(runPreviewCli(["bogus"], {}), "Unknown command");
  await expectRejection(runPreviewCli([], {}), "Unknown command");
  await expectRejection(runPreviewCli(["url"], {}), "usage");
  await expectRejection(runPreviewCli(["smoke"], {}), "usage");
  const directory = await mkdtemp(join(tmpdir(), "metro-preview-"));
  try {
    const file = join(directory, "deploy.log");
    await writeFile(file, "ok https://metro-scaffold-pr-3.acct.workers.dev done");
    expect(await runPreviewCli(["url", file, "metro-scaffold-pr-3"], {})).toBe(
      "https://metro-scaffold-pr-3.acct.workers.dev",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("METRO-13 deployments are counted from a JSON array and anything else fails", async () => {
  expect(countDeployments("[]")).toBe(0);
  expect(countDeployments('[{"id":"a"},{"id":"b"}]')).toBe(2);
  expect(() => countDeployments('{"id":"a"}')).toThrow("JSON array");
  expect(() => countDeployments("not json")).toThrow("JSON");
  await expectRejection(runPreviewCli(["deployments"], {}), "usage");
  const directory = await mkdtemp(join(tmpdir(), "metro-preview-count-"));
  try {
    const file = join(directory, "deployments.json");
    await writeFile(file, '[{"id":"a"},{"id":"b"}]');
    expect(await runPreviewCli(["deployments", file], {})).toBe("2");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
