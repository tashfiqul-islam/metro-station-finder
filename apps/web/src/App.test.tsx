// The DOM must exist before React and Testing Library are imported (shared, see dom-test-env.ts).
const { restoreBunGlobals, enableDomGlobals } = await import("./dom-test-env");
enableDomGlobals();
const { cleanup, render, screen } = await import("@testing-library/react");
const { App } = await import("./App");
const { errorCopy } = await import("./error-boundary");
restoreBunGlobals(); // non-DOM test files must see Bun's globals again

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
  enableDomGlobals();
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});
afterAll(() => {
  restoreBunGlobals();
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
  expect(alert.textContent).toBe(errorCopy.statusUnavailable);
  expect(alert.textContent).not.toContain("HTTP 500");
  expect(screen.queryByLabelText("Scaffold status")).toBeNull();
});

test("FND-T2 shows an alert for a body that breaks the contract", async () => {
  stubFetch(() => Promise.resolve(json({ kind: "synthetic-scaffold", ready: false })));
  render(<App />);
  expect((await screen.findByRole("alert")).textContent).toBe(errorCopy.statusUnavailable);
  expect(screen.queryByLabelText("Scaffold status")).toBeNull();
});

test("FND-T2 shows the fixed copy for a network failure", async () => {
  stubFetch(() => Promise.reject(new TypeError("offline")));
  render(<App />);
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toBe(errorCopy.statusUnavailable);
  expect(alert.textContent).not.toContain("offline");
});

test("FND-T2 shows the fixed copy for a non-Error rejection", async () => {
  stubFetch(() => Promise.reject("boom"));
  render(<App />);
  expect((await screen.findByRole("alert")).textContent).toBe(errorCopy.statusUnavailable);
});

test("METRO-71 never renders or logs a raw error message (URL, coordinates)", async () => {
  const secret = "https://example.test/route?lat=23.8103&lng=90.4125 failed for 23.8103,90.4125";
  stubFetch(() => Promise.reject(new TypeError(secret)));
  const spies = (["error", "warn", "log", "info", "debug"] as const).map((method) =>
    jest.spyOn(console, method).mockImplementation(() => {}),
  );
  render(<App />);
  const alert = await screen.findByRole("alert");
  const rendered = document.body.textContent ?? "";
  for (const fragment of ["example.test", "https://", "23.8103", "90.4125", "lat=", "lng="]) {
    expect(rendered).not.toContain(fragment);
  }
  expect(alert.textContent).toBe(errorCopy.statusUnavailable);
  for (const spy of spies) {
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  }
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
