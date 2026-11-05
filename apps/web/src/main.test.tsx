import { restoreBunGlobals, enableDomGlobals } from "./dom-test-env"; // the DOM must exist before React is imported

const { act } = await import("react");
const { ErrorBoundary } = await import("./error-boundary");
restoreBunGlobals(); // non-DOM test files must see Bun's globals again

const realFetch = globalThis.fetch;
let mounted: HTMLElement | undefined;
const signals: (AbortSignal | undefined)[] = [];

beforeAll(() => {
  enableDomGlobals();
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  mounted?.remove(); // leave no rendered app behind for the next test file
  globalThis.fetch = realFetch;
});
afterAll(() => {
  restoreBunGlobals();
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-58 main.tsx wraps the app in StrictMode (effects mount, clean up and mount again)", async () => {
  const root = document.createElement("div");
  mounted = root;
  const renderSpy = jest.spyOn(ErrorBoundary.prototype, "render");
  root.id = "root";
  document.body.append(root);
  globalThis.fetch = Object.assign(
    (_input: unknown, init?: RequestInit) => {
      signals.push(init?.signal ?? undefined);
      return new Promise<Response>(() => {});
    },
    { preconnect: () => {} },
  );
  await act(async () => {
    await import("./main");
  });
  // Development StrictMode runs each effect, its cleanup, then the effect again.
  expect(signals).toHaveLength(2);
  expect(signals[0]?.aborted).toBe(true);
  expect(signals[1]?.aborted).toBe(false);
  // StrictMode must wrap the boundary too: dev StrictMode renders every class component it contains
  // twice, so a StrictMode placed only inside the boundary would leave this at 1.
  expect(renderSpy).toHaveBeenCalledTimes(2);
  renderSpy.mockRestore();
  expect(root.querySelector("h1")?.textContent).toBe("Metro scaffold");
});
