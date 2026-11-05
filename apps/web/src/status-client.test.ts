import { fetchScaffoldStatus } from "./status-client";

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
const asFetch = (
  handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
): typeof fetch => Object.assign(handler, { preconnect: () => {} });
const stub = (response: Response) => asFetch(() => Promise.resolve(response));

test("FND-R4 the client returns a schema-valid status", async () => {
  const status = await fetchScaffoldStatus(stub(json({ kind: "synthetic-scaffold", ready: true })));
  expect(status).toEqual({ kind: "synthetic-scaffold", ready: true });
});

test("FND-R4 the client requests the contract route with a JSON accept header", async () => {
  let seen: { url: string; accept: string | null } | undefined;
  const spy = asFetch((input, init) => {
    seen = {
      url: typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      accept: new Headers(init?.headers).get("accept"),
    };
    return Promise.resolve(json({ kind: "synthetic-scaffold", ready: true }));
  });
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
    const outcome = await fetchScaffoldStatus(stub(response)).then(
      () => "fulfilled",
      () => "rejected",
    );
    expect(outcome).toBe("rejected");
  });
}

test("FND-R4 a network failure rejects", async () => {
  const failing = asFetch(() => Promise.reject(new TypeError("offline")));
  const reason = await fetchScaffoldStatus(failing).then(
    () => null,
    (error: unknown) => error,
  );
  expect(reason instanceof Error ? reason.message : "did not reject with an Error").toContain(
    "offline",
  );
});
