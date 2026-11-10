import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { AppRoutes } from "./AppRoutes";

// The first `import()` of the screen loads and transforms its whole module graph (about 0.4 s alone, over 1 s on
// a loaded machine, METRO-125), which a 1 s `findBy` could not wait for. Loading it here, with a hook timeout
// sized for a cold graph, leaves the test to wait only for what it checks. The pending status below is still
// seen first: the lazy boundary has not been rendered yet, and a loaded module does not make it resolve at once.
const COLD_GRAPH_MS = 30_000;
beforeAll(async () => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  await Promise.all([import("./features/nearby/Nearby"), import("./adapters/maps")]);
}, COLD_GRAPH_MS);
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-93 the app renders the nearest-station slice with the real adapter and no key", async () => {
  render(<AppRoutes />);
  // The slice is a lazy chunk (ADR-0021): a fixed pending status first, then the slice inside the shell.
  // One status for the screen; the map beside it is silent while it loads.
  expect(screen.getByText("Loading this part of the page.").tagName).toBe("OUTPUT");
  expect(
    await screen.findByRole("heading", { level: 1, name: "Nearest Metro station" }),
  ).toBeTruthy();
  // No build-time key in tests: the visible "maps unavailable" state, and nothing loads from Google.
  expect(
    screen.getByText(/Place search is unavailable right now/u).closest("output"),
  ).not.toBeNull();
  expect(screen.queryByText("Search for a place")).toBeNull();
  // One main landmark (the shell's panel) holds the slice.
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.getByRole("main").contains(screen.getByRole("heading", { level: 1 }))).toBe(true);
});
