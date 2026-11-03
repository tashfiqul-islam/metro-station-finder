import { expect, test } from "bun:test";
import { fetchScaffoldStatus } from "./status-client";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
const stub = (response: Response) => (() => Promise.resolve(response)) as unknown as typeof fetch;

test("FND-R4 the client returns a schema-valid status", async () => {
  const status = await fetchScaffoldStatus(stub(json({ kind: "synthetic-scaffold", ready: true })));
  expect(status).toEqual({ kind: "synthetic-scaffold", ready: true });
});

test("FND-R4 the client requests the contract route with a JSON accept header", async () => {
  let seen: { url: string; accept: string | null } | undefined;
  const spy = ((input: string, init?: RequestInit) => {
    seen = { url: String(input), accept: new Headers(init?.headers).get("accept") };
    return Promise.resolve(json({ kind: "synthetic-scaffold", ready: true }));
  }) as unknown as typeof fetch;
  await fetchScaffoldStatus(spy);
  expect(seen).toEqual({ url: "/api/scaffold/status", accept: "application/json" });
});

for (const [name, response] of [
  ["ready: false", json({ kind: "synthetic-scaffold", ready: false })],
  ["missing kind", json({ ready: true })],
  ["extra field", json({ kind: "synthetic-scaffold", ready: true, extra: 1 })],
  ["HTTP 500 envelope", json({ error: { code: "internal_error", message: "x" } }, { status: 500 })],
  [
    "SPA HTML fallback",
    new Response("<!doctype html>", { headers: { "content-type": "text/html" } }),
  ],
  ["invalid JSON", new Response("{", { headers: { "content-type": "application/json" } })],
] as const) {
  test(`FND-R4 the client rejects: ${name}`, async () => {
    await expect(fetchScaffoldStatus(stub(response))).rejects.toThrow();
  });
}

test("FND-R4 a network failure rejects", async () => {
  const failing = (() => Promise.reject(new TypeError("offline"))) as unknown as typeof fetch;
  await expect(fetchScaffoldStatus(failing)).rejects.toThrow("offline");
});
