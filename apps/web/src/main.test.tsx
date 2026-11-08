import { act } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

let mounted: HTMLElement | undefined;

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  mounted?.remove(); // leave no rendered app behind for the next test file
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-58 main.tsx wraps the app in StrictMode and mounts the nearest-station slice", async () => {
  vi.resetModules(); // main.tsx runs on import: load it, and the boundary it wraps, fresh for this test
  const { ErrorBoundary } = await import("./error-boundary");
  const root = document.createElement("div");
  mounted = root;
  const renderSpy = vi.spyOn(ErrorBoundary.prototype, "render");
  root.id = "root";
  document.body.append(root);
  await act(async () => {
    await import("./main");
  });
  // StrictMode must wrap the boundary too: dev StrictMode renders every class component it contains
  // twice, so a StrictMode placed only inside the boundary would leave this at 1.
  expect(renderSpy).toHaveBeenCalledTimes(2);
  renderSpy.mockRestore();
  // The slice is a lazy chunk (ADR-0021): it appears inside the shell once its chunk has loaded.
  await vi.waitFor(() => {
    expect(root.querySelector("main h1")?.textContent).toBe("Nearest Metro station");
  });
});

test("METRO-79 main.tsx fails loudly when the page has no #root element", async () => {
  vi.resetModules();
  expect(document.getElementById("root")).toBeNull();
  await expect(import("./main")).rejects.toThrow("Missing application root");
});
