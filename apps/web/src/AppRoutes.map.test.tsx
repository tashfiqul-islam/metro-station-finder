import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";

import { AppRoutes } from "./AppRoutes";

// The first `import()` of the screen loads and transforms its whole module graph (about 0.4 s alone, over 1 s on
// a loaded machine, METRO-125), which a 1 s `findBy` could not wait for. Loading it here, with a hook timeout
// sized for a cold graph, leaves the test to wait only for what it checks: the lazy boundary resolving and the
// screen rendering its map.
const COLD_GRAPH_MS = 30_000;
beforeAll(async () => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
  await Promise.all([import("./features/nearby/Nearby"), import("./adapters/maps")]);
}, COLD_GRAPH_MS);
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

// A file of its own: `AppRoutes.test.tsx` checks the pending state of the slice, which a loaded chunk would hide.
test("METRO-111 the shell's map slot shows the line map", async () => {
  render(<AppRoutes />);
  const list = await screen.findByRole("list", { name: "Stations on MRT Line 6, north to south" });
  expect(list.querySelectorAll("li")).toHaveLength(16);
  // The control for the failure test: once the screen has loaded, the map frame and its region exist.
  expect(document.querySelector(".app__map-frame")).not.toBeNull();
  expect(screen.getByRole("region", { name: "Line map" })).toBeTruthy();
});
