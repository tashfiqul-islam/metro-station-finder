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
const alert = () => container.querySelector<HTMLElement>('[role="alert"]');
const retryButton = () => container.querySelector("button");

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
  expect(alert()).toBeNull();
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

test("METRO-104 a rejected import shows the fixed failure copy and never the error text", async () => {
  const Lazy = lazyFeature<{ name: string }>(() => Promise.reject(new TypeError(LEAK)));
  await act(async () => {
    root.render(<Lazy name="x" />);
  });
  await settle();
  const region = alert();
  expect(region?.textContent).toContain(lazyCopy.failed);
  expect(document.activeElement).toBe(region);
  const shown = container.textContent ?? "";
  for (const fragment of ["example.test", "lat=", "23.81", "Failed to fetch"])
    expect(shown).not.toContain(fragment);
  // The only log is the root callback's safe class name.
  const logged = JSON.stringify(errorSpy.mock.calls);
  expect(logged).toContain("TypeError");
  for (const fragment of ["example.test", "lat=", "23.81", "Failed to fetch"])
    expect(logged).not.toContain(fragment);
});

test("METRO-104 Retry asks the loader again and shows the feature when the second attempt works", async () => {
  const load = vi
    .fn<() => Promise<{ default: typeof Feature }>>()
    .mockRejectedValueOnce(new TypeError(LEAK))
    .mockResolvedValueOnce({ default: Feature });
  const Lazy = lazyFeature(load);
  await act(async () => {
    root.render(<Lazy name="again" />);
  });
  await settle();
  expect(alert()).not.toBeNull();
  expect(load).toHaveBeenCalledTimes(1);
  await act(async () => {
    retryButton()?.click();
  });
  await settle();
  expect(load).toHaveBeenCalledTimes(2);
  expect(alert()).toBeNull();
  expect(container.textContent).toBe("Loaded again");
});

test("METRO-104 a second failure shows the failure copy again, one attempt per click", async () => {
  const load = vi.fn<() => Promise<{ default: typeof Feature }>>(() =>
    Promise.reject(new TypeError(LEAK)),
  );
  const Lazy = lazyFeature(load);
  await act(async () => {
    root.render(<Lazy name="down" />);
  });
  await settle();
  await act(async () => {
    retryButton()?.click();
  });
  await settle();
  expect(load).toHaveBeenCalledTimes(2);
  expect(alert()?.textContent).toContain(lazyCopy.failed);
  expect(document.activeElement).toBe(alert());
});

test("METRO-104 roles and keyboard: the failure is an alert, Retry is a focusable button of type button", async () => {
  const Lazy = lazyFeature<{ name: string }>(() => Promise.reject(new TypeError(LEAK)));
  await act(async () => {
    root.render(<Lazy name="x" />);
  });
  await settle();
  const button = retryButton();
  expect(button?.getAttribute("type")).toBe("button");
  expect(button?.textContent).toBe(lazyCopy.retry);
  button?.focus();
  expect(document.activeElement).toBe(button);
  expect(alert()?.getAttribute("tabindex")).toBe("-1");
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
