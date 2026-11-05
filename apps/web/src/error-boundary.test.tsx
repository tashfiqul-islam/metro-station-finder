// The DOM must exist before React is imported (shared registration, see dom-test-env.ts).
const { restoreBunGlobals, enableDomGlobals } = await import("./dom-test-env");
enableDomGlobals();
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ErrorBoundary } = await import("./error-boundary");
const { rootErrorOptions } = await import("./report-error");
restoreBunGlobals(); // non-DOM test files must see Bun's globals again

const LEAK = "lat=23.81 lng=90.41 https://example.test/stations?lat=23.81&lng=90.41";
let shouldThrow = true;
function Bomb() {
  if (shouldThrow) throw new TypeError(LEAK);
  return <p>Recovered content</p>;
}

type Root = ReturnType<typeof createRoot>;
let container: HTMLElement;
let root: Root;
let errorSpy: ReturnType<typeof jest.spyOn<Console, "error">>;

async function mount() {
  await act(async () => {
    root.render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
  });
}
const alert = () => container.querySelector<HTMLElement>('[role="alert"]');
const retryButton = () => container.querySelector("button");

beforeAll(() => {
  enableDomGlobals();
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
beforeEach(() => {
  shouldThrow = true;
  // Keep the (safe) report out of the test output; assertions read the spy.
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container, rootErrorOptions);
});
afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  errorSpy.mockRestore();
});
afterAll(() => {
  restoreBunGlobals();
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-58 renders children when nothing throws", async () => {
  shouldThrow = false;
  await mount();
  expect(container.textContent).toBe("Recovered content");
  expect(alert()).toBeNull();
});

test("METRO-58 shows a named alert with a retry button and focuses the alert", async () => {
  await mount();
  const region = alert();
  expect(region?.getAttribute("aria-labelledby")).toBe("error-heading");
  expect(container.querySelector("#error-heading")?.textContent).toBe("Something went wrong");
  expect(document.activeElement).toBe(region);
  expect(retryButton()?.textContent).toBe("Try again");
  expect(retryButton()?.getAttribute("type")).toBe("button");
  expect(container.textContent).not.toContain("Recovered content");
});

test("METRO-58 the fallback does not echo the error message, coordinates or URL", async () => {
  await mount();
  const text = container.textContent ?? "";
  expect(text).not.toContain("23.81");
  expect(text).not.toContain("example.test");
  expect(text).not.toContain("lat=");
});

test("METRO-58 the report logs only the error class, never the message", async () => {
  await mount();
  expect(errorSpy).toHaveBeenCalledWith("Render error: TypeError");
  const logged = JSON.stringify(errorSpy.mock.calls);
  expect(logged).not.toContain("23.81");
  expect(logged).not.toContain("example.test");
  expect(logged).not.toContain("lat=");
});

test("METRO-58 retry re-renders the children and can recover", async () => {
  await mount();
  shouldThrow = false;
  await act(async () => {
    retryButton()?.click();
  });
  expect(container.textContent).toBe("Recovered content");
  expect(alert()).toBeNull();
});

test("METRO-58 retry shows the fallback again when the child still throws", async () => {
  await mount();
  await act(async () => {
    retryButton()?.click();
  });
  expect(alert()).not.toBeNull();
  expect(document.activeElement).toBe(alert());
});

test("METRO-58 an uncaught and a recoverable error are reported the same safe way", () => {
  const info = { componentStack: "in Bomb" };
  rootErrorOptions.onUncaughtError?.(new RangeError(LEAK), info);
  rootErrorOptions.onRecoverableError?.(new Error(LEAK), info);
  const logged = JSON.stringify(errorSpy.mock.calls);
  expect(logged).toContain("Render error: RangeError");
  expect(logged).toContain("Recoverable error: Error");
  expect(logged).not.toContain("Render error: Error");
  expect(logged).not.toContain("23.81");
  expect(logged).not.toContain("in Bomb");
});
