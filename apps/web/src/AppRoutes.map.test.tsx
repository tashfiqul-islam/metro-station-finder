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

// A file of its own: `AppRoutes.test.tsx` checks the pending state of the slice, which a loaded chunk would hide.
test("METRO-111 the shell's map slot shows the line map", async () => {
  render(<AppRoutes />);
  const list = await screen.findByRole("list", { name: "Stations on MRT Line 6, north to south" });
  expect(list.querySelectorAll("li")).toHaveLength(16);
});
