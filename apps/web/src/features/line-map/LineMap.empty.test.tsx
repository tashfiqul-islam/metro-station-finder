import { cleanup, render } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

import { LineMap } from "./LineMap";
import type * as Projection from "./projection";

// A dataset with no stations: the module's first and last stop do not exist.
vi.mock("./projection", async (importOriginal) => ({
  ...(await importOriginal<typeof Projection>()),
  lineStops: () => [],
}));

beforeAll(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);
});
afterEach(cleanup);
afterAll(() => {
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("METRO-126 the map fails visibly, with a fixed message, when the station dataset is empty", () => {
  const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(() => render(<LineMap />)).toThrow("The station dataset is empty");
  } finally {
    quiet.mockRestore();
  }
});
