import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { AppRoutes } from "./AppRoutes";
import { ErrorBoundary } from "./error-boundary";

// The Nearby chunk cannot be loaded (offline, a stale hashed name after a deploy): importing it rejects.
vi.mock("./features/nearby/Nearby", () => {
  throw new Error("chunk 404");
});

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-112 when the Nearby chunk cannot load, the contained reload region shows and no empty map frame or Line map region is drawn", async () => {
  vi.spyOn(console, "error").mockImplementation(vi.fn());
  render(
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>,
  );
  const region = await screen.findByRole("region", {
    name: "This part of the page could not be loaded. Reload the page to try again.",
  });
  expect(document.activeElement).toBe(region);
  expect(screen.getByRole("button", { name: "Reload the page" })).toBeTruthy();
  // The shell around it still works, and the root fallback did not replace it.
  expect(screen.getByRole("link", { name: "Metro Station Finder, home" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  // Nothing of the map: no frame, no region, no application.
  expect(document.querySelector(".app__map-frame")).toBeNull();
  expect(screen.queryByRole("region", { name: "Line map" })).toBeNull();
  expect(screen.queryByRole("application")).toBeNull();
  // The only status was the pending one, and it is gone.
  expect(screen.queryByText("Loading this part of the page.")).toBeNull();
});
