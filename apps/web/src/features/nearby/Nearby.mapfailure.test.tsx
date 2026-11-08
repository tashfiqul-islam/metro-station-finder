import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { mapsAdapter } from "../../adapters/maps";
import { ErrorBoundary } from "../../error-boundary";
import { AppShell } from "../../shell/AppShell";
import { MapBoundary } from "./MapBoundary";
import { Nearby } from "./Nearby";

// The map throws while it renders (a bug, not a failed load).
vi.mock("../line-map/LineMap", () => ({
  LineMap: (): never => {
    throw new Error("map render failed at 23.8,90.4");
  },
}));

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

function Boom(): never {
  throw new Error("boom");
}

function Harness() {
  const [map, setMap] = useState<ReactNode>(null);
  return (
    <ErrorBoundary>
      <AppShell map={map ?? undefined}>
        <Nearby maps={mapsAdapter} setMap={setMap} />
      </AppShell>
    </ErrorBoundary>
  );
}

test("METRO-112 a render error in the line map is contained in the map frame: a fixed message and Reload, the page keeps working, no error text", () => {
  vi.spyOn(console, "error").mockImplementation(vi.fn());
  render(<Harness />);
  const alert = document.querySelector<HTMLElement>(".map-failed");
  if (alert === null) throw new Error("no map failure region");
  expect(alert.getAttribute("role")).toBe("alert");
  expect(alert.closest(".app__map-frame")).not.toBeNull();
  expect(alert.textContent).toContain(
    "The line map could not be shown. The rest of the page still works.",
  );
  expect(alert.textContent).not.toContain("23.8");
  expect(document.body.textContent).not.toContain("map render failed");
  expect(screen.getByRole("button", { name: "Reload the page" })).toBeTruthy();
  // Not the root fallback: the page and the picker are still there and usable.
  expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  expect(screen.getByRole("heading", { level: 1, name: "Nearest Metro station" })).toBeTruthy();
  const box = screen.getByRole("combobox", { name: "Or pick a station" });
  fireEvent.change(box, { target: { value: "farm" } });
  fireEvent.keyDown(box, { key: "Enter" });
  expect(screen.getByRole("heading", { level: 2, name: "Farmgate" })).toBeTruthy();
});

test("METRO-112 the map failure region reloads the page through its button", () => {
  vi.spyOn(console, "error").mockImplementation(vi.fn());
  const reload = vi.fn();
  render(
    <MapBoundary reload={reload}>
      <Boom />
    </MapBoundary>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Reload the page" }));
  expect(reload).toHaveBeenCalledTimes(1);
});

test("METRO-112 the default reload is window.location.reload", () => {
  vi.spyOn(console, "error").mockImplementation(vi.fn());
  const reload = vi.fn();
  vi.stubGlobal("location", { reload });
  try {
    render(
      <MapBoundary>
        <Boom />
      </MapBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Reload the page" }));
    expect(reload).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
});

test("METRO-112 a map that renders shows its children and no failure region", () => {
  render(
    <MapBoundary>
      <p>fine</p>
    </MapBoundary>,
  );
  expect(screen.getByText("fine")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
