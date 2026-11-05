import { domRegistered } from "./dom-test-env"; // the DOM must exist before React is imported

const { act } = await import("react");

const realFetch = globalThis.fetch;
let mounted: HTMLElement | undefined;
const signals: (AbortSignal | undefined)[] = [];

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  mounted?.remove(); // leave no rendered app behind for the next test file
  globalThis.fetch = realFetch;
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-58 main.tsx wraps the app in StrictMode (effects mount, clean up and mount again)", async () => {
  expect(domRegistered).toBe(true);
  const root = document.createElement("div");
  mounted = root;
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
  expect(root.querySelector("h1")?.textContent).toBe("Metro scaffold");
});
