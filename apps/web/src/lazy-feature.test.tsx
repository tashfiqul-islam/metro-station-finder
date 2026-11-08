import { act } from "react";
import { createRoot } from "react-dom/client";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  test,
  vi,
  type MockInstance,
} from "vitest";

import { lazyCopy, lazyFeature } from "./lazy-feature";
import { rootErrorOptions } from "./report-error";

const LEAK = "Failed to fetch dynamically imported module: https://example.test/a.js?lat=23.81";

function Feature({ name }: { readonly name: string }) {
  return <p>Loaded {name}</p>;
}

type Root = ReturnType<typeof createRoot>;
let container: HTMLElement;
let root: Root;
let errorSpy: MockInstance<typeof console.error>;

const settle = () => act(async () => {});
const status = () => container.querySelector("output");
const failure = () => container.querySelector<HTMLElement>("section");
const reloadButton = () => container.querySelector("button");

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-104 a resolved chunk renders the feature with its props", async () => {
  const Lazy = lazyFeature(() => Promise.resolve({ default: Feature }));
  await act(async () => {
    root.render(<Lazy name="station" />);
  });
  await settle();
  expect(container.textContent).toBe("Loaded station");
  expect(status()).toBeNull();
  expect(failure()).toBeNull();
});

test("METRO-104 while the chunk is pending a fixed polite status shows, then the feature replaces it", async () => {
  const gate = { release: (_module: { default: typeof Feature }): void => {} };
  const Lazy = lazyFeature(
    () =>
      new Promise<{ default: typeof Feature }>((resolve) => {
        gate.release = resolve;
      }),
  );
  await act(async () => {
    root.render(<Lazy name="late" />);
  });
  expect(status()?.textContent).toBe(lazyCopy.loading);
  expect(container.querySelector("svg, [aria-busy], [class]")).toBeNull();
  expect(container.textContent).not.toContain("Loaded");
  await act(async () => {
    gate.release({ default: Feature });
  });
  expect(status()).toBeNull();
  expect(container.textContent).toBe("Loaded late");
});

const LEAKS = ["example.test", "lat=", "23.81", "Failed to fetch"];

test("METRO-104 a rejected import shows the fixed failure copy and never the error text", async () => {
  const Lazy = lazyFeature<{ name: string }>(() => Promise.reject(new TypeError(LEAK)));
  await act(async () => {
    root.render(<Lazy name="x" />);
  });
  await settle();
  const region = failure();
  expect(region?.textContent).toContain(lazyCopy.failed);
  expect(region?.getAttribute("aria-label")).toBe(lazyCopy.failed);
  expect(document.activeElement).toBe(region);
  const shown = container.textContent ?? "";
  for (const fragment of LEAKS) expect(shown).not.toContain(fragment);
  // The only log is the root callback's safe class name.
  const logged = JSON.stringify(errorSpy.mock.calls);
  expect(logged).toContain("TypeError");
  for (const fragment of LEAKS) expect(logged).not.toContain(fragment);
});

test("METRO-104 the button reloads the page and makes no second import attempt", async () => {
  const load = vi.fn<() => Promise<{ default: typeof Feature }>>(() =>
    Promise.reject(new TypeError(LEAK)),
  );
  const reload = vi.fn();
  const Lazy = lazyFeature(load, reload);
  await act(async () => {
    root.render(<Lazy name="again" />);
  });
  await settle();
  expect(load).toHaveBeenCalledTimes(1);
  expect(reload).not.toHaveBeenCalled();
  await act(async () => {
    reloadButton()?.click();
  });
  await settle();
  expect(reload).toHaveBeenCalledTimes(1);
  expect(load).toHaveBeenCalledTimes(1);
  expect(failure()).not.toBeNull();
});

test("METRO-104 the default reload is window.location.reload", async () => {
  const reload = vi.fn();
  vi.stubGlobal("location", { reload });
  const Lazy = lazyFeature<{ name: string }>(() => Promise.reject(new TypeError(LEAK)));
  await act(async () => {
    root.render(<Lazy name="x" />);
  });
  await settle();
  await act(async () => {
    reloadButton()?.click();
  });
  expect(reload).toHaveBeenCalledTimes(1);
  vi.unstubAllGlobals();
});

test("METRO-104 roles and keyboard: focus lands on one named region, not an alert, and the button is native", async () => {
  const Lazy = lazyFeature<{ name: string }>(() => Promise.reject(new TypeError(LEAK)));
  await act(async () => {
    root.render(<Lazy name="x" />);
  });
  await settle();
  const button = reloadButton();
  expect(button?.tagName).toBe("BUTTON");
  expect(button?.getAttribute("type")).toBe("button");
  expect(button?.textContent).toBe(lazyCopy.reload);
  button?.focus();
  expect(document.activeElement).toBe(button);
  expect(failure()?.getAttribute("tabindex")).toBe("-1");
  // One announcement path only: moved focus, no live region.
  expect(container.querySelector('[role="alert"], [aria-live]')).toBeNull();
  expect(container.querySelectorAll("output")).toHaveLength(0);
});

test("METRO-104 two mounts of one lazy feature share the loaded chunk", async () => {
  const load = vi.fn(() => Promise.resolve({ default: Feature }));
  const Lazy = lazyFeature(load);
  await act(async () => {
    root.render(
      <>
        <Lazy name="one" />
        <Lazy name="two" />
      </>,
    );
  });
  await settle();
  expect(load).toHaveBeenCalledTimes(1);
  expect(container.textContent).toBe("Loaded oneLoaded two");
});
