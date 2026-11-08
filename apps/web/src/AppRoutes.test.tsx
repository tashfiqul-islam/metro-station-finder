import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { AppRoutes } from "./AppRoutes";

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-93 the app renders the nearest-station slice with the real adapter and no key", async () => {
  render(<AppRoutes />);
  // The slice is a lazy chunk (ADR-0021): a fixed pending status first, then the slice inside the shell.
  // The map slot and the slice are two lazy parts, so two pending statuses.
  const pending = screen.getAllByText("Loading this part of the page.");
  expect(pending.map((node) => node.tagName)).toEqual(["OUTPUT", "OUTPUT"]);
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeTruthy();
  // No build-time key in tests: the visible "maps unavailable" state, and nothing loads from Google.
  expect(screen.getByRole("alert").textContent).toContain("Place search is unavailable");
  // One main landmark (the shell's panel) holds the slice.
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.getByRole("main").contains(screen.getByRole("heading", { level: 1 }))).toBe(true);
});

test("METRO-111 the shell's map slot shows the line map", async () => {
  render(<AppRoutes />);
  const list = await screen.findByRole("list", { name: "Stations on MRT Line 6, north to south" });
  expect(list.querySelectorAll("li")).toHaveLength(16);
});
