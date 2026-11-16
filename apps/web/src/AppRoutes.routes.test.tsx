import { act, cleanup, render, screen } from "@testing-library/react";
import { createRoot } from "react-dom/client";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";

import { AppRoutes } from "./AppRoutes";
import { ErrorBoundary } from "./error-boundary";
import { rootErrorOptions } from "./report-error";
import type { RouteTable, ScreenProps } from "./routes";

const firstMap = <p>First map</p>;

function First({ setMap }: ScreenProps) {
  return (
    <>
      <h1>First screen</h1>
      <button
        type="button"
        onClick={() => {
          setMap(firstMap);
        }}
      >
        Show map
      </button>
    </>
  );
}
function Second() {
  return <h1>Second screen</h1>;
}
function Broken(): never {
  throw new TypeError("render failed");
}

const loadFirst = vi.fn(() => Promise.resolve({ default: First }));
const loadSecond = vi.fn(() => Promise.resolve({ default: Second }));
const one: RouteTable = [{ path: "/", load: loadFirst }];
const two: RouteTable = [...one, { path: "/second", load: loadSecond }];

const settle = () => act(async () => {});
const goTo = async (path: string): Promise<void> => {
  await act(async () => {
    window.history.replaceState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
};

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  loadFirst.mockClear();
  loadSecond.mockClear();
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-159 AC1 a table with one entry loads one chunk and keeps the plain shell", async () => {
  render(<AppRoutes routes={one} />);
  expect(await screen.findByRole("heading", { name: "First screen" })).toBeTruthy();
  expect(loadFirst).toHaveBeenCalledTimes(1);
  expect(loadSecond).not.toHaveBeenCalled();
  expect(document.querySelector(".app")?.classList.contains("app--plain")).toBe(true);
});

test("METRO-159 AC1 a second entry adds a second lazy chunk that is fetched only when its route shows, with no other file edited", async () => {
  render(<AppRoutes routes={two} />);
  await screen.findByRole("heading", { name: "First screen" });
  expect(loadSecond).not.toHaveBeenCalled();
  await goTo("/second");
  expect(await screen.findByRole("heading", { name: "Second screen" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "First screen" })).toBeNull();
  expect(loadSecond).toHaveBeenCalledTimes(1);
});

test("METRO-159 a deep link opens its route, Back returns, and an unknown path shows the first route", async () => {
  window.history.replaceState(null, "", "/second/");
  render(<AppRoutes routes={two} />);
  expect(await screen.findByRole("heading", { name: "Second screen" })).toBeTruthy();
  await goTo("/nowhere");
  expect(await screen.findByRole("heading", { name: "First screen" })).toBeTruthy();
});

test("METRO-159 a screen's map is shown on its own route only", async () => {
  render(<AppRoutes routes={two} />);
  const show = await screen.findByRole("button", { name: "Show map" });
  await act(async () => {
    show.click();
  });
  expect(screen.getByText("First map")).toBeTruthy();
  await goTo("/second");
  await screen.findByRole("heading", { name: "Second screen" });
  expect(screen.queryByText("First map")).toBeNull();
  expect(document.querySelector(".app__map-frame")).toBeNull();
});

test("METRO-159 AC3 a route whose loader rejects shows the failure with focus on its container", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());
  const failing: RouteTable = [
    ...one,
    { path: "/second", load: () => Promise.reject(new TypeError("offline")) },
  ];
  window.history.replaceState(null, "", "/second");
  render(
    <ErrorBoundary>
      <AppRoutes routes={failing} />
    </ErrorBoundary>,
  );
  const region = await screen.findByRole("region", {
    name: "This part of the page could not be loaded. Reload the page to try again.",
  });
  expect(document.activeElement).toBe(region);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: "Reload the page" })).toBeTruthy();
  errorSpy.mockRestore();
});

test("METRO-159 AC4 a screen's own render error reaches the root error boundary exactly once", async () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());
  const broken: RouteTable = [{ path: "/", load: () => Promise.resolve({ default: Broken }) }];
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host, rootErrorOptions);
  await act(async () => {
    root.render(
      <ErrorBoundary>
        <AppRoutes routes={broken} />
      </ErrorBoundary>,
    );
  });
  await settle();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Something went wrong");
  expect(host.textContent).not.toContain("could not be loaded");
  expect(errorSpy.mock.calls).toEqual([["Render error: TypeError"]]);
  await act(async () => {
    root.unmount();
  });
  host.remove();
  errorSpy.mockRestore();
});
