import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { mapsAdapter } from "../../adapters/maps";
import { AppShell } from "../../shell/AppShell";
import { Nearby } from "./Nearby";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

/** The screen inside the shell the way `AppRoutes` wires it: the map goes up through `setMap`. */
function Harness({ mounted = true }: { readonly mounted?: boolean }) {
  const [map, setMap] = useState<ReactNode>(null);
  return (
    <AppShell map={map}>{mounted ? <Nearby maps={mapsAdapter} setMap={setMap} /> : null}</AppShell>
  );
}

const combo = (): HTMLElement => screen.getByRole("combobox", { name: "Or pick a station" });

test("METRO-112 the screen fills the shell's map slot with the line map, nothing highlighted yet", () => {
  render(<Harness />);
  const map = screen.getByRole("application", { name: "Schematic map of MRT Line 6" });
  expect(map.closest(".app__map")).not.toBeNull();
  expect(screen.getByRole("list", { name: /^Stations on MRT Line 6/u }).textContent).not.toContain(
    "highlighted",
  );
});

test("METRO-112 picking a station highlights it on the map", () => {
  render(<Harness />);
  fireEvent.change(combo(), { target: { value: "farm" } });
  fireEvent.keyDown(combo(), { key: "Enter" });
  const items = screen
    .getAllByRole("listitem")
    .filter((item) => item.textContent.includes("Farmgate"));
  expect(items.some((item) => item.textContent === "Farmgate, highlighted")).toBe(true);
  expect(
    screen.getByRole("application", { name: "Schematic map of MRT Line 6" }).textContent,
  ).toContain("Farmgate");
});

test("METRO-112 the map goes away with the screen", () => {
  const { rerender } = render(<Harness />);
  rerender(<Harness mounted={false} />);
  expect(screen.queryByRole("application")).toBeNull();
});

test("METRO-112 the existing controls keep their order and the picker follows the location controls", () => {
  render(<Harness />);
  const locate = screen.getByRole("button", { name: "Use my location" });
  const picker = combo();
  const order = locate.compareDocumentPosition(picker);
  expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // Header, then panel handle, then the screen; the map region comes after the panel.
  const main = screen.getByRole("main");
  const region = screen.getByRole("region", { name: "Line map" });
  expect(main.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test("METRO-112 Show on map moves keyboard focus to the map", () => {
  render(<Harness />);
  fireEvent.change(combo(), { target: { value: "farm" } });
  fireEvent.keyDown(combo(), { key: "Enter" });
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Show on map" }));
  });
  expect(document.activeElement).toBe(
    screen.getByRole("application", { name: "Schematic map of MRT Line 6" }),
  );
});

test("METRO-112 Show on map does not fail when the map has not loaded", () => {
  render(
    <AppShell>
      <Nearby maps={mapsAdapter} setMap={vi.fn()} />
    </AppShell>,
  );
  fireEvent.change(combo(), { target: { value: "farm" } });
  fireEvent.keyDown(combo(), { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "Show on map" }));
  expect(screen.getByRole("heading", { level: 2, name: "Farmgate" })).toBeTruthy();
});
