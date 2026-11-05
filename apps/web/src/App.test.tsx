// The DOM must exist before React and Testing Library are imported (shared, see dom-test-env.ts).
await import("./dom-test-env");
const { cleanup, render, screen } = await import("@testing-library/react");
const { App } = await import("./App");

const realFetch = globalThis.fetch;
const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
const ignoreResponse = (_response: Response): void => {};
const stubFetch = (handler: () => Promise<Response>) => {
  globalThis.fetch = Object.assign(handler, { preconnect: () => {} });
};

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("FND-T2 shows the loading state while the request is pending", () => {
  stubFetch(() => new Promise<Response>(() => {}));
  render(<App />);
  expect(screen.getByRole("heading", { name: "Metro scaffold" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Loading");
  expect(screen.queryByRole("alert")).toBeNull();
});

test("FND-T2 shows the validated status on success", async () => {
  stubFetch(() => Promise.resolve(json({ kind: "synthetic-scaffold", ready: true })));
  render(<App />);
  const output = await screen.findByLabelText("Scaffold status");
  expect(JSON.parse(output.textContent ?? "")).toEqual({ kind: "synthetic-scaffold", ready: true });
  expect(screen.queryByRole("alert")).toBeNull();
});

test("FND-T2 shows an alert for an HTTP error", async () => {
  stubFetch(() =>
    Promise.resolve(json({ error: { code: "internal_error", message: "x" } }, { status: 500 })),
  );
  render(<App />);
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("unavailable");
  expect(alert.textContent).toContain("HTTP 500");
  expect(screen.queryByLabelText("Scaffold status")).toBeNull();
});

test("FND-T2 shows an alert for a body that breaks the contract", async () => {
  stubFetch(() => Promise.resolve(json({ kind: "synthetic-scaffold", ready: false })));
  render(<App />);
  expect((await screen.findByRole("alert")).textContent).toContain("unavailable");
  expect(screen.queryByLabelText("Scaffold status")).toBeNull();
});

test("FND-T2 shows an alert for a network failure", async () => {
  stubFetch(() => Promise.reject(new TypeError("offline")));
  render(<App />);
  expect((await screen.findByRole("alert")).textContent).toContain("offline");
});

test("FND-T2 shows a generic message for a non-Error rejection", async () => {
  stubFetch(() => Promise.reject("boom"));
  render(<App />);
  expect((await screen.findByRole("alert")).textContent).toContain("Unknown error");
});

test("FND-T2 unmounting before the response arrives updates nothing and throws nothing", async () => {
  let deliver = ignoreResponse;
  stubFetch(
    () =>
      new Promise<Response>((resolve) => {
        deliver = resolve;
      }),
  );
  const errors = jest.spyOn(console, "error").mockImplementation(() => {});
  const view = render(<App />);
  view.unmount();
  deliver(json({ kind: "synthetic-scaffold", ready: true }));
  await new Promise((resolve) => setTimeout(resolve, 10));
  expect(document.body.textContent).toBe("");
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});
