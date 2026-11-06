import { act } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

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
  vi.resetModules(); // main.tsx runs on import: load it, and the boundary it wraps, fresh for this test
  const { ErrorBoundary } = await import("./error-boundary");
  const root = document.createElement("div");
  mounted = root;
  const renderSpy = vi.spyOn(ErrorBoundary.prototype, "render");
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

test("METRO-79 main.tsx fails loudly when the page has no #root element", async () => {
  vi.resetModules();
  expect(document.getElementById("root")).toBeNull();
  await expect(import("./main")).rejects.toThrow("Missing application root");
});
