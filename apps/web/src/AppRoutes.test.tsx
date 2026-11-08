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
  expect(screen.getByRole("status").textContent).toBe("Loading this part of the page.");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeTruthy();
  // No build-time key in tests: the visible "maps unavailable" state, and nothing loads from Google.
  expect(screen.getByRole("alert").textContent).toContain("Place search is unavailable");
  // One main landmark (the shell's panel) holds the slice.
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.getByRole("main").contains(screen.getByRole("heading", { level: 1 }))).toBe(true);
});
