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

test("METRO-93 the app renders the nearest-station slice with the real adapter and no key", () => {
  render(<AppRoutes />);
  expect(screen.getByRole("heading", { level: 1, name: "Nearest Metro station" })).toBeTruthy();
  // No build-time key in tests: the visible "maps unavailable" state, and nothing loads from Google.
  expect(screen.getByRole("alert").textContent).toContain("Place search is unavailable");
});
